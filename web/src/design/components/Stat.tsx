import React from 'react';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  delta?: {
    value: string | number;
    positive?: boolean;
  };
  unit?: string;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  delta,
  unit,
  className = '',
}) => {
  return (
    <div className={`p-3 bg-ink-800/60 border border-ink-700/80 rounded ${className}`}>
      <div className="text-[11px] uppercase tracking-wider text-text-400 font-medium">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-semibold text-text-100 tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs text-text-400 font-mono">{unit}</span>}
        {delta && (
          <span
            className={`text-xs font-mono font-medium ml-auto ${
              delta.positive ? 'text-signal' : 'text-danger'
            }`}
          >
            {delta.positive ? '+' : ''}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
};

