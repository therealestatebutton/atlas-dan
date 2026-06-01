import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface EvictionLead {
  caseNumber: string;
  defendantName: string;
  address: string;
  filingDate: string;
  county: string;
  plaintiffName?: string;
  sourceUrl: string;
}

export class EvictionScraper {
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
   * Search for eviction cases in a county
   */
  async searchCounty(county: { name: string; code: string }): Promise<EvictionLead[]> {
    try {
      console.log(`Searching eviction records for ${county.name} County...`);

      const response = await axios.get(this.judicialIndexUrl, {
        params: {
          county: county.code,
          caseType: 'eviction',
          sort: 'filing_date',
          order: 'desc'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data, county.name);
      console.log(`Found ${leads.length} eviction cases for ${county.name} County`);

      return leads;
    } catch (error) {
      console.error(`Error searching eviction records for ${county.name}:`, error);
      return [];
    }
  }

  /**
   * Parse eviction search results
   */
  private parseResults(html: string, county: string): EvictionLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: EvictionLead[] = [];

      // Parse eviction cases table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const caseNumber = $(cells[0]).text().trim();
          const defendantName = $(cells[1]).text().trim();
          const address = $(cells[2]).text().trim();
          const filingDateText = $(cells[3]).text().trim();

          if (caseNumber && defendantName && address) {
            leads.push({
              caseNumber,
              defendantName,
              address,
              filingDate: this.parseDate(filingDateText),
              county,
              sourceUrl: this.judicialIndexUrl
            });
          }
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing eviction results:', error);
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
  async scrapeAll(): Promise<EvictionLead[]> {
    const allLeads: EvictionLead[] = [];

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
  convertToLead(eviction: EvictionLead, enrichmentData?: any): Lead {
    return {
      id: `EVICT-${eviction.caseNumber}`,
      leadType: 'eviction',
      ownerName: enrichmentData?.ownerName || eviction.plaintiffName || 'Unknown',
      address: enrichmentData?.address || eviction.address,
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || eviction.address,
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: eviction.county,
      caseNumber: eviction.caseNumber,
      filingDate: eviction.filingDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Eviction notice filed against ${eviction.defendantName}. Property: ${eviction.address}`,
      sourceUrl: eviction.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default EvictionScraper;
