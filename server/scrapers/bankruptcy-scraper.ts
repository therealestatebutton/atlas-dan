import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface BankruptcyLead {
  caseNumber: string;
  debtorName: string;
  filingDate: string;
  county: string;
  caseChapter: string;
  propertyAddresses?: string[];
  sourceUrl: string;
}

export class BankruptcyScraper {
  private readonly pacerUrl = 'https://www.pacer.uscourts.gov/';
  private readonly counties = [
    { name: 'Horry', code: 'SC' },
    { name: 'Georgetown', code: 'SC' },
    { name: 'Marion', code: 'SC' }
  ];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for bankruptcy cases in a county
   */
  async searchCounty(county: { name: string; code: string }): Promise<BankruptcyLead[]> {
    try {
      console.log(`Searching bankruptcy records for ${county.name} County...`);

      // Note: PACER requires authentication and fees. This is a placeholder for the API structure.
      // In production, you would need to set up PACER account and API credentials.
      const response = await axios.get(this.pacerUrl, {
        params: {
          county: county.name,
          state: county.code,
          sort: 'filing_date',
          order: 'desc'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data, county.name);
      console.log(`Found ${leads.length} bankruptcy cases for ${county.name} County`);

      return leads;
    } catch (error) {
      console.error(`Error searching bankruptcy records for ${county.name}:`, error);
      return [];
    }
  }

  /**
   * Parse bankruptcy search results
   */
  private parseResults(html: string, county: string): BankruptcyLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: BankruptcyLead[] = [];

      // Parse bankruptcy cases table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 5) {
          const caseNumber = $(cells[0]).text().trim();
          const debtorName = $(cells[1]).text().trim();
          const filingDateText = $(cells[2]).text().trim();
          const caseChapter = $(cells[3]).text().trim();

          if (caseNumber && debtorName) {
            leads.push({
              caseNumber,
              debtorName,
              filingDate: this.parseDate(filingDateText),
              county,
              caseChapter: caseChapter || 'Unknown',
              sourceUrl: this.pacerUrl
            });
          }
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing bankruptcy results:', error);
      return [];
    }
  }

  /**
   * Parse date string
   */
  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Scrape all counties
   */
  async scrapeAll(): Promise<BankruptcyLead[]> {
    const allLeads: BankruptcyLead[] = [];

    for (const county of this.counties) {
      const leads = await this.searchCounty(county);
      allLeads.push(...leads);
      await this.delay(3000);
    }

    return allLeads;
  }

  /**
   * Convert to Lead object
   */
  convertToLead(bankruptcy: BankruptcyLead, enrichmentData?: any): Lead {
    return {
      id: `BK-${bankruptcy.caseNumber}`,
      leadType: 'bankruptcy',
      ownerName: enrichmentData?.ownerName || bankruptcy.debtorName,
      address: enrichmentData?.address || (bankruptcy.propertyAddresses?.[0] || ''),
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || '',
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: bankruptcy.county,
      caseNumber: bankruptcy.caseNumber,
      filingDate: bankruptcy.filingDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: 'Bankruptcy Court',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Bankruptcy filing - ${bankruptcy.caseChapter}. Debtor: ${bankruptcy.debtorName}. Property may be liquidated.`,
      sourceUrl: bankruptcy.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default BankruptcyScraper;
