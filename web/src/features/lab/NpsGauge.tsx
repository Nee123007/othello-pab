import React, { useState, useEffect, useRef } from 'react';

export interface NpsGaugeProps {
  nps: number;
  totalNodes: number;
  elapsedMs: number;
}

export const NpsGauge: React.FC<NpsGaugeProps> = ({ nps, totalNodes, elapsedMs }) => {
  const [history, setHistory] = useState<number[]>([]);
  const lastNps = useRef(nps);

  useEffect(() => {
    lastNps.current = nps;
  }, [nps]);

  useEffect(() => {
    // Record history every 250ms for sparkline
    const timer = setInterval(() => {
      setHistory((prev) => {
        const next = [...prev, lastNps.current];
        if (next.length > 20) next.shift(); // 20 * 250ms = 5s
        return next;
      });
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const formattedNps =
    nps >= 1_000_000
      ? (nps / 1_000_000).toFixed(2) + ' M'
      : nps >= 1_000
      ? (nps / 1_000).toFixed(1) + ' k'
      : nps.toString();

  // Generate SVG points for sparkline
  const maxVal = Math.max(...history, 100);
  const width = 120;
  const height = 30;
  const points =
    history.length > 1
      ? history
          .map((val, idx) => {
            const x = (idx / (history.length - 1)) * width;
            const y = height - (val / maxVal) * (height - 4);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : `0,${height} ${width},${height}`;

  return (
    <div className="p-3 bg-ink-950/80 border border-ink-700/80 rounded flex items-center justify-between">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-text-400">
          Search Throughput
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="font-mono text-xl font-bold text-signal tabular-nums">
            {formattedNps}
          </span>
          <span className="font-mono text-xs text-text-400">nodes/sec</span>
        </div>
        <div className="text-[11px] font-mono text-text-400/80 mt-1 flex gap-3">
          <span>{totalNodes.toLocaleString()} nodes</span>
          <span>·</span>
          <span>{elapsedMs} ms</span>
        </div>
      </div>

      {/* 5-second live sparkline */}
      <div className="flex flex-col items-end">
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke="#4FB3A3"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
        <span className="text-[9px] font-mono text-text-400/60 mt-0.5">5s history</span>
      </div>
    </div>
  );
};

