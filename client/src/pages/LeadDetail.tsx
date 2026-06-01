import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Save, Phone, Mail, MapPin } from 'lucide-react';
import { useLead } from '../hooks/useLeads';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Badge } from '../components/Badge';
import { formatDate, formatCurrency } from '../lib/utils';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lead, loading, error, refetch } = useLead(id);
  const [notes, setNotes] = useState(lead?.notes || '');
  const [status, setStatus] = useState(lead?.status || 'new');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      refetch();
      alert('Lead updated successfully');
    } catch (error) {
      alert('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !lead) return <ErrorBoundary error={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <ArrowLeft size={20} />
        Back to Leads
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{lead.owner_name || 'Unknown Owner'}</h1>
                <Badge variant="type" value={lead.lead_type} className="mt-2" />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">County</p>
                <p className="text-lg font-semibold text-slate-900">{lead.county}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Property Address</p>
                <p className="font-semibold flex items-start gap-2">
                  <MapPin size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{lead.address || 'N/A'}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">City, State ZIP</p>
                <p className="font-semibold">
                  {lead.city}, {lead.state} {lead.zip}
                </p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {lead.case_number && (
                <div>
                  <p className="text-sm text-slate-600">Case Number</p>
                  <p className="font-semibold text-slate-900">{lead.case_number}</p>
                </div>
              )}
              {lead.filing_date && (
                <div>
                  <p className="text-sm text-slate-600">Filing Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(lead.filing_date)}</p>
                </div>
              )}
              {lead.assessed_value && (
                <div>
                  <p className="text-sm text-slate-600">Assessed Value</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(lead.assessed_value)}</p>
                </div>
              )}
              {lead.sale_amount && (
                <div>
                  <p className="text-sm text-slate-600">Sale Amount</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(lead.sale_amount)}</p>
                </div>
              )}
              {lead.lender && (
                <div>
                  <p className="text-sm text-slate-600">Lender</p>
                  <p className="font-semibold text-slate-900">{lead.lender}</p>
                </div>
              )}
              {lead.tax_year && (
                <div>
                  <p className="text-sm text-slate-600">Tax Year</p>
                  <p className="font-semibold text-slate-900">{lead.tax_year}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {lead.description && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-slate-700">{lead.description}</p>
            </div>
          )}

          {/* Mailing Address */}
          {lead.mailing_address && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Mailing Address</h2>
              <p className="font-semibold text-slate-900">{lead.mailing_address}</p>
              <p className="text-slate-600">
                {lead.mailing_city}, {lead.mailing_state} {lead.mailing_zip}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Status</h2>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="input mb-4"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
              <option value="not-interested">Not Interested</option>
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Skip Trace */}
          {lead.skip_traced && (
            <div className="card p-6 bg-green-50 border-green-200">
              <h2 className="text-lg font-semibold mb-4 text-green-900">Skip Trace Info</h2>
              <div className="space-y-3">
                {lead.st_phone && (
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-700">Phone</p>
                      <p className="font-semibold text-green-900">{lead.st_phone}</p>
                    </div>
                  </div>
                )}
                {lead.st_email && (
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-700">Email</p>
                      <p className="font-semibold text-green-900">{lead.st_email}</p>
                    </div>
                  </div>
                )}
                {lead.st_mailing && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-700">Mailing</p>
                      <p className="font-semibold text-green-900">{lead.st_mailing}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input h-32 resize-none"
              placeholder="Add notes about this lead..."
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary w-full mt-4 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {/* Meta Info */}
          <div className="card p-6 bg-slate-50">
            <h2 className="text-lg font-semibold mb-4">Info</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-600">Created</p>
                <p className="font-semibold text-slate-900">{formatDate(lead.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-600">Updated</p>
                <p className="font-semibold text-slate-900">{formatDate(lead.updated_at)}</p>
              </div>
              {lead.source_url && (
                <div>
                  <p className="text-slate-600">Source</p>
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-semibold truncate"
                  >
                    View Source
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
