import React from 'react';
import type { AlgorithmType } from '../../lib/types';
import type { TreePresetId } from './treeTypes';
import { TREE_PRESETS } from './treeGenerator';
import {
  Button,
  SegmentedControl,
  Slider,
  IconButton,
} from '../../design/components';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  Gamepad2,
} from 'lucide-react';

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
            variant="secondary"
            icon={<Gamepad2 className="w-3.5 h-3.5" />}
            onClick={onUseCurrentMatchBoard}
          >
            Load Current Game Board
          </Button>
        )}
      </div>

      {/* Middle Bar: Algorithm, Depth, Threads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Algorithm Selector */}
        <div>
          <label className="text-[10px] font-mono uppercase text-text-400 block mb-1 tracking-wider">
            Search Algorithm
          </label>
          <SegmentedControl
            size="sm"
            options={[
              { value: 'b2', label: 'B2 Seq' },
              { value: 'p1', label: 'P1 Root' },
              { value: 'p2', label: 'P2 PVS' },
              { value: 'p3', label: 'P3 YBWC' },
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
          <label className="text-[10px] font-mono uppercase text-text-400 block mb-1 tracking-wider">
            Worker Threads (Parallel Engines)
          </label>
          <SegmentedControl
            size="sm"
            options={[
              { value: '1', label: '1 Thread' },
              { value: '2', label: '2 Threads' },
              { value: '4', label: '4 Threads' },
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
            icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            onClick={onTogglePlay}
          >
            {isPlaying ? 'Pause' : 'Play Search'}
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
            Step <strong className="text-brass-400">{currentStep}</strong> / {maxStep}
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
