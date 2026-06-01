import { Router, Request, Response } from 'express';
import { LeadsService } from '../db/leads';

export default function statsRoutes(leadsService: LeadsService) {
  const router = Router();

  // Get dashboard stats
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const stats = await leadsService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Get leads by county
  router.get('/by-county', async (req: Request, res: Response) => {
    try {
      const stats = await leadsService.getStatsByCounty();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch county stats' });
    }
  });

  // Get leads by type
  router.get('/by-type', async (req: Request, res: Response) => {
    try {
      const stats = await leadsService.getStatsByType();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch type stats' });
    }
  });

  // Get leads by status
  router.get('/by-status', async (req: Request, res: Response) => {
    try {
      const stats = await leadsService.getStatsByStatus();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch status stats' });
    }
  });

  return router;
}
