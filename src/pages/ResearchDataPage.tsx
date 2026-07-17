import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { supabase } from '../lib/supabase';
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type Time,
} from 'lightweight-charts';
import {
  ArrowLeft,
  Hash,
  Percent,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react';

import type {
  Method,
  BacktestStats,
  TradeRecord,
  MonteCarloSimulationData,
} from '../types/database';

// ------------- Types for fetched data -----------------
type BacktestRow = {
  id: string;
  stats_json: BacktestStats;
  trade_history_json: TradeRecord[];
  created_at: string;
};
type MonteCarloRow = {
  id: string;
  prop_firm_target: number;
  prop_firm_daily_dd: number;
  prop_firm_total_dd: number;
  pass_probability: number;
  avg_trades_to_pass: number;
  simulation_data: MonteCarloSimulationData;
  created_at: string;
};

// ============================================================
// Equity Curve Chart (percent-based)
// ============================================================
const EquityCurveChart: React.FC<{ trades: TradeRecord[] }> = ({ trades }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const buildChart = useCallback(() => {
    if (!containerRef.current || trades.length === 0) return;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch { /* already disposed */ }
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8891b0',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(94,100,136,0.08)' },
        horzLines: { color: 'rgba(94,100,136,0.08)' },
      },
      width: containerRef.current.clientWidth,
      height: 360,
      rightPriceScale: {
        borderColor: 'rgba(94,100,136,0.15)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(94,100,136,0.15)',
        timeVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(59,130,246,0.3)', width: 1, style: 2, labelBackgroundColor: '#1e2231' },
        horzLine: { color: 'rgba(59,130,246,0.3)', width: 1, style: 2, labelBackgroundColor: '#1e2231' },
      },
    });

    const series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      title: 'Balance %',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#3b82f6',
      crosshairMarkerBackgroundColor: '#1e2231',
    });

    // Build percent-based equity curve
    // Use cumulative_profit as absolute equity, convert to percent of initial balance
    // If first cumulative_profit is close to first profit, assume starting from 0
    const firstCum = trades[0]?.cumulative_profit ?? 0;
    const initialBalance = firstCum - (trades[0]?.profit ?? 0); // balance before first trade

    const dataPoints = trades.map((t, idx) => {
      const balancePercent =
        initialBalance !== 0
          ? ((t.cumulative_profit - initialBalance) / Math.abs(initialBalance)) * 100
          : t.cumulative_profit; // fallback: use raw value if can't compute %

      // Use trade dates if available, otherwise use sequential numbering
      const dateStr = t.date_time?.split(' ')[0];
      const hasValidDate = dateStr && /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(dateStr);

      return {
        time: hasValidDate
          ? (dateStr!.replace(/\//g, '-') as unknown as Time)
          : ((idx + 1) as unknown as Time),
        value: parseFloat(balancePercent.toFixed(2)),
      };
    });

    // De-duplicate by time (keep last)
    const seen = new Map<string | number, typeof dataPoints[0]>();
    for (const pt of dataPoints) {
      seen.set(pt.time as unknown as string | number, pt);
    }
    const unique = Array.from(seen.values());

    series.setData(unique);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try { chart.remove(); } catch { /* ignore */ }
    };
  }, [trades]);

  useEffect(() => {
    const cleanup = buildChart();
    return cleanup;
  }, [buildChart]);

  return <div ref={containerRef} className="rounded-xl overflow-hidden" />;
};

// ============================================================
// Page Component
// ============================================================
export const ResearchDataPage: React.FC = () => {
  const { methodId } = useParams<{ methodId: string }>();
  const navigate = useNavigate();

  const [method, setMethod] = useState<Method | null>(null);
  const [backtest, setBacktest] = useState<BacktestRow | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!methodId) return;

    const fetchAll = async () => {
      setLoading(true);

      // Method
      const { data: mData } = await supabase
        .from('methods')
        .select('*')
        .eq('id', methodId)
        .single();
      setMethod(mData);

      // Latest backtest
      const { data: btData } = await supabase
        .from('backtest_sessions')
        .select('*')
        .eq('method_id', methodId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setBacktest(btData as BacktestRow | null);

      // Latest Monte Carlo (linked to that backtest)
      if (btData) {
        const { data: mcData } = await supabase
          .from('monte_carlo_results')
          .select('*')
          .eq('backtest_id', btData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setMonteCarlo(mcData as MonteCarloRow | null);
      }

      setLoading(false);
    };

    fetchAll();
  }, [methodId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    );
  }

  if (!method) {
    return (
      <div className="text-center py-20 text-surface-500">
        <p className="text-lg mb-4">Method not found.</p>
        <button
          onClick={() => navigate('/research-database')}
          className="text-brand-400 hover:underline cursor-pointer text-sm"
        >
          ← Back to database
        </button>
      </div>
    );
  }

  const stats = backtest?.stats_json ?? null;
  const trades = (backtest?.trade_history_json ?? []) as TradeRecord[];
  const mcData = monteCarlo?.simulation_data ?? null;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Back Nav + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/research-database')}
          className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-100 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-surface-100 tracking-tight">
            {method.name}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            {method.pair && (
              <span className="px-2.5 py-0.5 bg-surface-800 rounded-lg text-xs font-semibold text-surface-200">
                {method.pair}
              </span>
            )}
            {method.timeframe && (
              <span className="px-2.5 py-0.5 bg-surface-800 rounded-lg text-xs font-semibold text-surface-200">
                {method.timeframe}
              </span>
            )}
            {method.description && (
              <span className="text-xs text-surface-500 truncate max-w-md">
                {method.description}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION: Backtest Stats */}
      {/* ============================================================ */}
      {stats ? (
        <>
          <div>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={14} className="text-brand-400" /> Backtest Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Trades" value={stats.total_trades} icon={<Hash size={16} />} />
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
              <StatCard label="Max Drawdown" value={stats.max_drawdown} suffix="$" trend="down" icon={<TrendingDown size={16} />} />
              <StatCard label="Avg Win" value={stats.avg_profit} suffix="$" trend="up" />
              <StatCard label="Avg Loss" value={stats.avg_loss} suffix="$" trend="down" />
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION: Equity Curve Chart */}
          {/* ============================================================ */}
          {trades.length > 0 && (
            <Card padding="sm">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-semibold text-surface-200">
                  Balance Movement (%)
                </h3>
                <span className="text-[10px] bg-brand-600/10 text-brand-400 px-2 py-0.5 rounded-full font-semibold">
                  {trades.length} trades
                </span>
              </div>
              <EquityCurveChart trades={trades} />
            </Card>
          )}

          {/* ============================================================ */}
          {/* SECTION: Trade History Table */}
          {/* ============================================================ */}
          {trades.length > 0 && (
            <Card padding="sm">
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-sm font-semibold text-surface-200">
                  Trade History
                </h4>
                <span className="text-xs text-surface-500 font-mono">
                  {trades.length} rows
                </span>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-xl">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-800 z-10">
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
                    {trades.map((trade, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-surface-700/50 hover:bg-surface-800/40 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono text-surface-400">{trade.trade_number}</td>
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
                        <td className="px-3 py-2 text-surface-300 font-mono">{trade.date_time}</td>
                        <td className="px-3 py-2 text-right font-mono text-surface-300">{trade.price.toFixed(5)}</td>
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
                        <td className="px-3 py-2 text-right font-mono text-loss/70">
                          {trade.drawdown.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-surface-500 text-sm">No backtest data found for this method.</p>
        </Card>
      )}

      {/* ============================================================ */}
      {/* SECTION: Monte Carlo Results */}
      {/* ============================================================ */}
      <div>
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap size={14} className="text-purple-400" /> Monte Carlo Simulation
        </h3>
        {monteCarlo && mcData ? (
          <div className="space-y-4">
            {/* Params reminder */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-800/50">
              <div className="text-center">
                <p className="text-xs text-surface-400">Target Profit %</p>
                <p className="text-lg font-bold font-mono text-surface-100">{monteCarlo.prop_firm_target}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-surface-400">Max Daily DD %</p>
                <p className="text-lg font-bold font-mono text-surface-100">{monteCarlo.prop_firm_daily_dd}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-surface-400">Max Total DD %</p>
                <p className="text-lg font-bold font-mono text-surface-100">{monteCarlo.prop_firm_total_dd}</p>
              </div>
            </div>

            {/* MC Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Pass Probability"
                value={mcData.pass_probability}
                suffix="%"
                trend={mcData.pass_probability >= 60 ? 'up' : mcData.pass_probability >= 30 ? 'neutral' : 'down'}
                trendValue={mcData.pass_probability >= 60 ? 'Favorable' : mcData.pass_probability >= 30 ? 'Moderate' : 'Low'}
                icon={<BarChart3 size={16} />}
              />
              <StatCard
                label="Avg Trades to Pass"
                value={mcData.avg_trades_to_pass}
                icon={<Target size={16} />}
              />
              <StatCard
                label="Passed"
                value={mcData.pass_count.toLocaleString()}
                trend="up"
                trendValue={`of ${(mcData.pass_count + mcData.fail_count).toLocaleString()}`}
                icon={<CheckCircle2 size={16} />}
              />
              <StatCard
                label="Failed"
                value={mcData.fail_count.toLocaleString()}
                trend="down"
                trendValue={`${(100 - mcData.pass_probability).toFixed(1)}%`}
                icon={<XCircle size={16} />}
              />
            </div>

            {/* Equity Distribution Histogram */}
            <Card>
              <h4 className="text-sm font-semibold text-surface-200 mb-4">
                Final Equity Distribution
              </h4>
              <HistogramChart data={mcData.equity_distribution} target={monteCarlo.prop_firm_target} />
            </Card>

            <p className="text-[10px] text-surface-600 text-right flex items-center justify-end gap-1">
              <Clock size={10} /> Simulated on {new Date(monteCarlo.created_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-surface-500 text-sm">No Monte Carlo results found for this method.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Simple Histogram (pure CSS bars) — copied from StepMonteCarlo
// ============================================================
const HistogramChart: React.FC<{ data: number[]; target: number }> = ({ data, target }) => {
  if (data.length === 0) return null;

  const NUM_BINS = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binSize = range / NUM_BINS;

  const bins = new Array(NUM_BINS).fill(0) as number[];
  for (const val of data) {
    const idx = Math.min(Math.floor((val - min) / binSize), NUM_BINS - 1);
    bins[idx]++;
  }

  const maxBin = Math.max(...bins);
  const targetBinIdx = Math.floor((target - min) / binSize);

  return (
    <div className="relative">
      <div className="flex items-end gap-[1px] h-[140px]">
        {bins.map((count, idx) => {
          const height = maxBin > 0 ? (count / maxBin) * 100 : 0;
          const isTarget = idx === targetBinIdx;
          const isAboveTarget = idx >= targetBinIdx;

          return (
            <div
              key={idx}
              className={`flex-1 rounded-t-sm transition-all duration-500 ${
                isAboveTarget ? 'bg-profit/60' : 'bg-loss/40'
              } ${isTarget ? 'ring-1 ring-accent-400' : ''}`}
              style={{ height: `${height}%` }}
              title={`Range: ${(min + idx * binSize).toFixed(1)} - ${(min + (idx + 1) * binSize).toFixed(1)}\nCount: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-surface-500 font-mono">
        <span>{min.toFixed(1)}</span>
        <span className="text-accent-400">Target: {target}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
};
