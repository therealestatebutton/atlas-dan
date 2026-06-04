import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { db, upsertLead, getLeads, updateLeadStatus, updateLeadSkipTrace, getStats, logScrapeRun, finishScrapeRun, getScrapeRuns, getSettings, saveSettings, getKV, setKV, deleteLeadsByFilter } from "./db.js";
import { runAllScrapers, getDateRange } from "./scrapers/index.js";
import { sendDailyReport } from "./email.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── SYNC DB SETTINGS → process.env (so base.ts proxy helpers pick them up) ──
function syncEnvFromSettings(): void {
  const s = getSettings();
  if (s.scraper_api_key)  process.env.SCRAPER_API_KEY  = s.scraper_api_key;
  if (s.bright_data_user) process.env.BRIGHT_DATA_USER = s.bright_data_user;
  if (s.bright_data_pass) process.env.BRIGHT_DATA_PASS = s.bright_data_pass;
}

// ─── CLIENT CONFIG (injected per client via env vars) ─────────────────────────
const CLIENT_CONFIG = {
  name: process.env.CLIENT_NAME || "Dan Button Properties",
  email: process.env.CLIENT_EMAIL || "dan@therealestatebutton.com",
  counties: (JSON.parse(process.env.CLIENT_COUNTIES || '[{"name":"Horry","state":"SC"},{"name":"Georgetown","state":"SC"},{"name":"Marion","state":"SC"}]') as Array<Record<string, string>>).map(c => ({ name: c.name || c.county || "", county: c.name || c.county || "", state: c.state || "" })),
};

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
function leadsToCSV(leads: Record<string, string | null>[]): string {
  const headers = [
    "Lead Type", "County", "State", "Owner Name", "Property Address", "City", "Zip",
    "Mailing Address", "Mailing City", "Mailing State", "Mailing Zip",
    "Case Number", "Filing Date", "Assessed Value", "Tax Year",
    "Lender", "Loan Amount", "Sale Date", "Sale Amount", "Description", "Source URL", "Status",
    "Skip Traced", "Phone", "Email", "Skip Trace Mailing"
  ];
  const fields = [
    "lead_type", "county", "state", "owner_name", "address", "city", "zip",
    "mailing_address", "mailing_city", "mailing_state", "mailing_zip",
    "case_number", "filing_date", "assessed_value", "tax_year",
    "lender", "loan_amount", "sale_date", "sale_amount", "description", "source_url", "status",
    "skip_traced", "st_phone", "st_email", "st_mailing"
  ];
  const escape = (v: string | null | undefined) => {
    if (!v) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = leads.map(l => fields.map(f => escape(l[f] as string)).join(","));
  return [headers.join(","), ...rows].join("\n");
}

// ─── SCRAPE JOB STATE ─────────────────────────────────────────────────────────
let scrapeInProgress = false;
let lastScrapeLog: string[] = [];
// Persist lastScrapeTime to DB so it survives Railway redeploys
let lastScrapeTime: string | null = getKV("last_scrape_time");

async function runScrapeJob(fromDate: string, toDate: string): Promise<number> {
  if (scrapeInProgress) throw new Error("Scrape already in progress");
  scrapeInProgress = true;
  lastScrapeLog = [];
  let totalNew = 0;
  const runId = logScrapeRun(fromDate, toDate);
  try {
    const counties = CLIENT_CONFIG.counties.map(c => ({
      name: c.name || (c as any).county || "",
      state: c.state,
      leadTypes: ["Pre-Foreclosure", "Foreclosure", "Tax Delinquent", "Probate", "Sheriff Sale", "Bankruptcy", "Obituary", "FSBO", "Code Violation", "Divorce", "Vacant/Abandoned"],
    }));
    const { leads, errors } = await runAllScrapers(counties, fromDate, toDate, (msg) => {
      lastScrapeLog.push(msg);
      console.log(`[Scrape] ${msg}`);
    });
    for (const lead of leads) {
      const isNew = upsertLead(lead as unknown as Record<string, string | null>);
      if (isNew) totalNew++;
    }
    if (errors.length) lastScrapeLog.push(`⚠ ${errors.length} errors: ${errors.join("; ")}`);
    lastScrapeLog.push(`✓ Done: ${totalNew} new leads saved`);
    lastScrapeTime = new Date().toISOString();
    setKV("last_scrape_time", lastScrapeTime);
    console.log(`[Scrape] Complete: ${totalNew} new leads`);
    finishScrapeRun(runId, totalNew);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    finishScrapeRun(runId, totalNew, errMsg);
    throw e;
  } finally {
    scrapeInProgress = false;
  }
  return totalNew;
}

// ─── DAILY CRON — 6:00 AM EST every day (restart-safe via node-cron) ─────────
function startDailyCron() {
  // 0 11 * * * = 11:00 UTC = 6:00 AM EST / 7:00 AM EDT
  cron.schedule("0 11 * * *", async () => {
    console.log("[Cron] Running daily scrape at 6am EST...");
    const { fromDate, toDate } = getDateRange(1);
    try {
      const newLeads = await runScrapeJob(fromDate, toDate);
      const settings = getSettings();
      const recipients = settings.email_recipients
        ? settings.email_recipients.split(",").map(e => e.trim()).filter(Boolean)
        : CLIENT_CONFIG.email ? [CLIENT_CONFIG.email] : [];
      const smtpReady = settings.smtp_host && settings.smtp_user && settings.smtp_pass
        && !settings.smtp_pass.startsWith("placeholder");
      if (recipients.length > 0 && newLeads > 0 && smtpReady) {
        const allLeads = getLeads({ from_date: toDate, to_date: toDate }) as Record<string, string | null>[];
        for (const recipient of recipients) {
          await sendDailyReport(recipient, CLIENT_CONFIG.name, allLeads as any, toDate, settings).catch(e =>
            console.error(`[Cron] Email to ${recipient} failed:`, e)
          );
        }
        console.log(`[Cron] Daily report sent to ${recipients.length} recipient(s)`);
      } else if (!smtpReady) {
        console.log("[Cron] Email skipped — SMTP not configured in Settings");
      }
    } catch (e) {
      console.error("[Cron] Daily scrape failed:", e);
    }
  }, { timezone: "America/New_York" });
  console.log("[Cron] Daily scrape scheduled for 6:00 AM EST (node-cron, restart-safe)");
}

// ─── EXPRESS APP ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));

  // ── API Routes ──────────────────────────────────────────────────────────────
  // GET /api/leads — list leads with filters
  app.get("/api/leads", (req, res) => {
    const { county, lead_type, status, from_date, to_date, limit, offset } = req.query as Record<string, string>;
    const filters = {
      county: county || undefined,
      lead_type: lead_type || undefined,
      status: status || undefined,
      from_date: from_date || undefined,
      to_date: to_date || undefined,
    };
    const allLeads = getLeads(filters);
    const total = allLeads.length;
    const pageLimit = limit ? parseInt(limit) : 100;
    const pageOffset = offset ? parseInt(offset) : 0;
    const leads = allLeads.slice(pageOffset, pageOffset + pageLimit);
    res.json({ leads, total });
  });

  // GET /api/leads/export — download CSV
  app.get("/api/leads/export", (req, res) => {
    const { county, lead_type, status, from_date, to_date } = req.query as Record<string, string>;
    const leads = getLeads({
      county: county || undefined,
      lead_type: lead_type || undefined,
      status: status || undefined,
      from_date: from_date || undefined,
      to_date: to_date || undefined,
    }) as Record<string, string | null>[];
    const csv = leadsToCSV(leads);
    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="atlas-leads-${date}.csv"`);
    res.send(csv);
  });

  // PATCH /api/leads/:id — update status/notes
  app.patch("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    updateLeadStatus(id, status, notes);
    res.json({ ok: true });
  });

  // GET /api/stats — dashboard stats
  app.get("/api/stats", (_req, res) => {
    res.json({ ...getStats(), lastScrapeTime });
  });

  // GET /api/config — client config (counties, name)
  app.get("/api/config", (_req, res) => {
    res.json({ name: CLIENT_CONFIG.name, counties: CLIENT_CONFIG.counties });
  });

  // GET /api/settings — get current settings (masks secrets)
  app.get("/api/settings", (_req, res) => {
    const s = getSettings();
    res.json({
      smtp_host: s.smtp_host,
      smtp_port: s.smtp_port,
      smtp_user: s.smtp_user,
      smtp_pass: s.smtp_pass && !s.smtp_pass.startsWith("placeholder") ? "••••••••••••••••" : "",
      smtp_from: s.smtp_from,
      email_recipients: s.email_recipients,
      scraper_api_key: s.scraper_api_key ? "••••••••••••••••" : "",
      skip_trace_key: s.skip_trace_key ? "••••••••••••••••" : "",
      auto_skip_trace: s.auto_skip_trace,
      bright_data_user: s.bright_data_user || "",
      bright_data_pass: s.bright_data_pass ? "••••••••••••••••" : "",
      attom_api_key: s.attom_api_key ? "••••••••••••••••" : "",
      smtp_configured: !!(s.smtp_host && s.smtp_user && s.smtp_pass && !s.smtp_pass.startsWith("placeholder")),
      scraper_api_configured: !!s.scraper_api_key,
      skip_trace_configured: !!s.skip_trace_key,
      bright_data_configured: !!(s.bright_data_user && s.bright_data_pass),
      attom_configured: !!s.attom_api_key,
    });
  });

  // POST /api/settings — save settings
  app.post("/api/settings", (req, res) => {
    const allowed = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "email_recipients", "scraper_api_key", "skip_trace_key", "auto_skip_trace", "bright_data_user", "bright_data_pass", "attom_api_key"];
    const partial: Record<string, string> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined && req.body[key] !== "••••••••••••••••") {
        partial[key] = String(req.body[key]);
      }
    }
    saveSettings(partial);
    syncEnvFromSettings();
    res.json({ ok: true });
  });

  // POST /api/settings/test-email — send a test email
  app.post("/api/settings/test-email", async (req, res) => {
    const settings = getSettings();
    const testRecipient = req.body.email || settings.email_recipients?.split(",")[0]?.trim();
    if (!testRecipient) return res.status(400).json({ error: "No recipient email" });
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass || settings.smtp_pass.startsWith("placeholder")) {
      return res.status(400).json({ error: "SMTP not configured" });
    }
    try {
      await sendDailyReport(testRecipient, CLIENT_CONFIG.name, [], new Date().toISOString().split("T")[0], settings, true);
      res.json({ ok: true, message: `Test email sent to ${testRecipient}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/leads/:id/skip-trace — skip trace a single lead
  app.post("/api/leads/:id/skip-trace", async (req, res) => {
    const { id } = req.params;
    const settings = getSettings();
    if (!settings.skip_trace_key) {
      return res.status(400).json({ success: false, error: "Easy Button Skip Trace API key not configured. Go to Settings to add it." });
    }
    // Easy Button Skip Trace API — POST to their REST endpoint
    // API docs: https://app.easybuttonskiptrace.com (API Access section in dashboard)
    const lead = (db as any).prepare("SELECT * FROM leads WHERE id = ?").get(id) as any;
    if (!lead) return res.status(404).json({ success: false, error: "Lead not found." });
    try {
      const r = await fetch("https://api.easybuttonskiptrace.com/v1/trace", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.skip_trace_key}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: lead.owner_name,
          address: lead.address,
          city: lead.city,
          state: lead.state || "SC",
          zip: lead.zip,
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ success: false, error: `Skip trace API returned ${r.status}: ${errText}` });
      }
      const data = await r.json() as any;
      // Normalize response — Easy Button returns phone/email/mailing_address fields
      const phone = data.phone || data.phones?.[0] || data.phone_number || null;
      const email = data.email || data.emails?.[0] || data.email_address || null;
      const mailing = data.mailing_address || data.mail_address || data.address || null;
      updateLeadSkipTrace(id, { phone, email, mailing });
      return res.json({ success: true, phone, email, mailing });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: `Skip trace request failed: ${err.message}` });
    }
  });

  // POST /api/leads/:id/skip-trace-update — update skip trace data
  app.post("/api/leads/:id/skip-trace-update", (req, res) => {
    const { id } = req.params;
    const { phone, email, mailing } = req.body;
    updateLeadSkipTrace(id, { phone, email, mailing });
    res.json({ ok: true });
  });

  // GET /api/scrape/runs — list recent scrape runs
  app.get("/api/scrape/runs", (_req, res) => {
    res.json(getScrapeRuns(50));
  });

  // POST /api/scrape — trigger manual scrape
  app.post("/api/scrape", async (req, res) => {
    if (scrapeInProgress) {
      return res.status(409).json({ error: "Scrape already in progress" });
    }
    const { from_date, to_date } = req.body;
    const fromDate = from_date || getDateRange(1).fromDate;
    const toDate = to_date || getDateRange(1).toDate;
    runScrapeJob(fromDate, toDate).catch(console.error);
    res.json({ ok: true, message: "Scrape started", from_date: fromDate, to_date: toDate });
  });

  // GET /api/scrape/status — SSE stream for scrape progress
  app.get("/api/scrape/status", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const interval = setInterval(() => {
      if (res.writableEnded) { clearInterval(interval); return; }
      res.write(`data: ${JSON.stringify({ in_progress: scrapeInProgress, log: lastScrapeLog })}\n\n`);
    }, 1000);
    req.on("close", () => clearInterval(interval));
  });

  // POST /api/scrape/historical — pull last N days (up to 90)
  app.post("/api/scrape/historical", async (req, res) => {
    if (scrapeInProgress) {
      return res.status(409).json({ error: "Scrape already in progress" });
    }
    const { days_back } = req.body;
    const daysBack = Math.min(parseInt(days_back) || 30, 90);
    const { fromDate, toDate } = getDateRange(daysBack);
    runScrapeJob(fromDate, toDate).catch(console.error);
    res.json({ ok: true, message: `Historical scrape started (${daysBack} days)`, from_date: fromDate, to_date: toDate });
  });

  // POST /api/import — bulk import leads (accepts array of lead objects, idempotent)
  app.post("/api/import", (req, res) => {
    const leads: Record<string, string | null>[] = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ error: "Expected array of leads" });
    let inserted = 0;
    let skipped = 0;
    for (const lead of leads) {
      try {
        const isNew = upsertLead(lead);
        if (isNew) inserted++; else skipped++;
      } catch { skipped++; }
    }
    res.json({ ok: true, inserted, skipped, total: leads.length });
  });

  // POST /api/seed — inject demo leads for SC
  app.post("/api/seed", (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
    const seedLeads = [
      { id: "SC-HORRY-PREFC-001", county: "Horry", state: "SC", lead_type: "Pre-Foreclosure", owner_name: "James & Patricia Williams", address: "1204 Oak Forest Rd", city: "Myrtle Beach", zip: "29577", mailing_address: "1204 Oak Forest Rd", mailing_city: "Myrtle Beach", mailing_state: "SC", mailing_zip: "29577", case_number: "2026CP2600891", filing_date: twoDaysAgo, assessed_value: "185000", tax_year: "2025", lender: "Wells Fargo", loan_amount: "152000", sale_date: null, sale_amount: null, description: "Horry County Pre-Foreclosure — Lis Pendens filed", source_url: "https://acclaimweb.horrycounty.org", status: "new", notes: null, scraped_at: today },
      { id: "SC-HORRY-TAXD-001", county: "Horry", state: "SC", lead_type: "Tax Delinquent", owner_name: "Robert Johnson", address: "4521 Highway 501", city: "Conway", zip: "29526", mailing_address: "PO Box 1234", mailing_city: "Conway", mailing_state: "SC", mailing_zip: "29526", case_number: "2025-TD-04821", filing_date: yesterday, assessed_value: "98000", tax_year: "2024", lender: null, loan_amount: null, sale_date: null, sale_amount: null, description: "Horry County Tax Delinquent — 2024 taxes unpaid", source_url: "https://www.horrycountysc.gov/Departments/Treasurer", status: "new", notes: null, scraped_at: today },
      { id: "SC-GEORGETOWN-PREFC-001", county: "Georgetown", state: "SC", lead_type: "Pre-Foreclosure", owner_name: "Michael & Susan Davis", address: "823 Front St", city: "Georgetown", zip: "29440", mailing_address: "823 Front St", mailing_city: "Georgetown", mailing_state: "SC", mailing_zip: "29440", case_number: "2026CP2200412", filing_date: today, assessed_value: "210000", tax_year: "2025", lender: "Bank of America", loan_amount: "178000", sale_date: null, sale_amount: null, description: "Georgetown County Pre-Foreclosure — Foreclosure case filed", source_url: "https://publicindex.sccourts.org/Georgetown", status: "new", notes: null, scraped_at: today },
      { id: "SC-MARION-PROBATE-001", county: "Marion", state: "SC", lead_type: "Probate", owner_name: "Estate of Dorothy Mae Thompson", address: null, city: "Marion", zip: null, mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null, case_number: "2026ES3100089", filing_date: today, assessed_value: null, tax_year: null, lender: null, loan_amount: null, sale_date: null, sale_amount: null, description: "Marion County Probate — Estate case filed", source_url: "https://publicindex.sccourts.org/Marion", status: "new", notes: null, scraped_at: today },
    ];
    let inserted = 0;
    for (const lead of seedLeads) {
      const isNew = upsertLead(lead as unknown as Record<string, string | null>);
      if (isNew) inserted++;
    }
    res.json({ ok: true, inserted, total: seedLeads.length });
  });

  // DELETE /api/leads/purge — delete leads by filter
  app.delete("/api/leads/purge", (req, res) => {
    const { county, source_url, owner_name_contains } = req.body;
    const deleted = deleteLeadsByFilter({ county, source_url, owner_name_contains });
    res.json({ ok: true, deleted });
  });

  // ── Static Frontend ──────────────────────────────────────────────────────────
  const staticPath = path.resolve(__dirname, "public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Sync DB settings → process.env on startup (keys saved in Settings survive restarts)
  syncEnvFromSettings();

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`[Atlas] Server running on http://localhost:${port}/`);
    console.log(`[Atlas] Client: ${CLIENT_CONFIG.name}`);
    console.log(`[Atlas] Counties: ${CLIENT_CONFIG.counties.map(c => `${c.name} ${c.state}`).join(", ")}`);
    console.log(`[Atlas] ScraperAPI: ${process.env.SCRAPER_API_KEY ? "✓ configured" : "not set — add key in Settings"}`);
    startDailyCron();
  });
}
startServer().catch(console.error);
// force rebuild Dan Button SC — Jun 4 2026
