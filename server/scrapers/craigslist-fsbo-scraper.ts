import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface CraigslistListing {
  title: string;
  url: string;
  price: number;
  location: string;
  postedDate: string;
  description: string;
  county: string;
}

export class CraigslistFSBOScraper {
  private readonly charlestonUrl = 'https://charleston.craigslist.org/search/apa';
  private readonly countyKeywords: Record<string, string[]> = {
    'Horry': ['myrtle beach', 'north myrtle beach', 'surfside beach', 'horry county'],
    'Georgetown': ['georgetown', 'pawleys island', 'murrells inlet'],
    'Marion': ['marion', 'mullins', 'marion county']
  };

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape Craigslist for FSBO listings
   */
  async scrapeAll(): Promise<CraigslistListing[]> {
    try {
      console.log('Scraping Craigslist for FSBO listings...');

      const response = await axios.get(this.charlestonUrl, {
        params: {
          query: 'for sale by owner',
          sort: 'date'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const listings = this.parseListings(response.data);
      console.log(`Found ${listings.length} FSBO listings`);

      return listings;
    } catch (error) {
      console.error('Error scraping Craigslist:', error);
      return [];
    }
  }

  /**
   * Parse Craigslist listings
   */
  private parseListings(html: string): CraigslistListing[] {
    try {
      const $ = cheerio.load(html);
      const listings: CraigslistListing[] = [];

      $('ol.rows li.cl-static-search-result').each((index, element) => {
        const titleEl = $(element).find('a.titlestring');
        const title = titleEl.text().trim();
        const url = titleEl.attr('href') || '';
        
        const priceEl = $(element).find('span.priceinfo');
        const priceText = priceEl.text().trim();
        const price = parseFloat(priceText.replace(/[$,]/g, '')) || 0;

        const locationEl = $(element).find('span.l2');
        const location = locationEl.text().trim();

        const dateEl = $(element).find('time');
        const postedDate = dateEl.attr('datetime') || new Date().toISOString();

        if (title && url && price > 0) {
          // Determine county based on location
          const county = this.determineCounty(location);

          if (county) {
            listings.push({
              title,
              url,
              price,
              location,
              postedDate,
              description: title,
              county
            });
          }
        }
      });

      return listings;
    } catch (error) {
      console.error('Error parsing Craigslist listings:', error);
      return [];
    }
  }

  /**
   * Determine county from location string
   */
  private determineCounty(location: string): string | null {
    const lowerLocation = location.toLowerCase();

    for (const [county, keywords] of Object.entries(this.countyKeywords)) {
      for (const keyword of keywords) {
        if (lowerLocation.includes(keyword)) {
          return county;
        }
      }
    }

    return null;
  }

  /**
   * Get listing details
   */
  async getListingDetails(url: string): Promise<{ description: string; contact?: string }> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const description = $('#postingbody').text().trim();
      const contact = $('a[href^="mailto:"]').text().trim();

      return { description, contact };
    } catch (error) {
      console.error('Error getting listing details:', error);
      return { description: '' };
    }
  }

  /**
   * Convert Craigslist listing to Lead
   */
  convertToLead(listing: CraigslistListing, enrichmentData?: any): Lead {
    return {
      id: `FSBO-${listing.county}-${Math.random().toString(36).substr(2, 9)}`,
      leadType: 'fsbo',
      ownerName: enrichmentData?.ownerName || 'Unknown',
      address: enrichmentData?.address || listing.location,
      city: enrichmentData?.city || this.extractCity(listing.location),
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || listing.location,
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || this.extractCity(listing.location),
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: listing.county,
      caseNumber: `CRAIGSLIST-${listing.county}-${new Date().getTime()}`,
      filingDate: listing.postedDate.split('T')[0],
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear(),
      lender: '',
      loanAmount: 0,
      saleDate: '',
      saleAmount: listing.price,
      description: `For Sale By Owner - Craigslist listing. ${listing.description}`,
      sourceUrl: listing.url,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Extract city from location string
   */
  private extractCity(location: string): string {
    const parts = location.split(',');
    return parts[0]?.trim() || '';
  }
}

export default CraigslistFSBOScraper;
