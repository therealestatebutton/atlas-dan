import { getDatabase } from './connection.js';
import { Lead, LeadStatus, LeadType } from '../types/index.js';

export class LeadsService {
  /**
   * Insert or update a lead (upsert)
   */
  static insertLead(lead: Lead): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO leads (
        id, county, state, lead_type, owner_name, address, city, zip,
        mailing_address, mailing_city, mailing_state, mailing_zip,
        case_number, filing_date, assessed_value, tax_year, lender,
        loan_amount, sale_date, sale_amount, description, source_url,
        status, skip_traced, st_phone, st_email, st_mailing,
        scraped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        lead.id,
        lead.county,
        lead.state,
        lead.lead_type,
        lead.owner_name,
        lead.address,
        lead.city,
        lead.zip,
        lead.mailing_address,
        lead.mailing_city,
        lead.mailing_state,
        lead.mailing_zip,
        lead.case_number,
        lead.filing_date,
        lead.assessed_value,
        lead.tax_year,
        lead.lender,
        lead.loan_amount,
        lead.sale_date,
        lead.sale_amount,
        lead.description,
        lead.source_url,
        lead.status,
        lead.skip_traced ? 1 : 0,
        lead.st_phone,
        lead.st_email,
        lead.st_mailing,
        lead.scraped_at,
        lead.created_at,
        lead.updated_at
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Error inserting lead:', error);
      return false;
    }
  }

  /**
   * Batch insert leads
   */
  static insertLeads(leads: Lead[]): number {
    const db = getDatabase();
    let inserted = 0;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO leads (
        id, county, state, lead_type, owner_name, address, city, zip,
        mailing_address, mailing_city, mailing_state, mailing_zip,
        case_number, filing_date, assessed_value, tax_year, lender,
        loan_amount, sale_date, sale_amount, description, source_url,
        status, skip_traced, st_phone, st_email, st_mailing,
        scraped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const lead of leads) {
      try {
        const result = stmt.run(
          lead.id,
          lead.county,
          lead.state,
          lead.lead_type,
          lead.owner_name,
          lead.address,
          lead.city,
          lead.zip,
          lead.mailing_address,
          lead.mailing_city,
          lead.mailing_state,
          lead.mailing_zip,
          lead.case_number,
          lead.filing_date,
          lead.assessed_value,
          lead.tax_year,
          lead.lender,
          lead.loan_amount,
          lead.sale_date,
          lead.sale_amount,
          lead.description,
          lead.source_url,
          lead.status,
          lead.skip_traced ? 1 : 0,
          lead.st_phone,
          lead.st_email,
          lead.st_mailing,
          lead.scraped_at,
          lead.created_at,
          lead.updated_at
        );
        if (result.changes > 0) inserted++;
      } catch (error) {
        console.error('Error inserting lead:', error);
      }
    }

    return inserted;
  }

  /**
   * Get lead by ID
   */
  static getLead(id: string): Lead | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    return (stmt.get(id) as Lead) || null;
  }

  /**
   * Get leads with filters
   */
  static getLeads(filters: {
    county?: string;
    lead_type?: LeadType;
    status?: LeadStatus;
    search?: string;
    skip_traced?: boolean;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): { leads: Lead[]; total: number } {
    const db = getDatabase();
    const {
      county,
      lead_type,
      status,
      search,
      skip_traced,
      from_date,
      to_date,
      limit = 50,
      offset = 0,
    } = filters;

    let query = 'SELECT * FROM leads WHERE 1=1';
    const params: any[] = [];

    if (county) {
      query += ' AND county = ?';
      params.push(county);
    }
    if (lead_type) {
      query += ' AND lead_type = ?';
      params.push(lead_type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (skip_traced !== undefined) {
      query += ' AND skip_traced = ?';
      params.push(skip_traced ? 1 : 0);
    }
    if (search) {
      query += ' AND (owner_name LIKE ? OR address LIKE ? OR city LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (from_date) {
      query += ' AND created_at >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND created_at <= ?';
      params.push(to_date);
    }

    // Get total count
    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countStmt = db.prepare(countQuery);
    const { count: total } = countStmt.get(...params) as { count: number };

    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const leads = stmt.all(...params) as Lead[];

    return { leads, total };
  }

  /**
   * Update lead status and notes
   */
  static updateLead(id: string, updates: { status?: LeadStatus; notes?: string }): Lead | null {
    const db = getDatabase();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.status) {
      updateFields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(updates.notes);
    }

    if (updateFields.length === 0) return this.getLead(id);

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const stmt = db.prepare(`UPDATE leads SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return this.getLead(id);
  }

  /**
   * Get statistics
   */
  static getStats(): {
    total: number;
    by_type: Record<LeadType, number>;
    by_status: Record<LeadStatus, number>;
    by_county: Record<string, number>;
    new_today: number;
  } {
    const db = getDatabase();

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM leads');
    const { count: total } = totalStmt.get() as { count: number };

    const typeStmt = db.prepare('SELECT lead_type, COUNT(*) as count FROM leads GROUP BY lead_type');
    const typeRows = typeStmt.all() as Array<{ lead_type: string; count: number }>;
    const by_type: Record<LeadType, number> = {} as Record<LeadType, number>;
    typeRows.forEach(row => {
      by_type[row.lead_type as LeadType] = row.count;
    });

    const statusStmt = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
    const statusRows = statusStmt.all() as Array<{ status: string; count: number }>;
    const by_status: Record<LeadStatus, number> = {} as Record<LeadStatus, number>;
    statusRows.forEach(row => {
      by_status[row.status as LeadStatus] = row.count;
    });

    const countyStmt = db.prepare('SELECT county, COUNT(*) as count FROM leads GROUP BY county');
    const countyRows = countyStmt.all() as Array<{ county: string; count: number }>;
    const by_county: Record<string, number> = {};
    countyRows.forEach(row => {
      by_county[row.county] = row.count;
    });

    const todayStmt = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE DATE(created_at) = DATE('now')
    `);
    const { count: new_today } = todayStmt.get() as { count: number };

    return { total, by_type, by_status, by_county, new_today };
  }

  /**
   * Get new leads since date
   */
  static getNewLeads(since: string): Lead[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM leads WHERE created_at >= ? ORDER BY created_at DESC');
    return stmt.all(since) as Lead[];
  }

  /**
   * Delete lead
   */
  static deleteLead(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM leads WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
