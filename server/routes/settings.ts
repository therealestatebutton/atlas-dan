import express, { Request, Response } from 'express';
import { SettingsService } from '../db/settings.js';
import { sendTestEmail } from '../email/index.js';

const router = express.Router();

// GET /api/settings - Get current settings (masks secrets)
router.get('/', (req: Request, res: Response) => {
  try {
    const settings = SettingsService.getAllMasked();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Save settings
router.post('/', (req: Request, res: Response) => {
  try {
    const settings = req.body;

    const updated = SettingsService.setMultiple(settings);

    // Update environment variables
    for (const [key, value] of Object.entries(settings)) {
      process.env[key.toUpperCase()] = String(value);
    }

    res.json({ success: true, message: `${updated} settings saved` });
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
