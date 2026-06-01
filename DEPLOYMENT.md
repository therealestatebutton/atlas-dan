# Railway Deployment Guide

This guide explains how to deploy the Atlas SC Leads platform to Railway.

## Prerequisites

- Railway account (https://railway.app)
- GitHub account with the project repository
- GitHub personal access token (if needed)

## Deployment Steps

### 1. Connect GitHub Repository

1. Log in to Railway (https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize Railway to access your GitHub account
5. Select the `atlas-sc-leads` repository

### 2. Configure Environment Variables

Once the project is created, add the following environment variables in Railway:

**Server Configuration:**
- `NODE_ENV`: `production`
- `PORT`: `5000`
- `DATABASE_PATH`: `/data/leads.db`

**Client Configuration:**
- `CLIENT_NAME`: `Atlas SC Leads`
- `CLIENT_EMAIL`: Your email address
- `CLIENT_COUNTIES`: `[{"name":"Horry","state":"SC"},{"name":"Georgetown","state":"SC"},{"name":"Marion","state":"SC"}]`

**Email Configuration (SMTP):**
- `SMTP_HOST`: Your SMTP server (e.g., `smtp.gmail.com`)
- `SMTP_PORT`: `587`
- `SMTP_USER`: Your email address
- `SMTP_PASS`: Your app password
- `SMTP_FROM`: Sender email address
- `EMAIL_RECIPIENTS`: Comma-separated recipient emails

**API Keys:**
- `SKIP_TRACE_KEY`: Your skip trace API key
- `SCRAPER_API_KEY`: Your scraper API key (optional)
- `BRIGHT_DATA_USER`: Your Bright Data username (optional)
- `BRIGHT_DATA_PASS`: Your Bright Data password (optional)

### 3. Configure Build Settings

Railway should automatically detect the project as a Node.js application. Verify:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18 or higher

### 4. Enable Persistent Storage

For the SQLite database to persist across deployments:

1. In Railway, go to your project settings
2. Add a volume mount:
   - **Mount Path**: `/data`
   - **Size**: 1GB (or as needed)

### 5. Deploy

1. Push your code to GitHub
2. Railway will automatically detect the push and start building
3. Monitor the build logs in the Railway dashboard
4. Once deployed, your app will be available at the provided Railway URL

## Monitoring and Maintenance

### View Logs

```bash
# In Railway dashboard, click "Logs" to view real-time application logs
```

### Manual Scrape

Access the application at your Railway URL and navigate to "Scrape Status" to trigger manual scrapes.

### Database Backup

The SQLite database is stored in the persistent volume at `/data/leads.db`. Railway will preserve this across deployments.

## Troubleshooting

### Build Failures

- Check that all environment variables are set correctly
- Verify Node.js version is 18+
- Check build logs for specific errors

### Runtime Errors

- Check application logs in Railway dashboard
- Verify all required environment variables are set
- Ensure database volume is mounted correctly

### Email Not Sending

- Verify SMTP credentials are correct
- Check that SMTP_PORT is correct (usually 587 for TLS)
- For Gmail, use an app password, not your main password
- Check email logs in the application

## GitHub Integration

The project is configured to auto-deploy when you push to GitHub:

1. Make changes locally
2. Commit and push to GitHub
3. Railway will automatically detect the push
4. Build and deploy will start automatically

## Scaling

To scale your application:

1. In Railway, go to project settings
2. Increase the number of replicas
3. Railway will load balance traffic automatically

## Custom Domain

To use a custom domain:

1. In Railway, go to your project settings
2. Add a custom domain
3. Update your DNS records as instructed by Railway

## Support

For Railway-specific issues, visit: https://railway.app/docs
