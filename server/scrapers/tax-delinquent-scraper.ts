import axios from 'axios';
import * as cheerio from 'cheerio';
import { Lead } from '../types/index.js';

interface TaxDelinquentLead {
  propertyDescription: string;
  taxAmount: number;
  delinquentYear: number;
  county: string;
  sourceUrl: string;
  parcelNumber?: string;
  ownerName?: string;
}

export class TaxDelinquentScraper {
  private readonly counties = [
    {
      name: 'Horry',
      url: 'https://www.horrycountysc.gov/departments/tax-collector/',
      selector: 'table tbody tr'
    },
    {
      name: 'Georgetown',
      url: 'https://www.gtcountysc.gov/',
      selector: 'table tbody tr'
    },
    {
      name: 'Marion',
      url: 'https://www.marionsc.org/departments/tax_collector/tax_sale_information/index.php',
      selector: 'table tbody tr'
    }
  ];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeCounty(county: { name: string; url: string; selector: string }): Promise<TaxDelinquentLead[]> {
    try {
      console.log(`Scraping tax delinquent data for ${county.name} County...`);
      
      const response = await axios.get(county.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const leads: TaxDelinquentLead[] = [];

      // Parse tax delinquent sales table
      $(county.selector).each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 2) {
          const propertyDescription = $(cells[0]).text().trim();
          const taxAmountText = $(cells[1]).text().trim();
          const taxAmount = parseFloat(taxAmountText.replace(/[$,]/g, '')) || 0;

          if (propertyDescription && taxAmount > 0) {
            leads.push({
              propertyDescription,
              taxAmount,
              delinquentYear: new Date().getFullYear() - 1,
              county: county.name,
              sourceUrl: county.url
            });
          }
        }
      });

      console.log(`Found ${leads.length} tax delinquent leads for ${county.name} County`);
      return leads;
    } catch (error) {
      console.error(`Error scraping ${county.name} County tax delinquent:`, error);
      return [];
    }
  }

  async scrapeAll(): Promise<TaxDelinquentLead[]> {
    const allLeads: TaxDelinquentLead[] = [];

    for (const county of this.counties) {
      const leads = await this.scrapeCounty(county);
      allLeads.push(...leads);
      
      // Respect rate limits
      await this.delay(3000);
    }

    return allLeads;
  }

  convertToLead(taxLead: TaxDelinquentLead, enrichmentData?: any): Lead {
    return {
      id: `TAX-${taxLead.county}-${Math.random().toString(36).substr(2, 9)}`,
      leadType: 'tax-delinquent',
      ownerName: enrichmentData?.ownerName || taxLead.ownerName || 'Unknown',
      address: enrichmentData?.address || taxLead.propertyDescription,
      city: enrichmentData?.city || '',
      state: 'SC',
      zip: enrichmentData?.zip || '',
      mailingAddress: enrichmentData?.mailingAddress || enrichmentData?.address || '',
      mailingCity: enrichmentData?.mailingCity || enrichmentData?.city || '',
      mailingState: 'SC',
      mailingZip: enrichmentData?.mailingZip || enrichmentData?.zip || '',
      county: taxLead.county,
      caseNumber: taxLead.parcelNumber || `TAX-${taxLead.county}-${taxLead.delinquentYear}`,
      filingDate: new Date().toISOString().split('T')[0],
      assessedValue: enrichmentData?.assessedValue || 0,
      taxYear: taxLead.delinquentYear,
      lender: 'Tax Collector',
      loanAmount: taxLead.taxAmount,
      saleDate: '',
      saleAmount: 0,
      description: `Property has unpaid property taxes for ${taxLead.delinquentYear}. Amount due: $${taxLead.taxAmount.toFixed(2)}`,
      sourceUrl: taxLead.sourceUrl,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default TaxDelinquentScraper;
