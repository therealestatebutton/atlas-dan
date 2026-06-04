/**
 * South Carolina County Scrapers
 * Counties: Horry, Georgetown, Marion
 *
 * Sources:
 * - Horry Pre-Foreclosure / Lis Pendens: AcclaimWeb ROD API (acclaimweb.horrycounty.org)
 * - Horry Foreclosure Notices: AcclaimWeb ROD API (doc type 137 = NOTICE OF FORECLOSURE)
 * - Georgetown / Marion Pre-Foreclosure: SC Public Index (publicindex.sccourts.org)
 * - Tax Delinquent: County treasurer portals
 * - Probate: SC Public Index estate cases
 * - Sheriff Sales: County Sheriff civil sale listings
 */

import * as cheerio from "cheerio";
import { Lead, makeId, formatDate, fetchWithRetry } from "./base.js";

const STATE = "SC";

// ─── ACCLAIM WEB HELPERS (Horry County ROD) ──────────────────────────────────

const ACCLAIM_BASE = "https://acclaimweb.horrycounty.org/AcclaimWeb";

// AcclaimWeb document type IDs — confirmed via live browser test on acclaimweb.horrycounty.org
// Format: label is the display name, id is the Value field in the Kendo dropdown
const ACCLAIM_DOC_TYPES = {
  LIS_PENDENS_DEED:      { id: 132, label: "LIS PENDENS DEED (135)" },
  LIS_PENDENS_MTG:       { id: 210, label: "LIS PENDENS MTG (138)" },
  NOTICE_OF_FORECLOSURE: { id: 137, label: "NOTICE OF FORECLOSURE (143)" },
  PROBATE_FIDUCIARY:     { id: 135, label: "PROBATE FIDUCIARY LETTER (133)" },
  TAX_LIEN_STATE:        { id: 99,  label: "TAX LIENS - STATE (084)" },
  TAX_LIEN_FEDERAL:      { id: 101, label: "TAX LIENS - FEDERAL (093)" },
  COURT_ORDER_DEED:      { id: 133, label: "COURT ORDER DEED (125)" },
};

async function acclaimWebSearch(
  docTypeId: number,
  docTypeLabel: string,
  acclaimFrom: string, // MM/DD/YYYY
  acclaimTo: string    // MM/DD/YYYY
): Promise<Record<string, string>[]> {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  try {
    // Step 1: GET disclaimer page to obtain ASP.NET session cookie
    // AcclaimWeb redirects to disclaimer before allowing searches
    const initRes = await fetchWithRetry(
      `${ACCLAIM_BASE}/Search/Disclaimer?st=/AcclaimWeb/search/SearchTypeDocType`,
      { headers: { "User-Agent": UA }, redirect: "follow" }
    );
    if (!initRes.ok) return [];

    // Extract session cookie from response headers
    const rawCookies = initRes.headers.get("set-cookie") || "";
    const sessionMatch = rawCookies.match(/ASP\.NET_SessionId=([^;,\s]+)/i);
    const sessionId = sessionMatch ? sessionMatch[1] : "";
    const cookieHeader = sessionId ? `ASP.NET_SessionId=${sessionId}` : "";

    // Step 2: POST to accept disclaimer (sets session state to "accepted")
    await fetchWithRetry(`${ACCLAIM_BASE}/Search/Disclaimer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Referer: `${ACCLAIM_BASE}/Search/Disclaimer?st=/AcclaimWeb/search/SearchTypeDocType`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: "btnButton=I+accept+the+conditions+above.",
      redirect: "follow",
    });

    // Step 3: POST search criteria — field names confirmed via browser XHR intercept:
    //   DocTypes=<id>&DocTypesDisplay_input=<label>&DocTypesDisplay=<id>&DateRangeList= &RecordDateFrom=M/D/YYYY&RecordDateTo=M/D/YYYY
    // NOTE: ?Length=6 is required in the URL (matches the form action observed in browser)
    const searchBody = new URLSearchParams({
      DocTypes: String(docTypeId),
      DocTypesDisplay_input: docTypeLabel,
      DocTypesDisplay: String(docTypeId),
      DateRangeList: " ",
      RecordDateFrom: acclaimFrom,
      RecordDateTo: acclaimTo,
    });
    const searchRes = await fetchWithRetry(
      `${ACCLAIM_BASE}/search/SearchTypeDocType?Length=6`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: searchBody.toString(),
      }
    );
    if (!searchRes.ok) return [];

    // Step 4: Export CSV — confirmed working via live browser test
    //   GridResults returns 404; ExportCsv is the correct data endpoint
    //   CSV columns: Consideration,DirectName,IndirectName,BookPage,RecordDate,DocTypeDescription,BookType,Comments,DeletedAfterVerify
    const csvRes = await fetchWithRetry(`${ACCLAIM_BASE}/Search/ExportCsv`, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!csvRes.ok) return [];

    const csvText = await csvRes.text();
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse CSV header row
    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());

    // Parse data rows (handle quoted fields with embedded commas)
    return lines.slice(1).map(line => {
      const cols: string[] = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cols[i] || ""; });
      return row;
    });
  } catch (e) {
    console.error("[AcclaimWeb] Error:", e);
    return [];
  }
}

/** Convert YYYY-MM-DD → MM/DD/YYYY for AcclaimWeb */
function toAcclaimDate(d: string): string {
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${m}/${day}/${y}`;
}

/** Convert AcclaimWeb YYYY/MM/DD → YYYY-MM-DD */
function acclaimDateToIso(d: string): string {
  return d ? d.replace(/\//g, "-") : d;
}

// ─── HORRY COUNTY ─────────────────────────────────────────────────────────────

async function scrapeHorryPreForeclosure(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Horry";

  const acclaimFrom = toAcclaimDate(fromDate);
  const acclaimTo = toAcclaimDate(toDate);

  // Fetch LIS PENDENS DEED + LIS PENDENS MTG in parallel
  const [lisDeed, lisMtg] = await Promise.all([
    acclaimWebSearch(ACCLAIM_DOC_TYPES.LIS_PENDENS_DEED.id, ACCLAIM_DOC_TYPES.LIS_PENDENS_DEED.label, acclaimFrom, acclaimTo),
    acclaimWebSearch(ACCLAIM_DOC_TYPES.LIS_PENDENS_MTG.id, ACCLAIM_DOC_TYPES.LIS_PENDENS_MTG.label, acclaimFrom, acclaimTo),
  ]);

  for (const rec of [...lisDeed, ...lisMtg]) {
    // CSV columns: Consideration, DirectName, IndirectName, BookPage, RecordDate, DocTypeDescription, BookType, Comments
    const name = (rec.DirectName || rec.IndirectName || "").trim() || null;
    const caseMatch = (rec.Comments || "").match(/(?:case|c\/a\s*no\.?|no\.?)\s*([\w\d\s\-]+)/i);
    const caseNumber = caseMatch ? caseMatch[1].trim() : (rec.BookPage || null);
    // RecordDate format from CSV: "M/D/YYYY H:MM:SS AM/PM"
    const recordDate = rec.RecordDate ? formatDate(new Date(rec.RecordDate).toISOString().slice(0, 10)) : null;
    const consideration = rec.Consideration ? parseFloat(rec.Consideration) : null;

    leads.push({
      id: makeId(COUNTY, STATE, "Pre-Foreclosure", rec.BookPage || name || String(Date.now())),
      county: COUNTY,
      state: STATE,
      lead_type: "Pre-Foreclosure",
      owner_name: name,
      address: null,
      city: "Myrtle Beach",
      zip: null,
      mailing_address: null,
      mailing_city: null,
      mailing_state: null,
      mailing_zip: null,
      case_number: caseNumber,
      filing_date: recordDate,
      assessed_value: null,
      tax_year: null,
      lender: null,
      loan_amount: consideration && consideration > 0 ? String(Math.round(consideration)) : null,
      sale_date: null,
      sale_amount: null,
      description: rec.Comments || rec.DocTypeDescription || "Lis Pendens",
      source_url: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
      raw_data: JSON.stringify({ bookPage: rec.BookPage, docType: rec.DocTypeDescription, comments: rec.Comments }),
    });
  }

  return leads;
}

async function scrapeHorryForeclosure(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Horry";

  const acclaimFrom = toAcclaimDate(fromDate);
  const acclaimTo = toAcclaimDate(toDate);

  const records = await acclaimWebSearch(
    ACCLAIM_DOC_TYPES.NOTICE_OF_FORECLOSURE.id,
    ACCLAIM_DOC_TYPES.NOTICE_OF_FORECLOSURE.label,
    acclaimFrom,
    acclaimTo
  );

  for (const rec of records) {
    // CSV columns: Consideration, DirectName, IndirectName, BookPage, RecordDate, DocTypeDescription, BookType, Comments
    const name = (rec.DirectName || rec.IndirectName || "").trim() || null;
    const recordDate = rec.RecordDate ? formatDate(new Date(rec.RecordDate).toISOString().slice(0, 10)) : null;
    const consideration = rec.Consideration ? parseFloat(rec.Consideration) : null;

    leads.push({
      id: makeId(COUNTY, STATE, "Foreclosure", rec.BookPage || name || String(Date.now())),
      county: COUNTY,
      state: STATE,
      lead_type: "Foreclosure",
      owner_name: name,
      address: null,
      city: "Myrtle Beach",
      zip: null,
      mailing_address: null,
      mailing_city: null,
      mailing_state: null,
      mailing_zip: null,
      case_number: rec.BookPage || null,
      filing_date: recordDate,
      assessed_value: null,
      tax_year: null,
      lender: null,
      loan_amount: consideration && consideration > 0 ? String(Math.round(consideration)) : null,
      sale_date: null,
      sale_amount: null,
      description: rec.Comments || "Notice of Foreclosure",
      source_url: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
      raw_data: JSON.stringify({ bookPage: rec.BookPage, docType: rec.DocTypeDescription, comments: rec.Comments }),
    });
  }

  return leads;
}

async function scrapeHorryTaxDelinquent(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Horry";

  // Primary source: AcclaimWeb ROD — State Tax Liens (id=99) and Federal Tax Liens (id=101)
  // These are recorded when a tax lien is filed against a property owner
  const acclaimFrom = toAcclaimDate(fromDate);
  const acclaimTo = toAcclaimDate(toDate);

  const [stateLiens, federalLiens] = await Promise.all([
    acclaimWebSearch(ACCLAIM_DOC_TYPES.TAX_LIEN_STATE.id, ACCLAIM_DOC_TYPES.TAX_LIEN_STATE.label, acclaimFrom, acclaimTo),
    acclaimWebSearch(ACCLAIM_DOC_TYPES.TAX_LIEN_FEDERAL.id, ACCLAIM_DOC_TYPES.TAX_LIEN_FEDERAL.label, acclaimFrom, acclaimTo),
  ]);

  for (const rec of [...stateLiens, ...federalLiens]) {
    const name = (rec.DirectName || rec.IndirectName || "").trim() || null;
    const recordDate = rec.RecordDate ? formatDate(new Date(rec.RecordDate).toISOString().slice(0, 10)) : null;
    const consideration = rec.Consideration ? parseFloat(rec.Consideration) : null;
    leads.push({
      id: makeId(COUNTY, STATE, "Tax Delinquent", rec.BookPage || name || String(Date.now())),
      county: COUNTY,
      state: STATE,
      lead_type: "Tax Delinquent",
      owner_name: name,
      address: null,
      city: "Myrtle Beach",
      zip: null,
      mailing_address: null,
      mailing_city: null,
      mailing_state: null,
      mailing_zip: null,
      case_number: rec.BookPage || null,
      filing_date: recordDate,
      assessed_value: null,
      tax_year: new Date().getFullYear().toString(),
      lender: null,
      loan_amount: consideration && consideration > 0 ? String(Math.round(consideration)) : null,
      sale_date: null,
      sale_amount: null,
      description: rec.Comments || rec.DocTypeDescription || "Tax Lien Filed",
      source_url: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
      raw_data: JSON.stringify({ bookPage: rec.BookPage, docType: rec.DocTypeDescription }),
    });
  }

  // Secondary source: Horry County delinquent-tax page (requires login for full list,
  // but the page itself is accessible and may have downloadable PDFs)
  try {
    const taxUrl = "https://www.horrycountysc.gov/departments/treasurer/delinquent-tax/";
    const res = await fetchWithRetry(taxUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (href.match(/\.(pdf|xlsx?|csv)/i) && text.toLowerCase().match(/tax|delinquent|sale/)) {
          leads.push({
            id: makeId(COUNTY, STATE, "Tax Delinquent", href),
            county: COUNTY,
            state: STATE,
            lead_type: "Tax Delinquent",
            owner_name: null,
            address: null,
            city: "Myrtle Beach",
            zip: null,
            mailing_address: null,
            mailing_city: null,
            mailing_state: null,
            mailing_zip: null,
            case_number: null,
            filing_date: formatDate(fromDate),
            assessed_value: null,
            tax_year: new Date().getFullYear().toString(),
            lender: null,
            loan_amount: null,
            sale_date: null,
            sale_amount: null,
            description: `Horry County Tax Delinquent List — ${text}`,
            source_url: href.startsWith("http") ? href : `https://www.horrycountysc.gov${href}`,
            raw_data: null,
          });
        }
      });
    }
  } catch (e) {
    console.error("[Horry Tax] Secondary source error:", e);
  }

  return leads;
}

async function scrapeHorryProbate(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Horry";
  // SC Public Index (publicindex.sccourts.org) blocks datacenter IPs with HTTP 406
  // Use AcclaimWeb ROD instead: PROBATE FIDUCIARY LETTER (id=135) is recorded when
  // an estate is opened and the personal representative is appointed
  const acclaimFrom = toAcclaimDate(fromDate);
  const acclaimTo = toAcclaimDate(toDate);

  const records = await acclaimWebSearch(
    ACCLAIM_DOC_TYPES.PROBATE_FIDUCIARY.id,
    ACCLAIM_DOC_TYPES.PROBATE_FIDUCIARY.label,
    acclaimFrom,
    acclaimTo
  );

  for (const rec of records) {
    const name = (rec.DirectName || rec.IndirectName || "").trim() || null;
    const recordDate = rec.RecordDate ? formatDate(new Date(rec.RecordDate).toISOString().slice(0, 10)) : null;
    leads.push({
      id: makeId(COUNTY, STATE, "Probate", rec.BookPage || name || String(Date.now())),
      county: COUNTY,
      state: STATE,
      lead_type: "Probate",
      owner_name: name,
      address: null,
      city: "Myrtle Beach",
      zip: null,
      mailing_address: null,
      mailing_city: null,
      mailing_state: null,
      mailing_zip: null,
      case_number: rec.BookPage || null,
      filing_date: recordDate,
      assessed_value: null,
      tax_year: null,
      lender: null,
      loan_amount: null,
      sale_date: null,
      sale_amount: null,
      description: rec.Comments || "Probate Fiduciary Letter — Estate Opening",
      source_url: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
      raw_data: JSON.stringify({ bookPage: rec.BookPage, docType: rec.DocTypeDescription }),
    });
  }
  return leads;
}

async function scrapeHorrySheriffSales(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Horry";
  // hcso.net is a parked GoDaddy domain. Real Horry County Sheriff civil sales
  // require login on horrycountysc.gov. Use AcclaimWeb COURT ORDER DEED (id=133)
  // as a proxy — these are filed when a court orders a sheriff sale or property transfer.
  const acclaimFrom = toAcclaimDate(fromDate);
  const acclaimTo = toAcclaimDate(toDate);

  const records = await acclaimWebSearch(
    ACCLAIM_DOC_TYPES.COURT_ORDER_DEED.id,
    ACCLAIM_DOC_TYPES.COURT_ORDER_DEED.label,
    acclaimFrom,
    acclaimTo
  );

  for (const rec of records) {
    const name = (rec.DirectName || rec.IndirectName || "").trim() || null;
    const recordDate = rec.RecordDate ? formatDate(new Date(rec.RecordDate).toISOString().slice(0, 10)) : null;
    leads.push({
      id: makeId(COUNTY, STATE, "Sheriff Sale", rec.BookPage || name || String(Date.now())),
      county: COUNTY,
      state: STATE,
      lead_type: "Sheriff Sale",
      owner_name: name,
      address: null,
      city: "Myrtle Beach",
      zip: null,
      mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
      case_number: rec.BookPage || null,
      filing_date: recordDate,
      assessed_value: null,
      tax_year: null,
      lender: null, loan_amount: null,
      sale_date: recordDate,
      sale_amount: null,
      description: rec.Comments || "Court Order Deed (Sheriff Sale)",
      source_url: `${ACCLAIM_BASE}/search/SearchTypeDocType`,
      raw_data: JSON.stringify({ bookPage: rec.BookPage, docType: rec.DocTypeDescription }),
    });
  }
  return leads;
}

// ─── GEORGETOWN COUNTY ────────────────────────────────────────────────────────
// NOTE: publicindex.sccourts.org returns HTTP 406 from datacenter IPs.
// Georgetown County sources used instead:
//   1. Tax Sale: gtcountysc.gov/408/Tax-Sale — annual PDF list (confirmed accessible)
//   2. Pre-Foreclosure/Probate: PACER SC District Court RSS (confirmed 200, 673 items)
//   3. Bankruptcy: PACER SC Bankruptcy RSS (confirmed 200, 897 items)

async function scrapeGeorgetownCounty(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Georgetown";
  const fromMs = new Date(fromDate).getTime();

  // 1. Georgetown Tax Sale — annual PDF list from gtcountysc.gov
  try {
    const taxSaleUrl = "https://www.gtcountysc.gov/408/Tax-Sale";
    const taxRes = await fetchWithRetry(taxSaleUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (taxRes.ok) {
      const html = await taxRes.text();
      const $ = cheerio.load(html);
      $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (href.match(/\.(pdf|xlsx?|csv)/i) || href.includes("DocumentCenter")) {
          const fullUrl = href.startsWith("http") ? href : `https://www.gtcountysc.gov${href}`;
          leads.push({
            id: makeId(COUNTY, STATE, "Tax Delinquent", href),
            county: COUNTY,
            state: STATE,
            lead_type: "Tax Delinquent",
            owner_name: null,
            address: null,
            city: "Georgetown",
            zip: null,
            mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
            case_number: null,
            filing_date: formatDate(fromDate),
            assessed_value: null,
            tax_year: new Date().getFullYear().toString(),
            lender: null, loan_amount: null, sale_date: null, sale_amount: null,
            description: `Georgetown County Tax Sale List — ${text || href}`,
            source_url: fullUrl,
            raw_data: JSON.stringify({ text, href }),
          });
        }
      });
    }
  } catch (e) {
    console.error("[Georgetown Tax] Error:", e);
  }

  // 2. Pre-Foreclosure / Probate via PACER SC District Court RSS
  // Case numbers starting with 4: (Florence Division) cover Georgetown County
  try {
    const rss = await fetchWithRetry("https://ecf.scd.uscourts.gov/cgi-bin/rss_outside.pl", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (rss.ok) {
      const xml = await rss.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim() || "";
        const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim() || "";
        const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || "";
        const pubMs = pubDate ? new Date(pubDate).getTime() : 0;
        if (pubMs < fromMs) continue;
        // Florence Division (4:xx-cv) covers Georgetown County
        if (!title.match(/^4:/)) continue;
        const lower = title.toLowerCase();
        const isForeclosure = lower.includes("foreclos") || lower.includes("mortgage") || lower.includes("lis pendens");
        const isProbate = lower.includes("estate") || lower.includes("probate");
        if (!isForeclosure && !isProbate) continue;
        const leadType = isForeclosure ? "Pre-Foreclosure" : "Probate";
        const caseNum = title.split(" ")[0];
        leads.push({
          id: makeId(COUNTY, STATE, leadType, caseNum),
          county: COUNTY,
          state: STATE,
          lead_type: leadType,
          owner_name: title.replace(caseNum, "").trim() || null,
          address: null,
          city: "Georgetown",
          zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: caseNum,
          filing_date: pubDate ? formatDate(new Date(pubDate).toISOString().slice(0, 10)) : null,
          assessed_value: null,
          tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `Georgetown County ${leadType} — ${title}`,
          source_url: link || "https://ecf.scd.uscourts.gov/",
          raw_data: JSON.stringify({ title, pubDate }),
        });
      }
    }
  } catch (e) {
    console.error("[Georgetown PACER] Error:", e);
  }

  return leads;
}

// ─── MARION COUNTY ────────────────────────────────────────────────────────────
// NOTE: publicindex.sccourts.org returns HTTP 406 from datacenter IPs.
// Marion County sources:
//   1. Pre-Foreclosure/Probate: PACER SC District Court RSS — Florence Division (4:xx-cv)
//   2. Bankruptcy: PACER SC Bankruptcy RSS (scrapeBankruptcy handles state-wide)
//   3. Marion County has no public-facing delinquent tax list online.

async function scrapeMarionCounty(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const COUNTY = "Marion";
  const fromMs = new Date(fromDate).getTime();

  // Pre-Foreclosure / Probate via PACER SC District Court RSS
  // Florence Division (4:xx-cv) covers Marion County
  try {
    const rss = await fetchWithRetry("https://ecf.scd.uscourts.gov/cgi-bin/rss_outside.pl", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (rss.ok) {
      const xml = await rss.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim() || "";
        const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim() || "";
        const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || "";
        const pubMs = pubDate ? new Date(pubDate).getTime() : 0;
        if (pubMs < fromMs) continue;
        // Florence Division (4:xx-cv) covers Marion County
        if (!title.match(/^4:/)) continue;
        const lower = title.toLowerCase();
        const isForeclosure = lower.includes("foreclos") || lower.includes("mortgage") || lower.includes("lis pendens");
        const isProbate = lower.includes("estate") || lower.includes("probate");
        if (!isForeclosure && !isProbate) continue;
        const leadType = isForeclosure ? "Pre-Foreclosure" : "Probate";
        const caseNum = title.split(" ")[0];
        leads.push({
          id: makeId(COUNTY, STATE, leadType, caseNum),
          county: COUNTY,
          state: STATE,
          lead_type: leadType,
          owner_name: title.replace(caseNum, "").trim() || null,
          address: null,
          city: "Marion",
          zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: caseNum,
          filing_date: pubDate ? formatDate(new Date(pubDate).toISOString().slice(0, 10)) : null,
          assessed_value: null,
          tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `Marion County ${leadType} — ${title}`,
          source_url: link || "https://ecf.scd.uscourts.gov/",
          raw_data: JSON.stringify({ title, pubDate }),
        });
      }
    }
  } catch (e) {
    console.error("[Marion PACER] Error:", e);
  }

  return leads;
}

// ─── MASTER SCRAPER ───────────────────────────────────────────────────────────

export async function scrapeSC(county: string, fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];

  switch (county.toLowerCase()) {
    case "horry":
      leads.push(
        ...(await scrapeHorryPreForeclosure(fromDate, toDate)),
        ...(await scrapeHorryForeclosure(fromDate, toDate)),
        ...(await scrapeHorryTaxDelinquent(fromDate, toDate)),
        ...(await scrapeHorryProbate(fromDate, toDate)),
        ...(await scrapeHorrySheriffSales(fromDate, toDate)),
      );
      break;
    case "georgetown":
      leads.push(...(await scrapeGeorgetownCounty(fromDate, toDate)));
      break;
    case "marion":
      leads.push(...(await scrapeMarionCounty(fromDate, toDate)));
      break;
    default:
      console.warn(`[SC] No scraper for county: ${county}`);
  }

  return leads;
}

// ─── BANKRUPTCY — District of SC (ecf.scb.uscourts.gov) ─────────────────────

// ─── FSBO — South Carolina Craigslist ────────────────────────────────────────
export async function scrapeFSBO(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const cities = ["charleston", "columbia", "myrtle beach", "florence"];
  for (const city of cities) {
    try {
      const url = `https://${city.replace(" ", "")}.craigslist.org/search/reo?format=json&sort=date&query=for+sale+by+owner`;
      const res = await fetchWithRetry(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json() as { items?: unknown[] };
      const items = data?.items || [];
      for (const item of items as Record<string, unknown>[]) {
        const title = String(item.Title || item.title || "");
        const url2 = String(item.url || item.URL || "");
        const price = String(item.ask || item.price || "");
        const posted = String(item.PostedDate || item.date || "");
        if (!title) continue;
        leads.push({
          id: makeId("FSBO", title, "SC", city),
          county: city,
          state: "SC",
          lead_type: "FSBO",
          owner_name: null,
          address: null,
          city: city,
          zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: null,
          filing_date: posted ? formatDate(new Date(posted).toISOString().slice(0,10)) : formatDate(fromDate),
          assessed_value: price || null,
          tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `FSBO — ${title}`,
          source_url: url2 || url,
          raw_data: JSON.stringify({ title, price, posted }),
        });
      }
    } catch (e) {
      console.error(`[SC] FSBO Craigslist ${city} error:`, e);
    }
  }
  return leads;
}

export async function scrapeBankruptcy(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  try {
    const rss = await fetchWithRetry("https://ecf.scb.uscourts.gov/cgi-bin/rss_outside.pl");
    if (!rss.ok) return leads;
    const xml = await rss.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const title = (item.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) || item.match(/<title>(.+?)<\/title>/))?.[1]?.trim() || "";
      const link  = (item.match(/<link>(.+?)<\/link>/))?.[1]?.trim() || "";
      const desc  = (item.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/) || item.match(/<description>(.+?)<\/description>/))?.[1]?.trim() || "";
      const pubDate = (item.match(/<pubDate>(.+?)<\/pubDate>/))?.[1]?.trim() || "";
      const caseNum = (title.match(/([0-9]{2}-[0-9]{5})/)?.[1]) || title;
      // Extract owner name from title: "26-70730-13 Jesse Ray Evin Keeton" -> "Jesse Ray Evin Keeton"
      const ownerFromTitle = title.replace(/^[0-9]{2}-[0-9]{5}(-[0-9]+)?\s*/, "").trim();
      const caseName = ownerFromTitle || desc.replace(/<[^>]+>/g, "").replace(/&[a-z0-9#]+;/g, "").trim();
      leads.push({
        id: makeId("SC", "SC", "Bankruptcy", caseNum),
        county: "SC",
        state: "SC",
        lead_type: "Bankruptcy",
        owner_name: caseName || caseNum,
        address: "", city: "", zip: "",
        mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
        case_number: caseNum,
        filing_date: pubDate ? formatDate(new Date(pubDate).toISOString().slice(0,10)) : formatDate(fromDate),
        assessed_value: null, tax_year: null,
        lender: null, loan_amount: null,
        sale_date: null, sale_amount: null,
        source_url: link || "https://ecf.scb.uscourts.gov/cgi-bin/rss_outside.pl",
        description: `SC Bankruptcy — ${caseName || caseNum}`,
        raw_data: JSON.stringify({ title, caseNum, caseName, pubDate }),
      });
    }
  } catch (e) {
    console.error("[SC] Bankruptcy RSS error:", e);
  }
  return leads;
}

// ─── OBITUARIES — Legacy.com SC ──────────────────────────────────────────────
export async function scrapeObituaries(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  const url = `https://www.legacy.com/us/obituaries/thesunnews/browse?dateRange=last30Days&countryId=1&regionId=45`; // SC
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return leads;
    const html = await res.text();
    const nameMatches = Array.from(html.matchAll(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/gi));
    const locationMatches = Array.from(html.matchAll(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(?:SC|South Carolina)/g));
    const names = nameMatches.map(m => m[1].trim()).filter(n => n.length > 3);
    const linkMatches = Array.from(html.matchAll(/href="(\/us\/obituaries\/[^"]+)"/g)).map(m => `https://www.legacy.com${m[1]}`);
    names.forEach((name, i) => {
      const location = locationMatches[i]?.[1] || "SC";
      leads.push({
        id: makeId("SC", "SC", "Obituary", name + i),
        county: "Horry",
        state: "SC",
        lead_type: "Obituary",
        owner_name: name,
        address: "", city: location, zip: "",
        mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
        case_number: null,
        filing_date: formatDate(fromDate),
        assessed_value: null, tax_year: null,
        lender: null, loan_amount: null,
        sale_date: null, sale_amount: null,
        source_url: linkMatches[i] || url,
        description: `Obituary — ${name}, ${location}, SC. Potential estate/probate lead.`,
        raw_data: JSON.stringify({ name, location }),
      });
    });
  } catch (e) {
    console.error("[SC] Obituaries error:", e);
  }
  return leads;
}


// ─── CODE VIOLATIONS — South Carolina municipal portals ─────────────────────────
export async function scrapeCodeViolations(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  // CourtListener API — South Carolina district court civil cases (code enforcement)
  try {
    const url =
      `https://www.courtlistener.com/api/rest/v4/dockets/` +
      `?court=scd&date_filed__gte=${fromDate}&date_filed__lte=${toDate}` +
      `&nature_of_suit=440&order_by=-date_filed&page_size=50`;
    const res = await fetchWithRetry(url, {
      headers: { "User-Agent": "Atlas/1.0 (atlas@easybuttonrealestate.com)", Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json() as { results?: unknown[] };
      for (const r of (data?.results || []) as Record<string, unknown>[]) {
        const caseName = String(r.case_name || "");
        const caseNum = String(r.docket_number || "");
        const filedDate = String(r.date_filed || "");
        if (!caseName && !caseNum) continue;
        leads.push({
          id: makeId("CV", caseNum || caseName, "SC", "code"),
          county: "SC",
          state: "SC",
          lead_type: "Code Violation",
          owner_name: caseName || null,
          address: null, city: null, zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: caseNum || null,
          filing_date: formatDate(filedDate),
          assessed_value: null, tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `Code Violation / Civil Rights — ${caseName || caseNum}`,
          source_url: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : "https://www.courtlistener.com/",
          raw_data: JSON.stringify({ caseName, caseNum, filedDate }),
        });
      }
    }
  } catch (e) {
    console.error("[SC] Code Violations error:", e);
  }
  return leads;
}

// ─── OUT-OF-STATE OWNERS — CourtListener South Carolina ─────────────────────────
export async function scrapeOutOfStateOwners(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  // Use CourtListener to find absentee/out-of-state property cases
  try {
    const url =
      `https://www.courtlistener.com/api/rest/v4/dockets/` +
      `?court=scd&date_filed__gte=${fromDate}&date_filed__lte=${toDate}` +
      `&nature_of_suit=290&order_by=-date_filed&page_size=50`;
    const res = await fetchWithRetry(url, {
      headers: { "User-Agent": "Atlas/1.0 (atlas@easybuttonrealestate.com)", Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json() as { results?: unknown[] };
      for (const r of (data?.results || []) as Record<string, unknown>[]) {
        const caseName = String(r.case_name || "");
        const caseNum = String(r.docket_number || "");
        const filedDate = String(r.date_filed || "");
        if (!caseName && !caseNum) continue;
        leads.push({
          id: makeId("OOS", caseNum || caseName, "SC", "oos"),
          county: "SC",
          state: "SC",
          lead_type: "Vacant/Abandoned",
          owner_name: caseName || null,
          address: null, city: null, zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: caseNum || null,
          filing_date: formatDate(filedDate),
          assessed_value: null, tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `Out-of-State Owner / Property Dispute — ${caseName || caseNum}`,
          source_url: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : "https://www.courtlistener.com/",
          raw_data: JSON.stringify({ caseName, caseNum, filedDate }),
        });
      }
    }
  } catch (e) {
    console.error("[SC] Out-of-State Owners error:", e);
  }
  return leads;
}

// ─── VACANT / ABANDONED — South Carolina PACER civil RSS ────────────────────────
export async function scrapeVacantAbandoned(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  try {
    const rssRes = await fetchWithRetry("https://ecf.scb.uscourts.gov/cgi-bin/rss_outside.pl");
    if (rssRes.ok) {
      const xml = await rssRes.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = (item.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) || item.match(/<title>(.+?)<\/title>/))?.[1]?.trim() || "";
        const link = (item.match(/<link>(.+?)<\/link>/))?.[1]?.trim() || "";
        const pubDate = (item.match(/<pubDate>(.+?)<\/pubDate>/))?.[1]?.trim() || "";
        const desc = (item.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/) || item.match(/<description>(.+?)<\/description>/))?.[1]?.trim() || "";
        if (!title) continue;
        const lower = (title + " " + desc).toLowerCase();
        // Chapter 7 liquidations often involve vacant/abandoned properties
        if (!lower.includes("chapter 7") && !lower.includes("vacant") && !lower.includes("abandon")) continue;
        leads.push({
          id: makeId("VAC", title, "SC", "vacant"),
          county: "SC",
          state: "SC",
          lead_type: "Vacant/Abandoned",
          owner_name: title.split(/\s+v\.?\s+/i)[0]?.trim() || title,
          address: null, city: null, zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: null,
          filing_date: pubDate ? formatDate(new Date(pubDate).toISOString().slice(0,10)) : formatDate(fromDate),
          assessed_value: null, tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `Vacant/Abandoned — Chapter 7 Liquidation — ${title}`,
          source_url: link || "https://ecf.scb.uscourts.gov/cgi-bin/rss_outside.pl",
          raw_data: JSON.stringify({ title, pubDate, desc }),
        });
      }
    }
  } catch (e) {
    console.error("[SC] Vacant/Abandoned error:", e);
  }
  return leads;
}

// ─── DIVORCE / EVICTION — South Carolina PACER civil RSS ────────────────────────
export async function scrapeDivorce(fromDate: string, toDate: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  try {
    const rssRes = await fetchWithRetry("https://ecf.scd.uscourts.gov/cgi-bin/rss_outside.pl");
    if (rssRes.ok) {
      const xml = await rssRes.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = (item.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) || item.match(/<title>(.+?)<\/title>/))?.[1]?.trim() || "";
        const link = (item.match(/<link>(.+?)<\/link>/))?.[1]?.trim() || "";
        const pubDate = (item.match(/<pubDate>(.+?)<\/pubDate>/))?.[1]?.trim() || "";
        const desc = (item.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/) || item.match(/<description>(.+?)<\/description>/))?.[1]?.trim() || "";
        if (!title) continue;
        const lower = (title + " " + desc).toLowerCase();
        if (!lower.includes("matrimon") && !lower.includes("divorce") && !lower.includes("dissolution") && !lower.includes("evict")) continue;
        const parts = title.split(/\s+v\.?\s+/i);
        leads.push({
          id: makeId("DIV", title, "SC", "divorce"),
          county: "SC",
          state: "SC",
          lead_type: "Divorce",
          owner_name: parts.join(" & ") || title,
          address: null, city: null, zip: null,
          mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
          case_number: null,
          filing_date: pubDate ? formatDate(new Date(pubDate).toISOString().slice(0,10)) : formatDate(fromDate),
          assessed_value: null, tax_year: null,
          lender: null, loan_amount: null, sale_date: null, sale_amount: null,
          description: `Divorce / Eviction — ${title}`,
          source_url: link || "https://ecf.scd.uscourts.gov/cgi-bin/rss_outside.pl",
          raw_data: JSON.stringify({ title, pubDate, desc }),
        });
      }
    }
  } catch (e) {
    console.error("[SC] Divorce/Eviction RSS error:", e);
  }
  return leads;
}

export async function scrapeAll(fromDate: string, toDate: string): Promise<Lead[]> {
  const results = await Promise.allSettled([
    scrapeHorryPreForeclosure(fromDate, toDate),
    scrapeHorryForeclosure(fromDate, toDate),
    scrapeHorryTaxDelinquent(fromDate, toDate),
    scrapeHorryProbate(fromDate, toDate),
    scrapeHorrySheriffSales(fromDate, toDate),
    scrapeGeorgetownCounty(fromDate, toDate),
    scrapeMarionCounty(fromDate, toDate),
    scrapeBankruptcy(fromDate, toDate),
    scrapeObituaries(fromDate, toDate),
    scrapeCodeViolations(fromDate, toDate),
    scrapeDivorce(fromDate, toDate),
    scrapeOutOfStateOwners(fromDate, toDate),
    scrapeVacantAbandoned(fromDate, toDate),
    scrapeFSBO(fromDate, toDate),
  
  
  ]);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
