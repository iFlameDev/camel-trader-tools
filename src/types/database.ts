// ============================================================
// Database Types — mirrors Supabase schema
// ============================================================

export interface Method {
  id: string;
  name: string;
  timeframe: string | null;
  pair: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BacktestSession {
  id: string;
  method_id: string;
  stats_json: BacktestStats;
  trade_history_json: TradeRecord[];
  created_at: string;
}

export interface MonteCarloResult {
  id: string;
  backtest_id: string;
  prop_firm_target: number;
  prop_firm_daily_dd: number;
  prop_firm_total_dd: number;
  pass_probability: number;
  avg_trades_to_pass: number;
  simulation_data: MonteCarloSimulationData;
  created_at: string;
}

export interface LiveMonitor {
  id: string;
  method_id: string;
  live_equity_curve: EquityPoint[];
  live_win_rate: number;
  created_at: string;
}

// ============================================================
// Trade Data Types
// ============================================================

export interface TradeRecord {
  trade_number: number;
  type: 'Long' | 'Short' | string;
  signal: string;
  date_time: string;
  price: number;
  profit: number;
  cumulative_profit: number;
  run_up: number;
  drawdown: number;
}

export interface BacktestStats {
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
}

// ============================================================
// Monte Carlo Types
// ============================================================

export interface MonteCarloParams {
  trades: TradeRecord[];
  iterations: number;
  targetProfit: number;
  maxDailyDD: number;
  maxTotalDD: number;
}

export interface MonteCarloSimulationData {
  pass_probability: number;
  avg_trades_to_pass: number;
  equity_distribution: number[];
  max_dd_distribution: number[];
  pass_count: number;
  fail_count: number;
}

export interface MonteCarloProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface MonteCarloWorkerMessage {
  type: 'progress' | 'result';
  data: MonteCarloProgress | MonteCarloSimulationData;
}

// ============================================================
// Chart Types
// ============================================================

export interface EquityPoint {
  time: string;
  value: number;
}

// ============================================================
// Form Types
// ============================================================

export type MethodFormData = Omit<Method, 'id' | 'created_at' | 'updated_at'>;

export interface PropFirmParams {
  targetProfit: number;
  maxDailyDD: number;
  maxTotalDD: number;
}
