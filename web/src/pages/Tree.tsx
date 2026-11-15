import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '../lib/store';
import type { AlgorithmType, DiscColor, GameConfig } from '../lib/types';
import type { TreePresetId, SearchTreeNode } from '../features/tree/treeTypes';
import {
  TREE_PRESETS,
  getPresetBoard,
  buildSearchTree,
  reconstructBoardAtMove,
} from '../features/tree/treeGenerator';
import { SearchTreeView } from '../features/tree/SearchTreeView';
import { TreeInspector } from '../features/tree/TreeInspector';
import {
  TreeControls,
  type DetectedSettingsInfo,
} from '../features/tree/TreeControls';
import { GitFork, Activity, CheckCircle2 } from 'lucide-react';
import { Badge } from '../design/components';

function detectTurnSettings(
  turn: DiscColor,
  config: GameConfig,
  isGameOver: boolean
): DetectedSettingsInfo {
  if (config.matchMode === 'ai_vs_ai') {
    if (turn === 'black') {
      return {
        algo: (config.algoBlack || config.algo || 'p3') as AlgorithmType,
        threads: config.threadsBlack || config.threads || 4,
        depth: 2,
        playerLabel: 'AI Black',
        isGameOver,
        turn,
      };
    } else {
      return {
        algo: (config.algoWhite || config.algo || 'b2') as AlgorithmType,
        threads: config.threadsWhite || config.threads || 1,
        depth: 2,
        playerLabel: 'AI White',
        isGameOver,
        turn,
      };
    }
  } else {
    const isHuman = config.humanColor === turn;
    return {
      algo: (config.algo || 'p3') as AlgorithmType,
      threads: config.threads || 4,
      depth: 2,
      playerLabel: isHuman ? `Human (${turn})` : `AI Engine (${turn})`,
      isGameOver,
      turn,
    };
  }
}

export const TreePage: React.FC = () => {
  const store = useGameStore();

  const [selectedPreset, setSelectedPreset] = useState<TreePresetId>('standard');
  const [isLiveSync, setIsLiveSync] = useState<boolean>(false);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number>(-1);

  const [algo, setAlgo] = useState<AlgorithmType>('b2');
  const [depth, setDepth] = useState<number>(2);
  const [threads, setThreads] = useState<number>(4);
  const [board, setBoard] = useState<(DiscColor | null)[]>(() => getPresetBoard('standard'));
  const [turn, setTurn] = useState<DiscColor>('black');

  const [selectedNode, setSelectedNode] = useState<SearchTreeNode | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Compute detected settings info for active game
  const detectedInfo = useMemo<DetectedSettingsInfo | null>(() => {
    if (!isLiveSync) return null;
    return detectTurnSettings(
      turn,
      store.config,
      store.status === 'gameover'
    );
  }, [isLiveSync, turn, store.config, store.status]);

  // Handle Preset Selection
  const handleSelectPreset = (presetId: TreePresetId) => {
    if (presetId === 'live_game') {
      handleToggleLiveSync();
      return;
    }
    setIsLiveSync(false);
    setSelectedMoveIndex(-1);
    setSelectedPreset(presetId);
    const preset = TREE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setAlgo(preset.defaultAlgo);
      setDepth(preset.defaultDepth);
      setThreads(preset.defaultThreads);
      setBoard(getPresetBoard(presetId));
      setTurn('black');
    }
  };

  // Toggle or Activate Live Match Tracking
  const handleToggleLiveSync = () => {
    if (!isLiveSync) {
      setIsLiveSync(true);
      setSelectedPreset('live_game');
      setSelectedMoveIndex(-1);

      if (store.discs && store.discs.some((d) => d !== null)) {
        setBoard([...store.discs]);
        setTurn(store.turn);
        const detected = detectTurnSettings(
          store.turn,
          store.config,
          store.status === 'gameover'
        );
        setAlgo(detected.algo);
        setThreads(detected.threads);
      }
    } else {
      // Disconnecting live sync preserves current board as a static snapshot
      setIsLiveSync(false);
    }
  };

  // Synchronize dynamically with live match as moves occur
  useEffect(() => {
    if (!isLiveSync) return;
    if (selectedMoveIndex !== -1) return; // User is inspecting a past move

    if (store.discs && store.discs.some((d) => d !== null)) {
      setBoard([...store.discs]);
      setTurn(store.turn);

      // Auto-detect settings for the active turn
      const detected = detectTurnSettings(
        store.turn,
        store.config,
        store.status === 'gameover'
      );
      setAlgo(detected.algo);
      setThreads(detected.threads);
    }
  }, [
    isLiveSync,
    selectedMoveIndex,
    store.discs,
    store.turn,
    store.lastMove,
    store.status,
    store.config,
    store.moveHistory.length,
  ]);

  // Handle inspecting specific ply from match history
  const handleSelectMoveIndex = (idx: number) => {
    setSelectedMoveIndex(idx);
    if (idx === -1) {
      // Return to live latest state
      if (store.discs && store.discs.some((d) => d !== null)) {
        setBoard([...store.discs]);
        setTurn(store.turn);
        const detected = detectTurnSettings(
          store.turn,
          store.config,
          store.status === 'gameover'
        );
        setAlgo(detected.algo);
        setThreads(detected.threads);
      }
    } else {
      // Reconstruct board at historical ply
      const state = reconstructBoardAtMove(store.moveHistory, idx);
      setBoard(state.board);
      setTurn(state.turn);
      const detected = detectTurnSettings(
        state.turn,
        store.config,
        false
      );
      setAlgo(detected.algo);
      setThreads(detected.threads);
    }
  };

  // Generate tree dynamically
  const { root, metrics, allNodes } = useMemo(() => {
    return buildSearchTree(board, turn, algo, depth, threads);
  }, [board, turn, algo, depth, threads]);

  const maxStep = allNodes.length;

  // Sync step and selected node on tree re-generation
  useEffect(() => {
    setCurrentStep(maxStep);
    setSelectedNode(root);
    setIsPlaying(false);
  }, [root, maxStep]);

  // Stepper playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= maxStep) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        const activeNode = allNodes.find((n) => n.stepOrder === next);
        if (activeNode) setSelectedNode(activeNode);
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, maxStep, allNodes]);

  const handleStepForward = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(maxStep, prev + 1);
      const activeNode = allNodes.find((n) => n.stepOrder === next);
      if (activeNode) setSelectedNode(activeNode);
      return next;
    });
  }, [maxStep, allNodes]);

  const handleStepBackward = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(1, prev - 1);
      const activeNode = allNodes.find((n) => n.stepOrder === next);
      if (activeNode) setSelectedNode(activeNode);
      return next;
    });
  }, [allNodes]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(1);
    setSelectedNode(root);
  }, [root]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-8 py-6 space-y-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-text-100 flex items-center gap-2.5">
              <GitFork className="w-6 h-6 text-brass-400" />
              Algorithm Search Tree
            </h1>
            {isLiveSync && (
              <Badge variant={store.status === 'gameover' ? 'brass' : 'signal'}>
                {store.status === 'gameover' ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-brass-400" />
                    Match Preserved
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-signal animate-pulse" />
                    Live Game Synced
                  </span>
                )}
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-400 mt-1 max-w-2xl font-sans">
            Explore the negamax game tree generated by Sequential Alpha-Beta (B2), Root Splitting (P1),
            Principal Variation Splitting (P2), and Young Brothers Wait Concept (P3).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs bg-ink-900 border border-ink-700 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-text-400">Total Nodes:</span>
          <span className="text-brass-400 font-bold">{metrics.totalNodes}</span>
          <span className="text-ink-700">|</span>
          <span className="text-text-400">Visited:</span>
          <span className="text-text-100 font-bold">{metrics.visitedNodes}</span>
        </div>
      </div>

      {/* Control Panel */}
      <TreeControls
        algo={algo}
        onChangeAlgo={setAlgo}
        depth={depth}
        onChangeDepth={setDepth}
        threads={threads}
        onChangeThreads={setThreads}
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
        onUseCurrentMatchBoard={handleToggleLiveSync}
        isLiveSync={isLiveSync}
        onToggleLiveSync={handleToggleLiveSync}
        detectedInfo={detectedInfo}
        moveHistory={store.moveHistory}
        selectedMoveIndex={selectedMoveIndex}
        onSelectMoveIndex={handleSelectMoveIndex}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onReset={handleReset}
        currentStep={currentStep}
        maxStep={maxStep}
        onChangeStep={(step) => {
          setCurrentStep(step);
          const activeNode = allNodes.find((n) => n.stepOrder === step);
          if (activeNode) setSelectedNode(activeNode);
        }}
        hasLiveMatchBoard={Boolean(store.discs && store.discs.some((d) => d !== null))}
      />

      {/* Main Grid: Interactive SVG Canvas (Left) + Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: SVG Canvas */}
        <div className="lg:col-span-8 w-full min-w-0 space-y-2">
          <SearchTreeView
            root={root}
            allNodes={allNodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            currentStep={currentStep}
            maxStep={maxStep}
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-text-400 px-1">
            <span>Drag canvas to pan · Scroll wheel to zoom · Click node to inspect</span>
            <span>
              Showing {currentStep} of {maxStep} nodes explored
            </span>
          </div>
        </div>

        {/* Right: Selected Node Details & Metrics */}
        <div className="lg:col-span-4 w-full min-w-0">
          <TreeInspector
            selectedNode={selectedNode}
            metrics={metrics}
            algo={algo}
          />
        </div>
      </div>
    </div>
  );
};
export default TreePage;

