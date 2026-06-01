import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { getDatabase, closeDatabase } from './db/connection.js';
import { initializeEmailService } from './email/index.js';
import { scrapeAllCounties } from './scrapers/index.js';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';
import scrapeRouter from './routes/scrape.js';
import settingsRouter from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = parseInt(process.env.PORT || '5000');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/client')));

// Initialize services
const db = getDatabase();
initializeEmailService();

// API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/scrape', scrapeRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/client/index.html'));
});

// Schedule daily scrape at 6 AM EST
cron.schedule('0 6 * * *', async () => {
  console.log('Starting scheduled daily scrape...');
  try {
    const leads = await scrapeAllCounties();
    console.log(`✓ Scrape completed: ${leads.length} leads found`);
  } catch (error) {
    console.error('Error in scheduled scrape:', error);
  }
});

// Start server
app.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
  console.log(`✓ Database: ${process.env.DATABASE_PATH || './data/leads.db'}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});
