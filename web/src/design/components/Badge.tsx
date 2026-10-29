import React from 'react';

export interface BadgeProps {
  variant?: 'neutral' | 'brass' | 'signal' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  }[size];

  const variantStyles = {
    neutral: 'bg-ink-800 text-text-400 border-ink-700',
    brass: 'bg-brass-400/10 text-brass-400 border-brass-400/30',
    signal: 'bg-signal/10 text-signal border-signal/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded border ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};

