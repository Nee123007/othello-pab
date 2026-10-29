import React from 'react';
import type { ThreadInfo } from '../../lib/types';
import { Badge } from '../../design/components';

export interface ThreadLanesProps {
  threads: ThreadInfo[];
  splits?: number;
  steals?: number;
}

export const ThreadLanes: React.FC<ThreadLanesProps> = ({ threads }) => {
  const maxNodes = Math.max(...threads.map((t) => t.nodes), 1);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-wider text-text-400">
        <span>Worker Thread Lanes</span>
        <span>{threads.length} Active Cores</span>
      </div>

      <div className="space-y-1.5">
        {threads.map((t) => {
          const pct = Math.min(100, Math.round((t.nodes / maxNodes) * 100));
          const stateColor =
            t.state === 'busy'
              ? 'signal'
              : t.state === 'stealing'
              ? 'brass'
              : 'neutral';

          return (
            <div
              key={t.id}
              className="p-2 bg-ink-950/80 border border-ink-700/80 rounded flex flex-col gap-1 text-xs"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-text-100">
                    W{t.id}
                  </span>
                  <Badge size="sm" variant={stateColor}>
                    {t.state.toUpperCase()}
                  </Badge>
                </div>
                <span className="font-mono text-text-400 tabular-nums">
                  {t.nodes.toLocaleString()} nodes
                </span>
              </div>

              {/* Workload Progress Bar */}
              <div className="w-full h-1 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    t.state === 'busy'
                      ? 'bg-signal'
                      : t.state === 'stealing'
                      ? 'bg-brass-400'
                      : 'bg-text-400/40'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

