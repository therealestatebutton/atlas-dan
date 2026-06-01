import { useState, useEffect } from 'react';
import { Lead } from '../types';

interface LeadsResponse {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

interface UseLeadsOptions {
  county?: string;
  lead_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useLeads(options: UseLeadsOptions = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (options.county) params.append('county', options.county);
      if (options.lead_type) params.append('lead_type', options.lead_type);
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);
      params.append('limit', String(options.limit || 50));
      params.append('offset', String(options.offset || 0));

      const response = await fetch(`/api/leads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      
      const data: LeadsResponse = await response.json();
      setLeads(data.leads);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [options.county, options.lead_type, options.status, options.search, options.limit, options.offset]);

  return { leads, total, loading, error, refetch: fetchLeads };
}

export function useLead(id: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/leads/${id}`);
      if (!response.ok) throw new Error('Failed to fetch lead');
      
      const data: Lead = await response.json();
      setLead(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  return { lead, loading, error, refetch: fetchLead };
}
