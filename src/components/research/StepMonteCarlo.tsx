import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { Tooltip } from '../ui/Tooltip';
import { useMonteCarloWorker } from '../../hooks/useMonteCarloWorker';
import { supabase } from '../../lib/supabase';
import type { TradeRecord, BacktestStats } from '../../types/database';
import {
  Play,
  Zap,
  Target,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  XCircle,
  Save,
  ShieldAlert,
  Clock,
  Repeat,
  DollarSign,
  Percent,
  CalendarDays,
  ListOrdered,
  ArrowDownUp,
  ArrowLeft,
} from 'lucide-react';

type StepMonteCarloProps = {
  backtestId: string;
  trades: TradeRecord[];
  stats: BacktestStats;
  onBack?: () => void;
};

export const StepMonteCarlo: React.FC<StepMonteCarloProps> = ({
  backtestId,
  trades,
  stats,
  onBack,
}) => {
  // Default avg risk = avg_loss from backtest (absolute value)
  const defaultAvgRisk = stats.avg_loss > 0 ? stats.avg_loss : 1;

  const [avgRiskInput, setAvgRiskInput] = useState(defaultAvgRisk);
  const [accountSize, setAccountSize] = useState(100000);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [profitTarget, setProfitTarget] = useState(10);
  const [maxDailyDD, setMaxDailyDD] = useState(5);
  const [maxTotalDD, setMaxTotalDD] = useState(10);
  const [drawdownType, setDrawdownType] = useState<'static' | 'trailing'>('static');
  const [minTradingDays, setMinTradingDays] = useState(5);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(3);
  const [iterations, setIterations] = useState(10000);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { run, progress, result, isRunning, error } = useMonteCarloWorker();

  // Compute R-multiples from trades
  const rMultiples = useMemo(() => {
    if (avgRiskInput <= 0) return [];
    return trades.map((t) => t.profit / avgRiskInput);
  }, [trades, avgRiskInput]);

  // Quick R-stats summary
  const rStats = useMemo(() => {
    if (rMultiples.length === 0) return null;
    const wins = rMultiples.filter((r) => r > 0);
    const losses = rMultiples.filter((r) => r < 0);
    const avgWinR = wins.length > 0 ? wins.reduce((s, r) => s + r, 0) / wins.length : 0;
    const avgLossR = losses.length > 0 ? losses.reduce((s, r) => s + r, 0) / losses.length : 0;
    return {
      avgWinR: avgWinR.toFixed(2),
      avgLossR: avgLossR.toFixed(2),
      expectancyR: ((avgWinR * (wins.length / rMultiples.length)) + (avgLossR * (losses.length / rMultiples.length))).toFixed(3),
    };
  }, [rMultiples]);

  const handleRunSimulation = () => {
    run({
      rMultiples,
      accountSize,
      riskPerTrade,
      profitTarget,
      maxDailyDD,
      maxTotalDD,
      drawdownType,
      minTradingDays,
      maxTradesPerDay,
      iterations,
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      const { error: dbError } = await supabase.from('monte_carlo_results').insert({
        backtest_id: backtestId,
        prop_firm_target: profitTarget,
        prop_firm_daily_dd: maxDailyDD,
        prop_firm_total_dd: maxTotalDD,
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
      {/* ============== SECTION: R-Multiple Configuration ============== */}
      <Card gradient>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
            <Zap size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-surface-100">Monte Carlo Engine V2</h3>
            <p className="text-xs text-surface-400">
              Compound risk simulation with R-multiple normalization
            </p>
          </div>
        </div>

        {/* Backtest stats reminder */}
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
            <p className="text-xs text-surface-400">Avg Loss</p>
            <p className="text-lg font-bold font-mono text-loss">${stats.avg_loss.toFixed(2)}</p>
          </div>
        </div>

        {/* Avg Risk Input for R-multiple */}
        <div className="mb-6">
          <Tooltip text="Rata-rata risk (dalam dollar/pips) per trade dari backtest. Digunakan untuk menormalisasi semua profit menjadi R-multiple (kelipatan risk). Default diambil dari avg loss backtest Anda.">
            <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
              Average Risk per Trade ($)
            </label>
          </Tooltip>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="number"
              value={avgRiskInput}
              onChange={(e) => setAvgRiskInput(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0.01"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
            />
          </div>
          {rStats && (
            <div className="mt-3 flex items-center gap-4 text-xs text-surface-400">
              <span>Avg Win: <strong className="text-profit">{rStats.avgWinR}R</strong></span>
              <span>Avg Loss: <strong className="text-loss">{rStats.avgLossR}R</strong></span>
              <span>Expectancy: <strong className={parseFloat(rStats.expectancyR) >= 0 ? 'text-profit' : 'text-loss'}>{rStats.expectancyR}R</strong></span>
            </div>
          )}
        </div>

        {/* ============== Prop Firm Parameters ============== */}
        <div className="border-t border-surface-700/50 pt-6 mb-6">
          <h4 className="text-sm font-semibold text-surface-200 mb-4 flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-400" />
            Prop Firm Challenge Rules
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Size */}
            <div>
              <Tooltip text="Ukuran akun prop firm yang akan digunakan. Tidak mempengaruhi probabilitas lolos, tapi mempengaruhi kalkulasi dollar amount dari risk dan drawdown.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Account Size
                </label>
              </Tooltip>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)}
                  min="1000"
                  step="1000"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>

            {/* Risk per Trade */}
            <div>
              <Tooltip text="Persentase akun yang dirisikokan setiap trade. Compound: dihitung dari saldo terkini. Contoh: 1% dari $100K = $1000 risk per trade. Semakin besar risk, semakin cepat mencapai target TAPI semakin tinggi risiko kena drawdown limit.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Risk per Trade (%)
                </label>
              </Tooltip>
              <div className="relative">
                <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>

            {/* Profit Target */}
            <div>
              <Tooltip text="Target profit untuk lulus challenge prop firm, biasanya 8-10% dari akun. Anda harus mencapai profit ini tanpa melanggar batas drawdown.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Profit Target (%)
                </label>
              </Tooltip>
              <div className="relative">
                <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={profitTarget}
                  onChange={(e) => setProfitTarget(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>

            {/* Max Daily DD */}
            <div>
              <Tooltip text="Batas kerugian harian dari prop firm. Jika dalam satu hari Anda rugi melebihi persentase ini dari akun awal, challenge langsung gagal. Biasanya 4-5%.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Max Daily DD (%)
                </label>
              </Tooltip>
              <div className="relative">
                <TrendingDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={maxDailyDD}
                  onChange={(e) => setMaxDailyDD(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>

            {/* Max Total DD */}
            <div>
              <Tooltip text="Batas total kerugian keseluruhan. Jika saldo turun melebihi persentase ini dari akun, challenge gagal. Biasanya 8-12%. Cara menghitungnya tergantung tipe drawdown (static/trailing).">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Max Total DD (%)
                </label>
              </Tooltip>
              <div className="relative">
                <TrendingDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={maxTotalDD}
                  onChange={(e) => setMaxTotalDD(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>

            {/* Drawdown Type */}
            <div>
              <Tooltip text="Static: drawdown dihitung dari saldo awal. Misal akun $100K, DD limit 10% = gagal jika saldo turun ke $90K. Trailing: drawdown dihitung dari saldo TERTINGGI yang pernah dicapai. Lebih ketat karena batas bergerak naik.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Drawdown Type
                </label>
              </Tooltip>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDrawdownType('static')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    drawdownType === 'static'
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface-800 text-surface-400 border border-surface-600 hover:border-surface-500'
                  }`}
                >
                  <ArrowDownUp size={14} /> Static
                </button>
                <button
                  type="button"
                  onClick={() => setDrawdownType('trailing')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    drawdownType === 'trailing'
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface-800 text-surface-400 border border-surface-600 hover:border-surface-500'
                  }`}
                >
                  <Repeat size={14} /> Trailing
                </button>
              </div>
            </div>

            {/* Min Trading Days */}
            <div>
              <Tooltip text="Minimum jumlah hari trading aktif yang diwajibkan oleh prop firm sebelum challenge dianggap selesai. Biasanya 5-10 hari. Simulasi akan memastikan perlu minimal (minDays × tradesPerDay) trade sebelum bisa pass.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Min Trading Days
                </label>
              </Tooltip>
              <div className="relative">
                <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={minTradingDays}
                  onChange={(e) => setMinTradingDays(parseInt(e.target.value) || 0)}
                  min="0"
                  max="60"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>

            {/* Max Trades per Day */}
            <div>
              <Tooltip text="Estimasi jumlah trade per hari sesuai dengan metode trading Anda. Digunakan untuk menghitung daily DD reset dan memodelkan hari trading. Sesuaikan dengan strategi: scalper bisa 5-10, swing trader 1-3.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Max Trades / Day
                </label>
              </Tooltip>
              <div className="relative">
                <ListOrdered size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="number"
                  value={maxTradesPerDay}
                  onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value) || 1)}
                  min="1"
                  max="50"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Iterations */}
        <div className="mb-6">
          <Tooltip text="Jumlah simulasi acak yang dijalankan. Semakin banyak semakin akurat hasilnya tapi semakin lama prosesnya. 10.000 biasanya cukup untuk hasil yang stabil.">
            <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
              Iterations
            </label>
          </Tooltip>
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
        <div className="flex gap-4">
          {onBack && (
            <Button
              onClick={onBack}
              disabled={isRunning}
              variant="secondary"
              size="lg"
              icon={<ArrowLeft size={18} />}
              className="w-full md:w-auto"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleRunSimulation}
            loading={isRunning}
            size="lg"
            className="flex-1"
            icon={<Play size={18} />}
            disabled={isRunning || rMultiples.length === 0}
          >
            {isRunning ? `Running... ${progressPct}%` : 'Run Monte Carlo Simulation'}
          </Button>
        </div>

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

      {/* ============== RESULTS ============== */}
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
              label="Est. Max Trades (P95)"
              value={result.percentile_95_trades}
              trend="neutral"
              trendValue="95th percentile"
              icon={<Clock size={16} />}
            />
            <StatCard
              label="Median Trades"
              value={result.median_trades_to_pass}
              icon={<Target size={16} />}
            />
            <StatCard
              label="Avg Trades to Pass"
              value={result.avg_trades_to_pass}
              icon={<Target size={16} />}
            />
          </div>

          {/* Pass / Fail breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Passed"
              value={result.pass_count.toLocaleString()}
              trend="up"
              trendValue={`of ${(result.pass_count + result.fail_count).toLocaleString()}`}
              icon={<CheckCircle2 size={16} />}
            />
            <StatCard
              label="Failed — Daily DD"
              value={result.fail_by_daily_dd.toLocaleString()}
              trend="down"
              trendValue={`${result.fail_count > 0 ? ((result.fail_by_daily_dd / result.fail_count) * 100).toFixed(0) : 0}% of fails`}
              icon={<XCircle size={16} />}
            />
            <StatCard
              label="Failed — Total DD"
              value={result.fail_by_total_dd.toLocaleString()}
              trend="down"
              trendValue={`${result.fail_count > 0 ? ((result.fail_by_total_dd / result.fail_count) * 100).toFixed(0) : 0}% of fails`}
              icon={<XCircle size={16} />}
            />
            <StatCard
              label="Failed — No Target"
              value={result.fail_by_no_target.toLocaleString()}
              trend="down"
              trendValue="Ran out of trades"
              icon={<XCircle size={16} />}
            />
          </div>

          {/* Equity Distribution Histogram */}
          <Card>
            <h4 className="text-sm font-semibold text-surface-200 mb-4">
              Final Equity Distribution
            </h4>
            <HistogramChart
              data={result.equity_distribution}
              target={accountSize + accountSize * (profitTarget / 100)}
              label={`Target: $${(accountSize + accountSize * (profitTarget / 100)).toLocaleString()}`}
            />
          </Card>

          {/* Trades to Pass Distribution */}
          {result.trades_to_pass_distribution.length > 0 && (
            <Card>
              <h4 className="text-sm font-semibold text-surface-200 mb-4">
                Trades to Pass Distribution
              </h4>
              <HistogramChart
                data={result.trades_to_pass_distribution}
                target={result.percentile_95_trades}
                label={`P95: ~${result.percentile_95_trades} trades`}
              />
            </Card>
          )}

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

const HistogramChart: React.FC<{ data: number[]; target: number; label?: string }> = ({ data, target, label }) => {
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
  const targetBinIdx = Math.min(Math.max(Math.floor((target - min) / binSize), 0), NUM_BINS - 1);

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
        <span className="text-accent-400">{label || `Target: ${target.toFixed(1)}`}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
};
