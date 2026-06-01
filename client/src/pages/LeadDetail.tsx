import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Lead } from '../types';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/leads/${id}`);
      const data = await response.json();
      setLead(data);
      setNotes(data.notes || '');
      setStatus(data.status);
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      const updated = await response.json();
      setLead(updated);
      alert('Lead updated successfully');
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!lead) return <div className="p-6">Lead not found</div>;

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate('/leads')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
        <ArrowLeft size={20} />
        Back to Leads
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h1 className="text-2xl font-bold mb-4">{lead.owner_name || 'Unknown Owner'}</h1>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Property Address</p>
                <p className="font-semibold">{lead.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">City, State ZIP</p>
                <p className="font-semibold">
                  {lead.city}, {lead.state} {lead.zip}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Lead Type</p>
                <p className="font-semibold capitalize">{lead.lead_type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">County</p>
                <p className="font-semibold">{lead.county}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {lead.case_number && (
                <div>
                  <p className="text-sm text-slate-600">Case Number</p>
                  <p className="font-semibold">{lead.case_number}</p>
                </div>
              )}
              {lead.filing_date && (
                <div>
                  <p className="text-sm text-slate-600">Filing Date</p>
                  <p className="font-semibold">{lead.filing_date}</p>
                </div>
              )}
              {lead.assessed_value && (
                <div>
                  <p className="text-sm text-slate-600">Assessed Value</p>
                  <p className="font-semibold">${lead.assessed_value}</p>
                </div>
              )}
              {lead.sale_amount && (
                <div>
                  <p className="text-sm text-slate-600">Sale Amount</p>
                  <p className="font-semibold">${lead.sale_amount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mailing Address */}
          {lead.mailing_address && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Mailing Address</h2>
              <p className="font-semibold">{lead.mailing_address}</p>
              <p>
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
            <select value={status} onChange={e => setStatus(e.target.value)} className="input mb-4">
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
              <option value="not-interested">Not Interested</option>
            </select>
            <button onClick={handleSave} className="btn btn-primary w-full">
              Save Changes
            </button>
          </div>

          {/* Skip Trace */}
          {lead.skip_traced && (
            <div className="card p-6 bg-green-50 border-green-200">
              <h2 className="text-lg font-semibold mb-4">Skip Trace Info</h2>
              {lead.st_phone && <p className="text-sm mb-2">📞 {lead.st_phone}</p>}
              {lead.st_email && <p className="text-sm mb-2">📧 {lead.st_email}</p>}
              {lead.st_mailing && <p className="text-sm">📬 {lead.st_mailing}</p>}
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
            <button onClick={handleSave} className="btn btn-primary w-full mt-4">
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
