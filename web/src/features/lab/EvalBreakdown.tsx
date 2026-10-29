import React from 'react';
import type { EvalBreakdownMsg } from '../../lib/types';
import { Badge } from '../../design/components';

export interface EvalBreakdownProps {
  data: EvalBreakdownMsg | null;
}

export const EvalBreakdown: React.FC<EvalBreakdownProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="text-xs font-mono text-text-400/60 p-3 bg-ink-950/40 rounded border border-ink-700/60 text-center">
        No evaluation breakdown loaded.
      </div>
    );
  }

  const terms = [
    { label: 'Mobility', value: data.terms.mobility },
    { label: 'Corners', value: data.terms.corners },
    { label: 'Positional', value: data.terms.positional },
    { label: 'Stability', value: data.terms.stability },
    { label: 'Discs', value: data.terms.discs },
  ];

  const maxVal = Math.max(...terms.map((t) => Math.abs(t.value)), 100);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[11px] font-mono text-text-400">
        <span className="uppercase tracking-wider">Evaluation Terms (§5.2)</span>
        <Badge variant="brass" size="sm">
          {data.phase.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2 p-2.5 bg-ink-950/80 border border-ink-700/80 rounded">
        {terms.map((term) => {
          const val = term.value;
          const pct = Math.min(100, Math.round((Math.abs(val) / maxVal) * 50));
          const isPos = val >= 0;

          return (
            <div key={term.label} className="text-xs font-mono space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-400">{term.label}</span>
                <span
                  className={`font-semibold tabular-nums ${
                    val > 0 ? 'text-signal' : val < 0 ? 'text-danger' : 'text-text-400'
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </span>
              </div>

              {/* Diverging Bar */}
              <div className="w-full h-1.5 bg-ink-800 rounded-sm flex overflow-hidden">
                <div className="w-1/2 flex justify-end">
                  {!isPos && (
                    <div
                      className="h-full bg-danger rounded-l-sm transition-all"
                      style={{ width: `${pct * 2}%` }}
                    />
                  )}
                </div>
                <div className="w-1/2 flex justify-start">
                  {isPos && (
                    <div
                      className="h-full bg-signal rounded-r-sm transition-all"
                      style={{ width: `${pct * 2}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-2 border-t border-ink-700 flex justify-between items-center text-xs font-mono">
          <span className="text-text-400 font-semibold uppercase">Total Score:</span>
          <span
            className={`font-bold tabular-nums text-sm ${
              data.total > 0 ? 'text-signal' : data.total < 0 ? 'text-danger' : 'text-text-100'
            }`}
          >
            {data.total > 0 ? `+${data.total}` : data.total}
          </span>
        </div>
      </div>
    </div>
  );
};

