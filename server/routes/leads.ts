import { Router, Request, Response } from 'express';
import { LeadsService } from '../db/leads';

export default function leadsRoutes(leadsService: LeadsService) {
  const router = Router();

  // Get all leads with filtering
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { county, leadType, status, page = 1, limit = 50 } = req.query;
      const filters: any = {};
      
      if (county) filters.county = county;
      if (leadType) filters.leadType = leadType;
      if (status) filters.status = status;
      
      const leads = await leadsService.getLeads(filters, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // Get single lead
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const lead = await leadsService.getLeadById(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  });

  // Export leads to CSV
  router.get('/export/csv', async (req: Request, res: Response) => {
    try {
      const { county, leadType, startDate, endDate } = req.query;
      const filters: any = {};
      
      if (county) filters.county = county;
      if (leadType) filters.leadType = leadType;
      if (startDate || endDate) {
        filters.dateRange = {
          start: startDate ? new Date(startDate as string) : new Date('2024-01-01'),
          end: endDate ? new Date(endDate as string) : new Date()
        };
      }
      
      const leads = await leadsService.getLeads(filters, { limit: 10000 });
      
      // Convert to CSV
      const csv = convertToCSV(leads);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export leads' });
    }
  });

  // Update lead status
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const updated = await leadsService.updateLead(req.params.id, { status });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  return router;
}

function convertToCSV(leads: any[]): string {
  if (leads.length === 0) return '';
  
  const headers = Object.keys(leads[0]);
  const rows = leads.map(lead => 
    headers.map(header => {
      const value = lead[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}
