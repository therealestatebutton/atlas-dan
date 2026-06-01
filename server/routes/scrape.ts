import express, { Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';
import { scrapeAllCounties } from '../scrapers/index.js';
import { v4 as uuidv4 } from 'crypto';

const router = express.Router();
let currentScrapeId: string | null = null;

// POST /api/scrape - Trigger manual scrape
router.post('/', async (req: Request, res: Response) => {
  try {
    if (currentScrapeId) {
      return res.status(409).json({ error: 'Scrape already in progress' });
    }

    const scrapeId = Buffer.from(Math.random().toString()).toString('base64').substring(0, 12);
    currentScrapeId = scrapeId;

    const db = getDatabase();
    const now = new Date().toISOString();

    // Record scrape start
    const stmt = db.prepare(`
      INSERT INTO scrape_runs (id, started_at, leads_found, errors)
      VALUES (?, ?, 0, NULL)
    `);
    stmt.run(scrapeId, now);

    // Run scrape in background
    (async () => {
      try {
        const leads = await scrapeAllCounties();

        // Update scrape record
        const updateStmt = db.prepare(`
          UPDATE scrape_runs 
          SET completed_at = ?, leads_found = ?
          WHERE id = ?
        `);
        updateStmt.run(new Date().toISOString(), leads.length, scrapeId);

        console.log(`✓ Scrape ${scrapeId} completed: ${leads.length} leads`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const updateStmt = db.prepare(`
          UPDATE scrape_runs 
          SET completed_at = ?, errors = ?
          WHERE id = ?
        `);
        updateStmt.run(new Date().toISOString(), errorMsg, scrapeId);
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
    const db = getDatabase();

    // Get latest scrape
    const stmt = db.prepare(`
      SELECT id, started_at, completed_at, leads_found, errors
      FROM scrape_runs
      ORDER BY started_at DESC
      LIMIT 1
    `);
    const scrape = stmt.get() as any;

    if (!scrape) {
      return res.json({
        status: 'idle',
        current_scrape: null,
        last_scrape: null,
      });
    }

    const isRunning = scrape.completed_at === null;

    res.json({
      status: isRunning ? 'running' : 'idle',
      current_scrape: isRunning
        ? {
            id: scrape.id,
            started_at: scrape.started_at,
          }
        : null,
      last_scrape: {
        id: scrape.id,
        started_at: scrape.started_at,
        completed_at: scrape.completed_at,
        leads_found: scrape.leads_found,
        errors: scrape.errors,
      },
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

    if (currentScrapeId) {
      return res.status(409).json({ error: 'Scrape already in progress' });
    }

    const scrapeId = Buffer.from(Math.random().toString()).toString('base64').substring(0, 12);
    currentScrapeId = scrapeId;

    const db = getDatabase();
    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const startTime = new Date().toISOString();

    // Record scrape start
    const stmt = db.prepare(`
      INSERT INTO scrape_runs (id, started_at, leads_found, errors)
      VALUES (?, ?, 0, NULL)
    `);
    stmt.run(scrapeId, startTime);

    // Run scrape in background
    (async () => {
      try {
        const leads = await scrapeAllCounties(fromDate, now);

        // Update scrape record
        const updateStmt = db.prepare(`
          UPDATE scrape_runs 
          SET completed_at = ?, leads_found = ?
          WHERE id = ?
        `);
        updateStmt.run(new Date().toISOString(), leads.length, scrapeId);

        console.log(`✓ Historical scrape ${scrapeId} completed: ${leads.length} leads`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const updateStmt = db.prepare(`
          UPDATE scrape_runs 
          SET completed_at = ?, errors = ?
          WHERE id = ?
        `);
        updateStmt.run(new Date().toISOString(), errorMsg, scrapeId);
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
