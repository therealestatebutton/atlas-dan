import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface WaterShutoffLead {
  address: string;
  accountHolder: string;
  shutoffDate: string;
  amountOwed: number;
  county: string;
  utilityCompany: string;
  sourceUrl: string;
}

export class WaterShutoffScraper {
  private readonly countyUrls: Record<string, string> = {
    'Horry': 'https://www.horrycountysc.gov/departments/utilities/',
    'Georgetown': 'https://www.gtcountysc.gov/',
    'Marion': 'https://www.marionsc.org/departments/water-sewer/'
  };

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for water shutoff accounts
   */
  async searchCounty(county: string): Promise<WaterShutoffLead[]> {
    try {
      console.log(`Searching water shutoff accounts for ${county} County...`);

      const url = this.countyUrls[county];
      if (!url) {
        console.warn(`No water utility URL configured for ${county} County`);
        return [];
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data, county, url);
      console.log(`Found ${leads.length} water shutoff accounts for ${county} County`);

      return leads;
    } catch (error) {
      console.error(`Error searching water shutoffs for ${county}:`, error);
      return [];
    }
  }

  /**
   * Parse water shutoff search results
   */
  private parseResults(html: string, county: string, sourceUrl: string): WaterShutoffLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: WaterShutoffLead[] = [];

      // Parse delinquent accounts table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const address = $(cells[0]).text().trim();
          const accountHolder = $(cells[1]).text().trim();
          const amountOwedText = $(cells[2]).text().trim();
          const shutoffDateText = $(cells[3]).text().trim();

          const amountOwed = parseFloat(amountOwedText.replace(/[$,]/g, '')) || 0;

          if (address && accountHolder && amountOwed > 0) {
            leads.push({
              address,
              accountHolder,
              shutoffDate: this.parseDate(shutoffDateText),
              amountOwed,
              county,
              utilityCompany: `${county} County Water Department`,
              sourceUrl
            });
          }
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing water shutoff results:', error);
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
  async scrapeAll(): Promise<WaterShutoffLead[]> {
    const allLeads: WaterShutoffLead[] = [];
    const counties = Object.keys(this.countyUrls);

    for (const county of counties) {
      const leads = await this.searchCounty(county);
      allLeads.push(...leads);
      await this.delay(3000);
    }

    return allLeads;
  }

  /**
   * Convert to Lead object
   */
  convertToLead(water: WaterShutoffLead, enrichmentData?: any): Lead {
    return {
      id: `WATER-${water.county}-${Math.random().toString(36).substr(2, 9)}`,
      leadType: 'water-shutoff',
      ownerName: enrichmentData?.ownerName || water.accountHolder,
      address: enrichmentData?.address || water.address,
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || water.address,
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: water.county,
      caseNumber: `WATER-${water.county}-${water.shutoffDate}`,
      filingDate: water.shutoffDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: water.utilityCompany,
      loanAmount: water.amountOwed,
      saleDate: '',
      saleAmount: 0,
      description: `Water service shutoff for non-payment. Amount owed: $${water.amountOwed.toFixed(2)}. Shutoff date: ${water.shutoffDate}`,
      sourceUrl: water.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default WaterShutoffScraper;
