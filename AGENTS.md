# Parallel Alpha-Beta Othello Engine: Master Rules

You are helping me build a university project: "Parallel Alpha-Beta Search for an Othello Engine: comparing Root Splitting, Principal Variation Splitting (PVS) and the Young Brothers Wait Concept (YBWC)."

Hard rules for the whole project:
- Language: C++17, built with CMake, compiled with -O2 -Wall -Wextra. Parallelism only via std::thread and std::atomic (no OpenMP, no TBB, no external libs except a test framework).
- Board: two uint64_t bitboards (player-to-move, opponent) plus side flag. Use negamax formulation.
- All engines (sequential and parallel) MUST share the same evaluation function, move generator and move ordering, so differences come only from the search.
- Every search function must report: value, best move, nodes visited (atomic counter for parallel), time.
- The sequential alpha-beta (B2) is the reference. For P in {1,2,4,8}, parallel engines must return the same value as B2 at the same depth (tested with transposition table OFF for strict equality).
- Write unit tests for everything. Never claim a task is finished until you have built the project and run the tests and shown me the output.
- Keep code clean, commented, and modular (one module per file as in the repo layout I give you).
- Before coding each phase, show me a short plan and wait for my approval.
- Never silently change an algorithm's definition. If something is ambiguous, ask me.

## Web UI

PROJECT: Ebon & Ivory, a web Othello game fronting my C++ parallel alpha-beta engine (algorithms: b2 sequential, p1 root splitting, p2 PVS, p3 YBWC). The engine is the single source of truth for rules and search. The frontend never implements move legality.

STACK: Vite + React 18 + TypeScript (strict), Tailwind CSS with a fully custom theme (do NOT use Tailwind's default palette), Framer Motion, Zustand, visx or uPlot for charts, KaTeX for formulas, Lucide icons only, FastAPI + WebSockets bridge to the engine subprocess.

DESIGN BRIEF (non-negotiable):
- Theme "Ebon & Ivory": quiet premium late-night study. Lacquered dark jade board, polished obsidian and pearl discs, brass accent.
- Colours exactly: ink-950 #0B0D10, ink-900 #12161B, ink-800 #181D24, ink-700 #262D36, jade-900 #0C3329, jade-700 #14513F, jade-600 #1C6A53, obsidian #14171B, pearl #F2EDE4, brass-400 #D9A441, brass-600 #A87B26, text-100 #E8E4DA, text-400 #8A919B, danger #E2574C, signal #4FB3A3.
- Fonts: Fraunces (headings), IBM Plex Sans (UI), JetBrains Mono tabular (all numbers).
- Dark only. One accent colour (brass). No purple/blue gradients, no neon, no glassmorphism, no gradient text, no emoji, no lorem ipsum, no placeholder images. Radii: 6px controls, 12px panels. 8px spacing grid. 1px ink-700 borders. Subtle 3-4% noise texture on the page background.
- Motion: disc placement spring 220ms; flips are 3D Y-rotation 450ms staggered 60ms by distance from the placed disc; legal-move rings breathe slowly; respect prefers-reduced-motion.
- Must work at 390px, 1024px and 1440px, be keyboard accessible, meet WCAG AA contrast.

PROCESS: Before reporting any UI task done, run the app, open it in the browser tool, screenshot at 390, 1024 and 1440 widths, critique against this brief, and fix every violation. Show me the final screenshots. Use only real copy that I provide; never invent statistics: every number shown must come from the engine or from my results files.

VOCABULARY (use these exact terms in UI copy): speedup S_P = T1/TP, efficiency E_P = S_P/P, search overhead SO_P = N_P/N_1 - 1, pruning efficiency = 1 - N_alphabeta/N_minimax, effective branching factor b* = N1^(1/d); node types PV, CUT, ALL; algorithms: Sequential alpha-beta (B2), Root splitting (P1), Principal Variation Splitting (P2), Young Brothers Wait Concept with work stealing (P3).

