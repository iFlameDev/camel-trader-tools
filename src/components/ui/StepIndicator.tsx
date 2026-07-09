import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-0 ${className}`}>
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold
                  transition-all duration-500 ease-out
                  ${
                    isCompleted
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                      : isActive
                        ? 'bg-brand-600/20 text-brand-400 border-2 border-brand-500 shadow-lg shadow-brand-500/20 animate-pulse-glow'
                        : 'bg-surface-800 text-surface-500 border border-surface-600'
                  }
                `}
              >
                {isCompleted ? <Check size={18} strokeWidth={3} /> : stepNum}
                {isActive && (
                  <span className="absolute inset-0 rounded-full border-2 border-brand-400/30 animate-ping" />
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap transition-colors duration-300 ${
                  isActive ? 'text-brand-400' : isCompleted ? 'text-surface-200' : 'text-surface-500'
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 min-w-[60px] max-w-[120px] h-[2px] mx-2 mb-6 relative overflow-hidden rounded-full bg-surface-700">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    isCompleted
                      ? 'w-full bg-gradient-to-r from-brand-500 to-brand-400'
                      : 'w-0 bg-brand-500'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
