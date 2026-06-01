import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { initializeDatabase } from './db/init';
import { LeadsService } from './db/leads';
import { ScrapeRunsService } from './db/scrape-runs';
import { SettingsService } from './db/settings';
import TaxDelinquentScraper from './scrapers/tax-delinquent-production';
import leadsRoutes from './routes/leads';
import statsRoutes from './routes/stats';
import scrapeRoutes from './routes/scrape';
import settingsRoutes from './routes/settings';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
let leadsService: LeadsService;
let scrapeRunsService: ScrapeRunsService;
let settingsService: SettingsService;
let taxDelinquentScraper: TaxDelinquentScraper;

// Initialize database and start server
async function start() {
  try {
    console.log('🚀 Initializing Atlas SC Leads platform...');
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Create service instances
    leadsService = new LeadsService();
    scrapeRunsService = new ScrapeRunsService();
    settingsService = new SettingsService();
    taxDelinquentScraper = new TaxDelinquentScraper(leadsService, scrapeRunsService);
    
    // Register routes
    app.use('/api/leads', leadsRoutes(leadsService));
    app.use('/api/stats', statsRoutes(leadsService));
    app.use('/api/scrape', scrapeRoutes(taxDelinquentScraper, leadsService, scrapeRunsService));
    app.use('/api/settings', settingsRoutes(settingsService));
    
    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });
    
    // Schedule daily tax delinquent scraping at 6 AM EST
    // Cron format: minute hour day month dayOfWeek
    cron.schedule('0 6 * * *', async () => {
      console.log('⏰ Running scheduled tax delinquent scrape...');
      try {
        await taxDelinquentScraper.scrapeAllCounties();
        console.log('✅ Scheduled scrape completed');
      } catch (error) {
        console.error('❌ Scheduled scrape failed:', error);
      }
    });
    
    console.log('✅ Daily scraping scheduled for 6 AM EST');
    
    // Start server
    app.listen(port, () => {
      console.log(`🌐 Server running on port ${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}`);
      console.log(`📡 API: http://localhost:${port}/api`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
