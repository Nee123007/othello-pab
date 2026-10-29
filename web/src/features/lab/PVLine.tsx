import React from 'react';
import { squareToCoord } from '../../lib/bitboard';

export interface PVLineProps {
  pv: number[];
  onSelectStep?: (index: number) => void;
}

export const PVLine: React.FC<PVLineProps> = ({ pv, onSelectStep }) => {
  if (!pv || pv.length === 0) {
    return (
      <div className="text-xs font-mono text-text-400/60 p-2 bg-ink-950/40 rounded border border-ink-700/60 text-center">
        No Principal Variation available yet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-400">
        Principal Variation (PV)
      </div>
      <div className="flex flex-wrap gap-1.5 p-2 bg-ink-950/70 border border-ink-700/80 rounded">
        {pv.map((sq, idx) => {
          const coord = squareToCoord(sq);
          const isFirst = idx === 0;

          return (
            <button
              key={idx}
              onClick={() => onSelectStep?.(idx)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 ${
                isFirst
                  ? 'bg-brass-400 text-ink-950 font-bold border border-brass-600'
                  : 'bg-ink-800 text-text-100 hover:bg-ink-700 border border-ink-700'
              }`}
            >
              {coord}
            </button>
          );
        })}
      </div>
    </div>
  );
};

