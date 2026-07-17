import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi, type LineData, type Time } from 'lightweight-charts';

interface EquityChartProps {
  backtestData: { time: string | number; value: number }[];
  liveData: { time: string | number; value: number }[];
  className?: string;
}

const processChartData = (data: { time: string | number; value: number }[]): LineData<Time>[] => {
  const dataMap = new Map<string | number, number>();
  data.forEach(item => {
    dataMap.set(item.time, item.value);
  });

  return Array.from(dataMap.entries())
    .map(([timeKey, value]) => {
      const timeStr = String(timeKey);
      const isNumeric = !isNaN(Number(timeStr)) && !timeStr.includes('-');
      const time = isNumeric ? Number(timeStr) : timeStr;
      return { time: time as Time, value };
    })
    .sort((a, b) => {
      if (typeof a.time === 'number' && typeof b.time === 'number') {
        return a.time - b.time;
      }
      return String(a.time).localeCompare(String(b.time));
    });
};

export const EquityChart: React.FC<EquityChartProps> = ({
  backtestData,
  liveData,
  className = '',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const backtestSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const liveSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Cleanup existing
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        // Ignore if already disposed
      }
      chartRef.current = null;
      backtestSeriesRef.current = null;
      liveSeriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8891b0',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(94, 100, 136, 0.08)' },
        horzLines: { color: 'rgba(94, 100, 136, 0.08)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: 'rgba(94, 100, 136, 0.15)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(94, 100, 136, 0.15)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: 'rgba(59, 130, 246, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e2231',
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e2231',
        },
      },
    });

    // Backtest equity series (blue)
    const backtestSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      title: 'Backtest',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#3b82f6',
      crosshairMarkerBackgroundColor: '#1e2231',
    });

    // Live equity series (green)
    const liveSeries = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 2,
      title: 'Live',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#10b981',
      crosshairMarkerBackgroundColor: '#1e2231',
    });

    chartRef.current = chart;
    backtestSeriesRef.current = backtestSeries;
    liveSeriesRef.current = liveSeries;

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        chart.remove();
      } catch (e) {
        // Ignore if already disposed
      }
      if (chartRef.current === chart) {
        chartRef.current = null;
        backtestSeriesRef.current = null;
        liveSeriesRef.current = null;
      }
    };
  }, []);

  // Initialize chart on mount
  useEffect(() => {
    const cleanup = initChart();
    return cleanup;
  }, [initChart]);

  // Update backtest data
  useEffect(() => {
    if (backtestSeriesRef.current && backtestData.length > 0) {
      try {
        const processed = processChartData(backtestData);
        if (processed.length > 0) {
          backtestSeriesRef.current.setData(processed);
          chartRef.current?.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Failed to set backtest data:', err);
      }
    }
  }, [backtestData]);

  // Update live data
  useEffect(() => {
    if (liveSeriesRef.current && liveData.length > 0) {
      try {
        const processed = processChartData(liveData);
        if (processed.length > 0) {
          liveSeriesRef.current.setData(processed);
        }
      } catch (err) {
        console.error('Failed to set live data:', err);
      }
    }
  }, [liveData]);

  return (
    <div className={`relative ${className}`}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] bg-brand-500 rounded-full" />
          <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
            Backtest
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] bg-profit rounded-full" />
          <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      <div ref={chartContainerRef} className="rounded-xl overflow-hidden" />

      {backtestData.length === 0 && liveData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-surface-500">
            Select a method to view equity curves
          </p>
        </div>
      )}
    </div>
  );
};
