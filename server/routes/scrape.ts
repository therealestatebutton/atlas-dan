import { Router, Request, Response } from 'express';
import TaxDelinquentScraper from '../scrapers/tax-delinquent-production';
import { LeadsService } from '../db/leads';
import { ScrapeRunsService } from '../db/scrape-runs';

export default function scrapeRoutes(
  taxDelinquentScraper: TaxDelinquentScraper,
  leadsService: LeadsService,
  scrapeRunsService: ScrapeRunsService
) {
  const router = Router();

  // Trigger manual scrape
  router.post('/trigger', async (req: Request, res: Response) => {
    try {
      res.json({ status: 'scraping', message: 'Tax delinquent scrape started' });
      await taxDelinquentScraper.scrapeAllCounties();
    } catch (error) {
      console.error('Scrape error:', error);
    }
  });

  // Get scrape history
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const runs = await scrapeRunsService.getRecentRuns(30);
      res.json(runs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch scrape history' });
    }
  });

  // Get scrape status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const latestRun = await scrapeRunsService.getLatestRun();
      res.json(latestRun);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch scrape status' });
    }
  });

  return router;
}
