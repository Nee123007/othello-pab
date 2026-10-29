# Ebon & Ivory: Web Othello with a Parallel Alpha-Beta Engine (Plan v2)
### Updated against the Stage 1 proposal (ECSCT24301, Adani University). Replaces `othello_web_plan.md`.

---

## 0. What changed in v2 (from your proposal)

1. **Figure 1 data is filled in.** The YBWC tree stepper now uses the real tree: leaves A = [5, 7, 9], B = [3, 6, 8], C = [4, 7, 9]. Under YBWC 5 leaves are searched; under root splitting 9 are, so SO = 9/5 − 1 = **80%**. (I read these values from the PDF text and checked them against the labels: A = 5, B ≤ 3, C ≤ 4, root = 5. Please eyeball them against the figure image once.)
2. **Benchmarks page now follows your research questions**: RQ1 (search overhead), RQ2 (speedup/efficiency vs P and depth), RQ3 (move ordering and failure analysis), plus a Verification section (value match with B2) and Playing Strength (tournaments), which cover the PEAS performance measures.
3. **Node-type vocabulary from §5.3** (PV / CUT / ALL) is used in the tree stepper and Lab tooltips.
4. **Evaluation breakdown** (§5.2): the engine exposes the five terms (mobility, corners, positional, stability, discs) so the UI can show *why* a position is scored as it is.
5. **Metrics popover** with your exact formulas (S_P, E_P, SO_P, pruning efficiency, b\*) rendered with KaTeX.
6. **About page copy** now comes from your proposal (Allis complexity figures, RQs, team, course details).
7. **Best-move agreement** is treated as a separate metric from value agreement (your PEAS mentions both; ties can legitimately give a different best move).
8. **Deviation note:** §8 of the proposal says "Pygame (or Streamlit)". A React web UI is a deviation, so tell Dr. Hingrajiya (see §10).

---

## 1. Architecture

```
Browser (React UI)  <--WebSocket (JSON)-->  FastAPI bridge  <--stdin/stdout-->  C++ engine (B2, P1, P2, P3)
```

- **Primary:** native engine + bridge. Real multithreading, so the speedup numbers are honest.
- **Stretch only:** WebAssembly with pthreads (needs SharedArrayBuffer + COOP/COEP headers, so no plain GitHub Pages). Skip unless everything else is finished.
- The engine is the single source of truth for rules. The frontend never decides move legality.

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS, fully custom theme (override the default palette) |
| Animation | Framer Motion + CSS 3D transforms |
| State | Zustand |
| Charts | visx or uPlot, fully themed |
| Math | KaTeX (metric formulas) |
| Icons | Lucide (one set only) |
| Sound | WebAudio, synthesized |
| Bridge | Python FastAPI + WebSockets |
| Engine | Your C++17 binary |
| Tests | Vitest, Playwright, pytest |
| Deploy | Docker; backend Fly.io/Render/Railway or just local for the viva |

Fonts: **Fraunces** (headings), **IBM Plex Sans** (UI), **JetBrains Mono** (numbers).

## 3. Theme: "Ebon & Ivory"

A quiet, premium late-night-study feel: lacquered board on a dark desk, polished obsidian and pearl discs, brass accent. A handcrafted object, not a SaaS dashboard.

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#0B0D10` | Page background |
| `ink-900` | `#12161B` | Panels |
| `ink-800` | `#181D24` | Raised surfaces |
| `ink-700` | `#262D36` | Borders |
| `jade-900` | `#0C3329` | Board base |
| `jade-700` | `#14513F` | Board squares |
| `jade-600` | `#1C6A53` | Grid lines, highlights |
| `obsidian` | `#14171B` | Black disc |
| `pearl` | `#F2EDE4` | White disc |
| `brass-400` | `#D9A441` | Single accent |
| `brass-600` | `#A87B26` | Hover/pressed |
| `text-100` | `#E8E4DA` | Primary text |
| `text-400` | `#8A919B` | Muted text |
| `danger` | `#E2574C` | Errors, losing eval |
| `signal` | `#4FB3A3` | Winning eval, thread activity |

**Rules:** dark only; one accent (brass); no purple/blue gradients, neon, glassmorphism, gradient text, emoji, lorem ipsum, placeholder images. Radii 6px (controls) / 12px (panels). 8px grid. 1px `ink-700` borders. 3 to 4% noise texture on the background. Numbers always in JetBrains Mono tabular.

**Motion:** placement spring 220ms; flips = 3D Y-rotation 450ms, staggered 60ms per step of distance from the placed disc; legal-move rings breathe (2.4s); counters roll; honour `prefers-reduced-motion`.

**Layout (≥1100px):** slim top bar (wordmark in Fraunces; nav **Play · Engine Lab · Benchmarks · About**); board centre-left (max 640px) with player cards; 380px right sidebar with tabs **Game** and **Search**. Mobile: board on top, sidebar becomes a bottom sheet.

**Anti-slop checklist (paste into every UI prompt):** no lorem ipsum, no default component-library look, no centered-everything hero sections, no identical card grids, no gradient text, no emoji, no fabricated numbers.

## 4. Pages

1. **Play**: board and game flow. Choose colour, algorithm (Sequential α-β / Root Split / PVS / YBWC), threads (1/2/4/8), depth or time per move.
2. **Engine Lab**: live parallel-search visualisation (thread lanes, nodes/sec, splits/steals/cancels, PV, eval bar, evaluation breakdown).
3. **Benchmarks** (organised by your proposal):
   - **RQ1: Search overhead** (SO_P vs P per strategy; the YBWC tree stepper lives here)
   - **RQ2: Scaling** (speedup and efficiency vs P; speedup vs depth at P=8; nodes vs depth for B1 vs B2; pruning efficiency; effective branching factor b\*)
   - **RQ3: Move ordering and failure analysis** (degraded-ordering runs, where scaling flattens or overhead explodes)
   - **Verification** (value agreement of P1 to P3 with B2 at equal depth; best-move agreement shown separately)
   - **Playing strength** (tournament results: win rate and mean disc difference with 95% CIs, colour-swapped)
4. **About**: problem statement, RQs, method, team, references (real text; see Prompt W8b).

## 5. WebSocket contract

Bitboards as **hex strings**. Squares 0 to 63 (a1=0, h8=63, row-major).

Client to server:
```json
{"type":"new","human":"black","algo":"p3","threads":4,"depth":8,"timeMs":null}
{"type":"move","sq":19}
{"type":"undo"}
{"type":"hint"}
{"type":"stop"}
{"type":"eval"}
{"type":"config","algo":"p2","threads":8,"depth":9,"timeMs":1500}
```

Server to client:
```json
{"type":"state","black":"0x...","white":"0x...","turn":"black","legal":[19,26,37,44],"lastMove":19,"flipped":[27],"score":{"black":4,"white":1},"status":"playing"}
{"type":"info","depth":7,"nodes":1234567,"nps":8800000,"value":12,"pv":[19,18,9],"elapsedMs":140,"threads":[{"id":0,"nodes":300000,"state":"busy"}],"splits":42,"steals":17,"cancels":5}
{"type":"bestmove","sq":37,"value":12,"nodes":1234567,"timeMs":140}
{"type":"evalbreakdown","phase":"midgame","terms":{"mobility":14,"corners":0,"positional":-6,"stability":2,"discs":-1},"total":9}
{"type":"gameover","winner":"black","score":{"black":38,"white":26}}
{"type":"error","message":"illegal move"}
```
`status` is `playing | passed | gameover`.

## 6. Timeline (about 3 weeks)

| Step | Work |
|---|---|
| W0 | Web rules in AGENTS.md |
| W1 | Engine JSON/info/eval extensions |
| W2 | FastAPI bridge + Docker |
| W3 | Design system + styleguide |
| W4 | Board + animations (mock data) |
| W5 | Connect to engine, full game flow |
| W6 | Engine Lab |
| W7 | Benchmarks (RQ1 to RQ3, Verification, Strength) + YBWC stepper |
| W8 | Sound, responsive, a11y, polish |
| W8b | About page |
| W9 | Tests |
| W10 | Deploy |
| W11 | README + demo script |

## 7. Getting good UI out of Antigravity

1. Design brief goes into `AGENTS.md` first; the agent must not improvise visuals.
2. Design system and `/styleguide` before any real page.
3. After each UI step: open the app in the browser tool, screenshot at 390 / 1024 / 1440, critique against the brief, fix, then report.
4. One component or page per task.
5. Name the violated token or rule when fixing ("panel uses a gradient, which the brief forbids"), not "make it prettier".
6. Reference screenshots (Lichess, Linear, Things 3): "match density and spacing, not colours".

## 8. Repo additions

```
web/
  src/
    design/tokens.css, design/components/
    features/play/    # Board, Disc, PlayerCard, MoveList, GameControls
    features/lab/     # ThreadLanes, NpsGauge, EvalBar, PVLine, SplitStealTicker, EvalBreakdown
    features/bench/   # charts, MetricsPopover, VerificationTable, StrengthTable, YBWCTreeStepper
    features/about/
    lib/socket.ts, store.ts, sound.ts, types.ts
  public/data/        # summary.json, failure.json, verification.json, tournament.json, hardware.json, ybwc_tree.json
server/               # app.py, engine_proc.py, tests/
tools/csv_to_json.py
Dockerfile, docker-compose.yml
```

### `web/public/data/ybwc_tree.json` (paste this file yourself, taken from Figure 1)

```json
{
  "root": { "label": "Root", "player": "MAX", "nodeType": "PV", "value": 5 },
  "children": [
    { "id": "A", "player": "MIN", "nodeType": "PV",  "leaves": [5, 7, 9], "result": "V = 5" },
    { "id": "B", "player": "MIN", "nodeType": "CUT", "leaves": [3, 6, 8], "result": "V <= 3" },
    { "id": "C", "player": "MIN", "nodeType": "CUT", "leaves": [4, 7, 9], "result": "V <= 4" }
  ],
  "workers": ["W1", "W2"]
}
```
Expected counts: YBWC searches A fully (3 leaves) + 1 leaf each in B and C = **5**; root splitting searches **9**; overhead = 9/5 − 1 = **80%**.

---

## 9. Prompts

### W0: Web rules file (append to existing `AGENTS.md`)

```
Append a "Web UI" section to AGENTS.md with these permanent rules:

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
```

### W1: Engine extensions

```
Phase W1 (C++ engine). Extend the existing stdin/stdout protocol WITHOUT breaking existing commands:
1. Add a --json flag: every response line is a single JSON object.
2. Add commands: `legal` (list of legal squares 0-63, a1=0, h8=63, row-major), `play <sq>` (returns new state AND list of flipped squares), `undo`, `state`.
3. `go` must stream `info` lines at least every 100 ms during search: depth, nodes (total, from atomics), nps, value, pv (squares), elapsedMs, per-thread array [{id, nodes, state: busy|idle|stealing}], splits, steals, cancels. Reuse the existing YBWC counters; for B2/P1/P2 fill what applies and set the rest to 0. Finish with a `bestmove` line.
4. `stop` must interrupt a running search within 50 ms using the atomic stop flag and still return the best move from the last completed iteration.
5. Add `eval`: returns the contribution of each of the five evaluation terms (mobility, corners, positional weights, stability, disc difference), the current game phase, and the total, for the position on the board. The total must equal the value returned by the normal evaluation function; add a test for that.
6. Bitboards in JSON are hex strings like "0x0000001008000000".
Tests: legal moves from the start position are [19,26,37,44]; play 19 flips [27]; stop works; info lines arrive during a depth-9 P3 search with 4 threads; eval breakdown sums to the evaluation. Run ThreadSanitizer, show no races. Show sample JSON output.
```

### W2: Bridge + Docker

```
Phase W2 (server/). Build a FastAPI app with a WebSocket endpoint /ws. For each connection spawn one engine subprocess (ENGINE_PATH env, default ./build/othello, --json) and bridge messages per this contract: [paste section 5 exactly]. Requirements:
- Validate every client message with Pydantic; reject unknown types with an `error` message.
- Human move -> `play <sq>`; if it is the engine's turn, send `go` using current config, forward `info` messages immediately (no buffering), then forward bestmove, play it, send the new `state`. `eval` -> engine `eval` -> `evalbreakdown`.
- Handle passes (either side) and game over.
- Clamp threads to os.cpu_count(); depth max 12; timeMs max 10000; allow only algos b2, p1, p2, p3.
- Kill the engine on disconnect; max 4 concurrent games; a crashed engine must not hang the socket (send `error`).
- GET /api/health and GET /api/system (returns cpu_count).
Add pytest tests with a fake engine script and with the real engine (skipped if the binary is missing). Add a multi-stage Dockerfile (build C++ engine, run uvicorn) and docker-compose.yml. Give exact run commands and show a websocket test transcript.
```

### W3: Design system + styleguide

```
Phase W3 (web/). Initialise Vite + React + TypeScript (strict) + Tailwind + Framer Motion + Zustand + react-router + KaTeX. Implement tailwind.config.ts with ONLY the Ebon & Ivory tokens from AGENTS.md (override the default palette entirely), load the three fonts, add the noise texture and vignette on body. Build in src/design/components, with variants and brass keyboard focus rings: Button (primary/secondary/ghost), Panel (with title row), Tabs, Stat (label + mono value + optional delta), Segmented control, Slider (with mono value readout), Select, Toast, Tooltip, Popover, Dialog, Badge, Divider, IconButton, Formula (KaTeX wrapper). Create a /styleguide route showing every component in every state, the colour tokens as swatches with hex values, and the type scale. No game UI yet.
Then run the app, screenshot /styleguide at 390/1024/1440, critique against the brief (default-looking controls, weak contrast, inconsistent spacing, gradients/glass) and fix. Show final screenshots.
```

### W4: Board + animations (mock data)

```
Phase W4. Build features/play/Board.tsx and Disc.tsx with mock state only (no backend):
- 8x8 board, max 640px, responsive. Dark jade lacquer surface with a subtle inner bevel, thin jade-600 grid lines, four small decorative star dots like a go board, coordinate labels a-h and 1-8 in JetBrains Mono, small, text-400.
- Discs: perfect circles. Obsidian = near-black with soft specular highlight and faint rim light; Pearl = warm ivory with subtle gradient and soft shadow. Pure CSS/SVG, no images. Each disc is a 3D card (front obsidian, back pearl) so a flip is a true rotateY with backface hidden.
- Animations: placement spring (scale 1.15 to 1, 220ms), flip rotateY 450ms staggered 60ms by Chebyshev distance from the placed disc, legal-move brass ring breathing slowly (2.4s), last-move small brass dot. prefers-reduced-motion -> instant changes.
- Interaction: hover on a legal square shows a 40% ghost disc of the current colour; click calls onMove(sq); keyboard: arrows move a focus ring, Enter plays; aria-labels like "Square d3, legal move".
- Player cards above/below the board: disc swatch, name, disc count with rolling number, brass underline on the side to move.
Create a dev-only /board-demo route with buttons to play scripted moves and trigger flips. Screenshot at 3 widths and fix brief violations. Add Vitest tests for the flip-stagger delay function.
```

### W5: Game flow

```
Phase W5. Implement lib/socket.ts (typed client for the WebSocket contract, auto-reconnect with backoff, connection status) and lib/store.ts (Zustand: board, turn, legal, lastMove, flipped, score, status, config, history, thinking, searchInfo). Build the Play route:
- Board + player cards on the left. Sidebar tab "Game": New game dialog (play as Black / White / Random; algorithm segmented control labelled "Sequential α-β", "Root Split", "PVS", "YBWC"; threads 1/2/4/8, disabled beyond server cpu_count; strength: depth slider 2-12 or time per move), move list (d3, c5...), Undo (undoes human+engine move), Hint (asks the engine, shows a brass ring on the best square), Resign, Rematch.
- Flow: human clicks a legal square, optimistic placement then reconcile with the server state; flips animate from the `flipped` list; "Engine thinking" state with the board non-interactive; pass toast ("No legal moves, White passes"); game-over dialog with final score, winner, and engine stats from that game (average nodes, time per move, NPS) computed from received info messages.
- Errors: connection-lost banner with retry, shake animation for an illegal move.
Add a Playwright e2e: new game vs YBWC 4 threads depth 5, play 3 moves, assert board updates and the engine replies. Screenshot at 3 widths and fix brief violations.
```

### W6: Engine Lab

```
Phase W6. Build the Search tab in the sidebar and a /lab route reusing the same components, driven only by real websocket data:
- ThreadLanes: one lane per worker (up to 8) with a live nodes bar and a state chip (busy / idle / stealing); `signal` for busy, text-400 for idle; steal events flash a brass tick on the receiving lane.
- NpsGauge: large mono nodes/sec with a 5-second sparkline; total nodes and elapsed time beside it.
- EvalBar: horizontal bar centred at 0 (obsidian side vs pearl side), numeric value in mono.
- PVLine: principal variation as small square chips (d3 c5 f6...), first move in brass; clicking a chip previews the sequence as ghost discs on the board.
- SplitStealTicker: counters for splits, steals, cancels and a rolling log of the last 6 events. Add a tooltip explaining PV / CUT / ALL nodes and why YBWC waits for the eldest brother before splitting (use the wording from my proposal section 5.3: parallel work is safe at ALL nodes and wasteful at CUT nodes).
- EvalBreakdown: send `eval` after each position change and show the five terms (mobility, corners, positional weights, stability, disc difference) as a small diverging bar list with mono values, plus the game phase.
- Run summary after bestmove: depth reached, nodes, time; and if the same position+depth was previously run with 1 thread this session, the measured speedup and efficiency. Never fabricate it; show "n/a" when unknown. A "Compare" button re-runs the same position with threads=1 to measure it.
Calm instrument-panel feel (thin lines, mono numbers, no neon). Add a dev-only mock-info replayer to test visuals without the engine. Screenshot at 3 widths and fix brief violations.
```

### W7: Benchmarks page + YBWC tree stepper

```
Phase W7. (1) Extend tools/csv_to_json.py to convert results/summary.csv, results/failure.csv, the tournament CSV and the correctness-suite report (check the actual filenames in results/ and in the Phase 8 and Phase 12 outputs) into web/public/data/summary.json, failure.json, tournament.json and verification.json. hardware.json is provided by me.
(2) Build /benchmarks as one page with a sticky section nav matching my research questions, themed charts only (visx or uPlot; colours: p1 text-400, p2 signal, p3 brass, b2 pearl; gridlines ink-700; mono tick labels; never default chart styling):
 - RQ1 Search overhead: SO_P vs P per strategy, plus the YBWCTreeStepper described below.
 - RQ2 Scaling: speedup vs P with a dashed ideal-linear line, efficiency vs P, speedup vs depth at P=8, nodes vs depth for B1 vs B2 (pruning gain), pruning efficiency, effective branching factor b*.
 - RQ3 Move ordering and failure analysis: chart of speedup and overhead under each ordering mode (full, history_only, none, random, reverse) at P=8; highlight where scaling flattens or overhead explodes, using only numbers present in failure.json.
 - Verification: table of value agreement (P1, P2, P3 at P=1,2,4,8 vs B2 per depth), and best-move agreement shown separately, with a note that ties can legitimately give a different best move.
 - Playing strength: tournament table (win/draw/loss, win rate, mean final disc difference, 95% CI), with colour swaps stated.
 Controls: depth selector, game-phase selector (early/mid/late), tooltips, table-view toggle with CSV download. A "Metrics" popover renders these formulas with KaTeX: S_P = T_1/T_P, E_P = S_P/P, SO_P = N_P/N_1 - 1, pruning efficiency = 1 - N_alphabeta/N_minimax, b* = N_1^(1/d). Show hardware (CPU, cores) from hardware.json at the top. If a data file is missing, show a clear empty state, never fake data.
(3) Build YBWCTreeStepper (SVG) from web/public/data/ybwc_tree.json (I will add this file; it holds the Figure 1 tree: root MAX PV value 5; A = MIN PV leaves [5,7,9]; B = MIN CUT leaves [3,6,8], bound <= 3; C = MIN CUT leaves [4,7,9], bound <= 4; workers W1, W2). Render node-type labels (PV / CUT) on nodes. Steps with Next/Prev and keyboard arrows:
 Step 1: eldest brother A searched alone and sequentially, returns 5, so alpha = 5 (show alpha badge at the root).
 Step 2: young brothers B and C searched in parallel by W1 and W2 with alpha = 5; the first leaf of each (3 and 4) is <= alpha, so the remaining leaves are never searched and are drawn dashed grey.
 Toggle "Root splitting (no wait)": A, B and C start together without knowing alpha, so B and C expand every leaf. Show a live counter of leaves visited in each mode (computed from the JSON, expected 5 vs 9) and the resulting search overhead SO = 9/5 - 1 = 80%, so the viewer sees why waiting reduces overhead. Compute everything from the JSON; do not hardcode the counts. Real captions at each step.
Screenshot at 3 widths and fix brief violations.
```

### W8: Sound, responsiveness, a11y, polish

```
Phase W8. (1) Sound: lib/sound.ts with 4 tiny WebAudio-synthesized sounds (disc place, flip ripple, engine move, game end); volume + mute persisted in localStorage; off until first user interaction. (2) Responsive: below 900px the sidebar becomes a bottom sheet with a drag handle and two snap points; board = viewport width minus 16px gutters; no horizontal scroll at 390px. (3) Accessibility: focus-visible rings, aria-live announcements for moves ("Engine plays f6, flips 2 discs"), screen-reader labels, reduced-motion support, WCAG AA contrast audit (list failing pairs and fix). (4) Polish: subtle 150ms page transitions, skeleton states while the socket connects, empty/error states with real copy, favicon (obsidian + pearl disc pair, SVG), page titles, Open Graph meta, 404 page. (5) Performance: lazy-load Benchmarks and Lab routes; Lighthouse Performance and Accessibility >= 90 on /play; show the report.
Screenshot at 3 widths and fix brief violations.
```

### W8b: About page (copy supplied by me)

```
Build the /about route using ONLY this text (do not rewrite claims, do not add statistics):

Title: Parallel Alpha-Beta Search for an Othello Engine
Subtitle: A comparative study of Root Splitting, Principal Variation Splitting, and the Young Brothers Wait Concept.

The problem: Othello (Reversi) is a two-player, zero-sum, deterministic, perfect-information game on an 8 x 8 board. It has roughly 10^28 legal positions, a game-tree complexity of about 10^58, and an average branching factor of about 10 over a game of at most 60 moves (Allis, 1994). Exhaustive search is impossible, so strong play depends on depth-limited adversarial search with pruning. Alpha-beta pruning can cut the cost from O(b^d) to as little as O(b^(d/2)) when moves are well ordered (Knuth & Moore, 1975), but it is inherently sequential: bounds learned from earlier siblings are what cut off later ones. Searching siblings simultaneously discards some of that information and causes search overhead (Marsland & Campbell, 1982; Brockington, 1996).

Research questions:
RQ1: How much of alpha-beta's pruning is lost under each parallel strategy, measured as search overhead?
RQ2: How do speedup and efficiency scale with the number of workers P and depth d?
RQ3: How does the quality of move ordering affect each strategy, and where does parallel scaling break down?

Method: Three strategies (Root splitting, Principal Variation Splitting, YBWC with work stealing) are compared against a sequential alpha-beta reference (iterative deepening, transposition table, move ordering) using the same evaluation function, so differences come only from the search. Each runs with P in {1, 2, 4, 8} workers at depths 6 to 12 on seeded benchmark positions. Correctness check: parallel engines must return the same value as the sequential search at equal depth.

Team: Jenil Mistry (2410111064), Neel Parmar (2410111082), Shreyansh Patel (2410111123).
Course: ECSCT24301 Foundation of AI, B.Tech CSE (AI/ML), Semester 5, Academic Year 2026-27. Adani University, Ahmedabad, Faculty of Engineering Sciences and Technology, Department of Computer Science and Engineering (AI-ML). Course coordinator: Dr. Krishna H. Hingrajiya.

References: [I will paste the final verified APA list here; leave a clearly marked slot for it]

Layout: editorial, single column max 68ch, Fraunces headings, generous spacing, a small "Cite this project" block at the end. Screenshot at 3 widths and fix brief violations.
```

### W9: Tests

```
Phase W9. Add Vitest unit tests (store reducers, move formatting, flip stagger, csv_to_json, tree-stepper leaf counting from ybwc_tree.json giving 5 vs 9), Playwright e2e (new game, play to completion vs B2 depth 3, undo, pass handling with a scripted fake engine, reconnect banner, benchmark page renders with fixture data and with missing data), and visual-regression screenshots of Play, Lab, Benchmarks, About and Styleguide at 390/1024/1440. Add a GitHub Actions workflow that builds the engine, runs the C++ tests, pytest, Vitest and Playwright. Show all results.
```

### W10: Deploy

```
Phase W10. Finalise docker-compose.yml: one service builds the C++ engine and runs FastAPI with uvicorn, serving the built frontend as static files from the same origin (no CORS or mixed-content problems), with WebSocket over wss behind a reverse proxy. Env vars: ENGINE_PATH, MAX_GAMES, MAX_THREADS. Write DEPLOY.md with exact steps for (a) local `docker compose up` and (b) Fly.io or Render, noting that the host's core count limits P. /api/system must report real core counts. Test the container end to end and show commands and output.
```

### W11: README + demo script

```
Phase W11. Update README.md: overview, screenshot gallery (fresh screenshots of Play, Lab, Benchmarks), Mermaid architecture diagram (browser, FastAPI bridge, C++ engine), how to run locally and with Docker, the WebSocket contract, how to reproduce the benchmarks, and a link to the report. Write DEMO.md, a 5-minute viva script: (1) show the game; (2) play a move vs YBWC 8 threads; (3) Engine Lab: thread lanes, steals, eval breakdown; (4) Compare to measure speedup vs 1 thread; (5) Benchmarks: RQ1 with the tree stepper (5 vs 9 leaves, 80% overhead), RQ2 scaling, RQ3 failure analysis; (6) Verification table and tournament results. Use only real numbers from my results files.
```

---

## 10. Things only you can do

- **Create `ybwc_tree.json`** from §8 and compare it with Figure 1.
- **Run the real benchmarks** on your machine and keep the CSVs; never let the AI invent sample numbers. Note CPU model, cores and RAM in `hardware.json`.
- **Fill the proposal placeholders** before the final report: verified URLs and access dates for FFO and WTHOR, 1 to 2 recent (2020+) papers on parallel or GPU game-tree search, and the page range for Feldmann et al. (1993).
- **Tell the coordinator about the GUI change**: your Stage 1 proposal says "Pygame (or Streamlit)". Send one line, e.g. "We will implement the demo front end as a web application (React) talking to the same C++ engine through a WebSocket bridge; the research method and experiments are unchanged." This keeps the proposal and the final project consistent.
- **Download FFO and WTHOR files** into `bench/` yourself.

## 11. Common problems

| Problem | Fix |
|---|---|
| UI looks generic | Re-paste the brief, name the violated rule, require screenshots and a self-critique |
| Engine hangs the socket | Test `stop` and timeouts in W1 and W2; the bridge must kill the process on disconnect |
| uint64 wrong in JS | Always hex strings |
| Threads option exceeds the server | UI reads `/api/system` |
| Deployed host is slow | Free tiers have 1 shared core; use them for the UI demo only and quote benchmark numbers from your own machine |
| Parallel best move differs from B2 | Allowed on ties; value must match; show both agreement metrics |
| WASM temptation | Skip it |
