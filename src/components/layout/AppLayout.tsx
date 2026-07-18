import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { FlaskConical, Database, Clock, Brain } from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
  '/research': {
    title: 'Research Pipeline',
    subtitle: 'Create methods, ingest backtests, and run Monte Carlo simulations',
    icon: <FlaskConical size={20} />,
  },
  '/research-database': {
    title: 'Research Database',
    subtitle: 'View papers, backtest results, and Monte Carlo runs',
    icon: <Database size={20} />,
  },
  '/monitor': {
    title: 'Upcoming Monitor',
    subtitle: 'Upcoming features to sync with MQL5 and monitor MetaTrader accounts',
    icon: <Clock size={20} />,
  },
  '/disc': {
    title: 'DISC Psychology Calculator',
    subtitle: 'Assess your behavioral traits and decision-making styles under market conditions',
    icon: <Brain size={20} />,
  },
};

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const currentPage = pageTitles[location.pathname] || pageTitles['/research'];

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ease-out ${
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-16 px-8 flex items-center gap-4 border-b border-surface-700/50 bg-surface-950/80 backdrop-blur-xl">
          <span className="text-brand-400">{currentPage.icon}</span>
          <div>
            <h2 className="text-sm font-semibold text-surface-100">
              {currentPage.title}
            </h2>
            <p className="text-xs text-surface-500 hidden sm:block">
              {currentPage.subtitle}
            </p>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
