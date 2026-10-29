import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Badge, SegmentedControl } from '../../design/components';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface TreeNode {
  label: string;
  player: 'MAX' | 'MIN';
  nodeType: 'PV' | 'CUT' | 'ALL';
  value: number;
}

interface TreeChild {
  id: string;
  player: 'MAX' | 'MIN';
  nodeType: 'PV' | 'CUT' | 'ALL';
  leaves: number[];
  result: string;
}

interface YBWCTreeData {
  root: TreeNode;
  children: TreeChild[];
  workers: string[];
}

export const YBWCTreeStepper: React.FC = () => {
  const [data, setData] = useState<YBWCTreeData | null>(null);
  const [mode, setMode] = useState<'ybwc' | 'rootsplit'>('ybwc');
  const [step, setStep] = useState<number>(0); // 0: Start, 1: Eldest brother searched, 2: Young brothers searched

  useEffect(() => {
    fetch('/data/ybwc_tree.json')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((err) => console.error('Failed to load ybwc_tree.json:', err));
  }, []);

  const totalLeavesInTree = useMemo(() => {
    if (!data) return 0;
    return data.children.reduce((acc, c) => acc + c.leaves.length, 0);
  }, [data]);

  // Compute leaf visited counts from data
  const ybwcLeavesVisited = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    // Step 0: 0
    if (step === 0) return 0;
    // Step 1: Child A (eldest) is searched completely
    const eldest = data.children[0];
    if (eldest) count += eldest.leaves.length;
    // Step 2: Young brothers searched with alpha cutoff
    if (step >= 2) {
      const alpha = eldest ? Math.min(...eldest.leaves) : 5;
      for (let i = 1; i < data.children.length; i++) {
        const child = data.children[i];
        for (const leaf of child.leaves) {
          count += 1;
          // Beta cutoff at MIN node occurs if leaf <= alpha
          if (leaf <= alpha) break;
        }
      }
    }
    return count;
  }, [data, step]);

  const rootSplitLeavesVisited = useMemo(() => {
    if (!data) return 0;
    if (step === 0) return 0;
    // In root splitting without wait, all branches search all their leaves concurrently
    return totalLeavesInTree;
  }, [data, step, totalLeavesInTree]);

  const activeLeavesCount = mode === 'ybwc' ? ybwcLeavesVisited : rootSplitLeavesVisited;
  const maxYbwcLeaves = useMemo(() => {
    if (!data) return 5;
    const eldest = data.children[0];
    const eldestCount = eldest ? eldest.leaves.length : 3;
    const alpha = 5;
    let youngCount = 0;
    for (let i = 1; i < data.children.length; i++) {
      for (const leaf of data.children[i].leaves) {
        youngCount++;
        if (leaf <= alpha) break;
      }
    }
    return eldestCount + youngCount;
  }, [data]);

  const searchOverheadPct = useMemo(() => {
    if (maxYbwcLeaves === 0) return 0;
    return Math.round(((totalLeavesInTree / maxYbwcLeaves) - 1) * 100);
  }, [totalLeavesInTree, maxYbwcLeaves]);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, 2));
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep]);

  if (!data) {
    return <div className="text-xs font-mono text-text-400 p-4">Loading tree data...</div>;
  }

  // Determine node & leaf visual states based on mode and step
  const getChildState = (childIndex: number) => {
    if (step === 0) return { active: false, status: 'unvisited', worker: null };
    if (mode === 'rootsplit') {
      return { active: true, status: 'searching_all', worker: `W${childIndex + 1}` };
    }
    // YBWC mode
    if (childIndex === 0) {
      return { active: step >= 1, status: step >= 1 ? 'completed' : 'unvisited', worker: 'W1' };
    } else {
      return {
        active: step >= 2,
        status: step >= 2 ? 'cutoff' : 'waiting',
        worker: step >= 2 ? (childIndex === 1 ? 'W1' : 'W2') : null,
      };
    }
  };

  const isLeafVisited = (childIndex: number, leafIndex: number) => {
    if (step === 0) return false;
    if (mode === 'rootsplit') return true;
    // YBWC mode
    if (childIndex === 0) {
      return step >= 1;
    }
    if (step >= 2) {
      // First leaf of B and C is tested (3 and 4 <= 5), subsequent leaves pruned!
      return leafIndex === 0;
    }
    return false;
  };

  const isLeafPruned = (childIndex: number, leafIndex: number) => {
    if (mode === 'rootsplit') return false;
    if (childIndex > 0 && step >= 2 && leafIndex > 0) return true;
    return false;
  };

  return (
    <div className="bg-ink-950/80 border border-ink-700 rounded-xl p-5 space-y-5">
      {/* Top Header & Strategy Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-700/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-sm font-semibold text-text-100 uppercase tracking-wide">
              Young Brothers Wait Concept (YBWC) Interactive Stepper
            </h3>
            <Badge variant={mode === 'ybwc' ? 'brass' : 'neutral'}>
              {mode === 'ybwc' ? 'P3 YBWC' : 'P1 Root Splitting'}
            </Badge>
          </div>
          <p className="text-xs text-text-400 mt-1">
            Visualising why waiting for the eldest brother's result dramatically cuts parallel search overhead.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SegmentedControl
            options={[
              { value: 'ybwc', label: 'YBWC (Wait)' },
              { value: 'rootsplit', label: 'Root Splitting (No Wait)' },
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v as 'ybwc' | 'rootsplit');
              setStep(2); // Auto-show full effect when switching
            }}
          />
        </div>
      </div>

      {/* SVG Tree View */}
      <div className="w-full overflow-x-auto bg-ink-900/60 border border-ink-700/50 rounded-lg p-4 flex justify-center">
        <svg viewBox="0 0 640 280" className="w-full max-w-[640px] h-auto select-none font-mono">
          <defs>
            <filter id="glow-brass" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#D9A441" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Root to Children Lines */}
          <line x1="320" y1="50" x2="140" y2="120" stroke="#262D36" strokeWidth="2" />
          <line x1="320" y1="50" x2="320" y2="120" stroke="#262D36" strokeWidth="2" />
          <line x1="320" y1="50" x2="500" y2="120" stroke="#262D36" strokeWidth="2" />

          {/* Children to Leaves Lines */}
          {/* Child A */}
          <line x1="140" y1="145" x2="90" y2="215" stroke="#262D36" strokeWidth="1.5" />
          <line x1="140" y1="145" x2="140" y2="215" stroke="#262D36" strokeWidth="1.5" />
          <line x1="140" y1="145" x2="190" y2="215" stroke="#262D36" strokeWidth="1.5" />

          {/* Child B */}
          <line x1="320" y1="145" x2="270" y2="215" stroke={isLeafPruned(1, 1) ? '#262D36' : '#262D36'} strokeWidth="1.5" strokeDasharray={isLeafPruned(1, 0) ? '3,3' : undefined} />
          <line x1="320" y1="145" x2="320" y2="215" stroke={isLeafPruned(1, 1) ? '#181D24' : '#262D36'} strokeWidth="1.5" strokeDasharray={isLeafPruned(1, 1) ? '3,3' : undefined} />
          <line x1="320" y1="145" x2="370" y2="215" stroke={isLeafPruned(1, 2) ? '#181D24' : '#262D36'} strokeWidth="1.5" strokeDasharray={isLeafPruned(1, 2) ? '3,3' : undefined} />

          {/* Child C */}
          <line x1="500" y1="145" x2="450" y2="215" stroke="#262D36" strokeWidth="1.5" />
          <line x1="500" y1="145" x2="500" y2="215" stroke={isLeafPruned(2, 1) ? '#181D24' : '#262D36'} strokeWidth="1.5" strokeDasharray={isLeafPruned(2, 1) ? '3,3' : undefined} />
          <line x1="500" y1="145" x2="550" y2="215" stroke={isLeafPruned(2, 2) ? '#181D24' : '#262D36'} strokeWidth="1.5" strokeDasharray={isLeafPruned(2, 2) ? '3,3' : undefined} />

          {/* 1. ROOT NODE */}
          <g transform="translate(320, 45)">
            <rect
              x="-60"
              y="-25"
              width="120"
              height="40"
              rx="6"
              fill="#12161B"
              stroke={step >= 1 ? '#D9A441' : '#262D36'}
              strokeWidth="1.5"
              filter={step >= 1 ? 'url(#glow-brass)' : undefined}
            />
            <text x="0" y="-8" textAnchor="middle" fill="#E8E4DA" fontSize="11" fontWeight="bold">
              Root (MAX)
            </text>
            <text x="0" y="8" textAnchor="middle" fill={step >= 1 ? '#D9A441' : '#8A919B'} fontSize="10">
              {step >= 1 ? 'α = 5 · PV' : 'PV Node'}
            </text>
          </g>

          {/* 2. THREE CHILDREN NODES */}
          {data.children.map((child, idx) => {
            const cx = idx === 0 ? 140 : idx === 1 ? 320 : 500;
            const state = getChildState(idx);
            const isEldest = idx === 0;

            let strokeColor = '#262D36';
            let textFill = '#8A919B';

            if (state.active) {
              if (isEldest) {
                strokeColor = '#D9A441';
                textFill = '#E8E4DA';
              } else if (mode === 'ybwc' && state.status === 'cutoff') {
                strokeColor = '#4FB3A3';
                textFill = '#E8E4DA';
              } else {
                strokeColor = '#8A919B';
                textFill = '#E8E4DA';
              }
            }

            return (
              <g key={child.id} transform={`translate(${cx}, 135)`}>
                <rect
                  x="-55"
                  y="-20"
                  width="110"
                  height="38"
                  rx="6"
                  fill="#12161B"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                <text x="0" y="-5" textAnchor="middle" fill={textFill} fontSize="11" fontWeight="bold">
                  {isEldest ? 'A (Eldest)' : `Brother ${child.id}`} ({child.player})
                </text>
                <text x="0" y="10" textAnchor="middle" fill={isEldest ? '#D9A441' : '#4FB3A3'} fontSize="9">
                  {child.nodeType} {state.worker ? `· ${state.worker}` : ''}
                </text>

                {/* Status tag */}
                {state.status === 'waiting' && (
                  <text x="0" y="28" textAnchor="middle" fill="#8A919B" fontSize="9" fontStyle="italic">
                    waiting...
                  </text>
                )}
                {state.status === 'cutoff' && (
                  <text x="0" y="28" textAnchor="middle" fill="#4FB3A3" fontSize="9">
                    β-cutoff (≤ {child.leaves[0]})
                  </text>
                )}
                {state.status === 'searching_all' && (
                  <text x="0" y="28" textAnchor="middle" fill="#8A919B" fontSize="9">
                    split search
                  </text>
                )}
              </g>
            );
          })}

          {/* 3. LEAVES NODES */}
          {data.children.map((child, childIdx) => {
            const baseX = childIdx === 0 ? 140 : childIdx === 1 ? 320 : 500;
            const offsets = [-50, 0, 50];

            return child.leaves.map((leafVal, leafIdx) => {
              const lx = baseX + offsets[leafIdx];
              const visited = isLeafVisited(childIdx, leafIdx);
              const pruned = isLeafPruned(childIdx, leafIdx);

              let fill = '#0B0D10';
              let stroke = '#262D36';
              let textCol = '#8A919B';

              if (visited) {
                fill = '#181D24';
                stroke = childIdx === 0 ? '#D9A441' : '#4FB3A3';
                textCol = '#E8E4DA';
              } else if (pruned) {
                fill = '#0B0D10';
                stroke = '#262D36';
                textCol = '#262D36';
              }

              return (
                <g key={`${child.id}_leaf_${leafIdx}`} transform={`translate(${lx}, 225)`}>
                  <circle
                    cx="0"
                    cy="0"
                    r="14"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="1.5"
                    strokeDasharray={pruned ? '3,3' : undefined}
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={textCol}
                    fontSize="10"
                    fontWeight={visited ? 'bold' : 'normal'}
                  >
                    {leafVal}
                  </text>

                  {pruned && (
                    <text x="0" y="22" textAnchor="middle" fill="#262D36" fontSize="8">
                      pruned
                    </text>
                  )}
                  {visited && leafIdx === 0 && childIdx > 0 && mode === 'ybwc' && (
                    <text x="0" y="22" textAnchor="middle" fill="#4FB3A3" fontSize="8">
                      cutoff!
                    </text>
                  )}
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* Real Step-by-Step Explanation Banner */}
      <div className="p-3 bg-ink-900 border border-ink-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-semibold text-text-100 flex items-center gap-2">
            <span className="font-mono text-brass-400">Step {step + 1} of 3:</span>
            {step === 0 && 'Initial Unsearched Tree'}
            {step === 1 && (mode === 'ybwc' ? 'Eldest Brother (A) Evaluated First' : 'Root Splitting Starts All Branches')}
            {step === 2 && (mode === 'ybwc' ? 'Parallel Young Brothers (B & C) Cut Off Early' : 'All Leaves Explored Without Pruning')}
          </div>
          <p className="text-text-400 leading-relaxed">
            {step === 0 && 'The search is at the root MAX node. All children (A, B, C) are unvisited.'}
            {step === 1 &&
              (mode === 'ybwc'
                ? 'Under YBWC, worker W1 searches the eldest brother (A) sequentially. It evaluates all 3 leaves [5, 7, 9] and returns value 5, establishing α = 5 at the root.'
                : 'In root splitting, workers W1, W2, and W3 start searching A, B, and C simultaneously with no shared alpha bound.')}
            {step === 2 &&
              (mode === 'ybwc'
                ? 'Now that α = 5 is established, young brothers B and C are stolen and searched concurrently by W1 and W2. Their first leaves (3 and 4) are ≤ 5, causing immediate β-cutoffs. Leaves [6, 8] and [7, 9] are NEVER searched!'
                : 'Because A had not yet finished when B and C started, no alpha cutoff was available. Every leaf of B [3, 6, 8] and C [4, 7, 9] was searched unnecessarily.')}
          </p>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button size="sm" variant="ghost" onClick={() => setStep(0)} disabled={step === 0}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="secondary" onClick={prevStep} disabled={step === 0}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="primary" onClick={nextStep} disabled={step === 2}>
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Dynamic Leaf Counter & Search Overhead Comparison Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-ink-700/60">
        <div className="p-2.5 bg-ink-900/40 border border-ink-700/60 rounded">
          <div className="text-[10px] text-text-400 uppercase tracking-wider">Leaves Visited</div>
          <div className="font-mono text-lg font-bold text-text-100 mt-0.5">
            {activeLeavesCount} <span className="text-xs font-normal text-text-400">/ {totalLeavesInTree}</span>
          </div>
        </div>

        <div className="p-2.5 bg-ink-900/40 border border-ink-700/60 rounded">
          <div className="text-[10px] text-text-400 uppercase tracking-wider">Leaves Pruned</div>
          <div className="font-mono text-lg font-bold text-signal mt-0.5">
            {totalLeavesInTree - activeLeavesCount}
          </div>
        </div>

        <div className="p-2.5 bg-ink-900/40 border border-ink-700/60 rounded">
          <div className="text-[10px] text-text-400 uppercase tracking-wider">Search Strategy</div>
          <div className="font-mono text-xs font-bold text-brass-400 mt-1 uppercase">
            {mode === 'ybwc' ? 'P3 YBWC' : 'P1 Root Split'}
          </div>
        </div>

        <div className="p-2.5 bg-ink-900/40 border border-ink-700/60 rounded">
          <div className="text-[10px] text-text-400 uppercase tracking-wider">Root Split Overhead</div>
          <div className="font-mono text-lg font-bold text-danger mt-0.5">
            +{searchOverheadPct}%
          </div>
        </div>
      </div>
    </div>
  );
};
