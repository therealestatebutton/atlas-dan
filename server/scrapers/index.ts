import { Lead } from '../types/index.js';
import { LeadsService } from '../db/leads.js';
import { ScrapeRunsService } from '../db/scrape-runs.js';
import { sendDailyReport } from '../email/index.js';

// Import scrapers
import {
  HorryCountyLisPendensScraper,
  HorryCountyTaxDelinquentScraper,
  HorryCountyCodeViolationScraper,
  GeorgetownCountyLisPendensScraper,
  GeorgetownCountyTaxDelinquentScraper,
  GeorgetownCountyCodeViolationScraper,
  MarionCountyLisPendensScraper,
  MarionCountyTaxDelinquentScraper,
  MarionCountyCodeViolationScraper,
  SCCraigslistFBSOScraper,
  SCObituary Scraper,
  SCFireDamageScraper,
  SCWaterShutoffScraper,
  SCEvictionScraper,
  SCVacantAbandonedScraper,
} from './sc-counties.js';
import { CraigslistFSBOScraper } from './craigslist-fsbo.js';

const COUNTIES = [
  { name: 'Horry', state: 'SC' },
  { name: 'Georgetown', state: 'SC' },
  { name: 'Marion', state: 'SC' },
];

/**
 * Scrape all lead types for all counties
 */
export async function scrapeAllCounties(fromDate?: Date, toDate?: Date): Promise<Lead[]> {
  const allLeads: Lead[] = [];
  const errors: string[] = [];
  const scrapeId = Buffer.from(Math.random().toString()).toString('base64').substring(0, 12);

  // Create scrape run record
  ScrapeRunsService.createRun(scrapeId);

  try {
    for (const county of COUNTIES) {
      try {
        console.log(`\n========================================`);
        console.log(`Scraping ${county.name} County, ${county.state}`);
        console.log(`========================================`);

        const countyLeads = await scrapeCounty(county.name, county.state, fromDate, toDate);
        console.log(`✓ Found ${countyLeads.length} leads for ${county.name} County`);

        // Insert leads into database
        const inserted = LeadsService.insertLeads(countyLeads);
        console.log(`✓ Inserted ${inserted} new leads into database`);

        allLeads.push(...countyLeads);

        // Send daily report email if new leads found
        if (countyLeads.length > 0 && !fromDate) {
          try {
            await sendDailyReport(countyLeads, county.name);
          } catch (emailError) {
            console.warn('Failed to send daily report:', emailError);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${county.name} County: ${message}`);
        console.error(`✗ Error scraping ${county.name} County:`, message);
      }
    }
  } finally {
    // Complete scrape run record
    const errorMsg = errors.length > 0 ? errors.join('; ') : undefined;
    ScrapeRunsService.completeRun(scrapeId, allLeads.length, errorMsg);

    if (errors.length > 0) {
      console.error('\n✗ Scraping completed with errors:');
      errors.forEach(e => console.error(`  - ${e}`));
    } else {
      console.log('\n✓ Scraping completed successfully');
    }
  }

  return allLeads;
}

/**
 * Scrape a specific county
 */
export async function scrapeCounty(
  county: string,
  state: string,
  fromDate?: Date,
  toDate?: Date
): Promise<Lead[]> {
  const allLeads: Lead[] = [];

  // Define scrapers for each lead type
  const scrapers = [
    // County-specific scrapers
    new HorryCountyLisPendensScraper({ county, state, fromDate, toDate }),
    new HorryCountyTaxDelinquentScraper({ county, state, fromDate, toDate }),
    new HorryCountyCodeViolationScraper({ county, state, fromDate, toDate }),
    new GeorgetownCountyLisPendensScraper({ county, state, fromDate, toDate }),
    new GeorgetownCountyTaxDelinquentScraper({ county, state, fromDate, toDate }),
    new GeorgetownCountyCodeViolationScraper({ county, state, fromDate, toDate }),
    new MarionCountyLisPendensScraper({ county, state, fromDate, toDate }),
    new MarionCountyTaxDelinquentScraper({ county, state, fromDate, toDate }),
    new MarionCountyCodeViolationScraper({ county, state, fromDate, toDate }),

    // Generic scrapers
    new CraigslistFSBOScraper({ county, state, fromDate, toDate }),
  ];

  for (const scraper of scrapers) {
    try {
      const leads = await scraper.scrape();
      allLeads.push(...leads);
    } catch (error) {
      console.error(`Error with scraper:`, error);
    }
  }

  return allLeads;
}

/**
 * Scrape a specific lead type for all counties
 */
export async function scrapeLeadType(
  leadType: string,
  fromDate?: Date,
  toDate?: Date
): Promise<Lead[]> {
  const allLeads: Lead[] = [];

  for (const county of COUNTIES) {
    try {
      console.log(`Scraping ${leadType} for ${county.name} County...`);

      // TODO: Implement lead type specific scraping
      // This would route to the appropriate scraper based on leadType

      console.log(`✓ Completed ${leadType} for ${county.name} County`);
    } catch (error) {
      console.error(`Error scraping ${leadType} for ${county.name}:`, error);
    }
  }

  return allLeads;
}
