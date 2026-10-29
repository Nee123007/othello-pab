import React from 'react';
import { useGameStore } from '../../lib/store';
import { EvalBar } from './EvalBar';
import { NpsGauge } from './NpsGauge';
import { ThreadLanes } from './ThreadLanes';
import { PVLine } from './PVLine';
import { SplitStealTicker } from './SplitStealTicker';
import { EvalBreakdown } from './EvalBreakdown';
import { Button, Divider } from '../../design/components';
import { Cpu } from 'lucide-react';

export const LabPanel: React.FC = () => {
  const { searchInfo, evalBreakdown, config, updateConfig, isEngineThinking } = useGameStore();

  const handleCompareSequential = () => {
    updateConfig({ threads: 1 });
  };

  const threads =
    searchInfo?.threads && searchInfo.threads.length > 0
      ? searchInfo.threads
      : Array.from({ length: config.threads }, (_, i) => ({
          id: i,
          nodes: 0,
          state: (isEngineThinking ? 'busy' : 'idle') as 'busy' | 'idle',
        }));

  return (
    <div className="space-y-4">
      {/* 1. Evaluation Diverging Bar */}
      <EvalBar score={searchInfo?.value ?? evalBreakdown?.total ?? 0} />

      {/* 2. Throughput NPS Gauge */}
      <NpsGauge
        nps={searchInfo?.nps ?? 0}
        totalNodes={searchInfo?.nodes ?? 0}
        elapsedMs={searchInfo?.elapsedMs ?? 0}
      />

      {/* 3. Thread Workload Lanes */}
      <ThreadLanes
        threads={threads}
        splits={searchInfo?.splits ?? 0}
        steals={searchInfo?.steals ?? 0}
      />

      {/* 4. PV Line */}
      <PVLine pv={searchInfo?.pv ?? []} />

      {/* 5. Split / Steal / Cancel Ticker */}
      <SplitStealTicker
        splits={searchInfo?.splits ?? 0}
        steals={searchInfo?.steals ?? 0}
        cancels={searchInfo?.cancels ?? 0}
      />

      <Divider />

      {/* 6. Evaluation Sub-terms Breakdown */}
      <EvalBreakdown data={evalBreakdown} />

      {/* 7. Compare Button */}
      {config.threads > 1 && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-xs"
          icon={<Cpu className="w-3.5 h-3.5" />}
          disabled={isEngineThinking}
          onClick={handleCompareSequential}
        >
          Compare vs Sequential (P=1)
        </Button>
      )}
    </div>
  );
};

