# Camel Trader Tools

Camel Trader Tools is a client-side heavy SPA for quantitative trading research. It provides tools for backtesting, analyzing research databases, and managing quantitative models natively in the browser.

## Features
- **Research Pipeline**: Create methods, ingest and process backtests directly in the browser (via Web Workers).
- **Research Database**: A centralized knowledge base for exploring quantitative research papers, historical backtests, and computed Monte Carlo simulation results.
- **Client-Side Compute**: Leverages Web Workers to offload heavy computations during simulations.
- **Supabase Backend**: Fast metadata and method storage for data persistence.

## 🚀 Live Monitor (Upcoming Integration)
We are currently developing a deep integration system to natively sync with **MQL5**. 
The **Live Monitor** feature is upcoming. Soon, you will be able to monitor live MetaTrader accounts executing strategies directly matched with methods from your Research Database. The vision is to pull live real-time equity curves, tick data, and perform automated sanity checks to compare live operational results against backtest expectations.

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS with a refined dark mode UI
- Supabase (Backend as a Service)

## Getting Started

1. Set up `.env` with Supabase details (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
2. Run `npm install`
3. Run `npm run dev` to start the development server
