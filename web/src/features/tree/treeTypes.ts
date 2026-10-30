import type { DiscColor, AlgorithmType } from '../../lib/types';

export type NodeType = 'PV' | 'CUT' | 'ALL';
export type NodeStatus = 'unvisited' | 'searching' | 'waiting' | 'completed' | 'pruned';

export interface SearchTreeNode {
  id: string;
  coord: string;
  sq: number;
  player: DiscColor;
  ply: number;
  depth: number;
  alpha: number;
  beta: number;
  value: number | null;
  nodeType: NodeType;
  thread: string; // "T1", "T2", "T3", "T4"
  status: NodeStatus;
  pruned: boolean;
  cutoffReason?: string;
  isLeaf: boolean;
  boardDiscs: (DiscColor | null)[];
  children: SearchTreeNode[];
  stepOrder: number;
  x?: number;
  y?: number;
}

export interface TreeMetrics {
  totalNodes: number;
  visitedNodes: number;
  prunedNodes: number;
  leafNodes: number;
  pruningEfficiency: number; // 1 - N_ab / N_minimax
  searchOverhead: number;    // SO_P = N_P / N_1 - 1
  effectiveBranchingFactor: number; // b* = N1^(1/d)
  pvMoves: string[];
}

export type TreePresetId = 'standard' | 'cutoff_demo' | 'ybwc_stealing' | 'root_splitting';

export interface TreePreset {
  id: TreePresetId;
  name: string;
  description: string;
  defaultAlgo: AlgorithmType;
  defaultDepth: number;
  defaultThreads: number;
}
