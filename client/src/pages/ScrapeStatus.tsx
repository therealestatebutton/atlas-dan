import { useState, useEffect } from 'react';
import { Play, RotateCw, AlertCircle, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatDateTime } from '../lib/utils';

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
  const [actionLoading, setActionLoading] = useState(false);

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
      setActionLoading(true);
      const response = await fetch('/api/scrape', { method: 'POST' });
      const data = await response.json();
      alert(`Scrape started: ${data.scrape_id}`);
      fetchStatus();
    } catch (error) {
      alert('Failed to start scrape');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHistoricalScrape = async () => {
    try {
      setActionLoading(true);
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
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Scrape Status</h1>

      {/* Current Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Current Status</h2>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
              scrapeStatus?.status === 'running'
                ? 'bg-green-100 text-green-800'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              scrapeStatus?.status === 'running' ? 'bg-green-600 animate-pulse' : 'bg-slate-600'
            }`} />
            {scrapeStatus?.status === 'running' ? 'Running' : 'Idle'}
          </div>
        </div>

        {scrapeStatus?.current_scrape && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-medium">
              Scrape in progress since {formatDateTime(scrapeStatus.current_scrape.started_at)}
            </p>
            <p className="text-xs text-blue-700 mt-1">ID: {scrapeStatus.current_scrape.id}</p>
          </div>
        )}

        {!scrapeStatus?.current_scrape && scrapeStatus?.last_scrape && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">
                  Last scrape completed {formatDateTime(scrapeStatus.last_scrape.completed_at)}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Found <span className="font-semibold">{scrapeStatus.last_scrape.leads_found}</span> leads
                </p>
              </div>
              {scrapeStatus.last_scrape.errors ? (
                <AlertCircle className="text-red-600" size={24} />
              ) : (
                <CheckCircle className="text-green-600" size={24} />
              )}
            </div>
            {scrapeStatus.last_scrape.errors && (
              <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                <p className="font-medium mb-1">Errors:</p>
                <p>{scrapeStatus.last_scrape.errors}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Scrape Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Scrape */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Manual Scrape</h2>
          <p className="text-sm text-slate-600 mb-4">
            Trigger a manual scrape to fetch the latest leads from all counties immediately.
          </p>
          <button
            onClick={handleManualScrape}
            disabled={scrapeStatus?.status === 'running' || actionLoading}
            className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} />
            {actionLoading ? 'Starting...' : 'Start Scrape Now'}
          </button>
        </div>

        {/* Historical Scrape */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Historical Backfill</h2>
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
            disabled={scrapeStatus?.status === 'running' || actionLoading}
            className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw size={18} />
            {actionLoading ? 'Starting...' : 'Start Historical Scrape'}
          </button>
        </div>
      </div>

      {/* Scrape History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Scrapes</h2>
        <div className="space-y-3">
          {scrapeStatus?.last_scrape ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">ID: {scrapeStatus.last_scrape.id}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Started: {formatDateTime(scrapeStatus.last_scrape.started_at)}
                  </p>
                  {scrapeStatus.last_scrape.completed_at && (
                    <p className="text-xs text-slate-600">
                      Completed: {formatDateTime(scrapeStatus.last_scrape.completed_at)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{scrapeStatus.last_scrape.leads_found}</p>
                  <p className="text-xs text-slate-600">leads found</p>
                  {scrapeStatus.last_scrape.errors && (
                    <p className="text-xs text-red-600 mt-1 flex items-center justify-end gap-1">
                      <AlertCircle size={14} />
                      Errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">No scrape history available</p>
          )}
        </div>
      </div>
    </div>
  );
}
