import express, { Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';
import { DashboardStats, LeadStatus, LeadType } from '../types/index.js';

const router = express.Router();

// GET /api/stats - Get dashboard statistics
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Total leads
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM leads');
    const { count: total_leads } = totalStmt.get() as { count: number };

    // Leads by type
    const typeStmt = db.prepare('SELECT lead_type, COUNT(*) as count FROM leads GROUP BY lead_type');
    const typeRows = typeStmt.all() as Array<{ lead_type: string; count: number }>;
    const leads_by_type: Record<LeadType, number> = {} as Record<LeadType, number>;
    typeRows.forEach(row => {
      leads_by_type[row.lead_type as LeadType] = row.count;
    });

    // Leads by status
    const statusStmt = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
    const statusRows = statusStmt.all() as Array<{ status: string; count: number }>;
    const leads_by_status: Record<LeadStatus, number> = {} as Record<LeadStatus, number>;
    statusRows.forEach(row => {
      leads_by_status[row.status as LeadStatus] = row.count;
    });

    // Leads by county
    const countyStmt = db.prepare('SELECT county, COUNT(*) as count FROM leads GROUP BY county');
    const countyRows = countyStmt.all() as Array<{ county: string; count: number }>;
    const leads_by_county: Record<string, number> = {};
    countyRows.forEach(row => {
      leads_by_county[row.county] = row.count;
    });

    // Last scrape
    const lastScrapeStmt = db.prepare(
      'SELECT completed_at FROM scrape_runs WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1'
    );
    const lastScrapeRow = lastScrapeStmt.get() as { completed_at: string } | undefined;
    const last_scrape = lastScrapeRow?.completed_at || null;

    // New leads today
    const todayStmt = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE DATE(created_at) = DATE('now')
    `);
    const { count: new_leads_today } = todayStmt.get() as { count: number };

    const stats: DashboardStats = {
      total_leads,
      leads_by_type,
      leads_by_status,
      leads_by_county,
      last_scrape,
      new_leads_today,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/stats/config - Get client configuration
router.get('/config', (req: Request, res: Response) => {
  try {
    const clientName = process.env.CLIENT_NAME || 'Atlas Leads';
    const clientEmail = process.env.CLIENT_EMAIL || '';
    const clientCounties = process.env.CLIENT_COUNTIES
      ? JSON.parse(process.env.CLIENT_COUNTIES)
      : [
          { name: 'Horry', state: 'SC' },
          { name: 'Georgetown', state: 'SC' },
          { name: 'Marion', state: 'SC' },
        ];

    res.json({
      name: clientName,
      email: clientEmail,
      counties: clientCounties,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;
