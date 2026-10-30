import React, { useRef, useState, useMemo } from 'react';
import type { SearchTreeNode } from './treeTypes';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { IconButton } from '../../design/components';

interface SearchTreeViewProps {
  root: SearchTreeNode;
  allNodes: SearchTreeNode[];
  selectedNode: SearchTreeNode | null;
  onSelectNode: (node: SearchTreeNode) => void;
  currentStep: number;
  maxStep: number;
}

export const SearchTreeView: React.FC<SearchTreeViewProps> = ({
  root,
  allNodes,
  selectedNode,
  onSelectNode,
  currentStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Compute bounding box of tree
  const { minX, maxX, maxY } = useMemo(() => {
    let mx = Infinity;
    let Mx = -Infinity;
    let My = -Infinity;
    for (const n of allNodes) {
      if (n.x !== undefined && n.y !== undefined) {
        if (n.x < mx) mx = n.x;
        if (n.x > Mx) Mx = n.x;
        if (n.y > My) My = n.y;
      }
    }
    return {
      minX: mx === Infinity ? 0 : mx,
      maxX: Mx === -Infinity ? 800 : Mx,
      maxY: My === -Infinity ? 500 : My,
    };
  }, [allNodes]);

  const treeWidth = Math.max(700, maxX - minX + 160);
  const treeHeight = Math.max(450, maxY + 100);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.4, Math.min(2.5, z * factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 30, y: 20 });
  };

  // Flatten edges for SVG lines
  const edges = useMemo(() => {
    const list: { from: SearchTreeNode; to: SearchTreeNode; isPv: boolean; isPruned: boolean }[] = [];
    function traverse(parent: SearchTreeNode) {
      for (const child of parent.children) {
        const isPv = parent.nodeType === 'PV' && child.nodeType === 'PV';
        list.push({ from: parent, to: child, isPv, isPruned: child.pruned });
        traverse(child);
      }
    }
    traverse(root);
    return list;
  }, [root]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] bg-ink-950 rounded-xl border border-ink-700/80 overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-inner"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Background Subtle Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="tree-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#262D36" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tree-grid)" />
      </svg>

      {/* Floating Canvas Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-ink-900/90 border border-ink-700/80 rounded-lg p-1 backdrop-blur-md shadow-panel">
        <IconButton
          icon={<ZoomIn className="w-3.5 h-3.5" />}
          label="Zoom In"
          size="sm"
          variant="ghost"
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
        />
        <IconButton
          icon={<ZoomOut className="w-3.5 h-3.5" />}
          label="Zoom Out"
          size="sm"
          variant="ghost"
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
        />
        <IconButton
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          label="Reset View"
          size="sm"
          variant="ghost"
          onClick={resetView}
        />
        <span className="font-mono text-[11px] text-text-400 px-1.5 select-none">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Legend Badge Bar */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2 bg-ink-900/90 border border-ink-700/80 rounded-lg px-2.5 py-1.5 backdrop-blur-md text-[10px] font-mono shadow-panel">
        <span className="text-text-400 uppercase tracking-wider font-semibold">Legend:</span>
        <span className="flex items-center gap-1 text-brass-400">
          <span className="w-2 h-2 rounded-full bg-brass-400 inline-block" /> PV Node
        </span>
        <span className="flex items-center gap-1 text-signal">
          <span className="w-2 h-2 rounded-full bg-signal inline-block" /> CUT Node
        </span>
        <span className="flex items-center gap-1 text-text-400">
          <span className="w-2 h-2 rounded-full bg-ink-700 inline-block" /> ALL Node
        </span>
        <span className="flex items-center gap-1 text-danger">
          <span className="w-2 h-2 rounded-full border border-danger border-dashed inline-block" /> Pruned Branch
        </span>
      </div>

      {/* SVG Canvas */}
      <svg
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 100ms ease-out',
        }}
        viewBox={`0 0 ${treeWidth} ${treeHeight}`}
      >
        {/* Connection Edges */}
        <g className="edges">
          {edges.map((e, idx) => {
            const x1 = e.from.x || 0;
            const y1 = e.from.y || 0;
            const x2 = e.to.x || 0;
            const y2 = e.to.y || 0;
            const isVisible = e.to.stepOrder <= currentStep;

            let strokeColor = '#1C6A53'; // jade-600
            let strokeWidth = 1.5;
            let strokeDash = 'none';

            if (e.isPruned) {
              strokeColor = '#E2574C'; // danger
              strokeDash = '4,4';
              strokeWidth = 1.2;
            } else if (e.isPv) {
              strokeColor = '#D9A441'; // brass-400
              strokeWidth = 2.5;
            }

            return (
              <line
                key={`edge-${idx}`}
                x1={x1}
                y1={y1 + 16}
                x2={x2}
                y2={y2 - 16}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                opacity={isVisible ? 0.9 : 0.2}
                className="transition-opacity duration-300"
              />
            );
          })}
        </g>

        {/* Tree Nodes */}
        <g className="nodes">
          {allNodes.map((n) => {
            const x = n.x || 0;
            const y = n.y || 0;
            const isSelected = selectedNode?.id === n.id;
            const isVisible = n.stepOrder <= currentStep;
            const isCurrentlyActive = n.stepOrder === currentStep;

            // Border & fill styling by node type
            let borderColor = '#262D36';
            let fillColor = '#12161B';
            let textColor = '#E8E4DA';

            if (n.pruned) {
              borderColor = '#E2574C';
              fillColor = '#181214';
              textColor = '#E2574C';
            } else if (n.nodeType === 'PV') {
              borderColor = '#D9A441';
              fillColor = '#181D24';
              textColor = '#D9A441';
            } else if (n.nodeType === 'CUT') {
              borderColor = '#4FB3A3';
              fillColor = '#12161B';
              textColor = '#4FB3A3';
            }

            // Thread badge color
            const threadColor =
              n.thread === 'T1'
                ? '#D9A441'
                : n.thread === 'T2'
                ? '#4FB3A3'
                : n.thread === 'T3'
                ? '#E8E4DA'
                : '#8A919B';

            return (
              <g
                key={n.id}
                transform={`translate(${x}, ${y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(n);
                }}
                className="cursor-pointer transition-transform duration-150 hover:scale-110"
                opacity={isVisible ? 1 : 0.25}
              >
                {/* Active pulse highlight */}
                {isCurrentlyActive && (
                  <circle
                    r={24}
                    fill="none"
                    stroke="#D9A441"
                    strokeWidth={2}
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Selected Node Ring */}
                {isSelected && (
                  <circle
                    r={22}
                    fill="none"
                    stroke="#D9A441"
                    strokeWidth={2.5}
                    filter="drop-shadow(0 0 6px rgba(217,164,65,0.7))"
                  />
                )}

                {/* Node Body Circle */}
                <circle
                  r={16}
                  fill={fillColor}
                  stroke={borderColor}
                  strokeWidth={n.pruned ? 1.5 : 2}
                  strokeDasharray={n.pruned ? '3,3' : 'none'}
                />

                {/* Player Disc Indicator (inner disc) */}
                <circle
                  cx={-8}
                  cy={-8}
                  r={4}
                  fill={n.player === 'black' ? '#14171B' : '#F2EDE4'}
                  stroke={n.player === 'black' ? '#262D36' : '#D9A441'}
                  strokeWidth={0.8}
                />

                {/* Move Coord / Root Label */}
                <text
                  textAnchor="middle"
                  dy={4}
                  className="font-mono text-[11px] font-bold select-none"
                  fill={textColor}
                >
                  {n.coord === 'Root' ? 'R' : n.coord}
                </text>

                {/* Thread Tag (Top-right) */}
                <g transform="translate(10, -12)">
                  <rect
                    x={-4}
                    y={-7}
                    width={18}
                    height={11}
                    rx={3}
                    fill="#0B0D10"
                    stroke={threadColor}
                    strokeWidth={0.7}
                  />
                  <text
                    x={5}
                    y={1}
                    textAnchor="middle"
                    className="font-mono text-[8px] font-semibold select-none"
                    fill={threadColor}
                  >
                    {n.thread}
                  </text>
                </g>

                {/* Node Type Tag (Bottom) */}
                <g transform="translate(0, 24)">
                  <rect
                    x={-14}
                    y={-6}
                    width={28}
                    height={11}
                    rx={3}
                    fill="#0B0D10"
                    stroke={borderColor}
                    strokeWidth={0.7}
                  />
                  <text
                    x={0}
                    y={2}
                    textAnchor="middle"
                    className="font-mono text-[8px] uppercase font-bold select-none"
                    fill={textColor}
                  >
                    {n.pruned ? 'CUTOFF' : n.nodeType}
                  </text>
                </g>

                {/* Value or Bounds Tag */}
                {n.value !== null && !n.pruned && (
                  <text
                    x={0}
                    y={36}
                    textAnchor="middle"
                    className="font-mono text-[9px] font-semibold select-none"
                    fill="#8A919B"
                  >
                    v={n.value}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
