import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  gradient = false,
  hover = false,
  padding = 'md',
}) => {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        glass rounded-2xl ${paddings[padding]}
        ${gradient ? 'gradient-border' : ''}
        ${hover ? 'hover:bg-surface-800/60 hover:border-surface-500/20 transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
