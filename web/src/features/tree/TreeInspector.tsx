import React from 'react';
import type { SearchTreeNode, TreeMetrics } from './treeTypes';
import { Panel, Badge, Formula } from '../../design/components';
import { Info, GitBranch, Cpu, ShieldAlert } from 'lucide-react';

interface TreeInspectorProps {
  selectedNode: SearchTreeNode | null;
  metrics: TreeMetrics;
  algo: string;
}

export const TreeInspector: React.FC<TreeInspectorProps> = ({
  selectedNode,
  metrics,
  algo,
}) => {
  return (
    <div className="space-y-4">
      {/* Node Details Panel */}
      <Panel
        title={selectedNode ? `Node: ${selectedNode.coord.toUpperCase()}` : 'Node Inspector'}
        subtitle={selectedNode ? `Depth ${selectedNode.depth} · Ply ${selectedNode.ply}` : 'Select any node in tree'}
      >
        {selectedNode ? (
          <div className="space-y-4">
            {/* Status & Thread Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700/80 pb-3">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={
                    selectedNode.pruned
                      ? 'danger'
                      : selectedNode.nodeType === 'PV'
                      ? 'brass'
                      : selectedNode.nodeType === 'CUT'
                      ? 'signal'
                      : 'neutral'
                  }
                >
                  {selectedNode.pruned ? 'Pruned Subtree' : `${selectedNode.nodeType} Node`}
                </Badge>
                <Badge variant="neutral">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-brass-400" />
                    {selectedNode.thread}
                  </span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-text-400">Player:</span>
                <span className="flex items-center gap-1 text-text-100 font-semibold uppercase">
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block ${
                      selectedNode.player === 'black'
                        ? 'bg-obsidian border border-ink-700'
                        : 'bg-pearl border border-brass-400/80'
                    }`}
                  />
                  {selectedNode.player}
                </span>
              </div>
            </div>

            {/* Evaluation & Bounds */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-ink-950/70 border border-ink-700/80 rounded p-2.5">
                <span className="text-text-400 text-[10px] uppercase block mb-1">
                  Search Bounds [α, β]
                </span>
                <span className="text-text-100 font-bold">
                  [{selectedNode.alpha === -10000 ? '-∞' : selectedNode.alpha},{' '}
                  {selectedNode.beta === 10000 ? '+∞' : selectedNode.beta}]
                </span>
              </div>
              <div className="bg-ink-950/70 border border-ink-700/80 rounded p-2.5">
                <span className="text-text-400 text-[10px] uppercase block mb-1">
                  Node Value (v)
                </span>
                <span
                  className={`font-bold ${
                    selectedNode.value !== null ? 'text-brass-400' : 'text-text-400'
                  }`}
                >
                  {selectedNode.value !== null ? selectedNode.value : 'N/A (Pruned)'}
                </span>
              </div>
            </div>

            {/* Cutoff explanation if pruned */}
            {selectedNode.pruned && (
              <div className="p-2.5 bg-danger/10 border border-danger/30 rounded text-xs text-danger flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold font-serif">Alpha-Beta Cutoff</div>
                  <div className="text-[11px] font-mono mt-0.5">
                    {selectedNode.cutoffReason || 'Pruned because sibling achieved value ≥ β.'}
                  </div>
                </div>
              </div>
            )}

            {/* Mini 8x8 Board Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase text-text-400 block tracking-wider">
                Board Position at Node
              </span>
              <div className="w-48 h-48 mx-auto bg-jade-900 border border-jade-600/60 rounded-lg p-1.5 shadow-panel">
                <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-[1px] bg-jade-600 border border-jade-600 rounded-sm">
                  {selectedNode.boardDiscs.map((disc, idx) => {
                    const isMoveSq = idx === selectedNode.sq;
                    return (
                      <div
                        key={idx}
                        className="relative w-full h-full bg-jade-700 flex items-center justify-center"
                      >
                        {disc && (
                          <div
                            className={`w-3.5 h-3.5 rounded-full ${
                              disc === 'black'
                                ? 'bg-obsidian border border-ink-700'
                                : 'bg-pearl border border-brass-400/80'
                            }`}
                          />
                        )}
                        {isMoveSq && (
                          <div className="absolute inset-0 border border-brass-400 rounded-full animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-text-400 text-xs font-mono">
            <Info className="w-6 h-6 mx-auto mb-2 text-text-400/50" />
            Click any node in the tree to inspect search bounds, minimax evaluation, and board state.
          </div>
        )}
      </Panel>

      {/* Algorithm Comparison Metrics Panel */}
      <Panel title="Algorithm Metrics" subtitle={`${algo.toUpperCase()} Search Tree Analysis`}>
        <div className="space-y-3.5 text-xs font-mono">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-ink-950/70 border border-ink-700/80 rounded p-2.5">
              <span className="text-text-400 text-[10px] uppercase block mb-1">
                Visited Nodes (N_ab)
              </span>
              <span className="text-text-100 font-bold text-base">
                {metrics.visitedNodes}
              </span>
            </div>
            <div className="bg-ink-950/70 border border-ink-700/80 rounded p-2.5">
              <span className="text-text-400 text-[10px] uppercase block mb-1">
                Pruned Branches
              </span>
              <span className="text-danger font-bold text-base">
                {metrics.prunedNodes}
              </span>
            </div>
          </div>

          {/* Formulas required by master rules */}
          <div className="p-2.5 bg-ink-950/60 border border-ink-700 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-400">Pruning Efficiency:</span>
              <span className="text-brass-400 font-bold">
                {(metrics.pruningEfficiency * 100).toFixed(1)}%
              </span>
            </div>
            <Formula
              math="\text{pruning efficiency} = 1 - \frac{N_{\alpha\beta}}{N_{\text{minimax}}}"
              block={false}
              className="text-[11px] text-text-400 block"
            />
          </div>

          <div className="p-2.5 bg-ink-950/60 border border-ink-700 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-400">Search Overhead:</span>
              <span className="text-signal font-bold">
                +{(metrics.searchOverhead * 100).toFixed(0)}%
              </span>
            </div>
            <Formula
              math="SO_P = \frac{N_P}{N_1} - 1"
              block={false}
              className="text-[11px] text-text-400 block"
            />
          </div>

          <div className="p-2.5 bg-ink-950/60 border border-ink-700 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-400">Effective Branching:</span>
              <span className="text-text-100 font-bold">
                b* = {metrics.effectiveBranchingFactor}
              </span>
            </div>
            <Formula
              math="b^* = N_1^{1/d}"
              block={false}
              className="text-[11px] text-text-400 block"
            />
          </div>

          {/* Principal Variation Line */}
          {metrics.pvMoves.length > 0 && (
            <div className="pt-2 border-t border-ink-700 flex items-center justify-between">
              <span className="text-text-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-brass-400" />
                Principal Variation:
              </span>
              <span className="text-brass-400 font-bold">
                {metrics.pvMoves.join(' → ')}
              </span>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
