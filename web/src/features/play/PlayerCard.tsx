import React from 'react';
import type { DiscColor } from './Disc';

export interface PlayerCardProps {
  color: DiscColor;
  name: string;
  role?: string;
  score: number;
  isTurn: boolean;
  isEngineThinking?: boolean;
  className?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  color,
  name,
  role,
  score,
  isTurn,
  isEngineThinking = false,
  className = '',
}) => {
  const isObsidian = color === 'black';

  return (
    <div
      className={`relative flex items-center justify-between px-4 py-2.5 bg-ink-900 border border-ink-700 rounded-lg shadow-sm transition-all ${
        isTurn ? 'border-brass-400/60 shadow-[0_0_12px_rgba(217,164,65,0.08)]' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Disc Swatch */}
        <div
          className={`w-5 h-5 rounded-full border shadow-sm ${
            isObsidian
              ? 'bg-obsidian border-ink-700'
              : 'bg-pearl border-brass-400/70'
          }`}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-semibold tracking-wide text-text-100">
              {name}
            </span>
            {role && (
              <span className="text-[10px] font-mono text-text-400 uppercase tracking-wider bg-ink-800 px-1.5 py-0.5 rounded">
                {role}
              </span>
            )}
          </div>
          {isEngineThinking && isTurn && (
            <span className="text-[11px] font-mono text-brass-400 flex items-center gap-1.5 mt-0.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />
              Thinking...
            </span>
          )}
        </div>
      </div>

      {/* Rolling Mono Disc Count */}
      <div className="text-right">
        <span className="font-mono text-2xl font-bold text-text-100 tabular-nums">
          {score}
        </span>
        <span className="text-[10px] uppercase font-mono text-text-400 block tracking-wider">
          Discs
        </span>
      </div>

      {/* Turn Brass Underline Indicator */}
      {isTurn && (
        <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-brass-400 rounded-full" />
      )}
    </div>
  );
};

