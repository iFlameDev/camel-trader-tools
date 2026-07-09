import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  MonteCarloSimulationData,
  MonteCarloProgress,
  MonteCarloWorkerMessage,
  TradeRecord,
} from '../types/database';

interface UseMonteCarloWorkerReturn {
  run: (params: {
    trades: TradeRecord[];
    iterations: number;
    targetProfit: number;
    maxDailyDD: number;
    maxTotalDD: number;
  }) => void;
  progress: MonteCarloProgress | null;
  result: MonteCarloSimulationData | null;
  isRunning: boolean;
  error: string | null;
  reset: () => void;
}

export function useMonteCarloWorker(): UseMonteCarloWorkerReturn {
  const [progress, setProgress] = useState<MonteCarloProgress | null>(null);
  const [result, setResult] = useState<MonteCarloSimulationData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const run = useCallback(
    (params: {
      trades: TradeRecord[];
      iterations: number;
      targetProfit: number;
      maxDailyDD: number;
      maxTotalDD: number;
    }) => {
      // Terminate any existing worker
      workerRef.current?.terminate();

      setIsRunning(true);
      setError(null);
      setResult(null);
      setProgress({ completed: 0, total: params.iterations, percentage: 0 });

      try {
        const worker = new Worker(
          new URL('../workers/monteCarloWorker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<MonteCarloWorkerMessage>) => {
          const msg = event.data;

          if (msg.type === 'progress') {
            setProgress(msg.data as MonteCarloProgress);
          } else if (msg.type === 'result') {
            setResult(msg.data as MonteCarloSimulationData);
            setIsRunning(false);
            worker.terminate();
          }
        };

        worker.onerror = (err) => {
          setError(err.message || 'Worker error occurred');
          setIsRunning(false);
          worker.terminate();
        };

        // Send params — extract only numeric profit/drawdown for the worker
        worker.postMessage({
          trades: params.trades.map((t) => ({
            profit: t.profit,
            drawdown: t.drawdown,
          })),
          iterations: params.iterations,
          targetProfit: params.targetProfit,
          maxDailyDD: params.maxDailyDD,
          maxTotalDD: params.maxTotalDD,
        });

        workerRef.current = worker;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create worker');
        setIsRunning(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    setProgress(null);
    setResult(null);
    setIsRunning(false);
    setError(null);
  }, []);

  return { run, progress, result, isRunning, error, reset };
}
