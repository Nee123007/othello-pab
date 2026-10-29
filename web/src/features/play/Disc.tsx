import React from 'react';

export type DiscColor = 'black' | 'white';

export interface DiscProps {
  color: DiscColor;
  isJustPlaced?: boolean;
  flipDelayMs?: number;
  isGhost?: boolean;
}

export const Disc: React.FC<DiscProps> = ({
  color,
  isJustPlaced = false,
  flipDelayMs = 0,
  isGhost = false,
}) => {
  if (isGhost) {
    return (
      <div
        className={`w-full h-full rounded-full pointer-events-none transition-opacity duration-150 ${
          color === 'black'
            ? 'bg-obsidian/40 border border-text-400/30'
            : 'bg-pearl/40 border border-pearl/40'
        }`}
      />
    );
  }

  const isWhite = color === 'white';

  return (
    <div
      className={`w-full h-full relative [perspective:800px] ${
        isJustPlaced ? 'animate-disc-place' : ''
      }`}
    >
      <div
        className="w-full h-full relative rounded-full [transform-style:preserve-3d] transition-transform duration-[450ms] motion-reduce:transition-none ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          transform: isWhite ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transitionDelay: `${flipDelayMs}ms`,
        }}
      >
        {/* Obsidian Face (Front: 0deg, Black) */}
        <div
          className="absolute inset-0 rounded-full [backface-visibility:hidden] shadow-disc"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #2A303A 0%, #14171B 60%, #080A0D 100%)',
            boxShadow:
              'inset 0 1px 1.5px rgba(255, 255, 255, 0.18), inset 0 -1.5px 2px rgba(0, 0, 0, 0.8), 0 3px 6px rgba(0, 0, 0, 0.55)',
          }}
        />

        {/* Pearl Face (Back: 180deg, White) */}
        <div
          className="absolute inset-0 rounded-full [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-disc"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F2EDE4 65%, #DDD4C5 100%)',
            boxShadow:
              'inset 0 1.5px 2px rgba(255, 255, 255, 0.9), inset 0 -1.5px 2px rgba(160, 150, 135, 0.5), 0 3px 6px rgba(0, 0, 0, 0.45)',
          }}
        />
      </div>
    </div>
  );
};

