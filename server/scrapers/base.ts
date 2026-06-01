import { Lead, LeadType } from '../types/index.js';
import { v4 as uuidv4 } from 'crypto';

export interface ScraperOptions {
  county: string;
  state: string;
  fromDate?: Date;
  toDate?: Date;
}

export abstract class BaseScraper {
  protected county: string;
  protected state: string;
  protected fromDate: Date;
  protected toDate: Date;

  constructor(options: ScraperOptions) {
    this.county = options.county;
    this.state = options.state;
    this.fromDate = options.fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.toDate = options.toDate || new Date();
  }

  abstract scrape(): Promise<Lead[]>;

  protected generateLeadId(lead: Partial<Lead>): string {
    const key = `${lead.county}-${lead.state}-${lead.lead_type}-${lead.owner_name}-${lead.address}-${lead.filing_date}`;
    return Buffer.from(key).toString('base64');
  }

  protected createLead(data: Partial<Lead>, leadType: LeadType): Lead {
    const now = new Date().toISOString();
    return {
      id: this.generateLeadId(data),
      county: this.county,
      state: this.state,
      lead_type: leadType,
      owner_name: data.owner_name || null,
      address: data.address || null,
      city: data.city || null,
      zip: data.zip || null,
      mailing_address: data.mailing_address || null,
      mailing_city: data.mailing_city || null,
      mailing_state: data.mailing_state || null,
      mailing_zip: data.mailing_zip || null,
      case_number: data.case_number || null,
      filing_date: data.filing_date || null,
      assessed_value: data.assessed_value || null,
      tax_year: data.tax_year || null,
      lender: data.lender || null,
      loan_amount: data.loan_amount || null,
      sale_date: data.sale_date || null,
      sale_amount: data.sale_amount || null,
      description: data.description || null,
      source_url: data.source_url || null,
      status: 'new',
      notes: null,
      skip_traced: false,
      st_phone: null,
      st_email: null,
      st_mailing: null,
      scraped_at: now,
      created_at: now,
      updated_at: now,
    };
  }

  protected async fetchWithRetry(url: string, options: any = {}, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          timeout: 10000,
          ...options,
        });
        if (response.ok) return response;
        if (response.status === 429 && i < retries - 1) {
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
