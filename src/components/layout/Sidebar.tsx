import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FlaskConical, BarChart3, Menu, X, Database, Clock } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navGroups = [
  {
    title: 'Research',
    items: [
      {
        to: '/research',
        icon: FlaskConical,
        label: 'Research Pipeline',
        description: 'Backtest & simulate',
      },
      {
        to: '/research-database',
        icon: Database,
        label: 'Research Database',
        description: 'Papers & simulations',
      },
    ]
  },
  {
    title: 'Monitor',
    items: [
      {
        to: '/monitor',
        icon: Clock,
        label: 'Upcoming Monitor',
        description: 'Sync MQL5 accounts',
      },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-50
        bg-surface-900/95 backdrop-blur-xl
        border-r border-surface-700/50
        transition-all duration-300 ease-out
        flex flex-col
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      {/* Logo Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-700/50 shrink-0">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-600/20 shrink-0">
          <BarChart3 size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-sm font-bold text-surface-100 tracking-tight whitespace-nowrap">
              Camel Trader
            </h1>
            <p className="text-[10px] text-surface-500 font-medium uppercase tracking-widest">
              Dashboard
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all cursor-pointer shrink-0"
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-6' : ''}`}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-semibold text-surface-500 uppercase tracking-widest animate-fade-in">
                {group.title}
              </h3>
            )}
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`
                      relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 group
                      ${
                        isActive
                          ? 'bg-brand-600/10 text-brand-400'
                          : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                      }
                    `}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-brand-500 animate-slide-in-right" />
                    )}

                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-200'
                      }`}
                    />

                    {!collapsed && (
                      <div className="animate-fade-in overflow-hidden -mt-0.5">
                        <p className="text-sm font-medium whitespace-nowrap">{item.label}</p>
                        <p className="text-[10px] text-surface-500 whitespace-nowrap mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-surface-700/50 shrink-0">
        {!collapsed && (
          <div className="animate-fade-in px-3">
            <p className="text-[10px] text-surface-600 font-medium">
              v1.0 • Client-side compute
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
