import { BarChart3, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { useStats } from '../hooks/useStats';
import { LoadingSkeleton } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Badge } from '../components/Badge';

export default function Dashboard() {
  const { stats, loading, error, refetch } = useStats();

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <ErrorBoundary error={error} onRetry={refetch} />
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
        <p className="text-slate-600 mt-1">Overview of your lead aggregation metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          label="Last Scrape"
          value={stats.last_scrape ? new Date(stats.last_scrape).toLocaleDateString() : 'Never'}
          subtext="Most recent"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Types */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Top Lead Types</h2>
          <div className="space-y-4">
            {topLeadTypes.length > 0 ? (
              topLeadTypes.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">{type}</span>
                      <span className="text-sm font-semibold text-slate-900">{count}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(count / stats.total_leads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No leads yet</p>
            )}
          </div>
        </div>

        {/* Lead Status Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Lead Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.leads_by_status).length > 0 ? (
              Object.entries(stats.leads_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Badge variant="status" value={status} />
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No leads yet</p>
            )}
          </div>
        </div>
      </div>

      {/* County Breakdown */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Leads by County</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.leads_by_county).length > 0 ? (
            Object.entries(stats.leads_by_county).map(([county, count]) => (
              <div key={county} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <p className="text-sm text-slate-600 font-medium">{county} County</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{count}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {((count / stats.total_leads) * 100).toFixed(1)}% of total
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm col-span-3">No leads yet</p>
          )}
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
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-xs text-slate-500 mt-2">{subtext}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
