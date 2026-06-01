import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface DivorceLead {
  caseNumber: string;
  party1: string;
  party2: string;
  filingDate: string;
  county: string;
  propertyAddresses?: string[];
  sourceUrl: string;
}

export class DivorceScraper {
  private readonly judicialIndexUrl = 'https://portal.fccms.dss.sc.gov/';
  private readonly counties = [
    { name: 'Horry', code: '26' },
    { name: 'Georgetown', code: '25' },
    { name: 'Marion', code: '30' }
  ];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for divorce cases in a county
   */
  async searchCounty(county: { name: string; code: string }): Promise<DivorceLead[]> {
    try {
      console.log(`Searching divorce records for ${county.name} County...`);

      const response = await axios.get(this.judicialIndexUrl, {
        params: {
          county: county.code,
          caseType: 'divorce',
          sort: 'filing_date',
          order: 'desc'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data, county.name);
      console.log(`Found ${leads.length} divorce cases for ${county.name} County`);

      return leads;
    } catch (error) {
      console.error(`Error searching divorce records for ${county.name}:`, error);
      return [];
    }
  }

  /**
   * Parse divorce search results
   */
  private parseResults(html: string, county: string): DivorceLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: DivorceLead[] = [];

      // Parse divorce cases table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const caseNumber = $(cells[0]).text().trim();
          const party1 = $(cells[1]).text().trim();
          const party2 = $(cells[2]).text().trim();
          const filingDateText = $(cells[3]).text().trim();

          if (caseNumber && party1 && party2) {
            leads.push({
              caseNumber,
              party1,
              party2,
              filingDate: this.parseDate(filingDateText),
              county,
              sourceUrl: this.judicialIndexUrl
            });
          }
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing divorce results:', error);
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
  async scrapeAll(): Promise<DivorceLead[]> {
    const allLeads: DivorceLead[] = [];

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
  convertToLead(divorce: DivorceLead, enrichmentData?: any): Lead {
    return {
      id: `DIV-${divorce.caseNumber}`,
      leadType: 'divorce',
      ownerName: enrichmentData?.ownerName || divorce.party1,
      address: enrichmentData?.address || (divorce.propertyAddresses?.[0] || ''),
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || '',
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: divorce.county,
      caseNumber: divorce.caseNumber,
      filingDate: divorce.filingDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Divorce case filed. Parties: ${divorce.party1} vs ${divorce.party2}. Property division may result in sale.`,
      sourceUrl: divorce.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default DivorceScraper;
