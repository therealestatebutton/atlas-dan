import axios from 'axios';
import * as cheerio from 'cheerio';

export interface PropertyRecord {
  ownerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  assessedValue: number;
  parcelNumber: string;
  legalDescription: string;
  county: string;
}

export class QPublicEnricher {
  private readonly countyUrls: Record<string, string> = {
    'Horry': 'https://www.qpublic.net/sc/horry/search.html',
    'Georgetown': 'https://www.qpublic.net/sc/georgetown/search.html',
    'Marion': 'https://www.qpublic.net/sc/marion/search.html'
  };

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search for property by owner name
   */
  async searchByOwner(ownerName: string, county: string): Promise<PropertyRecord[]> {
    try {
      const url = this.countyUrls[county];
      if (!url) {
        console.warn(`No qPublic URL configured for ${county} County`);
        return [];
      }

      console.log(`Searching qPublic for ${ownerName} in ${county} County...`);

      const response = await axios.get(url, {
        params: {
          mode: 'namesubmit',
          name: ownerName,
          nametype: 'contains'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      return this.parseSearchResults(response.data, county);
    } catch (error) {
      console.error(`Error searching qPublic for ${ownerName}:`, error);
      return [];
    }
  }

  /**
   * Search for property by address
   */
  async searchByAddress(address: string, county: string): Promise<PropertyRecord[]> {
    try {
      const url = this.countyUrls[county];
      if (!url) {
        console.warn(`No qPublic URL configured for ${county} County`);
        return [];
      }

      console.log(`Searching qPublic for address ${address} in ${county} County...`);

      const response = await axios.get(url, {
        params: {
          mode: 'addresssubmit',
          address: address,
          addresstype: 'contains'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      return this.parseSearchResults(response.data, county);
    } catch (error) {
      console.error(`Error searching qPublic for address ${address}:`, error);
      return [];
    }
  }

  /**
   * Parse search results from qPublic
   */
  private parseSearchResults(html: string, county: string): PropertyRecord[] {
    try {
      const $ = cheerio.load(html);
      const records: PropertyRecord[] = [];

      // Parse results table
      $('table tbody tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          const ownerName = $(cells[0]).text().trim();
          const address = $(cells[1]).text().trim();
          const parcelNumber = $(cells[2]).text().trim();
          const assessedValueText = $(cells[3]).text().trim();
          const assessedValue = parseFloat(assessedValueText.replace(/[$,]/g, '')) || 0;

          if (ownerName && address) {
            const [city, state, zip] = this.parseAddress(address);
            records.push({
              ownerName,
              address,
              city,
              state,
              zip,
              assessedValue,
              parcelNumber,
              legalDescription: '',
              county
            });
          }
        }
      });

      console.log(`Found ${records.length} property records from qPublic`);
      return records;
    } catch (error) {
      console.error('Error parsing qPublic results:', error);
      return [];
    }
  }

  /**
   * Parse address into components
   */
  private parseAddress(address: string): [string, string, string] {
    // Simple parsing - can be improved
    const parts = address.split(',').map(p => p.trim());
    
    if (parts.length >= 3) {
      return [parts[1], parts[2].split(' ')[0], parts[2].split(' ')[1] || ''];
    }
    
    return ['', 'SC', ''];
  }

  /**
   * Enrich lead data with property information
   */
  async enrichLead(lead: any): Promise<any> {
    try {
      // Try to find property by owner name first
      let properties = await this.searchByOwner(lead.ownerName, lead.county);

      // If no results, try by address
      if (properties.length === 0 && lead.address) {
        properties = await this.searchByAddress(lead.address, lead.county);
      }

      // Return best match
      if (properties.length > 0) {
        const property = properties[0];
        return {
          ...lead,
          ownerName: property.ownerName,
          address: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip,
          assessedValue: property.assessedValue,
          parcelNumber: property.parcelNumber,
          enriched: true
        };
      }

      return {
        ...lead,
        enriched: false
      };
    } catch (error) {
      console.error('Error enriching lead:', error);
      return {
        ...lead,
        enriched: false
      };
    }
  }

  /**
   * Batch enrich multiple leads
   */
  async enrichLeads(leads: any[]): Promise<any[]> {
    const enrichedLeads: any[] = [];

    for (const lead of leads) {
      const enriched = await this.enrichLead(lead);
      enrichedLeads.push(enriched);
      
      // Respect rate limits
      await this.delay(2000);
    }

    return enrichedLeads;
  }
}

export default QPublicEnricher;
