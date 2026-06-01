export type LeadType = 
  | 'pre-foreclosure'
  | 'tax-delinquent'
  | 'probate'
  | 'sheriff-sale'
  | 'fsbo'
  | 'obituary'
  | 'code-violation'
  | 'divorce'
  | 'fire-damage'
  | 'water-shut-off'
  | 'eviction'
  | 'vacant-abandoned'
  | 'foreclosure'
  | 'lis-pendens';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'not-interested';

export interface Lead {
  id: string;
  county: string;
  state: string;
  lead_type: LeadType;
  owner_name: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  mailing_address: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip: string | null;
  case_number: string | null;
  filing_date: string | null;
  assessed_value: string | null;
  tax_year: string | null;
  lender: string | null;
  loan_amount: string | null;
  sale_date: string | null;
  sale_amount: string | null;
  description: string | null;
  source_url: string | null;
  status: LeadStatus;
  notes: string | null;
  skip_traced: boolean;
  st_phone: string | null;
  st_email: string | null;
  st_mailing: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface ClientConfig {
  name: string;
  email: string;
  counties: Array<{ name: string; state: string }>;
}

export interface Settings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  email_recipients: string;
  skip_trace_key: string;
  scraper_api_key?: string;
}

export interface ScrapeRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  leads_found: number;
  errors: string | null;
}

export interface DashboardStats {
  total_leads: number;
  leads_by_type: Record<LeadType, number>;
  leads_by_status: Record<LeadStatus, number>;
  leads_by_county: Record<string, number>;
  last_scrape: string | null;
  new_leads_today: number;
}
