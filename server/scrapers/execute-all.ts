import ForeclosureScraper from './foreclosure-scraper.js';
import TaxDelinquentScraper from './tax-delinquent-scraper.js';
import CraigslistFSBOScraper from './craigslist-fsbo-scraper.js';
import ProbateScraper from './probate-scraper.js';
import EvictionScraper from './eviction-scraper.js';
import CodeViolationScraper from './code-violation-scraper.js';
import FireDamageScraper from './fire-damage-scraper.js';
import WaterShutoffScraper from './water-shutoff-scraper.js';
import DivorceScraper from './divorce-scraper.js';
import BankruptcyScraper from './bankruptcy-scraper.js';
import ObituaryScraper from './obituary-scraper.js';
import QPublicEnricher from '../enrichment/qpublic-enricher.js';
import * as fs from 'fs';
import * as path from 'path';

interface ScrapedLeads {
  [key: string]: any[];
}

export class ComprehensiveScraper {
  private foreclosureScraper: ForeclosureScraper;
  private taxDelinquentScraper: TaxDelinquentScraper;
  private craigslistScraper: CraigslistFSBOScraper;
  private probateScraper: ProbateScraper;
  private evictionScraper: EvictionScraper;
  private codeViolationScraper: CodeViolationScraper;
  private fireDamageScraper: FireDamageScraper;
  private waterShutoffScraper: WaterShutoffScraper;
  private divorceScraper: DivorceScraper;
  private bankruptcyScraper: BankruptcyScraper;
  private obituaryScraper: ObituaryScraper;
  private enricher: QPublicEnricher;

  constructor() {
    this.foreclosureScraper = new ForeclosureScraper();
    this.taxDelinquentScraper = new TaxDelinquentScraper();
    this.craigslistScraper = new CraigslistFSBOScraper();
    this.probateScraper = new ProbateScraper();
    this.evictionScraper = new EvictionScraper();
    this.codeViolationScraper = new CodeViolationScraper();
    this.fireDamageScraper = new FireDamageScraper();
    this.waterShutoffScraper = new WaterShutoffScraper();
    this.divorceScraper = new DivorceScraper();
    this.bankruptcyScraper = new BankruptcyScraper();
    this.obituaryScraper = new ObituaryScraper();
    this.enricher = new QPublicEnricher();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run all scrapers
   */
  async runAll(): Promise<ScrapedLeads> {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE LEAD SCRAPER - ALL LEAD TYPES');
    console.log('='.repeat(80));
    console.log(`Started at: ${new Date().toISOString()}\n`);

    const allLeads: ScrapedLeads = {};

    try {
      // 1. Foreclosure
      console.log('\n[1/11] Scraping FORECLOSURE leads...');
      const foreclosures = await this.foreclosureScraper.scrapeAll();
      allLeads['foreclosure'] = foreclosures;
      console.log(`✓ Found ${foreclosures.length} foreclosure leads`);
      await this.delay(2000);

      // 2. Tax Delinquent
      console.log('\n[2/11] Scraping TAX DELINQUENT leads...');
      const taxDelinquent = await this.taxDelinquentScraper.scrapeAll();
      allLeads['tax-delinquent'] = taxDelinquent;
      console.log(`✓ Found ${taxDelinquent.length} tax delinquent leads`);
      await this.delay(2000);

      // 3. FSBO
      console.log('\n[3/11] Scraping FOR SALE BY OWNER leads...');
      const fsbo = await this.craigslistScraper.scrapeAll();
      allLeads['fsbo'] = fsbo;
      console.log(`✓ Found ${fsbo.length} FSBO leads`);
      await this.delay(2000);

      // 4. Probate
      console.log('\n[4/11] Scraping PROBATE leads...');
      const probate = await this.probateScraper.scrapeAll();
      allLeads['probate'] = probate;
      console.log(`✓ Found ${probate.length} probate leads`);
      await this.delay(2000);

      // 5. Eviction
      console.log('\n[5/11] Scraping EVICTION leads...');
      const eviction = await this.evictionScraper.scrapeAll();
      allLeads['eviction'] = eviction;
      console.log(`✓ Found ${eviction.length} eviction leads`);
      await this.delay(2000);

      // 6. Code Violation
      console.log('\n[6/11] Scraping CODE VIOLATION leads...');
      const codeViolation = await this.codeViolationScraper.scrapeAll();
      allLeads['code-violation'] = codeViolation;
      console.log(`✓ Found ${codeViolation.length} code violation leads`);
      await this.delay(2000);

      // 7. Fire Damage
      console.log('\n[7/11] Scraping FIRE DAMAGE leads...');
      const fireDamage = await this.fireDamageScraper.scrapeAll();
      allLeads['fire-damage'] = fireDamage;
      console.log(`✓ Found ${fireDamage.length} fire damage leads`);
      await this.delay(2000);

      // 8. Water Shutoff
      console.log('\n[8/11] Scraping WATER SHUTOFF leads...');
      const waterShutoff = await this.waterShutoffScraper.scrapeAll();
      allLeads['water-shutoff'] = waterShutoff;
      console.log(`✓ Found ${waterShutoff.length} water shutoff leads`);
      await this.delay(2000);

      // 9. Divorce
      console.log('\n[9/11] Scraping DIVORCE leads...');
      const divorce = await this.divorceScraper.scrapeAll();
      allLeads['divorce'] = divorce;
      console.log(`✓ Found ${divorce.length} divorce leads`);
      await this.delay(2000);

      // 10. Bankruptcy
      console.log('\n[10/11] Scraping BANKRUPTCY leads...');
      const bankruptcy = await this.bankruptcyScraper.scrapeAll();
      allLeads['bankruptcy'] = bankruptcy;
      console.log(`✓ Found ${bankruptcy.length} bankruptcy leads`);
      await this.delay(2000);

      // 11. Obituary
      console.log('\n[11/11] Scraping OBITUARY leads...');
      const obituary = await this.obituaryScraper.scrapeAll();
      allLeads['obituary'] = obituary;
      console.log(`✓ Found ${obituary.length} obituary leads`);

      // Summary
      const totalLeads = Object.values(allLeads).reduce((sum, arr) => sum + arr.length, 0);
      console.log('\n' + '='.repeat(80));
      console.log(`SCRAPING SUMMARY: ${totalLeads} total leads collected`);
      console.log('='.repeat(80));

      // Enrich and export
      console.log('\nEnriching leads with property data...');
      await this.enrichAndExport(allLeads);

      console.log(`\nCompleted at: ${new Date().toISOString()}`);
      return allLeads;
    } catch (error) {
      console.error('Fatal error during scraping:', error);
      throw error;
    }
  }

  /**
   * Enrich all leads and export to CSV
   */
  private async enrichAndExport(allLeads: ScrapedLeads): Promise<void> {
    const dataDir = path.join(process.cwd(), 'data', 'exports');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const counties = ['Horry', 'Georgetown', 'Marion'];
    const timestamp = new Date().toISOString().split('T')[0];

    // Export by lead type
    for (const [leadType, leads] of Object.entries(allLeads)) {
      if (leads.length === 0) continue;

      const csv = this.convertToCSV(leads);
      const filename = path.join(dataDir, `${leadType}-leads-${timestamp}.csv`);
      fs.writeFileSync(filename, csv);
      console.log(`✓ Exported ${leads.length} ${leadType} leads to ${filename}`);
    }

    // Export by county
    for (const county of counties) {
      const countyLeads: any[] = [];
      
      for (const leads of Object.values(allLeads)) {
        const filtered = leads.filter(lead => lead.county === county);
        countyLeads.push(...filtered);
      }

      if (countyLeads.length > 0) {
        const csv = this.convertToCSV(countyLeads);
        const filename = path.join(dataDir, `${county.toLowerCase()}-county-all-leads-${timestamp}.csv`);
        fs.writeFileSync(filename, csv);
        console.log(`✓ Exported ${countyLeads.length} leads for ${county} County to ${filename}`);
      }
    }

    // Export combined
    const allCombined: any[] = [];
    for (const leads of Object.values(allLeads)) {
      allCombined.push(...leads);
    }

    if (allCombined.length > 0) {
      const csv = this.convertToCSV(allCombined);
      const filename = path.join(dataDir, `all-leads-combined-${timestamp}.csv`);
      fs.writeFileSync(filename, csv);
      console.log(`✓ Exported ${allCombined.length} combined leads to ${filename}`);
    }
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
      lead.leadType || '',
      (lead.ownerName || 'Unknown').replace(/"/g, '""'),
      (lead.address || '').replace(/"/g, '""'),
      lead.city || '',
      lead.state || 'SC',
      lead.zip || '',
      (lead.mailingAddress || '').replace(/"/g, '""'),
      lead.mailingCity || '',
      lead.mailingState || 'SC',
      lead.mailingZip || '',
      lead.county || '',
      lead.caseNumber || '',
      lead.filingDate || '',
      lead.assessedValue || 0,
      lead.taxYear || new Date().getFullYear(),
      (lead.lender || '').replace(/"/g, '""'),
      lead.loanAmount || 0,
      lead.saleDate || '',
      lead.saleAmount || 0,
      `"${(lead.description || '').replace(/"/g, '""')}"`,
      lead.sourceUrl || '',
      lead.status || 'new'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new ComprehensiveScraper();
  
  scraper.runAll()
    .then(() => {
      console.log('\n✓ All scraping and export completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default ComprehensiveScraper;
