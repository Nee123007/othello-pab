import React, { useState } from 'react';
import { Board } from '../features/play/Board';
import { PlayerCard } from '../features/play/PlayerCard';
import { Button, Panel, Stat, Badge } from '../design/components';
import type { DiscColor } from '../features/play/Disc';
import { RotateCcw, Play, CheckCircle } from 'lucide-react';

interface BoardState {
  discs: (DiscColor | null)[];
  turn: DiscColor;
  legalMoves: number[];
  lastMove: number | null;
  flipped: number[];
}

const INITIAL_BOARD: BoardState = (() => {
  const discs = Array<DiscColor | null>(64).fill(null);
  discs[27] = 'white'; // d4
  discs[28] = 'black'; // e4
  discs[35] = 'black'; // d5
  discs[36] = 'white'; // e5
  return {
    discs,
    turn: 'black',
    legalMoves: [19, 26, 37, 44], // d3, c4, f5, e6
    lastMove: null,
    flipped: [],
  };
})();

export const BoardDemoPage: React.FC = () => {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [stepIndex, setStepIndex] = useState(0);

  // Scripted moves demo
  const scriptedMoves = [
    {
      sq: 19, // d3
      desc: 'Black plays d3 (19) -> Flips d4 (27)',
      apply: (prev: BoardState) => {
        const nextDiscs = [...prev.discs];
        nextDiscs[19] = 'black';
        nextDiscs[27] = 'black';
        return {
          discs: nextDiscs,
          turn: 'white' as DiscColor,
          legalMoves: [18, 20, 34], // c3, e3, c5
          lastMove: 19,
          flipped: [27],
        };
      },
    },
    {
      sq: 18, // c3
      desc: 'White plays c3 (18) -> Flips d3 (19) & d4 (27)',
      apply: (prev: BoardState) => {
        const nextDiscs = [...prev.discs];
        nextDiscs[18] = 'white';
        nextDiscs[19] = 'white';
        nextDiscs[27] = 'white';
        return {
          discs: nextDiscs,
          turn: 'black' as DiscColor,
          legalMoves: [20, 26, 34, 43],
          lastMove: 18,
          flipped: [19, 27],
        };
      },
    },
    {
      sq: 34, // c5
      desc: 'Black plays c5 (34) -> Multi-directional flips d5 (35) and d4 (27)',
      apply: (prev: BoardState) => {
        const nextDiscs = [...prev.discs];
        nextDiscs[34] = 'black';
        nextDiscs[35] = 'black';
        nextDiscs[27] = 'black';
        return {
          discs: nextDiscs,
          turn: 'white' as DiscColor,
          legalMoves: [17, 26, 42],
          lastMove: 34,
          flipped: [35, 27],
        };
      },
    },
  ];

  const handleNextScripted = () => {
    if (stepIndex < scriptedMoves.length) {
      const step = scriptedMoves[stepIndex];
      setBoard((prev) => step.apply(prev));
      setStepIndex((idx) => idx + 1);
    }
  };

  const handleReset = () => {
    setBoard(INITIAL_BOARD);
    setStepIndex(0);
  };

  const handleManualMove = (sq: number) => {
    if (!board.legalMoves.includes(sq)) return;

    // Flip logic simulation for demo
    const nextDiscs = [...board.discs];
    nextDiscs[sq] = board.turn;

    // For demo: flip adjacent opposite discs
    const flipped: number[] = [];
    const opp = board.turn === 'black' ? 'white' : 'black';
    const neighbors = [sq - 1, sq + 1, sq - 8, sq + 8, sq - 9, sq - 7, sq + 7, sq + 9];
    neighbors.forEach((n) => {
      if (n >= 0 && n < 64 && nextDiscs[n] === opp) {
        nextDiscs[n] = board.turn;
        flipped.push(n);
      }
    });

    const nextTurn = opp as DiscColor;
    // Mock new legal moves
    const nextLegal = [19, 26, 37, 44, 18, 20, 34].filter(
      (s) => nextDiscs[s] === null
    );

    setBoard({
      discs: nextDiscs,
      turn: nextTurn,
      legalMoves: nextLegal,
      lastMove: sq,
      flipped,
    });
  };

  const blackScore = board.discs.filter((d) => d === 'black').length;
  const whiteScore = board.discs.filter((d) => d === 'white').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink-700 pb-4 gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-text-100">
            Interactive Board &amp; Animation Showcase
          </h1>
          <p className="text-text-400 text-xs mt-1">
            Pure CSS 3D transforms, Chebyshev stagger flips (60ms/step), breathing rings, star dots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleReset}
          >
            Reset Board
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Play className="w-3.5 h-3.5" />}
            disabled={stepIndex >= scriptedMoves.length}
            onClick={handleNextScripted}
          >
            Next Move ({stepIndex}/{scriptedMoves.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Player Card Top, Board, Player Card Bottom */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-4">
          {/* White Player Card (Top) */}
          <div className="w-full max-w-[600px]">
            <PlayerCard
              color="white"
              name="White (Pearl Engine)"
              role="YBWC P3"
              score={whiteScore}
              isTurn={board.turn === 'white'}
              isEngineThinking={board.turn === 'white'}
            />
          </div>

          {/* 8x8 Board Component */}
          <Board
            discs={board.discs}
            turn={board.turn}
            legalMoves={board.legalMoves}
            lastMove={board.lastMove}
            flippedSquares={board.flipped}
            onMove={handleManualMove}
          />

          {/* Black Player Card (Bottom) */}
          <div className="w-full max-w-[600px]">
            <PlayerCard
              color="black"
              name="Black (Obsidian Human)"
              role="Player"
              score={blackScore}
              isTurn={board.turn === 'black'}
            />
          </div>
        </div>

        {/* Right Column: Telemetry & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <Panel title="Animation Diagnostics">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Last Placed" value={board.lastMove !== null ? `sq ${board.lastMove}` : 'None'} />
                <Stat label="Discs Flipped" value={board.flipped.length} />
              </div>

              <div>
                <span className="text-xs font-mono text-text-400 uppercase tracking-widest block mb-2">
                  Scripted Timeline
                </span>
                <div className="space-y-2">
                  {scriptedMoves.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border text-xs transition-colors flex items-center justify-between ${
                        idx < stepIndex
                          ? 'bg-ink-800/80 border-brass-400/40 text-text-100'
                          : idx === stepIndex
                          ? 'bg-ink-900 border-ink-700 text-brass-400 font-medium'
                          : 'bg-ink-950/60 border-ink-700/60 text-text-400/60'
                      }`}
                    >
                      <span>{m.desc}</span>
                      {idx < stepIndex && (
                        <CheckCircle className="w-4 h-4 text-brass-400 shrink-0 ml-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-text-400 uppercase tracking-widest block mb-2">
                  Active Features
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="brass">3D Y-Rotation (450ms)</Badge>
                  <Badge variant="brass">Chebyshev Stagger (60ms)</Badge>
                  <Badge variant="signal">Breathing Ring (2.4s)</Badge>
                  <Badge variant="neutral">Go Star Dots (Hoshi)</Badge>
                  <Badge variant="neutral">Ghost Disc Hover</Badge>
                  <Badge variant="neutral">Keyboard Accessible</Badge>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

