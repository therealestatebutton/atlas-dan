import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface ObituaryLead {
  deceasedName: string;
  deathDate: string;
  county: string;
  propertyAddress?: string;
  familyInfo?: string;
  sourceUrl: string;
  estateStatus?: string;
}

export class ObituaryScraper {
  private readonly legacyUrl = 'https://www.legacy.com/us/obituaries/south-carolina';
  private readonly countyKeywords: Record<string, string[]> = {
    'Horry': ['myrtle beach', 'north myrtle beach', 'surfside beach', 'horry county'],
    'Georgetown': ['georgetown', 'pawleys island', 'murrells inlet', 'georgetown county'],
    'Marion': ['marion', 'mullins', 'marion county']
  };

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for obituaries
   */
  async searchAll(): Promise<ObituaryLead[]> {
    try {
      console.log('Searching obituaries...');

      const response = await axios.get(this.legacyUrl, {
        params: {
          sort: 'date',
          order: 'desc'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const leads = this.parseResults(response.data);
      console.log(`Found ${leads.length} obituaries`);

      return leads;
    } catch (error) {
      console.error('Error searching obituaries:', error);
      return [];
    }
  }

  /**
   * Parse obituary search results
   */
  private parseResults(html: string): ObituaryLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: ObituaryLead[] = [];

      // Parse obituary listings
      $('article, .obituary, .obit-item').each((index, element) => {
        const nameEl = $(element).find('h2, h3, .name, .deceased-name');
        const deceasedName = nameEl.text().trim();

        const dateEl = $(element).find('time, .date, .death-date');
        const deathDateStr = dateEl.attr('datetime') || dateEl.text().trim();

        const contentEl = $(element).find('.content, .summary, .description, p');
        const content = contentEl.text().trim();

        // Determine county
        const county = this.determineCounty(content + ' ' + deceasedName);

        if (deceasedName && county) {
          leads.push({
            deceasedName,
            deathDate: this.parseDate(deathDateStr),
            county,
            familyInfo: content.substring(0, 200),
            sourceUrl: this.legacyUrl,
            estateStatus: 'Pending'
          });
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing obituary results:', error);
      return [];
    }
  }

  /**
   * Determine county from text
   */
  private determineCounty(text: string): string | null {
    const lowerText = text.toLowerCase();

    for (const [county, keywords] of Object.entries(this.countyKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return county;
        }
      }
    }

    return null;
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
   * Convert to Lead object
   */
  convertToLead(obituary: ObituaryLead, enrichmentData?: any): Lead {
    return {
      id: `OBT-${obituary.county}-${Math.random().toString(36).substr(2, 9)}`,
      leadType: 'obituary',
      ownerName: enrichmentData?.ownerName || obituary.deceasedName,
      address: enrichmentData?.address || obituary.propertyAddress || '',
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || '',
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: obituary.county,
      caseNumber: `OBT-${obituary.county}-${obituary.deathDate}`,
      filingDate: obituary.deathDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Obituary - ${obituary.deceasedName} passed away on ${obituary.deathDate}. Estate status: ${obituary.estateStatus}. ${obituary.familyInfo || ''}`,
      sourceUrl: obituary.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default ObituaryScraper;
