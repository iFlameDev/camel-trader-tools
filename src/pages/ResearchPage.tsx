import React, { useState } from 'react';
import { StepIndicator } from '../components/ui/StepIndicator';
import { StepMethodology } from '../components/research/StepMethodology';
import { StepBacktestIngestion } from '../components/research/StepBacktestIngestion';
import { StepMonteCarlo } from '../components/research/StepMonteCarlo';
import type { TradeRecord, BacktestStats } from '../types/database';

const STEPS = ['Methodology', 'Backtest Ingestion', 'Monte Carlo'];

export const ResearchPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [stats, setStats] = useState<BacktestStats | null>(null);

  const handleMethodComplete = (id: string) => {
    setMethodId(id);
    setCurrentStep(2);
  };

  const handleBacktestComplete = (
    id: string,
    parsedTrades: TradeRecord[],
    computedStats: BacktestStats
  ) => {
    setBacktestId(id);
    setTrades(parsedTrades);
    setStats(computedStats);
    setCurrentStep(3);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      {currentStep === 1 && (
        <StepMethodology onComplete={handleMethodComplete} />
      )}

      {currentStep === 2 && methodId && (
        <StepBacktestIngestion
          methodId={methodId}
          onComplete={handleBacktestComplete}
        />
      )}

      {currentStep === 3 && backtestId && stats && (
        <StepMonteCarlo
          backtestId={backtestId}
          trades={trades}
          stats={stats}
        />
      )}
    </div>
  );
};
