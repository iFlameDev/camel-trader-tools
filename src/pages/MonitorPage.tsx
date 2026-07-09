import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EquityChart } from '../components/monitor/EquityChart';
import { StatsComparison } from '../components/monitor/StatsComparison';
import { supabase } from '../lib/supabase';
import type { Method, BacktestSession, LiveMonitor } from '../types/database';
import {
  RefreshCw,
  ChevronDown,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const MonitorPage: React.FC = () => {
  const [methods, setMethods] = useState<Method[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [backtestSession, setBacktestSession] = useState<BacktestSession | null>(null);
  const [liveMonitor, setLiveMonitor] = useState<LiveMonitor | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch methods on mount
  useEffect(() => {
    const fetchMethods = async () => {
      const { data } = await supabase
        .from('methods')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setMethods(data);
        if (data.length > 0 && !selectedMethodId) {
          setSelectedMethodId(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchMethods();
  }, []);

  // Fetch data when method changes
  const fetchData = useCallback(async () => {
    if (!selectedMethodId) return;

    setRefreshing(true);

    // Fetch latest backtest
    const { data: btData } = await supabase
      .from('backtest_sessions')
      .select('*')
      .eq('method_id', selectedMethodId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setBacktestSession(btData);

    // Fetch latest live data
    const { data: liveData } = await supabase
      .from('live_monitor')
      .select('*')
      .eq('method_id', selectedMethodId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setLiveMonitor(liveData);
    setRefreshing(false);
  }, [selectedMethodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh polling (30s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Build equity curves from data
  const backtestEquity = React.useMemo(() => {
    if (!backtestSession?.trade_history_json) return [];
    const trades = backtestSession.trade_history_json as { date_time?: string; cumulative_profit?: number; profit?: number }[];
    
    let cumulative = 0;
    return trades.map((t, idx) => {
      cumulative += (t.profit || 0);
      // Generate sequential dates if no dates present
      const date = t.date_time || new Date(2024, 0, idx + 1).toISOString().split('T')[0];
      return {
        time: date.split(' ')[0] || date,
        value: t.cumulative_profit || cumulative,
      };
    });
  }, [backtestSession]);

  const liveEquity = React.useMemo(() => {
    if (!liveMonitor?.live_equity_curve) return [];
    return (liveMonitor.live_equity_curve as { time: string; value: number }[]) || [];
  }, [liveMonitor]);

  const backtestStats = React.useMemo(() => {
    if (!backtestSession?.stats_json) return null;
    const s = backtestSession.stats_json as {
      win_rate: number;
      profit_factor: number;
      max_drawdown: number;
      sharpe_ratio: number;
      total_profit: number;
      expectancy: number;
    };
    return s;
  }, [backtestSession]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Method Selector */}
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <select
            value={selectedMethodId || ''}
            onChange={(e) => setSelectedMethodId(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm cursor-pointer"
          >
            <option value="">Select a method...</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.pair} {m.timeframe}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
          />
        </div>

        {/* Auto Refresh Toggle */}
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            autoRefresh
              ? 'bg-profit/10 text-profit border border-profit/20'
              : 'bg-surface-800 text-surface-400 border border-surface-600 hover:border-surface-500'
          }`}
        >
          {autoRefresh ? <Wifi size={14} /> : <WifiOff size={14} />}
          {autoRefresh ? 'Live (30s)' : 'Auto-refresh Off'}
          {autoRefresh && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
            </span>
          )}
        </button>

        <Button
          onClick={fetchData}
          loading={refreshing}
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : methods.length === 0 ? (
        <Card className="text-center py-16">
          <Radio size={40} className="text-surface-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-300 mb-2">No Methods Found</h3>
          <p className="text-sm text-surface-500">
            Create a method in the Research Pipeline first to see monitoring data here.
          </p>
        </Card>
      ) : (
        <>
          {/* Equity Chart */}
          <Card padding="sm">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-semibold text-surface-200">
                Combined Equity Curve
              </h3>
              <div className="flex items-center gap-2">
                {backtestEquity.length > 0 && (
                  <span className="text-[10px] bg-brand-600/10 text-brand-400 px-2 py-0.5 rounded-full font-semibold">
                    BT: {backtestEquity.length} pts
                  </span>
                )}
                {liveEquity.length > 0 && (
                  <span className="text-[10px] bg-profit/10 text-profit px-2 py-0.5 rounded-full font-semibold">
                    LIVE: {liveEquity.length} pts
                  </span>
                )}
              </div>
            </div>
            <EquityChart
              backtestData={backtestEquity}
              liveData={liveEquity}
            />
          </Card>

          {/* Stats Comparison */}
          <StatsComparison
            backtestStats={backtestStats}
            liveStats={
              liveMonitor
                ? {
                    win_rate: liveMonitor.live_win_rate || 0,
                    profit_factor: 0,
                    current_drawdown: 0,
                    max_drawdown: 0,
                    total_profit: 0,
                    total_trades: 0,
                  }
                : null
            }
          />
        </>
      )}
    </div>
  );
};
