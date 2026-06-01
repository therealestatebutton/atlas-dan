import express, { Request, Response } from 'express';
import { LeadsService } from '../db/leads.js';
import { Lead, LeadStatus, LeadType } from '../types/index.js';

const router = express.Router();

// GET /api/leads - List leads with filters
router.get('/', (req: Request, res: Response) => {
  try {
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

    const filters: any = {
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    };

    if (county) filters.county = String(county);
    if (lead_type) filters.lead_type = String(lead_type);
    if (status) filters.status = String(status);
    if (search) filters.search = String(search);
    if (skip_traced === 'true') filters.skip_traced = true;
    else if (skip_traced === 'false') filters.skip_traced = false;
    if (from_date) filters.from_date = String(from_date);
    if (to_date) filters.to_date = String(to_date);

    const { leads, total } = LeadsService.getLeads(filters);

    res.json({
      leads,
      total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', (req: Request, res: Response) => {
  try {
    const lead = LeadsService.getLead(req.params.id);

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
    const { status, notes } = req.body;

    if (!status && notes === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const lead = LeadsService.updateLead(req.params.id, updates);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// GET /api/leads/export - Export leads as CSV
router.get('/export', (req: Request, res: Response) => {
  try {
    const { county, lead_type, status } = req.query;

    const filters: any = { limit: 10000 };
    if (county) filters.county = String(county);
    if (lead_type) filters.lead_type = String(lead_type);
    if (status) filters.status = String(status);

    const { leads } = LeadsService.getLeads(filters);

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
    const { leads } = req.body;

    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads must be an array' });
    }

    const imported = LeadsService.insertLeads(leads);

    res.json({ imported, total: leads.length });
  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

export default router;
