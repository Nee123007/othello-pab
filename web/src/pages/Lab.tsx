import React, { useState } from 'react';
import { useGameStore } from '../lib/store';
import { Board } from '../features/play/Board';
import { LabPanel } from '../features/lab/LabPanel';
import { PlayerCard } from '../features/play/PlayerCard';
import {
  Panel,
  Button,
  SegmentedControl,
  Slider,
  Dialog,
} from '../design/components';
import type { DiscColor, AlgorithmType } from '../lib/types';
import { Settings } from 'lucide-react';

/**
 * Standalone Engine Lab page — shows the board alongside
 * live search telemetry and evaluation breakdowns.
 */
export const LabPage: React.FC = () => {
  const {
    discs,
    turn,
    legalMoves,
    lastMove,
    flipped,
    score,
    status,
    config,
    isEngineThinking,
    init,
    sendMove,
    startNewGame,
    updateConfig,
    connectionStatus,
  } = useGameStore();

  const [configOpen, setConfigOpen] = useState(false);
  const [chosenAlgo, setChosenAlgo] = useState<AlgorithmType>(config.algo);
  const [chosenThreads, setChosenThreads] = useState<number>(config.threads);
  const [chosenDepth, setChosenDepth] = useState<number>(config.depth);

  React.useEffect(() => {
    init();
  }, [init]);

  const humanColor: DiscColor = config.humanColor === 'white' ? 'white' : 'black';
  const engineColor: DiscColor = humanColor === 'black' ? 'white' : 'black';

  const handleApplyConfig = () => {
    updateConfig({ algo: chosenAlgo, threads: chosenThreads, depth: chosenDepth });
    setConfigOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-100 tracking-tight">
            Engine Lab
          </h1>
          <p className="text-xs text-text-400 mt-0.5">
            Live search telemetry, evaluation breakdowns, and thread diagnostics.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Settings className="w-4 h-4" />}
          onClick={() => setConfigOpen(true)}
        >
          Configure
        </Button>
      </div>

      {/* Connection warning */}
      {connectionStatus === 'disconnected' && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <span>Engine not connected.</span>
          <Button size="sm" variant="danger" onClick={() => init()}>
            Retry
          </Button>
        </div>
      )}

      {/* Two-column layout: Board + Lab Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Board */}
        <div className="lg:col-span-6 flex flex-col items-center space-y-3">
          <div className="w-full max-w-[520px]">
            <PlayerCard
              color={engineColor}
              name={`Engine (${config.algo.toUpperCase()})`}
              role={`${config.threads}T · Depth ${config.depth}`}
              score={engineColor === 'black' ? score.black : score.white}
              isTurn={turn === engineColor && status === 'playing'}
              isEngineThinking={isEngineThinking}
            />
          </div>

          <div className="w-full">
            <Board
              discs={discs}
              turn={turn}
              legalMoves={legalMoves}
              lastMove={lastMove}
              flippedSquares={flipped}
              onMove={sendMove}
              disabled={isEngineThinking || status !== 'playing' || turn !== humanColor}
            />
          </div>

          <div className="w-full max-w-[520px]">
            <PlayerCard
              color={humanColor}
              name="Human Player"
              role="You"
              score={humanColor === 'black' ? score.black : score.white}
              isTurn={turn === humanColor && status === 'playing'}
            />
          </div>

          {status === 'gameover' && (
            <Button variant="primary" onClick={() => startNewGame()}>
              New Game
            </Button>
          )}
        </div>

        {/* Right: Lab Panel */}
        <div className="lg:col-span-6">
          <Panel title="Search Telemetry">
            <LabPanel />
          </Panel>
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Engine Configuration"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfigOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApplyConfig}>
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-1.5">
              Search Algorithm
            </label>
            <SegmentedControl
              options={[
                { value: 'b2', label: 'Sequential α-β' },
                { value: 'p1', label: 'Root Split' },
                { value: 'p2', label: 'PVS' },
                { value: 'p3', label: 'YBWC' },
              ]}
              value={chosenAlgo}
              onChange={(val) => setChosenAlgo(val as AlgorithmType)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-1.5">
              Threads (P)
            </label>
            <SegmentedControl
              options={[
                { value: '1', label: '1T' },
                { value: '2', label: '2T' },
                { value: '4', label: '4T' },
                { value: '8', label: '8T' },
              ]}
              value={String(chosenThreads)}
              onChange={(val) => setChosenThreads(Number(val))}
            />
          </div>

          <Slider
            label="Depth"
            min={2}
            max={14}
            value={chosenDepth}
            onChange={setChosenDepth}
            unit="plies"
          />
        </div>
      </Dialog>
    </div>
  );
};

