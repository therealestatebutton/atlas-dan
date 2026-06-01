import express, { Request, Response } from 'express';
import { LeadsService } from '../db/leads.js';
import { ScrapeRunsService } from '../db/scrape-runs.js';
import { DashboardStats, LeadStatus, LeadType } from '../types/index.js';

const router = express.Router();

// GET /api/stats - Get dashboard statistics
router.get('/', (req: Request, res: Response) => {
  try {
    const stats = LeadsService.getStats();
    
    // Get last scrape time
    const lastScrape = ScrapeRunsService.getLatestRun();
    const last_scrape = lastScrape?.completed_at || null;

    const dashboardStats: DashboardStats = {
      total_leads: stats.total,
      leads_by_type: stats.by_type,
      leads_by_status: stats.by_status,
      leads_by_county: stats.by_county,
      last_scrape,
      new_leads_today: stats.new_today,
    };

    res.json(dashboardStats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/stats/config - Get client configuration
router.get('/config', (req: Request, res: Response) => {
  try {
    const clientName = process.env.CLIENT_NAME || 'Atlas SC Leads';
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
