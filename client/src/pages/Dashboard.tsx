import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-slate-200 rounded-lg" />
            <div className="h-32 bg-slate-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
              <p className="text-red-700">{error || 'Failed to load statistics'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topLeadTypes = Object.entries(stats.leads_by_type)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Overview of your lead aggregation metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<TrendingUp className="text-blue-600" size={24} />}
          label="Total Leads"
          value={stats.total_leads.toLocaleString()}
          subtext="All time"
        />
        <MetricCard
          icon={<Calendar className="text-green-600" size={24} />}
          label="New Today"
          value={stats.new_leads_today.toString()}
          subtext="Last 24 hours"
        />
        <MetricCard
          icon={<BarChart3 className="text-purple-600" size={24} />}
          label="Lead Types"
          value={Object.keys(stats.leads_by_type).length.toString()}
          subtext="Tracked categories"
        />
        <MetricCard
          icon={<AlertCircle className="text-orange-600" size={24} />}
          label="Status"
          value="Active"
          subtext={stats.last_scrape ? 'Last scrape: ' + new Date(stats.last_scrape).toLocaleDateString() : 'Never'}
        />
      </div>

      {/* Lead Types Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Top Lead Types</h2>
          <div className="space-y-3">
            {topLeadTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / stats.total_leads) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Status Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Lead Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.leads_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 capitalize">{status}</span>
                <span className="text-sm font-semibold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* County Breakdown */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Leads by County</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.leads_by_county).map(([county, count]) => (
            <div key={county} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">{county} County</p>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-2">{subtext}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
