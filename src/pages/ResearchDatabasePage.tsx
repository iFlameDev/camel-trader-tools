import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Database,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SearchX,
} from 'lucide-react';

const PAGE_SIZE = 10;

interface DatabaseRow {
  methodName: string;
  pair: string | null;
  timeframe: string | null;
  winRate: number | null;
  totalTrades: number | null;
  estTradesToWin: number | null;
}

export const ResearchDatabasePage: React.FC = () => {
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Get total count of methods
    const { count } = await supabase
      .from('methods')
      .select('*', { count: 'exact', head: true });

    setTotalCount(count ?? 0);

    // 2. Get paginated methods
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: methods } = await supabase
      .from('methods')
      .select('id, name, pair, timeframe')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!methods || methods.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const methodIds = methods.map((m) => m.id);

    // 3. Fetch latest backtest for each method
    const { data: backtests } = await supabase
      .from('backtest_sessions')
      .select('id, method_id, stats_json')
      .in('method_id', methodIds)
      .order('created_at', { ascending: false });

    // De-duplicate: keep only latest backtest per method
    const latestBtMap = new Map<string, { id: string; stats_json: Record<string, unknown> }>();
    if (backtests) {
      for (const bt of backtests) {
        if (!latestBtMap.has(bt.method_id)) {
          latestBtMap.set(bt.method_id, { id: bt.id, stats_json: bt.stats_json as Record<string, unknown> });
        }
      }
    }

    // 4. Fetch monte carlo results for those backtests
    const btIds = Array.from(latestBtMap.values()).map((b) => b.id);
    let mcMap = new Map<string, number>();

    if (btIds.length > 0) {
      const { data: mcResults } = await supabase
        .from('monte_carlo_results')
        .select('backtest_id, avg_trades_to_pass')
        .in('backtest_id', btIds)
        .order('created_at', { ascending: false });

      if (mcResults) {
        for (const mc of mcResults) {
          if (!mcMap.has(mc.backtest_id)) {
            mcMap.set(mc.backtest_id, mc.avg_trades_to_pass);
          }
        }
      }
    }

    // 5. Compose rows
    const composed: DatabaseRow[] = methods.map((m) => {
      const bt = latestBtMap.get(m.id);
      const stats = bt?.stats_json as { win_rate?: number; total_trades?: number } | undefined;
      const estTrades = bt ? mcMap.get(bt.id) ?? null : null;

      return {
        methodName: m.name,
        pair: m.pair,
        timeframe: m.timeframe,
        winRate: stats?.win_rate ?? null,
        totalTrades: stats?.total_trades ?? null,
        estTradesToWin: estTrades,
      };
    });

    setRows(composed);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPage = (p: number) => {
    if (p >= 0 && p < totalPages) setPage(p);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-400">
          <Database size={22} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-surface-100">
            Research Database
          </h3>
          <p className="text-xs text-surface-500">
            Aggregated view of all methods, backtest statistics, and Monte Carlo projections.
          </p>
        </div>
      </div>

      {/* Table Card */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="px-6 py-4 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                  Method Name
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold text-surface-400 uppercase tracking-wider text-center" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-500/10 rounded-full text-brand-400 text-[10px] font-bold">
                    Backtest
                  </span>
                </th>
                <th className="px-6 py-4 text-[11px] font-semibold text-surface-400 uppercase tracking-wider text-center">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded-full text-amber-400 text-[10px] font-bold">
                    Monte Carlo
                  </span>
                </th>
              </tr>
              <tr className="border-b border-surface-800/60 bg-surface-900/40">
                <th className="px-6 py-2.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-2.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider text-center">
                  Pair
                </th>
                <th className="px-6 py-2.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider text-center">
                  Win Rate
                </th>
                <th className="px-6 py-2.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider text-center">
                  Total Trades
                </th>
                <th className="px-6 py-2.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider text-center">
                  Time Frame
                </th>
                <th className="px-6 py-2.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider text-center">
                  Est. Trades to Win
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-surface-500">
                      <Loader2 size={28} className="animate-spin text-brand-400" />
                      <span className="text-sm">Loading data…</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-surface-500">
                      <SearchX size={36} className="text-surface-700" />
                      <span className="text-sm">No methods found in the database.</span>
                      <span className="text-xs text-surface-600">
                        Create a method in the Research Pipeline to get started.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-surface-800/40 hover:bg-surface-800/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-surface-100">
                        {row.methodName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.pair ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-surface-800 rounded-lg text-xs font-semibold text-surface-200 tracking-wide">
                          {row.pair}
                        </span>
                      ) : (
                        <span className="text-xs text-surface-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.winRate !== null ? (
                        <span
                          className={`text-sm font-semibold ${
                            row.winRate >= 50
                              ? 'text-profit'
                              : 'text-loss'
                          }`}
                        >
                          {row.winRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-surface-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.totalTrades !== null ? (
                        <span className="text-sm text-surface-200 font-medium">
                          {row.totalTrades.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-surface-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.timeframe ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-surface-800 rounded-lg text-xs font-semibold text-surface-200">
                          {row.timeframe}
                        </span>
                      ) : (
                        <span className="text-xs text-surface-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.estTradesToWin !== null ? (
                        <span className="inline-flex items-center px-3 py-1 bg-amber-500/10 rounded-lg text-sm font-bold text-amber-400">
                          ~{Math.round(row.estTradesToWin)}
                        </span>
                      ) : (
                        <span className="text-xs text-surface-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700/50 bg-surface-900/30">
            <p className="text-xs text-surface-500">
              Showing{' '}
              <span className="font-semibold text-surface-300">
                {page * PAGE_SIZE + 1}
              </span>
              –
              <span className="font-semibold text-surface-300">
                {Math.min((page + 1) * PAGE_SIZE, totalCount)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-surface-300">
                {totalCount}
              </span>{' '}
              methods
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    i === page
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
