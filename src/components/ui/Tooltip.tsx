import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  /** Show a small ? icon next to the children */
  showIcon?: boolean;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  showIcon = true,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // If too close to top, show below
      if (rect.top < 80) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [visible]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {showIcon && (
        <HelpCircle
          size={13}
          className="text-surface-500 hover:text-brand-400 transition-colors cursor-help shrink-0"
        />
      )}

      {visible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-[100] w-64 px-3.5 py-2.5 rounded-xl
            bg-surface-800/95 backdrop-blur-xl
            border border-surface-600/60
            shadow-xl shadow-black/30
            text-xs text-surface-200 leading-relaxed font-normal
            animate-fade-in pointer-events-none
            ${position === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
            }
          `}
        >
          {text}
          {/* Arrow */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-2 h-2
              bg-surface-800/95 border-surface-600/60
              rotate-45
              ${position === 'top'
                ? 'top-full -mt-1 border-r border-b'
                : 'bottom-full -mb-1 border-l border-t'
              }
            `}
          />
        </div>
      )}
    </div>
  );
};
