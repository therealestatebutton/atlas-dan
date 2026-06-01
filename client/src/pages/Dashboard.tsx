import React, { useEffect, useState } from 'react';
import { useStats } from '../hooks/useStats';
import { formatNumber } from '../lib/utils';

export default function Dashboard() {
  const { stats, loading, error } = useStats();
  const [countyStats, setCountyStats] = useState<any[]>([]);
  const [typeStats, setTypeStats] = useState<any[]>([]);

  useEffect(() => {
    fetchCountyStats();
    fetchTypeStats();
  }, []);

  const fetchCountyStats = async () => {
    try {
      const res = await fetch('/api/stats/by-county');
      const data = await res.json();
      setCountyStats(data);
    } catch (error) {
      console.error('Error fetching county stats:', error);
    }
  };

  const fetchTypeStats = async () => {
    try {
      const res = await fetch('/api/stats/by-type');
      const data = await res.json();
      setTypeStats(data);
    } catch (error) {
      console.error('Error fetching type stats:', error);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Atlas Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Total Leads</div>
          <div className="text-3xl font-bold mt-2">{formatNumber(stats?.totalLeads || 0)}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Active Leads</div>
          <div className="text-3xl font-bold mt-2 text-green-600">{formatNumber(stats?.activeLeads || 0)}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Counties</div>
          <div className="text-3xl font-bold mt-2">{stats?.countyCount || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Lead Types</div>
          <div className="text-3xl font-bold mt-2">{stats?.typeCount || 0}</div>
        </div>
      </div>

      {/* County Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Leads by County</h2>
          <div className="space-y-3">
            {countyStats.map((county: any) => (
              <div key={county.county} className="flex justify-between items-center">
                <span className="text-gray-700">{county.county}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(county.count / (stats?.totalLeads || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-bold w-12 text-right">{formatNumber(county.count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Type Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Leads by Type</h2>
          <div className="space-y-3">
            {typeStats.map((type: any) => (
              <div key={type.leadType} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">{type.leadType.replace('-', ' ')}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(type.count / (stats?.totalLeads || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-bold w-12 text-right">{formatNumber(type.count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Recent Scrapes</h2>
        <p className="text-gray-600">Last updated: {new Date().toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-2">Scrapes run daily at 6 AM EST</p>
      </div>
    </div>
  );
}
