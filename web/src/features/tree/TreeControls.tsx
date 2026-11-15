import React from "react";
import type { AlgorithmType, DiscColor } from "../../lib/types";
import type { TreePresetId } from "./treeTypes";
import { TREE_PRESETS } from "./treeGenerator";
import {
  Button,
  SegmentedControl,
  Slider,
  IconButton,
} from "../../design/components";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  Gamepad2,
  Activity,
  History,
  CheckCircle2,
} from "lucide-react";

export interface DetectedSettingsInfo {
  algo: AlgorithmType;
  threads: number;
  depth: number;
  playerLabel: string;
  isGameOver: boolean;
  turn: DiscColor;
}

interface TreeControlsProps {
  algo: AlgorithmType;
  onChangeAlgo: (algo: AlgorithmType) => void;
  depth: number;
  onChangeDepth: (depth: number) => void;
  threads: number;
  onChangeThreads: (threads: number) => void;
  selectedPreset: TreePresetId;
  onSelectPreset: (presetId: TreePresetId) => void;
  onUseCurrentMatchBoard: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  currentStep: number;
  maxStep: number;
  onChangeStep: (step: number) => void;
  hasLiveMatchBoard: boolean;
  isLiveSync?: boolean;
  onToggleLiveSync?: () => void;
  detectedInfo?: DetectedSettingsInfo | null;
  moveHistory?: Array<{ sq: number; coord: string; color: DiscColor }>;
  selectedMoveIndex?: number;
  onSelectMoveIndex?: (idx: number) => void;
}

export const TreeControls: React.FC<TreeControlsProps> = ({
  algo,
  onChangeAlgo,
  depth,
  onChangeDepth,
  threads,
  onChangeThreads,
  selectedPreset,
  onSelectPreset,
  onUseCurrentMatchBoard,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onReset,
  currentStep,
  maxStep,
  onChangeStep,
  hasLiveMatchBoard,
  isLiveSync = false,
  onToggleLiveSync,
  detectedInfo,
  moveHistory = [],
  selectedMoveIndex = -1,
  onSelectMoveIndex,
}) => {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-xl p-4 space-y-4 shadow-panel">
      {/* Top Bar: Presets + Import Board */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brass-400 shrink-0" />
          <span className="text-xs font-mono uppercase text-text-400 tracking-wider">
            Tree Scenario:
          </span>
          <select
            value={selectedPreset}
            onChange={(e) => onSelectPreset(e.target.value as TreePresetId)}
            className="bg-ink-950 border border-ink-700 text-text-100 text-xs rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 font-mono cursor-pointer"
          >
            {isLiveSync && (
              <option value="live_game">
                🎮 Live Match ({detectedInfo?.isGameOver ? "Completed" : "Dynamic Sync"})
              </option>
            )}
            {TREE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {hasLiveMatchBoard && (
          <Button
            size="sm"
            variant={isLiveSync ? "primary" : "secondary"}
            icon={
              <Gamepad2
                className={`w-3.5 h-3.5 ${
                  isLiveSync ? "text-signal" : "text-brass-400"
                }`}
              />
            }
            onClick={onToggleLiveSync || onUseCurrentMatchBoard}
          >
            {isLiveSync ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                Live Match Synced
              </span>
            ) : (
              "Load Current Game Board"
            )}
          </Button>
        )}
      </div>

      {/* Dynamic Game Sync Banner (when connected to live match) */}
      {isLiveSync && detectedInfo && (
        <div className="bg-ink-950 border border-ink-700/80 rounded-lg p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-signal font-semibold">
                {detectedInfo.isGameOver ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-signal" />
                    MATCH COMPLETED (PRESERVED)
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-signal animate-pulse" />
                    LIVE GAME SYNC ACTIVE
                  </>
                )}
              </span>
              <span className="text-ink-700">|</span>
              <span className="text-text-400">Player:</span>
              <span className="text-text-100 font-semibold">
                {detectedInfo.playerLabel}
              </span>
              <span className="text-ink-700">|</span>
              <span className="text-text-400">Auto-detected Engine:</span>
              <span className="text-brass-400 font-bold uppercase">
                {detectedInfo.algo} ({detectedInfo.threads} {detectedInfo.threads === 1 ? 'core' : 'cores'})
              </span>
            </div>

            <span className="text-[11px] text-text-400">
              {detectedInfo.isGameOver
                ? "Full game state preserved for tree analysis"
                : "Dynamically re-evaluates as moves are placed"}
            </span>
          </div>

          {/* Move History / Replay Scrubber across match plies */}
          {moveHistory.length > 0 && onSelectMoveIndex && (
            <div className="pt-2 border-t border-ink-700/50 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-brass-400" />
                <span className="text-text-400">Inspect Ply:</span>
                <select
                  value={selectedMoveIndex}
                  onChange={(e) => onSelectMoveIndex(Number(e.target.value))}
                  className="bg-ink-900 border border-ink-700 text-text-100 text-xs rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 font-mono cursor-pointer"
                >
                  <option value={-1}>
                    Latest Board State ({moveHistory.length} moves played)
                  </option>
                  {moveHistory.map((m, idx) => (
                    <option key={idx} value={idx}>
                      Ply {idx + 1}: {m.coord.toUpperCase()} ({m.color})
                    </option>
                  ))}
                </select>
              </div>

              {selectedMoveIndex !== -1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectMoveIndex(-1)}
                >
                  Return to Live Latest
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Middle Bar: Algorithm, Depth, Threads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Algorithm Selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono uppercase text-text-400 tracking-wider">
              Search Algorithm
            </label>
            {isLiveSync && (
              <span className="text-[9px] font-mono text-brass-400">
                (Auto-synced)
              </span>
            )}
          </div>
          <SegmentedControl
            size="sm"
            options={[
              { value: "b2", label: "B2 Seq" },
              { value: "p1", label: "P1 Root" },
              { value: "p2", label: "P2 PVS" },
              { value: "p3", label: "P3 YBWC" },
            ]}
            value={algo}
            onChange={(v) => onChangeAlgo(v as AlgorithmType)}
          />
        </div>

        {/* Depth Slider */}
        <div>
          <Slider
            label="Search Depth"
            min={1}
            max={3}
            value={depth}
            onChange={onChangeDepth}
            unit="plies"
          />
        </div>

        {/* Parallel Threads */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono uppercase text-text-400 tracking-wider">
              Worker Threads
            </label>
            {isLiveSync && (
              <span className="text-[9px] font-mono text-brass-400">
                (Auto-synced)
              </span>
            )}
          </div>
          <SegmentedControl
            size="sm"
            options={[
              { value: "1", label: "1 Thread" },
              { value: "2", label: "2 Threads" },
              { value: "4", label: "4 Threads" },
            ]}
            value={String(threads)}
            onChange={(v) => onChangeThreads(Number(v))}
          />
        </div>
      </div>

      {/* Bottom Bar: Search Stepper Animation */}
      <div className="pt-2 border-t border-ink-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <IconButton
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            label="Reset"
            size="sm"
            variant="ghost"
            onClick={onReset}
          />
          <IconButton
            icon={<SkipBack className="w-3.5 h-3.5" />}
            label="Step Backward"
            size="sm"
            variant="secondary"
            disabled={currentStep <= 1}
            onClick={onStepBackward}
          />
          <Button
            size="sm"
            variant="primary"
            icon={
              isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
            onClick={onTogglePlay}
          >
            {isPlaying ? "Pause" : "Play Search"}
          </Button>
          <IconButton
            icon={<SkipForward className="w-3.5 h-3.5" />}
            label="Step Forward"
            size="sm"
            variant="secondary"
            disabled={currentStep >= maxStep}
            onClick={onStepForward}
          />
        </div>

        {/* Step Slider & Progress */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="text-[11px] font-mono text-text-400 shrink-0">
            Step <strong className="text-brass-400">{currentStep}</strong> /{" "}
            {maxStep}
          </span>
          <input
            type="range"
            min={1}
            max={maxStep}
            value={currentStep}
            onChange={(e) => onChangeStep(Number(e.target.value))}
            className="w-full accent-brass-400 cursor-pointer h-1.5 bg-ink-950 rounded-lg appearance-none"
          />
        </div>
      </div>
    </div>
  );
};
