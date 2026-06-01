import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/leads.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create leads table
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    county TEXT NOT NULL,
    state TEXT NOT NULL,
    lead_type TEXT NOT NULL,
    owner_name TEXT,
    address TEXT,
    city TEXT,
    zip TEXT,
    mailing_address TEXT,
    mailing_city TEXT,
    mailing_state TEXT,
    mailing_zip TEXT,
    case_number TEXT,
    filing_date TEXT,
    assessed_value TEXT,
    tax_year TEXT,
    lender TEXT,
    loan_amount TEXT,
    sale_date TEXT,
    sale_amount TEXT,
    description TEXT,
    source_url TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    skip_traced BOOLEAN DEFAULT 0,
    st_phone TEXT,
    st_email TEXT,
    st_mailing TEXT,
    scraped_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(county, state, lead_type, owner_name, address, filing_date)
  );
`);

// Create settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Create scrape_runs table
db.exec(`
  CREATE TABLE IF NOT EXISTS scrape_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    leads_found INTEGER DEFAULT 0,
    errors TEXT
  );
`);

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leads_county ON leads(county);
  CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
  CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_scraped ON leads(scraped_at);
`);

console.log('✓ Database initialized at', dbPath);
db.close();
