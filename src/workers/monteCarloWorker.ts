// ============================================================
// Monte Carlo V2 Simulation Web Worker
// Compound risk, R-multiples, static/trailing DD, min trading days
// ============================================================

type SimulationParams = {
  rMultiples: number[];
  accountSize: number;
  riskPerTrade: number;
  profitTarget: number;
  maxDailyDD: number;
  maxTotalDD: number;
  drawdownType: 'static' | 'trailing';
  minTradingDays: number;
  maxTradesPerDay: number;
  iterations: number;
};

type ProgressMessage = {
  type: 'progress';
  data: {
    completed: number;
    total: number;
    percentage: number;
  };
};

type SimResult = {
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

type ResultMessage = {
  type: 'result';
  data: SimResult;
};

function shuffleArray(arr: number[]): number[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (idx - lower);
}

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<SimulationParams>) => {
  try {
    const {
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
    } = event.data;

    if (!rMultiples || rMultiples.length === 0) {
      const empty: ResultMessage = {
        type: 'result',
        data: {
          pass_probability: 0,
          avg_trades_to_pass: 0,
          median_trades_to_pass: 0,
          percentile_95_trades: 0,
          pass_count: 0,
          fail_count: 0,
          fail_by_daily_dd: 0,
          fail_by_total_dd: 0,
          fail_by_no_target: 0,
          equity_distribution: [],
          max_dd_distribution: [],
          trades_to_pass_distribution: [],
        },
      };
      ctx.postMessage(empty);
      return;
    }

    // Convert percentages to fractions
    const riskFrac = riskPerTrade / 100;
    const targetAmount = accountSize * (profitTarget / 100);
    const dailyDDAmount = accountSize * (maxDailyDD / 100);
    const totalDDAmount = accountSize * (maxTotalDD / 100);

    let passCount = 0;
    let totalTradesToPass = 0;
    let failByDailyDD = 0;
    let failByTotalDD = 0;
    let failByNoTarget = 0;

    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];
    const tradesToPassArr: number[] = [];

    const PROGRESS_INTERVAL = 500;
    const totalR = rMultiples.length;

    for (let i = 0; i < iterations; i++) {
      const shuffled = shuffleArray([...rMultiples]);

      let balance = accountSize;
      let peakBalance = accountSize;
      let maxDD = 0;
      let dailyPnL = 0;
      let dailyTradeCount = 0;
      let passed = false;
      let tradesToPass = totalR;
      let failReason: 'daily_dd' | 'total_dd' | 'no_target' | null = null;

      for (let j = 0; j < shuffled.length; j++) {
        const rMult = shuffled[j];

        // Compound risk: risk amount based on CURRENT balance
        const riskAmount = riskFrac * balance;
        const tradePnL = rMult * riskAmount;

        balance += tradePnL;
        dailyPnL += tradePnL;
        dailyTradeCount++;

        // Track peak & drawdown
        if (balance > peakBalance) peakBalance = balance;

        let currentDD: number;
        if (drawdownType === 'trailing') {
          currentDD = peakBalance - balance;
        } else {
          // Static: measured from initial account size
          currentDD = accountSize - balance;
          if (currentDD < 0) currentDD = 0;
        }
        if (currentDD > maxDD) maxDD = currentDD;

        // Daily DD check (reset every maxTradesPerDay trades)
        if (dailyTradeCount >= maxTradesPerDay) {
          // Check daily DD before resetting
          if (dailyPnL < 0 && Math.abs(dailyPnL) >= dailyDDAmount) {
            failReason = 'daily_dd';
            break;
          }
          dailyPnL = 0;
          dailyTradeCount = 0;
        }

        // Also check daily DD mid-day
        if (dailyPnL < 0 && Math.abs(dailyPnL) >= dailyDDAmount) {
          failReason = 'daily_dd';
          break;
        }

        // Total DD check
        if (currentDD >= totalDDAmount) {
          failReason = 'total_dd';
          break;
        }

        // Check if balance is blown (can't continue)
        if (balance <= 0) {
          failReason = 'total_dd';
          break;
        }

        // Check profit target
        const profitAmount = balance - accountSize;
        if (profitAmount >= targetAmount) {
          // Check if min trading days are met
          const tradingDaysSoFar = Math.ceil((j + 1) / maxTradesPerDay);
          if (tradingDaysSoFar >= minTradingDays) {
            passed = true;
            tradesToPass = j + 1;
            break;
          }
          // If not enough trading days, continue trading but remember we hit target
        }
      }

      // If we ran out of trades without passing or failing
      if (!passed && !failReason) {
        // Check if we hit target but didn't have enough days
        const profitAmount = balance - accountSize;
        if (profitAmount >= targetAmount) {
          const tradingDaysSoFar = Math.ceil(totalR / maxTradesPerDay);
          if (tradingDaysSoFar >= minTradingDays) {
            passed = true;
            tradesToPass = totalR;
          } else {
            failReason = 'no_target';
          }
        } else {
          failReason = 'no_target';
        }
      }

      if (passed) {
        passCount++;
        totalTradesToPass += tradesToPass;
        tradesToPassArr.push(tradesToPass);
      } else {
        if (failReason === 'daily_dd') failByDailyDD++;
        else if (failReason === 'total_dd') failByTotalDD++;
        else failByNoTarget++;
      }

      finalEquities.push(balance);
      maxDrawdowns.push(maxDD);

      // Progress
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

    // Compute percentiles
    const sortedTrades = [...tradesToPassArr].sort((a, b) => a - b);
    const medianTrades = percentile(sortedTrades, 50);
    const p95Trades = percentile(sortedTrades, 95);
    const avgTradesToPass = passCount > 0 ? Math.round(totalTradesToPass / passCount) : 0;

    const result: ResultMessage = {
      type: 'result',
      data: {
        pass_probability: parseFloat(((passCount / iterations) * 100).toFixed(2)),
        avg_trades_to_pass: avgTradesToPass,
        median_trades_to_pass: Math.round(medianTrades),
        percentile_95_trades: Math.round(p95Trades),
        pass_count: passCount,
        fail_count: iterations - passCount,
        fail_by_daily_dd: failByDailyDD,
        fail_by_total_dd: failByTotalDD,
        fail_by_no_target: failByNoTarget,
        equity_distribution: finalEquities,
        max_dd_distribution: maxDrawdowns,
        trades_to_pass_distribution: sortedTrades,
      },
    };

    ctx.postMessage(result);
  } catch (err) {
    ctx.postMessage({
      type: 'result',
      data: {
        pass_probability: 0,
        avg_trades_to_pass: 0,
        median_trades_to_pass: 0,
        percentile_95_trades: 0,
        pass_count: 0,
        fail_count: 0,
        fail_by_daily_dd: 0,
        fail_by_total_dd: 0,
        fail_by_no_target: 0,
        equity_distribution: [],
        max_dd_distribution: [],
        trades_to_pass_distribution: [],
      },
    });
  }
};
