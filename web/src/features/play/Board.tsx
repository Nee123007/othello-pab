import React, { useState } from 'react';
import { Disc, type DiscColor } from './Disc';
import { getFlipDelayMs } from './anim';

export interface BoardProps {
  // Array of 64 squares: 'black' | 'white' | null
  discs: (DiscColor | null)[];
  turn: DiscColor;
  legalMoves: number[];
  lastMove: number | null;
  flippedSquares?: number[];
  onMove: (sq: number) => void;
  disabled?: boolean;
  className?: string;
}

export const Board: React.FC<BoardProps> = ({
  discs,
  turn,
  legalMoves,
  lastMove,
  flippedSquares = [],
  onMove,
  disabled = false,
  className = '',
}) => {
  const [hoveredSq, setHoveredSq] = useState<number | null>(null);
  const [focusedSq, setFocusedSq] = useState<number>(19); // Default focus around center (d3)

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, sq: number) => {
    let nextSq = sq;
    if (e.key === 'ArrowRight') nextSq = sq % 8 < 7 ? sq + 1 : sq;
    else if (e.key === 'ArrowLeft') nextSq = sq % 8 > 0 ? sq - 1 : sq;
    else if (e.key === 'ArrowDown') nextSq = sq + 8 < 64 ? sq + 8 : sq;
    else if (e.key === 'ArrowUp') nextSq = sq - 8 >= 0 ? sq - 8 : sq;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled && legalMoves.includes(sq)) {
        onMove(sq);
      }
      return;
    }

    if (nextSq !== sq) {
      e.preventDefault();
      setFocusedSq(nextSq);
      const el = document.getElementById(`othello-sq-${nextSq}`);
      if (el) el.focus();
    }
  };

  return (
    <div
      className={`relative w-full max-w-[600px] aspect-square mx-auto p-4 sm:p-5 bg-jade-900 rounded-xl border border-jade-600/50 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col ${className}`}
    >
      {/* File coordinate labels (top) */}
      <div className="grid grid-cols-8 pb-1 text-center font-mono text-[11px] text-text-400/80 uppercase select-none">
        {files.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>

      <div className="flex-1 flex">
        {/* Rank coordinate labels (left) */}
        <div className="grid grid-rows-8 pr-1.5 text-center font-mono text-[11px] text-text-400/80 items-center select-none">
          {ranks.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>

        {/* 8x8 Board Grid */}
        <div className="flex-1 grid grid-cols-8 grid-rows-8 gap-[1px] bg-jade-600 border border-jade-600 rounded-sm relative overflow-hidden shadow-inner">
          {discs.map((disc, sq) => {
            const isLegal = !disabled && legalMoves.includes(sq);
            const isLast = lastMove === sq;
            const isFlipped = flippedSquares.includes(sq);
            const flipDelay = isFlipped && lastMove !== null ? getFlipDelayMs(lastMove, sq) : 0;
            const row = Math.floor(sq / 8);
            const col = sq % 8;
            const coord = `${files[col]}${ranks[row]}`;

            // Check star dots: intersections at (2,2), (2,6), (6,2), (6,6)
            const isStarDot = (sq === 18 || sq === 21 || sq === 42 || sq === 45);

            let ariaLabel = `Square ${coord}`;
            if (disc) ariaLabel += `, ${disc} disc`;
            else if (isLegal) ariaLabel += `, legal move for ${turn}`;

            return (
              <button
                key={sq}
                id={`othello-sq-${sq}`}
                type="button"
                tabIndex={focusedSq === sq ? 0 : -1}
                aria-label={ariaLabel}
                disabled={disabled || (!isLegal && !disc)}
                onClick={() => {
                  if (isLegal) onMove(sq);
                }}
                onKeyDown={(e) => handleKeyDown(e, sq)}
                onMouseEnter={() => setHoveredSq(sq)}
                onMouseLeave={() => setHoveredSq(null)}
                className={`relative w-full h-full bg-jade-700 flex items-center justify-center p-1 sm:p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:z-20 ${
                  isLegal && !disabled ? 'cursor-pointer hover:bg-jade-600/70' : 'cursor-default'
                }`}
              >
                {/* Decorative Star Dots */}
                {isStarDot && !disc && (
                  <span className="absolute bottom-0 right-0 w-1.5 h-1.5 -mb-[3px] -mr-[3px] bg-ink-950/60 rounded-full pointer-events-none z-10" />
                )}

                {/* Disc */}
                {disc ? (
                  <Disc
                    color={disc}
                    isJustPlaced={isLast}
                    flipDelayMs={flipDelay}
                  />
                ) : (
                  <>
                    {/* Hover ghost disc */}
                    {isLegal && hoveredSq === sq && (
                      <Disc color={turn} isGhost />
                    )}

                    {/* Breathing legal move brass ring */}
                    {isLegal && hoveredSq !== sq && (
                      <div className="w-full h-full flex items-center justify-center pointer-events-none">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-brass-400/90 animate-breathe shadow-[0_0_8px_rgba(217,164,65,0.4)]" />
                      </div>
                    )}
                  </>
                )}

                {/* Last move brass center dot */}
                {isLast && disc && (
                  <span className="absolute w-2 h-2 rounded-full bg-brass-400 shadow-[0_0_4px_rgba(217,164,65,0.8)] z-10 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

