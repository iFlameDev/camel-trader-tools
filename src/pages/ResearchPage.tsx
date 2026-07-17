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

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className={currentStep === 1 ? 'block' : 'hidden'}>
        <StepMethodology onComplete={handleMethodComplete} />
      </div>

      <div className={currentStep === 2 ? 'block' : 'hidden'}>
        {methodId && (
          <StepBacktestIngestion
            methodId={methodId}
            onComplete={handleBacktestComplete}
            onBack={handleBack}
          />
        )}
      </div>

      <div className={currentStep === 3 ? 'block' : 'hidden'}>
        {backtestId && stats && (
          <StepMonteCarlo
            backtestId={backtestId}
            trades={trades}
            stats={stats}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};
