import { Lead, CountyConfig } from "./base.js";
import * as southCarolina from "./south_carolina.js";

// Run all scrapers for the configured counties
export async function runAllScrapers(
  counties: CountyConfig[],
  fromDate: string,
  toDate: string,
  onProgress?: (msg: string) => void
): Promise<{ leads: Lead[]; errors: string[] }> {
  const allLeads: Lead[] = [];
  const errors: string[] = [];

  // Group counties by state
  const stateGroups = new Map<string, CountyConfig[]>();
  for (const county of counties) {
    const key = county.state;
    if (!stateGroups.has(key)) stateGroups.set(key, []);
    stateGroups.get(key)!.push(county);
  }

  for (const [state, stateCounties] of Array.from(stateGroups)) {
    // County-by-county scrapers for SC
    for (const county of stateCounties) {
      try {
        const countyName = county.name || (county as any).county || "";
        onProgress?.(`Scraping ${countyName}, ${county.state}...`);
        let leads: Lead[] = [];
        if (state === "SC") {
          leads = await southCarolina.scrapeSC(countyName, fromDate, toDate);
        } else {
          const msg = `No scraper registered for ${countyName}, ${county.state}`;
          errors.push(msg);
          onProgress?.(`✗ ${msg}`);
          continue;
        }
        allLeads.push(...leads);
        onProgress?.(`✓ ${countyName} ${county.state}: ${leads.length} leads`);
      } catch (e) {
        const countyName = county.name || (county as any).county || "";
        const msg = `Error scraping ${countyName} ${county.state}: ${(e as Error).message}`;
        errors.push(msg);
        onProgress?.(`✗ ${msg}`);
      }
    }

    // State-wide scrapers for SC (run once per state, after county loop)
    if (state === "SC") {
      const stateWideFns: Array<[string, () => Promise<Lead[]>]> = [
        ["SC Bankruptcy", () => southCarolina.scrapeBankruptcy(fromDate, toDate)],
        ["SC Obituaries", () => southCarolina.scrapeObituaries(fromDate, toDate)],
        ["SC FSBO", () => southCarolina.scrapeFSBO(fromDate, toDate)],
        ["SC Code Violations", () => southCarolina.scrapeCodeViolations(fromDate, toDate)],
        ["SC Divorce/Eviction", () => southCarolina.scrapeDivorce(fromDate, toDate)],
        ["SC Vacant/Abandoned", () => southCarolina.scrapeVacantAbandoned(fromDate, toDate)],
      ];
      for (const [label, fn] of stateWideFns) {
        try {
          onProgress?.(`Scraping ${label}...`);
          const leads = await fn();
          allLeads.push(...leads);
          onProgress?.(`✓ ${label}: ${leads.length} leads`);
        } catch (e) {
          const msg = `Error scraping ${label}: ${(e as Error).message}`;
          errors.push(msg);
          onProgress?.(`✗ ${msg}`);
        }
      }
    }
  }

  return { leads: allLeads, errors };
}

export function getDefaultDateRange(): { fromDate: string; toDate: string } {
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return { fromDate, toDate };
}

export function getDateRange(daysBack: number): { fromDate: string; toDate: string } {
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return { fromDate, toDate };
}
