import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, BarChart3, List, Settings, Zap } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import LeadsTable from './pages/LeadsTable';
import LeadDetail from './pages/LeadDetail';
import SettingsPage from './pages/Settings';
import ScrapeStatus from './pages/ScrapeStatus';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientName, setClientName] = useState('Atlas Leads');
  const location = useLocation();

  useEffect(() => {
    // Fetch client config
    fetch('/api/stats/config')
      .then(r => r.json())
      .then(data => setClientName(data.name))
      .catch(console.error);
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
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
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <NavLink
              to="/"
              label="Dashboard"
              icon={<BarChart3 size={20} />}
              active={isActive('/')}
            />
            <NavLink
              to="/leads"
              label="Leads"
              icon={<List size={20} />}
              active={isActive('/leads')}
            />
            <NavLink
              to="/scrape"
              label="Scrape Status"
              icon={<Zap size={20} />}
              active={isActive('/scrape')}
            />
            <NavLink
              to="/settings"
              label="Settings"
              icon={<Settings size={20} />}
              active={isActive('/settings')}
            />
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
            <p className="font-semibold">Atlas Leads</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h2 className="text-lg font-semibold text-slate-900 flex-1 text-center lg:text-left">
            {getPageTitle(location.pathname)}
          </h2>
          <div className="w-8" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadsTable />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/scrape" element={<ScrapeStatus />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function NavLink({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case '/':
      return 'Dashboard';
    case '/leads':
      return 'Leads';
    case '/scrape':
      return 'Scrape Status';
    case '/settings':
      return 'Settings';
    default:
      return 'Atlas Leads';
  }
}

export function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
