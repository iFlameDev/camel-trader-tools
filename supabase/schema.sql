-- ============================================================
-- Project Dashboard Camel Trader — Supabase Schema
-- Run this in the Supabase SQL Editor to initialize the database
-- ============================================================

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. METHODS — Trading research methodologies
-- ============================================================
CREATE TABLE IF NOT EXISTS methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  timeframe TEXT,
  pair TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. BACKTEST SESSIONS — Parsed CSV results linked to a method
-- ============================================================
CREATE TABLE IF NOT EXISTS backtest_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  method_id UUID REFERENCES methods(id) ON DELETE CASCADE NOT NULL,
  stats_json JSONB DEFAULT '{}'::jsonb,
  trade_history_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. MONTE CARLO RESULTS — Simulation outputs linked to backtest
-- ============================================================
CREATE TABLE IF NOT EXISTS monte_carlo_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backtest_id UUID REFERENCES backtest_sessions(id) ON DELETE CASCADE NOT NULL,
  prop_firm_target NUMERIC NOT NULL DEFAULT 0,
  prop_firm_daily_dd NUMERIC NOT NULL DEFAULT 0,
  prop_firm_total_dd NUMERIC NOT NULL DEFAULT 0,
  pass_probability NUMERIC NOT NULL DEFAULT 0,
  avg_trades_to_pass NUMERIC NOT NULL DEFAULT 0,
  simulation_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. LIVE MONITOR — Live MQL5 equity data (written by Edge Function)
-- ============================================================
CREATE TABLE IF NOT EXISTS live_monitor (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  method_id UUID REFERENCES methods(id) ON DELETE CASCADE NOT NULL,
  live_equity_curve JSONB DEFAULT '[]'::jsonb,
  live_win_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_backtest_method ON backtest_sessions(method_id);
CREATE INDEX IF NOT EXISTS idx_monte_carlo_backtest ON monte_carlo_results(backtest_id);
CREATE INDEX IF NOT EXISTS idx_live_monitor_method ON live_monitor(method_id);
CREATE INDEX IF NOT EXISTS idx_live_monitor_created ON live_monitor(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — Permissive (open access for now)
-- Replace with auth-based policies when auth is implemented
-- ============================================================
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monte_carlo_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_monitor ENABLE ROW LEVEL SECURITY;

-- Permissive policies: allow all operations for anon/authenticated
CREATE POLICY "Allow all on methods" ON methods
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on backtest_sessions" ON backtest_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on monte_carlo_results" ON monte_carlo_results
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on live_monitor" ON live_monitor
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- UPDATED_AT trigger for methods table
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
