import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface ForeclosureLead {
  caseNumber: string;
  saleDate: string;
  propertyDescription: string;
  county: string;
  sourceUrl: string;
  filingDate?: string;
  lender?: string;
}

export class ForeclosureScraper {
  private readonly counties = [
    {
      name: 'Horry',
      url: 'https://www.horrycountysc.gov/departments/master-in-equity/principal-sales/',
      selector: 'table tbody tr'
    },
    {
      name: 'Georgetown',
      url: 'https://www.gtcountysc.gov/223/Foreclosure-Sales',
      selector: 'table tbody tr'
    },
    {
      name: 'Marion',
      url: 'https://www.marioncountyclerk.org/foreclosure-sales-2/',
      selector: 'table tbody tr'
    }
  ];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeCounty(county: { name: string; url: string; selector: string }): Promise<ForeclosureLead[]> {
    try {
      console.log(`Scraping foreclosure data for ${county.name} County...`);
      
      const response = await axios.get(county.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const leads: ForeclosureLead[] = [];

      // Parse foreclosure sales table
      $(county.selector).each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 3) {
          const caseNumber = $(cells[0]).text().trim();
          const saleDate = $(cells[1]).text().trim();
          const propertyDescription = $(cells[2]).text().trim();

          if (caseNumber && saleDate && propertyDescription) {
            leads.push({
              caseNumber,
              saleDate,
              propertyDescription,
              county: county.name,
              sourceUrl: county.url,
              filingDate: new Date().toISOString().split('T')[0]
            });
          }
        }
      });

      console.log(`Found ${leads.length} foreclosure leads for ${county.name} County`);
      return leads;
    } catch (error) {
      console.error(`Error scraping ${county.name} County foreclosures:`, error);
      return [];
    }
  }

  async scrapeAll(): Promise<ForeclosureLead[]> {
    const allLeads: ForeclosureLead[] = [];

    for (const county of this.counties) {
      const leads = await this.scrapeCounty(county);
      allLeads.push(...leads);
      
      // Respect rate limits
      await this.delay(3000);
    }

    return allLeads;
  }

  convertToLead(foreclosure: ForeclosureLead, enrichmentData?: any): Lead {
    return {
      id: `FC-${foreclosure.caseNumber}`,
      leadType: 'foreclosure',
      ownerName: enrichmentData?.ownerName || 'Unknown',
      address: enrichmentData?.address || foreclosure.propertyDescription,
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || '',
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: foreclosure.county,
      caseNumber: foreclosure.caseNumber,
      filingDate: foreclosure.filingDate || new Date().toISOString().split('T')[0],
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: new Date().getFullYear() - 1,
      lender: foreclosure.lender || 'Unknown',
      loanAmount: enrichmentData?.loanAmount || 0,
      saleDate: foreclosure.saleDate,
      saleAmount: 0,
      description: `Foreclosure sale scheduled. ${foreclosure.propertyDescription}`,
      sourceUrl: foreclosure.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default ForeclosureScraper;
