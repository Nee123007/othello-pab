import React from 'react';
import { HelpCircle, GitFork, HandMetal, Ban } from 'lucide-react';
import { Tooltip } from '../../design/components';

export interface SplitStealTickerProps {
  splits: number;
  steals: number;
  cancels: number;
}

export const SplitStealTicker: React.FC<SplitStealTickerProps> = ({
  splits,
  steals,
  cancels,
}) => {
  const proposalExplanation = (
    <div className="max-w-xs space-y-1.5 p-1 text-[11px] leading-relaxed text-text-100">
      <div className="font-serif font-semibold text-brass-400">Node Types (§5.3):</div>
      <p>
        In alpha-beta search, parallel work is <span className="text-signal font-semibold">safe at ALL nodes</span>{' '}
        (where every child must be explored) and{' '}
        <span className="text-danger font-semibold">wasteful at CUT nodes</span> (where the first move often causes a cutoff).
      </p>
      <p className="text-text-400">
        The Young Brothers Wait Concept (YBWC) therefore waits for the eldest brother to complete sequentially.
        If it causes a cutoff, younger brothers are avoided, drastically cutting search overhead.
      </p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-wider text-text-400">
        <span>Parallel Tree Events</span>
        <Tooltip content={proposalExplanation}>
          <span className="flex items-center gap-1 text-brass-400 cursor-help">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>PV / CUT / ALL</span>
          </span>
        </Tooltip>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-ink-950/80 border border-ink-700/80 rounded flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-text-400 uppercase font-mono">
            <GitFork className="w-3 h-3 text-signal" />
            <span>Splits</span>
          </div>
          <span className="font-mono text-base font-bold text-signal tabular-nums">
            {splits}
          </span>
        </div>

        <div className="p-2 bg-ink-950/80 border border-ink-700/80 rounded flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-text-400 uppercase font-mono">
            <HandMetal className="w-3 h-3 text-brass-400" />
            <span>Steals</span>
          </div>
          <span className="font-mono text-base font-bold text-brass-400 tabular-nums">
            {steals}
          </span>
        </div>

        <div className="p-2 bg-ink-950/80 border border-ink-700/80 rounded flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-text-400 uppercase font-mono">
            <Ban className="w-3 h-3 text-danger" />
            <span>Cancels</span>
          </div>
          <span className="font-mono text-base font-bold text-danger tabular-nums">
            {cancels}
          </span>
        </div>
      </div>
    </div>
  );
};

