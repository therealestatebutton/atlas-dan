import { useState, useEffect } from 'react';
import { Save, Mail } from 'lucide-react';

interface Settings {
  [key: string]: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' });
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    try {
      const response = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending test email' });
    }
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Settings</h1>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Email (SMTP)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
              <input
                type="text"
                className="input"
                value={settings.smtp_host || ''}
                onChange={e => setSettings({ ...settings, smtp_host: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
              <input
                type="number"
                className="input"
                value={settings.smtp_port || 587}
                onChange={e => setSettings({ ...settings, smtp_port: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP User</label>
              <input
                type="text"
                className="input"
                value={settings.smtp_user || ''}
                onChange={e => setSettings({ ...settings, smtp_user: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={settings.smtp_pass || ''}
                onChange={e => setSettings({ ...settings, smtp_pass: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
              <input
                type="email"
                className="input"
                value={settings.smtp_from || ''}
                onChange={e => setSettings({ ...settings, smtp_from: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipients (comma-separated)</label>
              <input
                type="text"
                className="input"
                value={settings.email_recipients || ''}
                onChange={e => setSettings({ ...settings, email_recipients: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Skip Trace API Key</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={settings.skip_trace_key || ''}
                onChange={e => setSettings({ ...settings, skip_trace_key: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scraper API Key (Optional)</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={settings.scraper_api_key || ''}
                onChange={e => setSettings({ ...settings, scraper_api_key: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bright Data User (Optional)</label>
              <input
                type="text"
                className="input"
                value={settings.bright_data_user || ''}
                onChange={e => setSettings({ ...settings, bright_data_user: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bright Data Pass (Optional)</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={settings.bright_data_pass || ''}
                onChange={e => setSettings({ ...settings, bright_data_pass: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Mail size={20} />
          Test Email Configuration
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Send a test email to verify your SMTP configuration is working correctly.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="test@example.com"
            className="input flex-1"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
          />
          <button onClick={handleTestEmail} className="btn btn-secondary">
            Send Test
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
          <Save size={18} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
