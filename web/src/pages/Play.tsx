import React, { useState, useEffect } from 'react';
import { useGameStore } from '../lib/store';
import { Board } from '../features/play/Board';
import { PlayerCard } from '../features/play/PlayerCard';
import {
  Button,
  Panel,
  Tabs,
  Slider,
  SegmentedControl,
  Dialog,
  Stat,
  Badge,
  IconButton,
  Toast,
} from '../design/components';
import type { DiscColor, AlgorithmType, MatchMode } from '../lib/types';
import {
  RotateCcw,
  Lightbulb,
  Flag,
  Plus,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldCheck,
  Play as PlayIcon,
  Pause,
  SkipForward,
  Bot,
} from 'lucide-react';
import { sound } from '../lib/sound';
import { LabPanel } from '../features/lab/LabPanel';

export const PlayPage: React.FC = () => {
  const {
    discs,
    turn,
    legalMoves,
    lastMove,
    flipped,
    score,
    status,
    winner,
    config,
    serverCpuCount,
    moveHistory,
    hintSq,
    isEngineThinking,
    isAiPaused,
    gameStats,
    connectionStatus,
    init,
    sendMove,
    startNewGame,
    requestUndo,
    requestHint,
    clearHint,
    pauseMatch,
    resumeMatch,
    stepMatch,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'game' | 'search'>('game');
  const [newGameModalOpen, setNewGameModalOpen] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted());

  // New game modal state
  const [chosenMode, setChosenMode] = useState<MatchMode>(config.matchMode || 'human_vs_ai');
  const [chosenColor, setChosenColor] = useState<'black' | 'white' | 'random'>(
    config.humanColor === 'none' ? 'black' : config.humanColor
  );
  const [chosenAlgo, setChosenAlgo] = useState<AlgorithmType>(config.algo);
  const [chosenThreads, setChosenThreads] = useState<number>(config.threads);
  const [chosenDepth, setChosenDepth] = useState<number>(config.depth);

  // Dual AI settings for Spectator mode
  const [algoBlack, setAlgoBlack] = useState<AlgorithmType>(config.algoBlack || 'p3');
  const [threadsBlack, setThreadsBlack] = useState<number>(config.threadsBlack || 4);
  const [depthBlack, setDepthBlack] = useState<number>(config.depthBlack || 6);

  const [algoWhite, setAlgoWhite] = useState<AlgorithmType>(config.algoWhite || 'b2');
  const [threadsWhite, setThreadsWhite] = useState<number>(config.threadsWhite || 1);
  const [depthWhite, setDepthWhite] = useState<number>(config.depthWhite || 6);

  const [delayMs, setDelayMs] = useState<number>(config.delayMs || 400);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (status !== 'gameover') {
      setGameOverDismissed(false);
    }
  }, [status]);

  const toggleSound = () => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
  };

  const isSpectator = config.matchMode === 'ai_vs_ai' || config.humanColor === 'none';

  const handleStartGameConfirm = () => {
    setGameOverDismissed(false);
    if (chosenMode === 'ai_vs_ai') {
      startNewGame({
        matchMode: 'ai_vs_ai',
        humanColor: 'none',
        algoBlack,
        threadsBlack,
        depthBlack,
        algoWhite,
        threadsWhite,
        depthWhite,
        delayMs,
      });
    } else {
      startNewGame({
        matchMode: 'human_vs_ai',
        humanColor: chosenColor,
        algo: chosenAlgo,
        threads: chosenThreads,
        depth: chosenDepth,
      });
    }
    setNewGameModalOpen(false);
  };

  const humanColor: DiscColor = config.humanColor === 'white' ? 'white' : 'black';
  const engineColor: DiscColor = humanColor === 'black' ? 'white' : 'black';

  // Compute average stats
  const avgNodes = gameStats.movesCount > 0 ? Math.round(gameStats.totalNodes / gameStats.movesCount) : 0;
  const avgTime = gameStats.movesCount > 0 ? (gameStats.totalSearchTimeMs / gameStats.movesCount).toFixed(1) : '0';
  const avgNps =
    gameStats.totalSearchTimeMs > 0
      ? Math.round((gameStats.totalNodes * 1000) / gameStats.totalSearchTimeMs)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Connection Lost Banner */}
      {connectionStatus === 'disconnected' && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection to engine bridge lost. Reconnecting...</span>
          </div>
          <Button size="sm" variant="danger" onClick={() => init()}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Grid: Board Area + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Board & Player Cards) */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-3.5">
          {/* Top Player Card (White) */}
          <div className="w-full max-w-[560px]">
            {isSpectator ? (
              <PlayerCard
                color="white"
                name={`White AI (${(config.algoWhite || 'b2').toUpperCase()})`}
                role={`${config.threadsWhite || 1}T · Depth ${config.depthWhite || 6}`}
                score={score.white}
                isTurn={turn === 'white' && status === 'playing'}
                isEngineThinking={turn === 'white' && isEngineThinking}
              />
            ) : (
              <PlayerCard
                color={engineColor}
                name={`Engine (${config.algo.toUpperCase()})`}
                role={`${config.threads} Threads · Depth ${config.depth}`}
                score={engineColor === 'black' ? score.black : score.white}
                isTurn={turn === engineColor && status === 'playing'}
                isEngineThinking={isEngineThinking}
              />
            )}
          </div>

          {/* 8x8 Board */}
          <div className="w-full relative">
            <Board
              discs={discs}
              turn={turn}
              legalMoves={legalMoves}
              lastMove={lastMove}
              flippedSquares={flipped}
              onMove={sendMove}
              disabled={isSpectator || isEngineThinking || status !== 'playing' || turn !== humanColor}
            />

            {/* Hint brass ring highlight */}
            {hintSq !== null && hintSq >= 0 && (
              <div className="absolute top-2 left-2 bg-ink-900/90 border border-brass-400 px-3 py-1.5 rounded text-xs text-brass-400 font-mono shadow-panel flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                <span>Engine Hint: Square {hintSq}</span>
                <button
                  onClick={clearHint}
                  className="ml-2 text-text-400 hover:text-text-100 font-mono"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Bottom Player Card (Black) */}
          <div className="w-full max-w-[560px]">
            {isSpectator ? (
              <PlayerCard
                color="black"
                name={`Black AI (${(config.algoBlack || 'p3').toUpperCase()})`}
                role={`${config.threadsBlack || 4}T · Depth ${config.depthBlack || 6}`}
                score={score.black}
                isTurn={turn === 'black' && status === 'playing'}
                isEngineThinking={turn === 'black' && isEngineThinking}
              />
            ) : (
              <PlayerCard
                color={humanColor}
                name="Human Player"
                role="You"
                score={humanColor === 'black' ? score.black : score.white}
                isTurn={turn === humanColor && status === 'playing'}
              />
            )}
          </div>
        </div>

        {/* Right Column (Sidebar Tabs) */}
        <div className="lg:col-span-5 w-full">
          <Panel>
            {/* Sidebar Tab Header */}
            <div className="flex items-center justify-between border-b border-ink-700/80 pb-2 mb-4">
              <Tabs
                tabs={[
                  { id: 'game', label: 'Game Control' },
                  { id: 'search', label: 'Engine Lab' },
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'game' | 'search')}
              />
              <IconButton
                icon={muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                label={muted ? 'Unmute Sound' : 'Mute Sound'}
                variant="ghost"
                size="sm"
                onClick={toggleSound}
              />
            </div>

            {activeTab === 'game' ? (
              <div className="space-y-5">
                {/* AI vs AI Spectator Controls Bar */}
                {isSpectator ? (
                  <div className="p-3 bg-ink-950/80 border border-brass-400/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-brass-400" />
                        <span className="text-xs font-semibold text-text-100 uppercase tracking-wide">
                          AI vs AI Match
                        </span>
                      </div>
                      <Badge variant={isAiPaused ? 'neutral' : 'signal'}>
                        {isAiPaused ? 'Paused' : 'Running'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {isAiPaused ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<PlayIcon className="w-4 h-4" />}
                          onClick={resumeMatch}
                          disabled={status !== 'playing'}
                        >
                          Play Match
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Pause className="w-4 h-4" />}
                          onClick={pauseMatch}
                          disabled={status !== 'playing'}
                        >
                          Pause
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<SkipForward className="w-4 h-4" />}
                        onClick={stepMatch}
                        disabled={status !== 'playing'}
                      >
                        Step Move
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setNewGameModalOpen(true)}
                  >
                    New Game
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<RotateCcw className="w-4 h-4" />}
                    disabled={moveHistory.length === 0 || isEngineThinking}
                    onClick={requestUndo}
                  >
                    Undo
                  </Button>
                </div>

                {!isSpectator && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      icon={<Lightbulb className="w-4 h-4" />}
                      disabled={isEngineThinking || status !== 'playing'}
                      onClick={requestHint}
                    >
                      Hint
                    </Button>
                    <Button
                      variant="danger"
                      icon={<Flag className="w-4 h-4" />}
                      disabled={status !== 'playing'}
                      onClick={() => startNewGame()}
                    >
                      Resign
                    </Button>
                  </div>
                )}

                {/* Move History Table */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-text-400 font-mono uppercase tracking-wider">
                    <span>Move History</span>
                    <span>{moveHistory.length} Moves</span>
                  </div>
                  <div className="h-44 overflow-y-auto bg-ink-950/70 border border-ink-700/80 rounded p-2 text-xs font-mono">
                    {moveHistory.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-text-400/50">
                        No moves played yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {moveHistory.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between text-text-100">
                            <span className="text-text-400">{idx + 1}.</span>
                            <span className="font-semibold">{m.coord}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                m.color === 'black' ? 'bg-obsidian border border-ink-700' : 'bg-pearl'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Notice */}
                {status === 'passed' && (
                  <Toast message="No legal moves available. Turn passed." type="info" />
                )}

                {/* Match Finished Banner when dialog is dismissed */}
                {status === 'gameover' && gameOverDismissed && (
                  <div className="p-3 bg-ink-950/80 border border-brass-400/40 rounded flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-semibold text-text-100 font-serif">
                        Match Finished — {winner === 'draw' ? 'Draw' : `${winner?.toUpperCase()} Wins`}
                      </div>
                      <div className="text-[11px] font-mono text-text-400">
                        Final Score: {score.black} - {score.white}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setGameOverDismissed(false)}>
                        Review Stats
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => startNewGame()}>
                        Rematch
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Info Badge */}
                <div className="p-3 bg-ink-800/40 border border-ink-700/60 rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brass-400" />
                    <span className="text-text-400">Match Mode:</span>
                    <span className="text-text-100 font-semibold font-mono uppercase">
                      {isSpectator ? 'AI vs AI' : `Human vs ${config.algo}`}
                    </span>
                  </div>
                  <Badge variant="brass">
                    {isSpectator ? `${config.threadsBlack}T vs ${config.threadsWhite}T` : `${config.threads} Threads`}
                  </Badge>
                </div>
              </div>
            ) : (
              /* Search / Engine Lab Tab */
              <LabPanel />
            )}
          </Panel>
        </div>
      </div>

      {/* New Game Dialog */}
      <Dialog
        open={newGameModalOpen}
        onClose={() => setNewGameModalOpen(false)}
        title="Configure New Match"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewGameModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStartGameConfirm}>
              Start Match
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Match Mode Toggle */}
          <div>
            <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-1.5">
              Match Mode
            </label>
            <SegmentedControl
              options={[
                { value: 'human_vs_ai', label: '👤 Human vs AI' },
                { value: 'ai_vs_ai', label: '🤖 AI vs AI (Spectator)' },
              ]}
              value={chosenMode}
              onChange={(val) => setChosenMode(val as MatchMode)}
            />
          </div>

          {chosenMode === 'human_vs_ai' ? (
            /* Human vs AI Options */
            <>
              <div>
                <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-1.5">
                  Play As
                </label>
                <SegmentedControl
                  options={[
                    { value: 'black', label: 'Black (First)' },
                    { value: 'white', label: 'White (Second)' },
                    { value: 'random', label: 'Random' },
                  ]}
                  value={chosenColor}
                  onChange={(val) => setChosenColor(val as 'black' | 'white' | 'random')}
                />
              </div>

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
                  Parallel Threads (P) — Host max: {serverCpuCount}
                </label>
                <SegmentedControl
                  options={[
                    { value: '1', label: '1T' },
                    { value: '2', label: '2T', disabled: serverCpuCount < 2 },
                    { value: '4', label: '4T', disabled: serverCpuCount < 4 },
                    { value: '8', label: '8T', disabled: serverCpuCount < 8 },
                  ]}
                  value={String(chosenThreads)}
                  onChange={(val) => setChosenThreads(Number(val))}
                />
              </div>

              <Slider
                label="Search Depth Target"
                min={2}
                max={12}
                value={chosenDepth}
                onChange={setChosenDepth}
                unit="plies"
              />
            </>
          ) : (
            /* AI vs AI Spectator Options */
            <div className="space-y-4">
              {/* Black Engine Config */}
              <div className="p-3 bg-ink-950/70 border border-ink-700 rounded-lg space-y-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-text-100 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-obsidian border border-ink-700" />
                  <span>Black AI (Plays First)</span>
                </div>
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: 'p3', label: 'P3 YBWC' },
                    { value: 'p2', label: 'P2 PVS' },
                    { value: 'p1', label: 'P1 Root' },
                    { value: 'b2', label: 'B2 Seq' },
                  ]}
                  value={algoBlack}
                  onChange={(v) => setAlgoBlack(v as AlgorithmType)}
                />
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: '1', label: '1T' },
                    { value: '2', label: '2T' },
                    { value: '4', label: '4T' },
                  ]}
                  value={String(threadsBlack)}
                  onChange={(v) => setThreadsBlack(Number(v))}
                />
                <Slider
                  label="Black Depth"
                  min={2}
                  max={10}
                  value={depthBlack}
                  onChange={setDepthBlack}
                  unit="plies"
                />
              </div>

              {/* White Engine Config */}
              <div className="p-3 bg-ink-950/70 border border-ink-700 rounded-lg space-y-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-text-100 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-pearl border border-brass-400/80" />
                  <span>White AI (Plays Second)</span>
                </div>
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: 'b2', label: 'B2 Seq' },
                    { value: 'p3', label: 'P3 YBWC' },
                    { value: 'p2', label: 'P2 PVS' },
                    { value: 'p1', label: 'P1 Root' },
                  ]}
                  value={algoWhite}
                  onChange={(v) => setAlgoWhite(v as AlgorithmType)}
                />
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: '1', label: '1T' },
                    { value: '2', label: '2T' },
                    { value: '4', label: '4T' },
                  ]}
                  value={String(threadsWhite)}
                  onChange={(v) => setThreadsWhite(Number(v))}
                />
                <Slider
                  label="White Depth"
                  min={2}
                  max={10}
                  value={depthWhite}
                  onChange={setDepthWhite}
                  unit="plies"
                />
              </div>

              {/* Pacing Speed */}
              <div>
                <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-1.5">
                  Move Pacing Speed
                </label>
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: '200', label: '⚡ Fast (200ms)' },
                    { value: '500', label: '⏳ Normal (500ms)' },
                    { value: '1000', label: '🐢 Slow (1s)' },
                  ]}
                  value={String(delayMs)}
                  onChange={(v) => setDelayMs(Number(v))}
                />
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Game Over Dialog */}
      <Dialog
        open={status === 'gameover' && !gameOverDismissed}
        onClose={() => setGameOverDismissed(true)}
        title={`Match Finished — ${winner ? (winner === 'draw' ? 'DRAW' : `${winner.toUpperCase()} WINS`) : 'DRAW'}`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setGameOverDismissed(true)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setGameOverDismissed(false);
                startNewGame();
              }}
            >
              Play Rematch
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-around items-center py-4 border-b border-ink-700 bg-ink-950/40 rounded">
            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-obsidian border border-ink-700 mx-auto mb-1.5 shadow-disc" />
              <div className="font-serif text-sm font-semibold text-text-100">Black</div>
              <div className="font-mono text-2xl font-bold text-brass-400">{score.black}</div>
            </div>
            <div className="font-serif text-sm text-text-400 uppercase">vs</div>
            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-pearl border border-brass-400/80 mx-auto mb-1.5 shadow-disc" />
              <div className="font-serif text-sm font-semibold text-text-100">White</div>
              <div className="font-mono text-2xl font-bold text-text-100">{score.white}</div>
            </div>
          </div>

          {/* Engine Session Statistics */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Avg Nodes" value={avgNodes.toLocaleString()} />
            <Stat label="Avg Time" value={avgTime} unit="ms" />
            <Stat label="Throughput" value={(avgNps / 1e6).toFixed(2)} unit="Mnps" />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
