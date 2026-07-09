import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix = '',
  trend,
  trendValue,
  icon,
  className = '',
}) => {
  const trendColors = {
    up: 'text-profit',
    down: 'text-loss',
    neutral: 'text-surface-400',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div
      className={`glass rounded-2xl p-5 animate-fade-in group hover:bg-surface-800/60 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="text-surface-500 group-hover:text-brand-400 transition-colors">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-surface-100 tracking-tight font-mono">
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-medium text-surface-400">{suffix}</span>
        )}
      </div>
      {trend && trendValue && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendColors[trend]}`}>
          <span>{trendIcons[trend]}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};
