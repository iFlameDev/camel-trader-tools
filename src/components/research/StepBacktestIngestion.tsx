import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { DropZone } from '../ui/DropZone';
import { supabase } from '../../lib/supabase';
import type { TradeRecord, BacktestStats } from '../../types/database';
import {
  ChevronRight,
  Database,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Percent,
  Hash,
} from 'lucide-react';

interface StepBacktestIngestionProps {
  methodId: string;
  onComplete: (backtestId: string, trades: TradeRecord[], stats: BacktestStats) => void;
}

/**
 * Parse a raw CSV row into a typed TradeRecord.
 * TradingView exports vary, so we try common column names.
 */
function parseTradeRow(row: Record<string, string>, index: number): TradeRecord {
  // Try common column name variations
  const getVal = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(
        (k) => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (found && row[found] !== undefined && row[found] !== '') return row[found];
    }
    return '0';
  };

  return {
    trade_number: parseInt(getVal(['tradeno', 'trade', 'tradenumber', 'no', '#'])) || index + 1,
    type: getVal(['type', 'side', 'direction']) || 'Long',
    signal: getVal(['signal', 'comment', 'tag']) || '',
    date_time: getVal(['datetime', 'date', 'time', 'entrydate', 'entrydate/time', 'closedatetime']) || '',
    price: parseFloat(getVal(['price', 'entryprice', 'entry'])) || 0,
    profit: parseFloat(getVal(['profit', 'pl', 'pnl', 'profitloss', 'netprofit', 'profit%'])) || 0,
    cumulative_profit: parseFloat(getVal(['cumulativeprofit', 'cumprofit', 'cumpl', 'runningtotal'])) || 0,
    run_up: parseFloat(getVal(['runup', 'maxrunup', 'mae'])) || 0,
    drawdown: parseFloat(getVal(['drawdown', 'dd', 'maxdrawdown', 'mfe'])) || 0,
  };
}

function computeStats(trades: TradeRecord[]): BacktestStats {
  if (trades.length === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      total_profit: 0,
      max_drawdown: 0,
      avg_profit: 0,
      avg_loss: 0,
      largest_win: 0,
      largest_loss: 0,
      sharpe_ratio: 0,
      expectancy: 0,
    };
  }

  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));

  // Calculate max drawdown from equity curve
  let peak = 0;
  let maxDD = 0;
  let equity = 0;
  for (const trade of trades) {
    equity += trade.profit;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe ratio (simplified: mean/std of returns)
  const mean = totalProfit / trades.length;
  const variance =
    trades.reduce((sum, t) => sum + Math.pow(t.profit - mean, 2), 0) / trades.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev !== 0 ? mean / stdDev : 0;

  return {
    total_trades: trades.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: parseFloat(((wins.length / trades.length) * 100).toFixed(2)),
    profit_factor: grossLoss !== 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? Infinity : 0,
    total_profit: parseFloat(totalProfit.toFixed(2)),
    max_drawdown: parseFloat(maxDD.toFixed(2)),
    avg_profit: wins.length > 0 ? parseFloat((grossProfit / wins.length).toFixed(2)) : 0,
    avg_loss: losses.length > 0 ? parseFloat((grossLoss / losses.length).toFixed(2)) : 0,
    largest_win: wins.length > 0 ? parseFloat(Math.max(...wins.map((t) => t.profit)).toFixed(2)) : 0,
    largest_loss: losses.length > 0 ? parseFloat(Math.abs(Math.min(...losses.map((t) => t.profit))).toFixed(2)) : 0,
    sharpe_ratio: parseFloat(sharpe.toFixed(3)),
    expectancy: parseFloat(mean.toFixed(2)),
  };
}

export const StepBacktestIngestion: React.FC<StepBacktestIngestionProps> = ({
  methodId,
  onComplete,
}) => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeStats(trades), [trades]);

  const handleCSVParsed = (data: Record<string, string>[], _file: File) => {
    const parsed = data.map((row, idx) => parseTradeRow(row, idx));

    // Recalculate cumulative profit if not in CSV
    let cumulative = 0;
    for (const trade of parsed) {
      cumulative += trade.profit;
      if (trade.cumulative_profit === 0) {
        trade.cumulative_profit = parseFloat(cumulative.toFixed(2));
      }
    }

    setTrades(parsed);
    setError(null);
  };

  const handleSave = async () => {
    if (trades.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('backtest_sessions')
        .insert({
          method_id: methodId,
          stats_json: stats,
          trade_history_json: trades,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;
      if (data) onComplete(data.id, trades, stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save backtest');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl mx-auto">
      {/* Drop Zone */}
      <Card gradient>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-600/20 flex items-center justify-center">
            <Database size={20} className="text-accent-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-surface-100">Backtest Ingestion</h3>
            <p className="text-xs text-surface-400">
              Upload your TradingView strategy report CSV
            </p>
          </div>
        </div>

        <DropZone onParsed={handleCSVParsed} />
      </Card>

      {/* Stats Grid */}
      {trades.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Trades"
              value={stats.total_trades}
              icon={<Hash size={16} />}
            />
            <StatCard
              label="Win Rate"
              value={stats.win_rate}
              suffix="%"
              trend={stats.win_rate >= 50 ? 'up' : 'down'}
              trendValue={`${stats.winning_trades}W / ${stats.losing_trades}L`}
              icon={<Percent size={16} />}
            />
            <StatCard
              label="Profit Factor"
              value={stats.profit_factor === Infinity ? '∞' : stats.profit_factor}
              trend={stats.profit_factor >= 1.5 ? 'up' : stats.profit_factor >= 1 ? 'neutral' : 'down'}
              trendValue={stats.profit_factor >= 1.5 ? 'Strong' : stats.profit_factor >= 1 ? 'Marginal' : 'Weak'}
              icon={<Target size={16} />}
            />
            <StatCard
              label="Sharpe Ratio"
              value={stats.sharpe_ratio}
              trend={stats.sharpe_ratio >= 1 ? 'up' : stats.sharpe_ratio >= 0 ? 'neutral' : 'down'}
              icon={<BarChart3 size={16} />}
            />
            <StatCard
              label="Total P&L"
              value={stats.total_profit}
              suffix="$"
              trend={stats.total_profit >= 0 ? 'up' : 'down'}
              icon={stats.total_profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            />
            <StatCard
              label="Max Drawdown"
              value={stats.max_drawdown}
              suffix="$"
              trend="down"
              icon={<TrendingDown size={16} />}
            />
            <StatCard
              label="Avg Win"
              value={stats.avg_profit}
              suffix="$"
              trend="up"
            />
            <StatCard
              label="Avg Loss"
              value={stats.avg_loss}
              suffix="$"
              trend="down"
            />
          </div>

          {/* Trade Preview Table */}
          <Card padding="sm">
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-sm font-semibold text-surface-200">
                Trade History Preview
              </h4>
              <span className="text-xs text-surface-500 font-mono">
                {trades.length} rows parsed
              </span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-800">
                  <tr className="text-surface-400 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Date/Time</th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">P&L</th>
                    <th className="px-3 py-2 text-right font-medium">Cum. P&L</th>
                    <th className="px-3 py-2 text-right font-medium">DD</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 50).map((trade, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-surface-700/50 hover:bg-surface-800/40 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-surface-400">
                        {trade.trade_number}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            trade.type.toLowerCase().includes('long')
                              ? 'bg-profit/10 text-profit'
                              : 'bg-loss/10 text-loss'
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-surface-300 font-mono">
                        {trade.date_time}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-surface-300">
                        {trade.price.toFixed(5)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-semibold ${
                          trade.profit >= 0 ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {trade.profit >= 0 ? '+' : ''}
                        {trade.profit.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-surface-300">
                        {trade.cumulative_profit.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-loss-light">
                        {trade.drawdown.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {trades.length > 50 && (
                <div className="text-center py-3 text-xs text-surface-500">
                  Showing first 50 of {trades.length} trades
                </div>
              )}
            </div>
          </Card>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-loss/10 border border-loss/20 text-loss text-xs font-medium">
              {error}
            </div>
          )}

          <Button
            onClick={handleSave}
            loading={saving}
            size="lg"
            className="w-full"
            icon={<ChevronRight size={18} />}
          >
            Save Backtest & Continue to Monte Carlo
          </Button>
        </>
      )}
    </div>
  );
};
