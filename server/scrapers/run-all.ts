import ForeclosureScraper from './foreclosure-scraper.js';
import TaxDelinquentScraper from './tax-delinquent-scraper.js';
import CraigslistFSBOScraper from './craigslist-fsbo-scraper.js';
import QPublicEnricher from '../enrichment/qpublic-enricher.js';
import { LeadsService } from '../db/leads.js';
import * as fs from 'fs';
import * as path from 'path';

interface ScrapedData {
  foreclosures: any[];
  taxDelinquent: any[];
  fsbo: any[];
}

export class MasterScraper {
  private foreclosureScraper: ForeclosureScraper;
  private taxDelinquentScraper: TaxDelinquentScraper;
  private craigslistScraper: CraigslistFSBOScraper;
  private enricher: QPublicEnricher;
  private leadsService: LeadsService;

  constructor(leadsService: LeadsService) {
    this.foreclosureScraper = new ForeclosureScraper();
    this.taxDelinquentScraper = new TaxDelinquentScraper();
    this.craigslistScraper = new CraigslistFSBOScraper();
    this.enricher = new QPublicEnricher();
    this.leadsService = leadsService;
  }

  /**
   * Run all scrapers
   */
  async runAll(): Promise<ScrapedData> {
    console.log('Starting master scraper run...');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const data: ScrapedData = {
      foreclosures: [],
      taxDelinquent: [],
      fsbo: []
    };

    try {
      // Scrape foreclosures
      console.log('\n=== Scraping Foreclosures ===');
      const foreclosures = await this.foreclosureScraper.scrapeAll();
      data.foreclosures = foreclosures;
      console.log(`Total foreclosures found: ${foreclosures.length}`);

      // Scrape tax delinquent
      console.log('\n=== Scraping Tax Delinquent ===');
      const taxDelinquent = await this.taxDelinquentScraper.scrapeAll();
      data.taxDelinquent = taxDelinquent;
      console.log(`Total tax delinquent found: ${taxDelinquent.length}`);

      // Scrape Craigslist FSBO
      console.log('\n=== Scraping Craigslist FSBO ===');
      const fsbo = await this.craigslistScraper.scrapeAll();
      data.fsbo = fsbo;
      console.log(`Total FSBO found: ${fsbo.length}`);

      // Enrich all leads
      console.log('\n=== Enriching Leads ===');
      await this.enrichAllLeads(data);

      // Save to database and CSV
      console.log('\n=== Saving to Database and CSV ===');
      await this.saveLeads(data);

      console.log('\n✓ Master scraper run completed successfully');
      return data;
    } catch (error) {
      console.error('Error in master scraper:', error);
      throw error;
    }
  }

  /**
   * Enrich all leads with property data
   */
  private async enrichAllLeads(data: ScrapedData): Promise<void> {
    console.log('Enriching foreclosure leads...');
    for (let i = 0; i < data.foreclosures.length; i++) {
      const lead = data.foreclosures[i];
      try {
        const enriched = await this.enricher.enrichLead(lead);
        data.foreclosures[i] = enriched;
      } catch (error) {
        console.error(`Error enriching foreclosure ${i}:`, error);
      }
    }

    console.log('Enriching tax delinquent leads...');
    for (let i = 0; i < data.taxDelinquent.length; i++) {
      const lead = data.taxDelinquent[i];
      try {
        const enriched = await this.enricher.enrichLead(lead);
        data.taxDelinquent[i] = enriched;
      } catch (error) {
        console.error(`Error enriching tax delinquent ${i}:`, error);
      }
    }

    console.log('Enriching FSBO leads...');
    for (let i = 0; i < data.fsbo.length; i++) {
      const lead = data.fsbo[i];
      try {
        const enriched = await this.enricher.enrichLead(lead);
        data.fsbo[i] = enriched;
      } catch (error) {
        console.error(`Error enriching FSBO ${i}:`, error);
      }
    }
  }

  /**
   * Save leads to database and export to CSV
   */
  private async saveLeads(data: ScrapedData): Promise<void> {
    const allLeads: any[] = [];

    // Convert to Lead objects
    for (const foreclosure of data.foreclosures) {
      const lead = this.foreclosureScraper.convertToLead(foreclosure);
      allLeads.push(lead);
      await this.leadsService.addLead(lead);
    }

    for (const taxLead of data.taxDelinquent) {
      const lead = this.taxDelinquentScraper.convertToLead(taxLead);
      allLeads.push(lead);
      await this.leadsService.addLead(lead);
    }

    for (const fsboLead of data.fsbo) {
      const lead = this.craigslistScraper.convertToLead(fsboLead);
      allLeads.push(lead);
      await this.leadsService.addLead(lead);
    }

    // Export to CSV
    await this.exportToCSV(allLeads);
  }

  /**
   * Export leads to CSV files by county
   */
  private async exportToCSV(leads: any[]): Promise<void> {
    const counties = ['Horry', 'Georgetown', 'Marion'];
    const dataDir = path.join(process.cwd(), 'data', 'exports');

    // Create directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    for (const county of counties) {
      const countyLeads = leads.filter(lead => lead.county === county);
      
      if (countyLeads.length > 0) {
        const csv = this.convertToCSV(countyLeads);
        const filename = path.join(dataDir, `${county.toLowerCase()}-county-leads-${new Date().toISOString().split('T')[0]}.csv`);
        fs.writeFileSync(filename, csv);
        console.log(`Exported ${countyLeads.length} leads to ${filename}`);
      }
    }

    // Export all leads combined
    const allCSV = this.convertToCSV(leads);
    const allFilename = path.join(dataDir, `all-counties-leads-${new Date().toISOString().split('T')[0]}.csv`);
    fs.writeFileSync(allFilename, allCSV);
    console.log(`Exported ${leads.length} total leads to ${allFilename}`);
  }

  /**
   * Convert leads to CSV format
   */
  private convertToCSV(leads: any[]): string {
    if (leads.length === 0) return '';

    const headers = [
      'lead_type', 'owner_name', 'address', 'city', 'state', 'zip',
      'mailing_address', 'mailing_city', 'mailing_state', 'mailing_zip',
      'county', 'case_number', 'filing_date', 'assessed_value', 'tax_year',
      'lender', 'loan_amount', 'sale_date', 'sale_amount', 'description',
      'source_url', 'status'
    ];

    const rows = leads.map(lead => [
      lead.leadType,
      lead.ownerName,
      lead.address,
      lead.city,
      lead.state,
      lead.zip,
      lead.mailingAddress,
      lead.mailingCity,
      lead.mailingState,
      lead.mailingZip,
      lead.county,
      lead.caseNumber,
      lead.filingDate,
      lead.assessedValue,
      lead.taxYear,
      lead.lender,
      lead.loanAmount,
      lead.saleDate,
      lead.saleAmount,
      `"${lead.description.replace(/"/g, '""')}"`,
      lead.sourceUrl,
      lead.status
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const leadsService = new LeadsService();
  const scraper = new MasterScraper(leadsService);
  
  scraper.runAll()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default MasterScraper;
