import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeadsTable from './pages/LeadsTable';
import LeadDetail from './pages/LeadDetail';
import Settings from './pages/Settings';
import ScrapeStatus from './pages/ScrapeStatus';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientName, setClientName] = useState('Atlas Leads');

  useEffect(() => {
    // Fetch client config
    fetch('/api/stats/config')
      .then(r => r.json())
      .then(data => setClientName(data.name))
      .catch(console.error);
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-xl font-bold">{clientName}</h1>
              <p className="text-sm text-slate-400">Lead Aggregation</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <NavLink to="/" label="Dashboard" onClick={() => setSidebarOpen(false)} />
              <NavLink to="/leads" label="Leads" onClick={() => setSidebarOpen(false)} />
              <NavLink to="/scrape" label="Scrape Status" onClick={() => setSidebarOpen(false)} />
              <NavLink to="/settings" label="Settings" onClick={() => setSidebarOpen(false)} />
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
              <p>Atlas Leads Platform</p>
              <p>v1.0.0</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="text-lg font-semibold text-slate-900">Atlas Leads</h2>
            <div className="w-8" />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<LeadsTable />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/scrape" element={<ScrapeStatus />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>

        {/* Close sidebar on mobile when clicking outside */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </Router>
  );
}

function NavLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors"
    >
      {label}
    </Link>
  );
}
