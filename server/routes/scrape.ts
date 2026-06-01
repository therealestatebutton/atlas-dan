import express, { Request, Response } from 'express';
import { scrapeAllCounties } from '../scrapers/index.js';
import { ScrapeRunsService } from '../db/scrape-runs.js';

const router = express.Router();
let currentScrapeId: string | null = null;

// POST /api/scrape - Trigger manual scrape
router.post('/', async (req: Request, res: Response) => {
  try {
    if (ScrapeRunsService.isRunning()) {
      return res.status(409).json({ error: 'Scrape already in progress' });
    }

    const scrapeId = Buffer.from(Math.random().toString()).toString('base64').substring(0, 12);
    currentScrapeId = scrapeId;

    // Create scrape run record
    ScrapeRunsService.createRun(scrapeId);

    // Run scrape in background
    (async () => {
      try {
        const leads = await scrapeAllCounties();
        ScrapeRunsService.completeRun(scrapeId, leads.length);
        console.log(`✓ Scrape ${scrapeId} completed: ${leads.length} leads`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        ScrapeRunsService.completeRun(scrapeId, 0, errorMsg);
        console.error(`✗ Scrape ${scrapeId} failed:`, error);
      } finally {
        currentScrapeId = null;
      }
    })();

    res.json({ scrape_id: scrapeId, status: 'started' });
  } catch (error) {
    currentScrapeId = null;
    console.error('Error starting scrape:', error);
    res.status(500).json({ error: 'Failed to start scrape' });
  }
});

// GET /api/scrape/status - Check scrape progress
router.get('/status', (req: Request, res: Response) => {
  try {
    const currentRun = ScrapeRunsService.getCurrentRun();
    const lastRun = ScrapeRunsService.getLatestRun();

    const isRunning = currentRun !== null;

    res.json({
      status: isRunning ? 'running' : 'idle',
      current_scrape: isRunning
        ? {
            id: currentRun!.id,
            started_at: currentRun!.started_at,
          }
        : null,
      last_scrape: lastRun
        ? {
            id: lastRun.id,
            started_at: lastRun.started_at,
            completed_at: lastRun.completed_at,
            leads_found: lastRun.leads_found,
            errors: lastRun.errors,
          }
        : null,
    });
  } catch (error) {
    console.error('Error checking scrape status:', error);
    res.status(500).json({ error: 'Failed to check scrape status' });
  }
});

// POST /api/scrape/historical - Pull historical data
router.post('/historical', async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.body;

    if (days < 1 || days > 90) {
      return res.status(400).json({ error: 'days must be between 1 and 90' });
    }

    if (ScrapeRunsService.isRunning()) {
      return res.status(409).json({ error: 'Scrape already in progress' });
    }

    const scrapeId = Buffer.from(Math.random().toString()).toString('base64').substring(0, 12);
    currentScrapeId = scrapeId;

    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Create scrape run record
    ScrapeRunsService.createRun(scrapeId);

    // Run scrape in background
    (async () => {
      try {
        const leads = await scrapeAllCounties(fromDate, now);
        ScrapeRunsService.completeRun(scrapeId, leads.length);
        console.log(`✓ Historical scrape ${scrapeId} completed: ${leads.length} leads`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        ScrapeRunsService.completeRun(scrapeId, 0, errorMsg);
        console.error(`✗ Historical scrape ${scrapeId} failed:`, error);
      } finally {
        currentScrapeId = null;
      }
    })();

    res.json({ scrape_id: scrapeId, status: 'started', days });
  } catch (error) {
    currentScrapeId = null;
    console.error('Error starting historical scrape:', error);
    res.status(500).json({ error: 'Failed to start historical scrape' });
  }
});

export default router;
