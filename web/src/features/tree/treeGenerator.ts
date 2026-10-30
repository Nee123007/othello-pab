import type { DiscColor, AlgorithmType } from '../../lib/types';
import type { SearchTreeNode, TreeMetrics, TreePreset, TreePresetId } from './treeTypes';
import { squareToCoord } from '../../lib/bitboard';

const POSITIONAL_WEIGHTS: number[] = [
  100, -20,  10,   5,   5,  10, -20, 100,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
   10,  -5,   2,   2,   2,   2,  -5,  10,
    5,  -5,   2,   0,   0,   2,  -5,   5,
    5,  -5,   2,   0,   0,   2,  -5,   5,
   10,  -5,   2,   2,   2,   2,  -5,  10,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
  100, -20,  10,   5,   5,  10, -20, 100
];

const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9];

function getRowCol(sq: number): [number, number] {
  return [Math.floor(sq / 8), sq % 8];
}

export function computeFlips(board: (DiscColor | null)[], sq: number, player: DiscColor): number[] {
  if (board[sq] !== null) return [];
  const opp: DiscColor = player === 'black' ? 'white' : 'black';
  const [r, c] = getRowCol(sq);
  const flips: number[] = [];

  for (const dir of DIRECTIONS) {
    // Normalized stepR, stepC
    const stepR = dir === -9 || dir === -8 || dir === -7 ? -1 : dir === 9 || dir === 8 || dir === 7 ? 1 : 0;
    const stepC = dir === -9 || dir === -1 || dir === 7 ? -1 : dir === -7 || dir === 1 || dir === 9 ? 1 : 0;

    let cr = r + stepR;
    let cc = c + stepC;
    const potential: number[] = [];

    while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
      const idx = cr * 8 + cc;
      if (board[idx] === opp) {
        potential.push(idx);
        cr += stepR;
        cc += stepC;
      } else if (board[idx] === player) {
        if (potential.length > 0) {
          flips.push(...potential);
        }
        break;
      } else {
        break;
      }
    }
  }

  return flips;
}

export function getLegalMoves(board: (DiscColor | null)[], player: DiscColor): number[] {
  const legal: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    if (board[sq] === null && computeFlips(board, sq, player).length > 0) {
      legal.push(sq);
    }
  }
  // Sort legal moves by positional weight descending
  legal.sort((a, b) => POSITIONAL_WEIGHTS[b] - POSITIONAL_WEIGHTS[a]);
  return legal;
}

export function applyMove(
  board: (DiscColor | null)[],
  sq: number,
  player: DiscColor
): (DiscColor | null)[] {
  const next = [...board];
  const flips = computeFlips(board, sq, player);
  next[sq] = player;
  for (const f of flips) {
    next[f] = player;
  }
  return next;
}

export function evaluatePosition(board: (DiscColor | null)[], player: DiscColor): number {
  let score = 0;
  const opp: DiscColor = player === 'black' ? 'white' : 'black';

  for (let i = 0; i < 64; i++) {
    if (board[i] === player) score += POSITIONAL_WEIGHTS[i];
    else if (board[i] === opp) score -= POSITIONAL_WEIGHTS[i];
  }

  // Mobility
  const playerMoves = getLegalMoves(board, player).length;
  const oppMoves = getLegalMoves(board, opp).length;
  score += (playerMoves - oppMoves) * 5;

  return score;
}

export const TREE_PRESETS: TreePreset[] = [
  {
    id: 'standard',
    name: 'Standard Opening (Depth 2-3)',
    description: 'Initial game position with 4 balanced opening moves (c4, d3, e6, f5).',
    defaultAlgo: 'b2',
    defaultDepth: 2,
    defaultThreads: 4,
  },
  {
    id: 'cutoff_demo',
    name: 'Cutoff Demonstration (Beta Cut)',
    description: 'A tactical position where the first move produces a cutoff, pruning young siblings.',
    defaultAlgo: 'b2',
    defaultDepth: 2,
    defaultThreads: 4,
  },
  {
    id: 'ybwc_stealing',
    name: 'YBWC Work Stealing Flow',
    description: 'Shows elder brother searched first on T1, followed by young brothers waiting and parallel steal on T2-T4.',
    defaultAlgo: 'p3',
    defaultDepth: 2,
    defaultThreads: 4,
  },
  {
    id: 'root_splitting',
    name: 'Root Splitting Overhead (P1 vs B2)',
    description: 'Shows how Root Splitting searches redundant branches concurrently, incurring search overhead SO_P.',
    defaultAlgo: 'p1',
    defaultDepth: 2,
    defaultThreads: 4,
  },
];

export function getInitialBoard(): (DiscColor | null)[] {
  const b: (DiscColor | null)[] = Array(64).fill(null);
  b[27] = 'white'; // d4
  b[28] = 'black'; // e4
  b[35] = 'black'; // d5
  b[36] = 'white'; // e5
  return b;
}

export function getPresetBoard(presetId: TreePresetId): (DiscColor | null)[] {
  const b = getInitialBoard();
  if (presetId === 'cutoff_demo') {
    // Play d3 then c3 to set up an asymmetric tactical board
    const b1 = applyMove(b, 19, 'black'); // d3
    return applyMove(b1, 18, 'white');    // c3
  }
  return b;
}

interface TreeBuildContext {
  algo: AlgorithmType;
  maxDepth: number;
  threads: number;
  stepCounter: number;
  totalVisited: number;
  totalPruned: number;
  leafCount: number;
  pvPath: string[];
}

export function buildSearchTree(
  board: (DiscColor | null)[],
  turn: DiscColor,
  algo: AlgorithmType,
  maxDepth: number,
  threads: number = 4
): { root: SearchTreeNode; metrics: TreeMetrics; allNodes: SearchTreeNode[] } {
  const ctx: TreeBuildContext = {
    algo,
    maxDepth,
    threads,
    stepCounter: 0,
    totalVisited: 0,
    totalPruned: 0,
    leafCount: 0,
    pvPath: [],
  };

  const allNodes: SearchTreeNode[] = [];

  const root = searchNode(
    board,
    turn,
    -1, // root
    'Root',
    0, // ply
    maxDepth,
    -10000,
    10000,
    'T1',
    ctx,
    allNodes,
    'root'
  );

  // Calculate layout coordinates
  assignTreeCoordinates(root);

  // Compute metrics
  const minAlphaBetaNodes = Math.max(1, ctx.totalVisited);
  const theoreticalMinimax = ctx.totalVisited + ctx.totalPruned;
  const pruningEff = 1 - (minAlphaBetaNodes / Math.max(1, theoreticalMinimax));
  const searchOverhead = algo === 'b2' ? 0 : algo === 'p1' ? 0.35 : algo === 'p2' ? 0.18 : 0.08;
  const effectiveB = Math.pow(minAlphaBetaNodes, 1 / Math.max(1, maxDepth));

  const metrics: TreeMetrics = {
    totalNodes: ctx.totalVisited + ctx.totalPruned,
    visitedNodes: ctx.totalVisited,
    prunedNodes: ctx.totalPruned,
    leafNodes: ctx.leafCount,
    pruningEfficiency: Math.max(0, Math.min(0.99, pruningEff)),
    searchOverhead,
    effectiveBranchingFactor: Number(effectiveB.toFixed(2)),
    pvMoves: ctx.pvPath,
  };

  return { root, metrics, allNodes };
}

function searchNode(
  board: (DiscColor | null)[],
  turn: DiscColor,
  sq: number,
  coord: string,
  ply: number,
  depth: number,
  alpha: number,
  beta: number,
  assignedThread: string,
  ctx: TreeBuildContext,
  allNodes: SearchTreeNode[],
  parentId: string
): SearchTreeNode {
  ctx.totalVisited++;
  const step = ++ctx.stepCounter;
  const isRoot = ply === 0;
  const opp: DiscColor = turn === 'black' ? 'white' : 'black';
  const nodeId = `${parentId}-${coord}`;

  const node: SearchTreeNode = {
    id: nodeId,
    coord,
    sq,
    player: turn,
    ply,
    depth,
    alpha,
    beta,
    value: null,
    nodeType: 'PV',
    thread: assignedThread,
    status: 'completed',
    pruned: false,
    isLeaf: false,
    boardDiscs: [...board],
    children: [],
    stepOrder: step,
  };

  allNodes.push(node);

  // Terminal or leaf check
  if (depth === 0) {
    node.isLeaf = true;
    ctx.leafCount++;
    node.value = evaluatePosition(board, turn);
    return node;
  }

  const legalMoves = getLegalMoves(board, turn);

  if (legalMoves.length === 0) {
    // Pass or terminal
    node.isLeaf = true;
    ctx.leafCount++;
    node.value = evaluatePosition(board, turn);
    return node;
  }

  let bestValue = -10000;
  let currentAlpha = alpha;
  let bestChildCoord = '';
  let hadCutoff = false;

  // Search children according to algorithm
  for (let i = 0; i < legalMoves.length; i++) {
    const childSq = legalMoves[i];
    const childCoord = squareToCoord(childSq);
    const nextBoard = applyMove(board, childSq, turn);

    // Thread assignment based on algorithm
    let childThread = 'T1';

    if (isRoot) {
      if (ctx.algo === 'p1') {
        // Root Splitting assigns each root child to a thread T1..TP
        const tIdx = (i % ctx.threads) + 1;
        childThread = `T${tIdx}`;
      } else if (ctx.algo === 'p2') {
        // PVS: first is T1, remaining are parallel
        childThread = i === 0 ? 'T1' : `T${(i % ctx.threads) + 1}`;
      } else if (ctx.algo === 'p3') {
        // YBWC: elder brother is T1, young brothers stolen by idle threads
        childThread = i === 0 ? 'T1' : `T${((i - 1) % (ctx.threads - 1 || 1)) + 2}`;
      }
    } else {
      childThread = assignedThread;
    }

    if (hadCutoff) {
      // In B2, P2, and YBWC, remaining siblings are PRUNED after a beta cutoff
      // In P1 (Root splitting), root siblings were dispatched simultaneously, so they are not pruned early at root
      const isPruned = !(isRoot && ctx.algo === 'p1');
      if (isPruned) {
        ctx.totalPruned++;
        const prunedNode: SearchTreeNode = {
          id: `${nodeId}-${childCoord}-pruned`,
          coord: childCoord,
          sq: childSq,
          player: opp,
          ply: ply + 1,
          depth: depth - 1,
          alpha: -beta,
          beta: -currentAlpha,
          value: null,
          nodeType: 'CUT',
          thread: childThread,
          status: 'pruned',
          pruned: true,
          cutoffReason: `Pruned by β-cutoff (v=${bestValue} ≥ β=${beta})`,
          isLeaf: true,
          boardDiscs: nextBoard,
          children: [],
          stepOrder: ++ctx.stepCounter,
        };
        allNodes.push(prunedNode);
        node.children.push(prunedNode);
        continue;
      }
    }

    // Negamax recursive call
    const childNode = searchNode(
      nextBoard,
      opp,
      childSq,
      childCoord,
      ply + 1,
      depth - 1,
      -beta,
      -currentAlpha,
      childThread,
      ctx,
      allNodes,
      nodeId
    );

    const childScore = childNode.value !== null ? -childNode.value : 0;

    if (childScore > bestValue) {
      bestValue = childScore;
      bestChildCoord = childCoord;
    }

    if (bestValue > currentAlpha) {
      currentAlpha = bestValue;
    }

    // Alpha-beta pruning condition: beta cutoff
    if (currentAlpha >= beta) {
      hadCutoff = true;
      node.nodeType = 'CUT';
      node.cutoffReason = `v=${currentAlpha} ≥ β=${beta}`;
    }

    node.children.push(childNode);
  }

  node.value = bestValue;

  if (node.nodeType !== 'CUT') {
    if (bestValue <= alpha) {
      node.nodeType = 'ALL';
    } else {
      node.nodeType = 'PV';
      if (isRoot && bestChildCoord) {
        ctx.pvPath.push(bestChildCoord);
      }
    }
  }

  return node;
}

// Tree layout coordinate assignment (tidy hierarchical tree)
function assignTreeCoordinates(root: SearchTreeNode) {
  let leafIndex = 0;

  function layoutSubtree(node: SearchTreeNode, depth: number) {
    const ySpacing = 95;
    node.y = depth * ySpacing + 45;

    if (node.children.length === 0) {
      const xSpacing = 68;
      node.x = leafIndex * xSpacing + 40;
      leafIndex++;
      return;
    }

    for (const child of node.children) {
      layoutSubtree(child, depth + 1);
    }

    // Parent x is the midpoint of first and last child
    const firstX = node.children[0].x || 0;
    const lastX = node.children[node.children.length - 1].x || 0;
    node.x = (firstX + lastX) / 2;
  }

  layoutSubtree(root, 0);
}
