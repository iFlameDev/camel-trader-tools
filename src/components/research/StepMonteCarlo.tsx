import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { useMonteCarloWorker } from '../../hooks/useMonteCarloWorker';
import { supabase } from '../../lib/supabase';
import type { TradeRecord, BacktestStats, PropFirmParams } from '../../types/database';
import {
  Play,
  Zap,
  Target,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  XCircle,
  Save,
} from 'lucide-react';

interface StepMonteCarloProps {
  backtestId: string;
  trades: TradeRecord[];
  stats: BacktestStats;
}

export const StepMonteCarlo: React.FC<StepMonteCarloProps> = ({
  backtestId,
  trades,
  stats,
}) => {
  const [params, setParams] = useState<PropFirmParams>({
    targetProfit: 10,
    maxDailyDD: 5,
    maxTotalDD: 10,
  });
  const [iterations, setIterations] = useState(10000);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { run, progress, result, isRunning, error } = useMonteCarloWorker();

  const handleRunSimulation = () => {
    // Convert percentage targets to absolute values based on a hypothetical $100k account
    // Or use them as-is if trades are already in % terms
    run({
      trades,
      iterations,
      targetProfit: params.targetProfit,
      maxDailyDD: params.maxDailyDD,
      maxTotalDD: params.maxTotalDD,
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      const { error: dbError } = await supabase.from('monte_carlo_results').insert({
        backtest_id: backtestId,
        prop_firm_target: params.targetProfit,
        prop_firm_daily_dd: params.maxDailyDD,
        prop_firm_total_dd: params.maxTotalDD,
        pass_probability: result.pass_probability,
        avg_trades_to_pass: result.avg_trades_to_pass,
        simulation_data: result,
      });

      if (dbError) throw dbError;
      setSaved(true);
    } catch (err) {
      console.error('Failed to save Monte Carlo results:', err);
    } finally {
      setSaving(false);
    }
  };

  const progressPct = progress ? progress.percentage : 0;

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl mx-auto">
      {/* Prop Firm Parameters */}
      <Card gradient>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
            <Zap size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-surface-100">Monte Carlo Engine</h3>
            <p className="text-xs text-surface-400">
              Configure prop firm parameters and run {iterations.toLocaleString()} simulations
            </p>
          </div>
        </div>

        {/* Stats reminder */}
        <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-surface-800/50">
          <div className="text-center">
            <p className="text-xs text-surface-400">Trades</p>
            <p className="text-lg font-bold font-mono text-surface-100">{stats.total_trades}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-surface-400">Win Rate</p>
            <p className="text-lg font-bold font-mono text-surface-100">{stats.win_rate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-surface-400">Expectancy</p>
            <p className={`text-lg font-bold font-mono ${stats.expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>
              {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy}
            </p>
          </div>
        </div>

        {/* Parameter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
              Target Profit %
            </label>
            <div className="relative">
              <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="number"
                value={params.targetProfit}
                onChange={(e) => setParams({ ...params, targetProfit: parseFloat(e.target.value) || 0 })}
                step="0.5"
                min="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
              Max Daily DD %
            </label>
            <div className="relative">
              <TrendingDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="number"
                value={params.maxDailyDD}
                onChange={(e) => setParams({ ...params, maxDailyDD: parseFloat(e.target.value) || 0 })}
                step="0.5"
                min="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
              Max Total DD %
            </label>
            <div className="relative">
              <TrendingDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="number"
                value={params.maxTotalDD}
                onChange={(e) => setParams({ ...params, maxTotalDD: parseFloat(e.target.value) || 0 })}
                step="0.5"
                min="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Iterations */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
            Iterations
          </label>
          <div className="flex gap-2">
            {[1000, 5000, 10000, 50000].map((n) => (
              <button
                key={n}
                onClick={() => setIterations(n)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  iterations === n
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface-800 text-surface-400 border border-surface-600 hover:border-surface-500'
                }`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <Button
          onClick={handleRunSimulation}
          loading={isRunning}
          size="lg"
          className="w-full"
          icon={<Play size={18} />}
          disabled={isRunning}
        >
          {isRunning ? `Running... ${progressPct}%` : 'Run Monte Carlo Simulation'}
        </Button>

        {/* Progress Bar */}
        {isRunning && progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-surface-400 mb-1">
              <span>{progress.completed.toLocaleString()} / {progress.total.toLocaleString()}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-loss/10 border border-loss/20 text-loss text-xs font-medium">
            {error}
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-slide-up">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Pass Probability"
              value={result.pass_probability}
              suffix="%"
              trend={result.pass_probability >= 60 ? 'up' : result.pass_probability >= 30 ? 'neutral' : 'down'}
              trendValue={result.pass_probability >= 60 ? 'Favorable' : result.pass_probability >= 30 ? 'Moderate' : 'Low'}
              icon={<BarChart3 size={16} />}
            />
            <StatCard
              label="Avg Trades to Pass"
              value={result.avg_trades_to_pass}
              icon={<Target size={16} />}
            />
            <StatCard
              label="Passed"
              value={result.pass_count.toLocaleString()}
              trend="up"
              trendValue={`of ${(result.pass_count + result.fail_count).toLocaleString()}`}
              icon={<CheckCircle2 size={16} />}
            />
            <StatCard
              label="Failed"
              value={result.fail_count.toLocaleString()}
              trend="down"
              trendValue={`${(100 - result.pass_probability).toFixed(1)}%`}
              icon={<XCircle size={16} />}
            />
          </div>

          {/* Equity Distribution Histogram */}
          <Card>
            <h4 className="text-sm font-semibold text-surface-200 mb-4">
              Final Equity Distribution
            </h4>
            <HistogramChart data={result.equity_distribution} target={params.targetProfit} />
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            loading={saving}
            variant={saved ? 'secondary' : 'primary'}
            size="lg"
            className="w-full"
            icon={saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
            disabled={saved}
          >
            {saved ? 'Results Saved to Supabase ✓' : 'Save Results to Database'}
          </Button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Simple Histogram (canvas-free, pure CSS bars)
// ============================================================

const HistogramChart: React.FC<{ data: number[]; target: number }> = ({ data, target }) => {
  if (data.length === 0) return null;

  const NUM_BINS = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binSize = range / NUM_BINS;

  const bins = new Array(NUM_BINS).fill(0);
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
              style={{
                height: `${height}%`,
                animationDelay: `${idx * 15}ms`,
              }}
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
