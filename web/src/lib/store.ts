import { create } from 'zustand';
import type {
  DiscColor,
  Score,
  GameStatus,
  GameConfig,
  SearchInfoMsg,
  EvalBreakdownMsg,
  ServerMessage,
} from './types';
import { socket, type ConnectionStatus } from './socket';
import { bitboardsToDiscs, squareToCoord } from './bitboard';
import { sound } from './sound';

export interface MoveRecord {
  sq: number;
  coord: string;
  color: DiscColor;
}

interface GameStoreState {
  // Board state
  discs: (DiscColor | null)[];
  turn: DiscColor;
  legalMoves: number[];
  lastMove: number | null;
  flipped: number[];
  score: Score;
  status: GameStatus;
  winner: 'black' | 'white' | 'draw' | null;

  // Game config
  config: GameConfig;
  serverCpuCount: number;

  // History & Hints
  moveHistory: MoveRecord[];
  hintSq: number | null;
  isEngineThinking: boolean;
  isAiPaused: boolean;

  // Telemetry & diagnostics
  searchInfo: SearchInfoMsg | null;
  evalBreakdown: EvalBreakdownMsg | null;

  // Game Stats summary
  gameStats: {
    movesCount: number;
    totalNodes: number;
    totalSearchTimeMs: number;
  };

  // Connection
  connectionStatus: ConnectionStatus;

  // Actions
  init: () => void;
  sendMove: (sq: number) => void;
  startNewGame: (configOverrides?: Partial<GameConfig>) => void;
  requestUndo: () => void;
  requestHint: () => void;
  pauseMatch: () => void;
  resumeMatch: () => void;
  stepMatch: () => void;
  stopSearch: () => void;
  requestEval: () => void;
  updateConfig: (newConfig: Partial<GameConfig>) => void;
  clearHint: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  // Listen for socket messages
  socket.onMessage((msg: ServerMessage) => {
    if (msg.type === 'state') {
      const discs = bitboardsToDiscs(msg.black, msg.white);
      const isTurnEngine = msg.turn !== get().config.humanColor;

      // Play flip or place sound
      if (msg.flipped.length > 0) {
        sound.playFlip();
      } else if (msg.lastMove !== null) {
        if (isTurnEngine) sound.playPlace();
        else sound.playEngineMove();
      }

      // Update history if new move
      let newHistory = [...get().moveHistory];
      if (msg.lastMove !== null && (newHistory.length === 0 || newHistory[newHistory.length - 1].sq !== msg.lastMove)) {
        // Opponent of current turn played the last move
        const moverColor = msg.turn === 'black' ? 'white' : 'black';
        newHistory.push({
          sq: msg.lastMove,
          coord: squareToCoord(msg.lastMove),
          color: moverColor,
        });
      }

      set({
        discs,
        turn: msg.turn,
        legalMoves: msg.legal,
        lastMove: msg.lastMove,
        flipped: msg.flipped,
        score: msg.score,
        status: msg.status,
        moveHistory: newHistory,
        hintSq: null,
      });

      // Automatically request eval breakdown after move
      socket.send({ type: 'eval' });
    } else if (msg.type === 'info') {
      set({
        searchInfo: msg,
        isEngineThinking: true,
      });
    } else if (msg.type === 'bestmove') {
      const currentStats = get().gameStats;
      set({
        isEngineThinking: false,
        hintSq: get().hintSq !== null ? msg.sq : null,
        gameStats: {
          movesCount: currentStats.movesCount + 1,
          totalNodes: currentStats.totalNodes + msg.nodes,
          totalSearchTimeMs: currentStats.totalSearchTimeMs + msg.timeMs,
        },
      });
    } else if (msg.type === 'evalbreakdown') {
      set({ evalBreakdown: msg });
    } else if (msg.type === 'gameover') {
      sound.playGameOver(msg.winner);
      set({
        status: 'gameover',
        winner: msg.winner,
        score: msg.score,
        isEngineThinking: false,
      });
    }
  });

  socket.onStatus((status) => {
    set({ connectionStatus: status });
  });

  return {
    discs: Array(64).fill(null),
    turn: 'black',
    legalMoves: [19, 26, 37, 44],
    lastMove: null,
    flipped: [],
    score: { black: 2, white: 2 },
    status: 'playing',
    winner: null,

    config: {
      humanColor: 'black',
      matchMode: 'human_vs_ai',
      algo: 'p3',
      threads: 4,
      depth: 8,
      timeMs: null,
      algoBlack: 'p3',
      threadsBlack: 4,
      depthBlack: 6,
      algoWhite: 'b2',
      threadsWhite: 1,
      depthWhite: 6,
      delayMs: 400,
    },
    serverCpuCount: 4,

    moveHistory: [],
    hintSq: null,
    isEngineThinking: false,
    isAiPaused: false,

    searchInfo: null,
    evalBreakdown: null,

    gameStats: {
      movesCount: 0,
      totalNodes: 0,
      totalSearchTimeMs: 0,
    },

    connectionStatus: 'disconnected',

    init: () => {
      socket.connect();
      // Fetch system CPU count
      fetch('/api/system')
        .then((r) => r.json())
        .then((d) => {
          if (d.cpu_count) {
            set((state) => ({
              serverCpuCount: d.cpu_count,
              config: {
                ...state.config,
                threads: Math.min(state.config.threads, d.cpu_count),
              },
            }));
          }
        })
        .catch(() => {});
    },

    sendMove: (sq: number) => {
      const { legalMoves, status, isEngineThinking } = get();
      if (status !== 'playing' || isEngineThinking || !legalMoves.includes(sq)) {
        return;
      }
      socket.send({ type: 'move', sq });
    },

    startNewGame: (configOverrides = {}) => {
      const newConfig = { ...get().config, ...configOverrides };
      set({
        config: newConfig,
        moveHistory: [],
        hintSq: null,
        winner: null,
        isAiPaused: false,
        gameStats: { movesCount: 0, totalNodes: 0, totalSearchTimeMs: 0 },
      });

      socket.send({
        type: 'new',
        human: newConfig.humanColor,
        algo: newConfig.algo,
        threads: newConfig.threads,
        depth: newConfig.depth,
        timeMs: newConfig.timeMs,
        algo_black: newConfig.algoBlack,
        threads_black: newConfig.threadsBlack,
        depth_black: newConfig.depthBlack,
        algo_white: newConfig.algoWhite,
        threads_white: newConfig.threadsWhite,
        depth_white: newConfig.depthWhite,
        delay_ms: newConfig.delayMs,
      });
    },

    pauseMatch: () => {
      set({ isAiPaused: true });
      socket.send({ type: 'pause' });
    },

    resumeMatch: () => {
      set({ isAiPaused: false });
      socket.send({ type: 'resume' });
    },

    stepMatch: () => {
      socket.send({ type: 'step' });
    },

    requestUndo: () => {
      socket.send({ type: 'undo' });
    },

    requestHint: () => {
      set({ hintSq: -1 }); // Pending hint
      socket.send({ type: 'hint' });
    },

    stopSearch: () => {
      socket.send({ type: 'stop' });
    },

    requestEval: () => {
      socket.send({ type: 'eval' });
    },

    updateConfig: (newConfig) => {
      const merged = { ...get().config, ...newConfig };
      set({ config: merged });
      socket.send({
        type: 'config',
        algo: merged.algo,
        threads: merged.threads,
        depth: merged.depth,
        timeMs: merged.timeMs,
      });
    },

    clearHint: () => {
      set({ hintSq: null });
    },
  };
});

