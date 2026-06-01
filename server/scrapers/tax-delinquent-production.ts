import axios from 'axios';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import * as cheerio from 'cheerio';
import { LeadsService } from '../db/leads';
import { ScrapeRunsService } from '../db/scrape-runs';

export interface TaxDelinquentLead {
  county: string;
  leadType: 'tax-delinquent';
  ownerName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  pin: string;
  assessedValue: number;
  taxAmount: number;
  taxYear: number;
  saleDate?: string;
  description: string;
  sourceUrl: string;
  scrapedAt: Date;
  status: 'active' | 'sold' | 'redeemed';
}

export class TaxDelinquentScraper {
  private leadsService: LeadsService;
  private scrapeRunsService: ScrapeRunsService;

  constructor(leadsService: LeadsService, scrapeRunsService: ScrapeRunsService) {
    this.leadsService = leadsService;
    this.scrapeRunsService = scrapeRunsService;
  }

  async scrapeAllCounties(): Promise<void> {
    console.log('Starting tax delinquent scraping for all counties...');
    
    try {
      // Scrape each county
      await this.scrapeHorryCounty();
      await this.scrapeGeorgetownCounty();
      await this.scrapeMarionCounty();
      
      console.log('✅ Tax delinquent scraping completed successfully');
    } catch (error) {
      console.error('❌ Error during tax delinquent scraping:', error);
      throw error;
    }
  }

  private async scrapeHorryCounty(): Promise<void> {
    console.log('Scraping Horry County tax delinquent properties...');
    
    const runId = await this.scrapeRunsService.createRun('horry', 'tax-delinquent');
    
    try {
      // Download Excel file
      const url = 'https://www.horrycountysc.gov/media/2xudn5bj/delinquent-list-real-estate.xlsx';
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
      
      // Parse Excel
      const workbook = XLSX.read(response.data, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extract leads starting from row 5 (row 4 has headers)
      const leads: TaxDelinquentLead[] = [];
      for (let i = 4; i < data.length; i++) {
        const row = data[i] as any[];
        if (row[0] && row[2]) {  // Item number and owner name
          const lead: TaxDelinquentLead = {
            county: 'Horry',
            leadType: 'tax-delinquent',
            ownerName: row[2]?.toString().trim() || '',
            propertyAddress: row[4]?.toString().trim() || '',
            city: 'Horry County',
            state: 'SC',
            zip: '',
            pin: row[1]?.toString() || '',
            assessedValue: 0,
            taxAmount: parseFloat(row[5]) || 0,
            taxYear: 2025,
            description: row[4]?.toString().trim() || '',
            sourceUrl: url,
            scrapedAt: new Date(),
            status: 'active'
          };
          leads.push(lead);
        }
      }
      
      // Save to database
      for (const lead of leads) {
        await this.leadsService.createLead(lead);
      }
      
      await this.scrapeRunsService.completeRun(runId, leads.length, null);
      console.log(`✅ Horry County: ${leads.length} leads scraped`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.scrapeRunsService.completeRun(runId, 0, errorMsg);
      console.error('❌ Error scraping Horry County:', error);
      throw error;
    }
  }

  private async scrapeGeorgetownCounty(): Promise<void> {
    console.log('Scraping Georgetown County tax delinquent properties...');
    
    const runId = await this.scrapeRunsService.createRun('georgetown', 'tax-delinquent');
    
    try {
      const url = 'https://www.gtcountysc.gov/408/Tax-Sale';
      const response = await axios.get(url, { timeout: 30000 });
      const $ = cheerio.load(response.data);
      
      const leads: TaxDelinquentLead[] = [];
      
      // Parse the page for tax sale information
      // This is a placeholder - actual parsing depends on page structure
      const tables = $('table');
      tables.each((index, table) => {
        const rows = $(table).find('tr');
        rows.each((rowIndex, row) => {
          if (rowIndex > 0) {  // Skip header
            const cells = $(row).find('td');
            if (cells.length >= 3) {
              const lead: TaxDelinquentLead = {
                county: 'Georgetown',
                leadType: 'tax-delinquent',
                ownerName: $(cells[0]).text().trim(),
                propertyAddress: $(cells[1]).text().trim(),
                city: 'Georgetown County',
                state: 'SC',
                zip: '',
                pin: '',
                assessedValue: 0,
                taxAmount: parseFloat($(cells[2]).text()) || 0,
                taxYear: 2025,
                description: $(cells[1]).text().trim(),
                sourceUrl: url,
                scrapedAt: new Date(),
                status: 'active'
              };
              leads.push(lead);
            }
          }
        });
      });
      
      // Save to database
      for (const lead of leads) {
        await this.leadsService.createLead(lead);
      }
      
      await this.scrapeRunsService.completeRun(runId, leads.length, null);
      console.log(`✅ Georgetown County: ${leads.length} leads scraped`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.scrapeRunsService.completeRun(runId, 0, errorMsg);
      console.error('❌ Error scraping Georgetown County:', error);
      throw error;
    }
  }

  private async scrapeMarionCounty(): Promise<void> {
    console.log('Scraping Marion County tax delinquent properties...');
    
    const runId = await this.scrapeRunsService.createRun('marion', 'tax-delinquent');
    
    try {
      const url = 'https://www.marionsc.org/departments/tax_collector/tax_sale_information/index.php';
      const response = await axios.get(url, { timeout: 30000 });
      const $ = cheerio.load(response.data);
      
      const leads: TaxDelinquentLead[] = [];
      
      // Parse the page for tax sale information
      const tables = $('table');
      tables.each((index, table) => {
        const rows = $(table).find('tr');
        rows.each((rowIndex, row) => {
          if (rowIndex > 0) {  // Skip header
            const cells = $(row).find('td');
            if (cells.length >= 2) {
              const lead: TaxDelinquentLead = {
                county: 'Marion',
                leadType: 'tax-delinquent',
                ownerName: $(cells[0]).text().trim(),
                propertyAddress: $(cells[1]).text().trim(),
                city: 'Marion County',
                state: 'SC',
                zip: '',
                pin: '',
                assessedValue: 0,
                taxAmount: parseFloat($(cells[2])?.text()) || 0,
                taxYear: 2025,
                description: $(cells[1]).text().trim(),
                sourceUrl: url,
                scrapedAt: new Date(),
                status: 'active'
              };
              leads.push(lead);
            }
          }
        });
      });
      
      // Save to database
      for (const lead of leads) {
        await this.leadsService.createLead(lead);
      }
      
      await this.scrapeRunsService.completeRun(runId, leads.length, null);
      console.log(`✅ Marion County: ${leads.length} leads scraped`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.scrapeRunsService.completeRun(runId, 0, errorMsg);
      console.error('❌ Error scraping Marion County:', error);
      throw error;
    }
  }
}

export default TaxDelinquentScraper;
