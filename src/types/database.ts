// ============================================================
// Database Types — mirrors Supabase schema
// ============================================================

export type Method = {
  id: string;
  name: string;
  timeframe: string | null;
  pair: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type BacktestSession = {
  id: string;
  method_id: string;
  stats_json: BacktestStats;
  trade_history_json: TradeRecord[];
  created_at: string;
};

export type MonteCarloResult = {
  id: string;
  backtest_id: string;
  prop_firm_target: number;
  prop_firm_daily_dd: number;
  prop_firm_total_dd: number;
  pass_probability: number;
  avg_trades_to_pass: number;
  simulation_data: MonteCarloV2Result;
  created_at: string;
};

export type LiveMonitor = {
  id: string;
  method_id: string;
  live_equity_curve: EquityPoint[];
  live_win_rate: number;
  created_at: string;
};

// ============================================================
// Trade Data Types
// ============================================================

export type TradeRecord = {
  trade_number: number;
  type: 'Long' | 'Short' | string;
  signal: string;
  date_time: string;
  price: number;
  profit: number;
  cumulative_profit: number;
  run_up: number;
  drawdown: number;
};

export type BacktestStats = {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  total_profit: number;
  max_drawdown: number;
  avg_profit: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  sharpe_ratio: number;
  expectancy: number;
};

// ============================================================
// Monte Carlo V2 Types
// ============================================================

export type MonteCarloV2Params = {
  rMultiples: number[];
  accountSize: number;
  riskPerTrade: number;       // percentage, e.g. 1 = 1%
  profitTarget: number;       // percentage, e.g. 10 = 10%
  maxDailyDD: number;         // percentage, e.g. 5 = 5%
  maxTotalDD: number;         // percentage, e.g. 10 = 10%
  drawdownType: 'static' | 'trailing';
  minTradingDays: number;
  maxTradesPerDay: number;
  iterations: number;
};

export type MonteCarloV2Result = {
  pass_probability: number;
  avg_trades_to_pass: number;
  median_trades_to_pass: number;
  percentile_95_trades: number;
  pass_count: number;
  fail_count: number;
  fail_by_daily_dd: number;
  fail_by_total_dd: number;
  fail_by_no_target: number;
  equity_distribution: number[];
  max_dd_distribution: number[];
  trades_to_pass_distribution: number[];
};

export type MonteCarloProgress = {
  completed: number;
  total: number;
  percentage: number;
};

export type MonteCarloWorkerMessage = {
  type: 'progress' | 'result';
  data: MonteCarloProgress | MonteCarloV2Result;
};

// ============================================================
// Chart Types
// ============================================================

export type EquityPoint = {
  time: string;
  value: number;
};

// ============================================================
// Form Types
// ============================================================

export type MethodFormData = Omit<Method, 'id' | 'created_at' | 'updated_at'>;
