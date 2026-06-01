import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface CodeViolationLead {
  violationType: string;
  address: string;
  violationDate: string;
  county: string;
  severity: string;
  caseNumber?: string;
  sourceUrl: string;
}

export class CodeViolationScraper {
  private readonly countyUrls: Record<string, string> = {
    'Horry': 'https://www.horrycountysc.gov/departments/code-enforcement/',
    'Georgetown': 'https://www.gtcountysc.gov/',
    'Marion': 'https://www.marionsc.org/'
  };

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for code violations in a county
   */
  async searchCounty(county: string): Promise<CodeViolationLead[]> {
    try {
      console.log(`Searching code violations for ${county} County...`);

      const url = this.countyUrls[county];
      if (!url) {
        console.warn(`No code enforcement URL configured for ${county} County`);
        return [];
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data, county, url);
      console.log(`Found ${leads.length} code violations for ${county} County`);

      return leads;
    } catch (error) {
      console.error(`Error searching code violations for ${county}:`, error);
      return [];
    }
  }

  /**
   * Parse code violation search results
   */
  private parseResults(html: string, county: string, sourceUrl: string): CodeViolationLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: CodeViolationLead[] = [];

      // Parse violations table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const address = $(cells[0]).text().trim();
          const violationType = $(cells[1]).text().trim();
          const violationDateText = $(cells[2]).text().trim();
          const severity = $(cells[3]).text().trim() || 'Unknown';

          if (address && violationType) {
            leads.push({
              violationType,
              address,
              violationDate: this.parseDate(violationDateText),
              county,
              severity,
              sourceUrl
            });
          }
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing code violation results:', error);
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
  async scrapeAll(): Promise<CodeViolationLead[]> {
    const allLeads: CodeViolationLead[] = [];
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
  convertToLead(violation: CodeViolationLead, enrichmentData?: any): Lead {
    return {
      id: `CODE-${violation.county}-${Math.random().toString(36).substr(2, 9)}`,
      leadType: 'code-violation',
      ownerName: enrichmentData?.ownerName || 'Unknown',
      address: enrichmentData?.address || violation.address,
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || violation.address,
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: violation.county,
      caseNumber: violation.caseNumber || `CODE-${violation.county}-${violation.violationDate}`,
      filingDate: violation.violationDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Code violation: ${violation.violationType}. Severity: ${violation.severity}. Date: ${violation.violationDate}`,
      sourceUrl: violation.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default CodeViolationScraper;
