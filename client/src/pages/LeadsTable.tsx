import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Filter } from 'lucide-react';
import { Lead } from '../types';

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    county: '',
    lead_type: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.county) params.append('county', filters.county);
      if (filters.lead_type) params.append('lead_type', filters.lead_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', '50');

      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.county) params.append('county', filters.county);
    if (filters.lead_type) params.append('lead_type', filters.lead_type);
    if (filters.status) params.append('status', filters.status);

    window.location.href = `/api/leads/export?${params}`;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search..."
            className="input"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="input"
            value={filters.county}
            onChange={e => setFilters({ ...filters, county: e.target.value })}
          >
            <option value="">All Counties</option>
            <option value="Horry">Horry</option>
            <option value="Georgetown">Georgetown</option>
            <option value="Marion">Marion</option>
          </select>
          <select
            className="input"
            value={filters.lead_type}
            onChange={e => setFilters({ ...filters, lead_type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="pre-foreclosure">Pre-Foreclosure</option>
            <option value="tax-delinquent">Tax Delinquent</option>
            <option value="probate">Probate</option>
            <option value="sheriff-sale">Sheriff Sale</option>
            <option value="fsbo">FSBO</option>
          </select>
          <select
            className="input"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-600">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-6 text-center text-slate-600">No leads found</div>
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
                    <tr key={lead.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="table-cell">
                        <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:underline">
                          {lead.owner_name || 'N/A'}
                        </Link>
                      </td>
                      <td className="table-cell text-slate-600">{lead.address || 'N/A'}</td>
                      <td className="table-cell">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {lead.lead_type}
                        </span>
                      </td>
                      <td className="table-cell text-slate-600">{lead.county}</td>
                      <td className="table-cell">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            lead.status === 'new'
                              ? 'bg-green-100 text-green-800'
                              : lead.status === 'contacted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="table-cell text-slate-600">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
              Showing {leads.length} of {total} leads
            </div>
          </>
        )}
      </div>
    </div>
  );
}
