# Atlas SC Leads - County Lead Aggregation Platform

Lead aggregation and enrichment platform for Horry, Georgetown, and Marion counties in South Carolina.

## Features

- **13+ Lead Types**: Pre-Foreclosure, Tax Delinquent, Probate, Sheriff Sale, FSBO, Obituary, Code Violation, Divorce, Fire Damage, Water Shut-off, Eviction, Vacant/Abandoned, Foreclosure
- **Daily Automated Scraping**: Runs at 6 AM EST via node-cron
- **County Record Enrichment**: Owner name, address, reverse lookup
- **Email Reporting**: Daily CSV reports with new leads
- **90-Day Historical Backfill**: Pull historical data on demand
- **CSV Export**: Download leads with all data fields
- **Skip Trace Integration**: Phone, email, mailing address lookup
- **Modern Dashboard**: Responsive UI with filtering and search
- **Production-Ready**: Deployed on Railway with Docker

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend**: Express.js + Node.js
- **Database**: SQLite (better-sqlite3)
- **Scraping**: Cheerio + Node-fetch
- **Automation**: Node-cron
- **Email**: Nodemailer
- **Deployment**: Railway + Docker

## Project Structure

```
atlas-sc-leads/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── index.html         # HTML template
│   └── src/styles/        # Global styles
├── server/                # Express backend
│   ├── index.ts           # Server entry point
│   ├── db/                # Database initialization
│   ├── routes/            # API routes
│   ├── scrapers/          # Lead scrapers
│   ├── enrichment/        # Data enrichment
│   ├── email/             # Email service
│   ├── middleware/        # Express middleware
│   └── types/             # TypeScript types
├── data/                  # SQLite database (persistent)
├── dist/                  # Build output
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── Dockerfile
├── nixpacks.toml
└── README.md
```

## Setup

### Local Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database**:
   ```bash
   pnpm db:init
   ```

4. **Start development server**:
   ```bash
   pnpm dev
   ```

   This will start both the Express backend (port 5000) and Vite frontend (port 5173) with hot reload.

### Production Build

```bash
pnpm build
pnpm start
```

## API Endpoints

### Lead Management
- `GET /api/leads` - List leads with filters
- `GET /api/leads/export` - Download CSV
- `PATCH /api/leads/:id` - Update lead status/notes
- `POST /api/import` - Bulk import leads

### Dashboard & Stats
- `GET /api/stats` - Dashboard statistics
- `GET /api/config` - Client configuration

### Scraping
- `POST /api/scrape` - Trigger manual scrape
- `GET /api/scrape/status` - Check scrape progress
- `POST /api/scrape/historical` - Pull historical data (1-90 days)

### Settings
- `GET /api/settings` - Get settings (masks secrets)
- `POST /api/settings` - Save settings
- `POST /api/settings/test-email` - Send test email

### Skip Trace
- `POST /api/leads/:id/skip-trace` - Skip trace a lead

## Database Schema

### leads
Main table for all lead data with fields for property info, owner info, filing dates, assessed values, and enrichment data.

### settings
Configuration storage for SMTP, API keys, and client settings.

### scrape_runs
Execution logs for scrape jobs with timestamps and error tracking.

## Environment Variables

See `.env.example` for all configuration options.

## Deployment to Railway

1. Create a Railway project
2. Connect this GitHub repository
3. Set environment variables in Railway dashboard
4. Railway will auto-detect and deploy using nixpacks.toml
5. Configure persistent volume for `data/` directory
6. Set up cron jobs for daily scrapes

## Counties

- **Horry County, SC**
- **Georgetown County, SC**
- **Marion County, SC**

## License

Proprietary - Atlas Lead Aggregation Platform
