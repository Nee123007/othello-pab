export type DiscColor = 'black' | 'white';

export interface Score {
  black: number;
  white: number;
}

export type GameStatus = 'playing' | 'passed' | 'gameover';

export interface BoardStateMsg {
  type: 'state';
  black: string; // hex
  white: string; // hex
  turn: DiscColor;
  legal: number[];
  lastMove: number | null;
  flipped: number[];
  score: Score;
  status: GameStatus;
}

export interface ThreadInfo {
  id: number;
  nodes: number;
  state: 'busy' | 'idle' | 'stealing';
}

export interface SearchInfoMsg {
  type: 'info';
  depth: number;
  nodes: number;
  nps: number;
  value: number;
  pv: number[];
  elapsedMs: number;
  threads: ThreadInfo[];
  splits: number;
  steals: number;
  cancels: number;
}

export interface BestMoveMsg {
  type: 'bestmove';
  sq: number;
  value: number;
  nodes: number;
  timeMs: number;
}

export interface EvalBreakdownMsg {
  type: 'evalbreakdown';
  phase: string;
  terms: {
    mobility: number;
    corners: number;
    positional: number;
    stability: number;
    discs: number;
  };
  total: number;
}

export interface GameOverMsg {
  type: 'gameover';
  winner: 'black' | 'white' | 'draw';
  score: Score;
}

export interface ErrorMsg {
  type: 'error';
  message: string;
}

export type ServerMessage =
  | BoardStateMsg
  | SearchInfoMsg
  | BestMoveMsg
  | EvalBreakdownMsg
  | GameOverMsg
  | ErrorMsg
  | { type: 'config_ack'; status: string }
  | { type: 'paused' }
  | { type: 'resumed' };

export type AlgorithmType = 'b2' | 'p1' | 'p2' | 'p3';
export type MatchMode = 'human_vs_ai' | 'ai_vs_ai';

export interface GameConfig {
  humanColor: 'black' | 'white' | 'random' | 'none';
  matchMode: MatchMode;
  algo: AlgorithmType;
  threads: number;
  depth: number;
  timeMs: number | null;
  algoBlack?: AlgorithmType;
  threadsBlack?: number;
  depthBlack?: number;
  algoWhite?: AlgorithmType;
  threadsWhite?: number;
  depthWhite?: number;
  delayMs?: number;
}

