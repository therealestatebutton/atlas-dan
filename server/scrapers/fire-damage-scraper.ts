import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface FireDamageLead {
  address: string;
  damageDate: string;
  damageType: string;
  county: string;
  severity: string;
  sourceUrl: string;
  propertyOwner?: string;
}

export class FireDamageScraper {
  private readonly newsUrls: Record<string, string[]> = {
    'Horry': [
      'https://www.myrtlebeachonline.com/search/?q=fire+damage',
      'https://www.wbtw.com/search/?q=fire+damage+horry'
    ],
    'Georgetown': [
      'https://www.georgetownindependent.com/search/?q=fire+damage'
    ],
    'Marion': [
      'https://www.marionstar.com/search/?q=fire+damage'
    ]
  };

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for fire damage incidents
   */
  async searchCounty(county: string): Promise<FireDamageLead[]> {
    try {
      console.log(`Searching fire damage incidents for ${county} County...`);

      const urls = this.newsUrls[county] || [];
      const allLeads: FireDamageLead[] = [];

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
          });

          const leads = this.parseResults(response.data, county, url);
          allLeads.push(...leads);
          await this.delay(2000);
        } catch (error) {
          console.error(`Error searching ${url}:`, error);
        }
      }

      console.log(`Found ${allLeads.length} fire damage incidents for ${county} County`);
      return allLeads;
    } catch (error) {
      console.error(`Error searching fire damage for ${county}:`, error);
      return [];
    }
  }

  /**
   * Parse fire damage search results from news sites
   */
  private parseResults(html: string, county: string, sourceUrl: string): FireDamageLead[] {
    try {
      const $ = cheerio.load(html);
      const leads: FireDamageLead[] = [];

      // Parse news articles
      $('article, .article, .news-item').each((index, element) => {
        const titleEl = $(element).find('h2, h3, .headline, .title');
        const title = titleEl.text().trim();

        const dateEl = $(element).find('time, .date, .publish-date');
        const dateStr = dateEl.attr('datetime') || dateEl.text().trim();

        const contentEl = $(element).find('.content, .summary, p');
        const content = contentEl.text().trim();

        // Extract address from content
        const address = this.extractAddress(content);

        if (title.toLowerCase().includes('fire') && address) {
          leads.push({
            address,
            damageDate: this.parseDate(dateStr),
            damageType: 'Fire',
            county,
            severity: this.determineSeverity(title + ' ' + content),
            sourceUrl
          });
        }
      });

      return leads;
    } catch (error) {
      console.error('Error parsing fire damage results:', error);
      return [];
    }
  }

  /**
   * Extract address from text
   */
  private extractAddress(text: string): string | null {
    // Simple regex to find addresses (Street Number + Street Name)
    const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd)/i);
    return addressMatch ? addressMatch[0] : null;
  }

  /**
   * Determine severity from text
   */
  private determineSeverity(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('destroyed') || lowerText.includes('total loss')) {
      return 'Severe';
    } else if (lowerText.includes('significant') || lowerText.includes('major')) {
      return 'Major';
    } else if (lowerText.includes('minor') || lowerText.includes('partial')) {
      return 'Minor';
    }
    return 'Unknown';
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
  async scrapeAll(): Promise<FireDamageLead[]> {
    const allLeads: FireDamageLead[] = [];
    const counties = Object.keys(this.newsUrls);

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
  convertToLead(fire: FireDamageLead, enrichmentData?: any): Lead {
    return {
      id: `FIRE-${fire.county}-${Math.random().toString(36).substr(2, 9)}`,
      leadType: 'fire-damage',
      ownerName: enrichmentData?.ownerName || fire.propertyOwner || 'Unknown',
      address: enrichmentData?.address || fire.address,
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || fire.address,
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: fire.county,
      caseNumber: `FIRE-${fire.county}-${fire.damageDate}`,
      filingDate: fire.damageDate,
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: 0,
      description: `Fire damage incident. Severity: ${fire.severity}. Date: ${fire.damageDate}. Type: ${fire.damageType}`,
      sourceUrl: fire.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default FireDamageScraper;
