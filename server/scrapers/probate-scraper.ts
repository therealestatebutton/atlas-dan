import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface ProbateLead {
  caseNumber: string;
  estateName: string;
  deceasedName: string;
  filingDate: string;
  county: string;
  propertyDescription?: string;
  sourceUrl: string;
}

export class ProbateScraper {
  private readonly probateSearchUrl = 'https://www.southcarolinaprobate.net/search/';
  private readonly counties = ['Horry', 'Georgetown', 'Marion'];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search probate records for a county
   */
  async searchCounty(county: string): Promise<ProbateLead[]> {
    try {
      console.log(`Searching probate records for ${county} County...`);

      const response = await axios.get(this.probateSearchUrl, {
        params: {
          county: county,
          sort: 'filing_date',
          order: 'desc'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data, county);
      console.log(`Found ${leads.length} probate cases for ${county} County`);

      return leads;
    } catch (error) {
      console.error(`Error searching probate records for ${county}:`, error);
      return [];
    }
  }

  /**
   * Parse probate search results
   */
  private parseResults(html: string, county: string): ProbateLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: ProbateLead[] = [];

      // Parse probate cases table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const caseNumber = $(cells[0]).text().trim();
          const estateName = $(cells[1]).text().trim();
          const deceasedName = $(cells[2]).text().trim();
          const filingDateText = $(cells[3]).text().trim();

          if (caseNumber && estateName && deceasedName) {
            leads.push({
              caseNumber,
              estateName,
              deceasedName,
              filingDate: this.parseDate(filingDateText),
              county,
              sourceUrl: this.probateSearchUrl
            });
          }
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing probate results:', error);
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
  async scrapeAll(): Promise<ProbateLead[]> {
    const allLeads: ProbateLead[] = [];

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
  convertToLead(probate: ProbateLead, enrichmentData?: any): Lead {
    return {
      id: `PROB-${probate.caseNumber}`,
      leadType: 'probate',
      ownerName: enrichmentData?.ownerName || probate.deceasedName,
      address: enrichmentData?.address || probate.propertyDescription || '',
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || '',
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: probate.county,
      caseNumber: probate.caseNumber,
      filingDate: probate.filingDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Estate probate filing. Deceased: ${probate.deceasedName}. Estate: ${probate.estateName}`,
      sourceUrl: probate.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default ProbateScraper;
