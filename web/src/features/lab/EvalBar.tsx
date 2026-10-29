import React from 'react';

export interface EvalBarProps {
  score: number; // positive = black advantage, negative = white advantage
}

export const EvalBar: React.FC<EvalBarProps> = ({ score }) => {
  // Clamp evaluation visual to [-1000, 1000] range
  const clamped = Math.max(-1000, Math.min(1000, score));
  const blackPct = 50 + (clamped / 1000) * 50;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[11px] font-mono text-text-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-obsidian border border-ink-700" />
          Black (Obsidian)
        </span>
        <span className="font-semibold text-text-100 tabular-nums font-mono">
          {score > 0 ? `+${score}` : score}
        </span>
        <span className="flex items-center gap-1.5">
          White (Pearl)
          <span className="w-2 h-2 rounded-full bg-pearl border border-brass-400/60" />
        </span>
      </div>

      {/* Horizontal Bar Centered at 0 */}
      <div className="w-full h-3 bg-ink-950 border border-ink-700 rounded-sm relative overflow-hidden flex">
        <div
          className="h-full bg-obsidian transition-all duration-300 border-r border-brass-400"
          style={{ width: `${blackPct}%` }}
        />
        <div className="flex-1 h-full bg-pearl" />
      </div>
    </div>
  );
};

