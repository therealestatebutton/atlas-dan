import express, { Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';
import { Lead, LeadStatus, LeadType } from '../types/index.js';

const router = express.Router();

// GET /api/leads - List leads with filters
router.get('/', (req: Request, res: Response) => {
  try {
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
    } = req.query;

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

    if (skip_traced === 'true') {
      query += ' AND skip_traced = 1';
    } else if (skip_traced === 'false') {
      query += ' AND skip_traced = 0';
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

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const leads = stmt.all(...params) as Lead[];

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM leads WHERE 1=1';
    const countParams: any[] = [];

    if (county) {
      countQuery += ' AND county = ?';
      countParams.push(county);
    }
    if (lead_type) {
      countQuery += ' AND lead_type = ?';
      countParams.push(lead_type);
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (skip_traced === 'true') {
      countQuery += ' AND skip_traced = 1';
    } else if (skip_traced === 'false') {
      countQuery += ' AND skip_traced = 0';
    }
    if (search) {
      countQuery += ' AND (owner_name LIKE ? OR address LIKE ? OR city LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (from_date) {
      countQuery += ' AND created_at >= ?';
      countParams.push(from_date);
    }
    if (to_date) {
      countQuery += ' AND created_at <= ?';
      countParams.push(to_date);
    }

    const countStmt = db.prepare(countQuery);
    const { count } = countStmt.get(...countParams) as { count: number };

    res.json({
      leads,
      total: count,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    const lead = stmt.get(req.params.id) as Lead | undefined;

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// PATCH /api/leads/:id - Update lead
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, notes } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    const stmt = db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedStmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    const lead = updatedStmt.get(req.params.id) as Lead;

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// GET /api/leads/export - Export leads as CSV
router.get('/export', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { county, lead_type, status } = req.query;

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

    const stmt = db.prepare(query);
    const leads = stmt.all(...params) as Lead[];

    const headers = [
      'Lead Type',
      'County',
      'State',
      'Owner Name',
      'Property Address',
      'City',
      'Zip',
      'Mailing Address',
      'Mailing City',
      'Mailing State',
      'Mailing Zip',
      'Case Number',
      'Filing Date',
      'Assessed Value',
      'Tax Year',
      'Lender',
      'Loan Amount',
      'Sale Date',
      'Sale Amount',
      'Description',
      'Source URL',
      'Status',
      'Skip Traced',
      'Phone',
      'Email',
      'Mailing',
    ];

    const rows = leads.map(lead => [
      lead.lead_type,
      lead.county,
      lead.state,
      lead.owner_name || '',
      lead.address || '',
      lead.city || '',
      lead.zip || '',
      lead.mailing_address || '',
      lead.mailing_city || '',
      lead.mailing_state || '',
      lead.mailing_zip || '',
      lead.case_number || '',
      lead.filing_date || '',
      lead.assessed_value || '',
      lead.tax_year || '',
      lead.lender || '',
      lead.loan_amount || '',
      lead.sale_date || '',
      lead.sale_amount || '',
      lead.description || '',
      lead.source_url || '',
      lead.status,
      lead.skip_traced ? 'Yes' : 'No',
      lead.st_phone || '',
      lead.st_email || '',
      lead.st_mailing || '',
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// POST /api/leads/import - Bulk import leads
router.post('/import', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { leads } = req.body;

    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads must be an array' });
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO leads (
        id, county, state, lead_type, owner_name, address, city, zip,
        mailing_address, mailing_city, mailing_state, mailing_zip,
        case_number, filing_date, assessed_value, tax_year, lender,
        loan_amount, sale_date, sale_amount, description, source_url,
        status, skip_traced, scraped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    const now = new Date().toISOString();

    for (const lead of leads) {
      try {
        const result = stmt.run(
          lead.id,
          lead.county,
          lead.state,
          lead.lead_type,
          lead.owner_name || null,
          lead.address || null,
          lead.city || null,
          lead.zip || null,
          lead.mailing_address || null,
          lead.mailing_city || null,
          lead.mailing_state || null,
          lead.mailing_zip || null,
          lead.case_number || null,
          lead.filing_date || null,
          lead.assessed_value || null,
          lead.tax_year || null,
          lead.lender || null,
          lead.loan_amount || null,
          lead.sale_date || null,
          lead.sale_amount || null,
          lead.description || null,
          lead.source_url || null,
          'new',
          false,
          lead.scraped_at || now,
          lead.created_at || now,
          lead.updated_at || now
        );
        if (result.changes > 0) imported++;
      } catch (error) {
        console.error('Error importing lead:', error);
      }
    }

    res.json({ imported, total: leads.length });
  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

export default router;
