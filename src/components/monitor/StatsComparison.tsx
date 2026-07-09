import React from 'react';
import { StatCard } from '../ui/StatCard';
import {
  Percent,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';

interface StatsComparisonProps {
  backtestStats: {
    win_rate: number;
    profit_factor: number;
    max_drawdown: number;
    sharpe_ratio: number;
    total_profit: number;
    expectancy: number;
  } | null;
  liveStats: {
    win_rate: number;
    profit_factor: number;
    current_drawdown: number;
    max_drawdown: number;
    total_profit: number;
    total_trades: number;
  } | null;
}

export const StatsComparison: React.FC<StatsComparisonProps> = ({
  backtestStats,
  liveStats,
}) => {
  if (!backtestStats && !liveStats) {
    return (
      <div className="text-center py-12 text-surface-500 text-sm">
        No data available for comparison
      </div>
    );
  }

  const comparisons = [
    {
      label: 'Win Rate',
      backtest: backtestStats ? `${backtestStats.win_rate}%` : '—',
      live: liveStats ? `${liveStats.win_rate}%` : '—',
      delta: backtestStats && liveStats
        ? liveStats.win_rate - backtestStats.win_rate
        : null,
      icon: <Percent size={16} />,
    },
    {
      label: 'Profit Factor',
      backtest: backtestStats ? `${backtestStats.profit_factor}` : '—',
      live: liveStats ? `${liveStats.profit_factor}` : '—',
      delta: backtestStats && liveStats
        ? liveStats.profit_factor - backtestStats.profit_factor
        : null,
      icon: <Target size={16} />,
    },
    {
      label: 'Max Drawdown',
      backtest: backtestStats ? `$${backtestStats.max_drawdown}` : '—',
      live: liveStats ? `$${liveStats.max_drawdown}` : '—',
      delta: backtestStats && liveStats
        ? -(liveStats.max_drawdown - backtestStats.max_drawdown)
        : null,
      icon: <TrendingDown size={16} />,
    },
    {
      label: 'Total P&L',
      backtest: backtestStats ? `$${backtestStats.total_profit}` : '—',
      live: liveStats ? `$${liveStats.total_profit}` : '—',
      delta: backtestStats && liveStats
        ? liveStats.total_profit - backtestStats.total_profit
        : null,
      icon: <TrendingUp size={16} />,
    },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
        <Zap size={16} className="text-accent-400" />
        Backtest vs Live Comparison
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {comparisons.map((item) => (
          <div
            key={item.label}
            className="glass rounded-2xl p-4 hover:bg-surface-800/60 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-surface-500 group-hover:text-brand-400 transition-colors">
                {item.icon}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-surface-500 mb-1">Backtest</p>
                <p className="text-sm font-bold font-mono text-brand-400">
                  {item.backtest}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-surface-500 mb-1">Live</p>
                <p className="text-sm font-bold font-mono text-profit">
                  {item.live}
                </p>
              </div>
            </div>

            {item.delta !== null && (
              <div
                className={`mt-3 pt-3 border-t border-surface-700/50 text-xs font-mono font-semibold ${
                  item.delta >= 0 ? 'text-profit' : 'text-loss'
                }`}
              >
                {item.delta >= 0 ? '▲' : '▼'} {Math.abs(item.delta).toFixed(2)} delta
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Extra stats row */}
      {(backtestStats || liveStats) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {backtestStats && (
            <StatCard
              label="Sharpe Ratio (BT)"
              value={backtestStats.sharpe_ratio}
              icon={<BarChart3 size={16} />}
              trend={backtestStats.sharpe_ratio >= 1 ? 'up' : 'neutral'}
            />
          )}
          {backtestStats && (
            <StatCard
              label="Expectancy (BT)"
              value={backtestStats.expectancy}
              suffix="$"
              trend={backtestStats.expectancy >= 0 ? 'up' : 'down'}
            />
          )}
          {liveStats && (
            <StatCard
              label="Live Trades"
              value={liveStats.total_trades}
              icon={<BarChart3 size={16} />}
            />
          )}
        </div>
      )}
    </div>
  );
};
