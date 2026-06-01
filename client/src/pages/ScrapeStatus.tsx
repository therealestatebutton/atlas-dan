import { useState, useEffect } from 'react';
import { Play, RotateCw, AlertCircle } from 'lucide-react';

interface ScrapeStatus {
  status: 'running' | 'idle';
  current_scrape: { id: string; started_at: string } | null;
  last_scrape: {
    id: string;
    started_at: string;
    completed_at: string;
    leads_found: number;
    errors: string | null;
  } | null;
}

export default function ScrapeStatusPage() {
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalDays, setHistoricalDays] = useState(7);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scrape/status');
      const data = await response.json();
      setScrapeStatus(data);
    } catch (error) {
      console.error('Error fetching scrape status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScrape = async () => {
    try {
      const response = await fetch('/api/scrape', { method: 'POST' });
      const data = await response.json();
      alert(`Scrape started: ${data.scrape_id}`);
      fetchStatus();
    } catch (error) {
      alert('Failed to start scrape');
    }
  };

  const handleHistoricalScrape = async () => {
    try {
      const response = await fetch('/api/scrape/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: historicalDays }),
      });
      const data = await response.json();
      alert(`Historical scrape started: ${data.scrape_id} (${historicalDays} days)`);
      fetchStatus();
    } catch (error) {
      alert('Failed to start historical scrape');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Scrape Status</h1>

      {/* Current Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Current Status</h2>
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              scrapeStatus?.status === 'running'
                ? 'bg-green-100 text-green-800'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            {scrapeStatus?.status === 'running' ? '🟢 Running' : '⚫ Idle'}
          </div>
        </div>

        {scrapeStatus?.current_scrape && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              Scrape in progress since {new Date(scrapeStatus.current_scrape.started_at).toLocaleString()}
            </p>
          </div>
        )}

        {!scrapeStatus?.current_scrape && scrapeStatus?.last_scrape && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700 mb-2">
              Last scrape: {new Date(scrapeStatus.last_scrape.completed_at).toLocaleString()}
            </p>
            <p className="text-sm text-slate-700">
              Found {scrapeStatus.last_scrape.leads_found} leads
            </p>
            {scrapeStatus.last_scrape.errors && (
              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                {scrapeStatus.last_scrape.errors}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Scrape Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Scrape */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Manual Scrape</h2>
          <p className="text-sm text-slate-600 mb-4">
            Trigger a manual scrape to fetch the latest leads from all counties.
          </p>
          <button
            onClick={handleManualScrape}
            disabled={scrapeStatus?.status === 'running'}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Start Scrape Now
          </button>
        </div>

        {/* Historical Scrape */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Historical Backfill</h2>
          <p className="text-sm text-slate-600 mb-4">
            Pull leads from the past N days (up to 90 days).
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Days to retrieve:</label>
            <input
              type="number"
              min="1"
              max="90"
              value={historicalDays}
              onChange={e => setHistoricalDays(Math.min(90, Math.max(1, parseInt(e.target.value))))}
              className="input"
            />
          </div>
          <button
            onClick={handleHistoricalScrape}
            disabled={scrapeStatus?.status === 'running'}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <RotateCw size={18} />
            Start Historical Scrape
          </button>
        </div>
      </div>

      {/* Scrape History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Scrapes</h2>
        <div className="space-y-3">
          {scrapeStatus?.last_scrape ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{scrapeStatus.last_scrape.id}</p>
                  <p className="text-sm text-slate-600">
                    Started: {new Date(scrapeStatus.last_scrape.started_at).toLocaleString()}
                  </p>
                  {scrapeStatus.last_scrape.completed_at && (
                    <p className="text-sm text-slate-600">
                      Completed: {new Date(scrapeStatus.last_scrape.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{scrapeStatus.last_scrape.leads_found} leads</p>
                  {scrapeStatus.last_scrape.errors && (
                    <p className="text-sm text-red-600 flex items-center gap-1 justify-end">
                      <AlertCircle size={16} />
                      Errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">No scrape history available</p>
          )}
        </div>
      </div>
    </div>
  );
}
