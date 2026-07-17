// ============================================================
// Monte Carlo Simulation Web Worker
// Runs N iterations of random resampling off the main thread
// ============================================================

type TradeInput = {
  profit: number;
  drawdown: number;
};

type SimulationParams = {
  trades: TradeInput[];
  iterations: number;
  targetProfit: number;
  maxDailyDD: number;
  maxTotalDD: number;
};

type ProgressMessage = {
  type: 'progress';
  data: {
    completed: number;
    total: number;
    percentage: number;
  };
};

type ResultMessage = {
  type: 'result';
  data: {
    pass_probability: number;
    avg_trades_to_pass: number;
    equity_distribution: number[];
    max_dd_distribution: number[];
    pass_count: number;
    fail_count: number;
  };
};

/**
 * Fisher-Yates shuffle (in-place, returns same array)
 */
function shuffleArray(arr: number[]): number[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<SimulationParams>) => {
  try {
    const { trades, iterations, targetProfit, maxDailyDD, maxTotalDD } = event.data;

    if (!trades || trades.length === 0) {
      const result: ResultMessage = {
        type: 'result',
        data: {
          pass_probability: 0,
          avg_trades_to_pass: 0,
          equity_distribution: [],
          max_dd_distribution: [],
          pass_count: 0,
          fail_count: 0,
        },
      };
      ctx.postMessage(result);
      return;
    }

    // Extract just the profit values for resampling
    const profitValues = trades.map((t) => t.profit);
    const totalTrades = profitValues.length;

    let passCount = 0;
    let totalTradesToPass = 0;
    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];

    const PROGRESS_INTERVAL = 500;

    for (let i = 0; i < iterations; i++) {
      // Create a shuffled copy for this iteration
      const shuffled = shuffleArray([...profitValues]);

      let equity = 0;
      let peak = 0;
      let maxDD = 0;
      let dailyPnL = 0;
      let passed = false;
      let tradesToPass = totalTrades;
      let dailyTradeCount = 0;
      const TRADES_PER_DAY = 5; // approximate trades per session

      for (let j = 0; j < shuffled.length; j++) {
        const pnl = shuffled[j];
        equity += pnl;
        dailyPnL += pnl;
        dailyTradeCount++;

        // Update peak and drawdown
        if (equity > peak) peak = equity;
        const currentDD = peak - equity;
        if (currentDD > maxDD) maxDD = currentDD;

        // Check daily DD limit (reset daily PnL every N trades)
        if (dailyTradeCount >= TRADES_PER_DAY) {
          dailyPnL = 0;
          dailyTradeCount = 0;
        }

        // Check if daily DD breached
        if (Math.abs(dailyPnL) >= maxDailyDD && dailyPnL < 0) {
          break;
        }

        // Check if total DD breached
        if (currentDD >= maxTotalDD) {
          break;
        }

        // Check if target reached
        if (equity >= targetProfit) {
          passed = true;
          tradesToPass = j + 1;
          break;
        }
      }

      if (passed) {
        passCount++;
        totalTradesToPass += tradesToPass;
      }

      finalEquities.push(equity);
      maxDrawdowns.push(maxDD);

      // Send progress update
      if ((i + 1) % PROGRESS_INTERVAL === 0 || i === iterations - 1) {
        const progress: ProgressMessage = {
          type: 'progress',
          data: {
            completed: i + 1,
            total: iterations,
            percentage: Math.round(((i + 1) / iterations) * 100),
          },
        };
        ctx.postMessage(progress);
      }
    }

    const avgTradesToPass = passCount > 0 ? Math.round(totalTradesToPass / passCount) : 0;

    const result: ResultMessage = {
      type: 'result',
      data: {
        pass_probability: parseFloat(((passCount / iterations) * 100).toFixed(2)),
        avg_trades_to_pass: avgTradesToPass,
        equity_distribution: finalEquities,
        max_dd_distribution: maxDrawdowns,
        pass_count: passCount,
        fail_count: iterations - passCount,
      },
    };

    ctx.postMessage(result);
  } catch (err) {
    ctx.postMessage({
      type: 'result',
      data: {
        pass_probability: 0,
        avg_trades_to_pass: 0,
        equity_distribution: [],
        max_dd_distribution: [],
        pass_count: 0,
        fail_count: 0,
        error: err instanceof Error ? err.message : 'Unknown worker error',
      },
    });
  }
};
