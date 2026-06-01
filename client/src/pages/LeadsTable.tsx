import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Filter, Search } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Pagination } from '../components/Pagination';
import { Badge } from '../components/Badge';
import { formatDate } from '../lib/utils';

export default function LeadsTable() {
  const [filters, setFilters] = useState({
    county: '',
    lead_type: '',
    status: '',
    search: '',
  });
  const [page, setPage] = useState(0);
  const limit = 50;

  const { leads, total, loading, error, refetch } = useLeads({
    ...filters,
    limit,
    offset: page,
  });

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.county) params.append('county', filters.county);
    if (filters.lead_type) params.append('lead_type', filters.lead_type);
    if (filters.status) params.append('status', filters.status);

    window.location.href = `/api/leads/export?${params}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
        <button onClick={handleExport} className="btn btn-primary flex items-center gap-2">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Owner, address, city..."
                className="input pl-10"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">County</label>
            <select
              className="input"
              value={filters.county}
              onChange={e => handleFilterChange('county', e.target.value)}
            >
              <option value="">All Counties</option>
              <option value="Horry">Horry</option>
              <option value="Georgetown">Georgetown</option>
              <option value="Marion">Marion</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Lead Type</label>
            <select
              className="input"
              value={filters.lead_type}
              onChange={e => handleFilterChange('lead_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="pre-foreclosure">Pre-Foreclosure</option>
              <option value="tax-delinquent">Tax Delinquent</option>
              <option value="probate">Probate</option>
              <option value="sheriff-sale">Sheriff Sale</option>
              <option value="fsbo">FSBO</option>
              <option value="lis-pendens">Lis Pendens</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
              <option value="not-interested">Not Interested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <ErrorBoundary error={error} onRetry={refetch}>
        <div className="card overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <p className="text-lg font-medium">No leads found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-cell text-left font-semibold text-slate-900">Owner</th>
                      <th className="table-cell text-left font-semibold text-slate-900">Address</th>
                      <th className="table-cell text-left font-semibold text-slate-900">Type</th>
                      <th className="table-cell text-left font-semibold text-slate-900">County</th>
                      <th className="table-cell text-left font-semibold text-slate-900">Status</th>
                      <th className="table-cell text-left font-semibold text-slate-900">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="table-cell">
                          <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {lead.owner_name || 'Unknown'}
                          </Link>
                        </td>
                        <td className="table-cell text-slate-600 text-sm">{lead.address || 'N/A'}</td>
                        <td className="table-cell">
                          <Badge variant="type" value={lead.lead_type} />
                        </td>
                        <td className="table-cell text-slate-600 text-sm">{lead.county}</td>
                        <td className="table-cell">
                          <Badge variant="status" value={lead.status} />
                        </td>
                        <td className="table-cell text-slate-600 text-sm">{formatDate(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={total}
                limit={limit}
                offset={page}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
