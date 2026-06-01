import express, { Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';
import { sendTestEmail } from '../email/index.js';

const router = express.Router();

// GET /api/settings - Get current settings (masks secrets)
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as Array<{ key: string; value: string }>;

    const settings: Record<string, any> = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });

    // Mask sensitive values
    const masked = { ...settings };
    if (masked.smtp_pass) masked.smtp_pass = '***';
    if (masked.skip_trace_key) masked.skip_trace_key = '***';
    if (masked.scraper_api_key) masked.scraper_api_key = '***';

    res.json(masked);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Save settings
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const settings = req.body;

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value));
    }

    // Update environment variables
    for (const [key, value] of Object.entries(settings)) {
      process.env[key.toUpperCase()] = String(value);
    }

    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// POST /api/settings/test-email - Send test email
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const success = await sendTestEmail(email);

    if (success) {
      res.json({ success: true, message: `Test email sent to ${email}` });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
