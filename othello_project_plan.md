# Parallel Alpha-Beta Othello Engine: Build Plan + Antigravity Prompts

## 1. Stack (final)

| Layer | Choice | Why |
|---|---|---|
| Engine | C++17, CMake, g++/clang | Matches the proposal; needed for real speedup numbers |
| Board | Two 64-bit bitboards + side to move | Fast movegen and flips |
| Hashing | Zobrist + lockless transposition table (XOR-key trick) | Safe to share between threads |
| Parallelism | `std::thread`, `std::atomic`, own thread pool + work-stealing deques | No OpenMP/TBB, so you control the YBWC logic |
| Tests | Catch2 or GoogleTest, plus perft | Validates movegen and correctness |
| Analysis | Python 3: NumPy, pandas, Matplotlib | Tables and plots |
| GUI | Pygame, talking to the engine over stdin/stdout text protocol | Matches the proposal |
| Tooling | Git/GitHub, Overleaf (LaTeX), APA | Matches the proposal |

Check first: run `nproc` (Linux/WSL) or check Task Manager. P=8 needs 8 hardware threads. If you have fewer, report P up to your core count and say so in the report.

## 2. Repo layout

```
othello-pab/
  CMakeLists.txt
  AGENTS.md                # master rules file for Antigravity
  src/
    board.hpp/.cpp         # bitboards, movegen, make/flip, perft
    zobrist.hpp/.cpp
    eval.hpp/.cpp
    tt.hpp/.cpp            # transposition table
    ordering.hpp/.cpp      # history heuristic, corner/mobility ordering
    search_seq.hpp/.cpp    # B1 minimax, B2 alpha-beta + ID + TT
    threadpool.hpp/.cpp    # workers, work-stealing deques
    search_root.hpp/.cpp   # P1 root splitting
    search_pvs.hpp/.cpp    # P2 PV splitting
    search_ybwc.hpp/.cpp   # P3 YBWC
    stats.hpp              # node counters, timers
    protocol.cpp           # stdin/stdout text protocol
    main.cpp
  tests/                   # perft, eval, search equality
  bench/
    gen_positions.py       # seeded random-play positions
    ffo/                   # FFO files (download manually)
    wthor/                 # WTHOR files (download manually)
    run_bench.py           # runs experiments, writes CSV
  analysis/
    plots.ipynb or plots.py
  gui/
    app.py                 # Pygame front end
  results/                 # CSVs and figures
  report/                  # LaTeX
```

## 3. Phased timeline (about 6 to 7 weeks)

| Phase | What | Output |
|---|---|---|
| 0 | Setup and rules file | Repo builds |
| 1 | Board, movegen, perft | Perft matches known values |
| 2 | Evaluation function | Eval tests pass |
| 3 | Sequential B0, B1, B2 | Reference engine (V1, T1, N1) |
| 4 | Protocol, stats, benchmark harness | CSV output |
| 5 | Thread pool + P1 root splitting | Parallel baseline |
| 6 | P2 PVS | Second strategy |
| 7 | P3 YBWC + work stealing | Main strategy |
| 8 | Correctness suite | P1 to P3 match B2 |
| 9 | Experiments | All CSVs |
| 10 | Failure analysis | Degraded-ordering runs |
| 11 | Plots and tables | Figures for report |
| 12 | GUI and tournaments | Demo + win-rate table |
| 13 | Report and slides | Final submission |

## 4. How to work with Antigravity (important)

1. Use one phase per conversation or agent task. Do not paste everything at once.
2. Start every phase by asking for a plan, then approve it, then let it implement.
3. Always require tests and a build run at the end of each phase. Do not accept "done" without them passing.
4. Commit to Git after each phase passes. If the agent breaks something, you can roll back.
5. Review the concurrency code (phases 5 to 7) yourself. This is where AI-written code most often has data races. Ask it to run ThreadSanitizer (`-fsanitize=thread`).
6. If a result looks too good (superlinear speedup, zero overhead), do not trust it until you understand why.

## 5. Prompts

### Prompt 0: Master rules file (put in `AGENTS.md`, or paste first)

```
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
```

### Prompt 1: Scaffolding

```
Phase 0. Create the repo structure for a C++17 CMake project with this layout: [paste layout from section 2]. Create CMakeLists.txt with three targets: the engine executable `othello`, a test executable `tests`, and an option to enable ThreadSanitizer (-DTSAN=ON). Add empty stub headers/sources, a .gitignore, and a README with build instructions. Make sure `cmake -B build && cmake --build build` works. Show me the build output.
```

### Prompt 2: Board, move generation, perft

```
Phase 1. Implement src/board.hpp/.cpp:
- struct Board { uint64_t me, opp; } with side tracking, standard start position.
- Legal move generation using bitboard shifts in 8 directions (returns a uint64_t mask).
- make_move(square) that places the disc and flips all flanked discs; pass handling; terminal test (neither side can move); final disc difference.
- A print function for debugging.
- perft(depth) that counts leaf nodes, handling passes correctly.
Then write tests in tests/ that check perft against these known values from the standard start position: depth 1=4, 2=12, 3=56, 4=244, 5=1396, 6=8200, 7=55092, 8=390216, 9=3005288, 10=24571284. Also test flips on hand-made positions and pass handling. Run the tests and show output. If perft does not match, debug until it does.
```

### Prompt 3: Zobrist + transposition table

```
Phase 1b. Implement src/zobrist.* (64-bit keys per square per colour + side to move, incremental update on make_move) and src/tt.* : a fixed-size transposition table (size power of two, configurable in MB) storing key, depth, value, bound type (EXACT/LOWER/UPPER), best move. Make it thread-safe and lock-free using the XOR trick (store key^data and data in two atomic 64-bit words). Include probe(), store(), clear(), and a depth-preferred replacement policy. Add tests: store/probe round trip, collision handling, and a multi-threaded stress test that never returns corrupted entries.
```

### Prompt 4: Evaluation function

```
Phase 2. Implement src/eval.* : e(s) = w1*d_mobility + w2*d_corners + w3*sum(W_i * x_i) + w4*d_stability + w5*d_discs, where d_ means (current player minus opponent) and W is a standard 8x8 positional weight matrix (corners high, X-squares and C-squares negative). Use three game phases (opening <= 20 discs placed, midgame, endgame) with different weight sets stored in a struct so I can tune them. Stability can be approximated by counting stable edge/corner-anchored discs. In the last few plies (when the search reaches a terminal state) return the exact disc difference scaled to dominate the heuristic. Add tests for symmetry (the eval of a position and its colour-swapped version must be negatives) and for terminal exactness. Keep it fast (no heap allocation).
```

### Prompt 5: Sequential engines (B0, B1, B2)

```
Phase 3. Implement in src/search_seq.* and src/ordering.*:
- B0: a random-move player and a greedy (max flips) player.
- B1: plain depth-limited negamax without pruning, returning value, best move, nodes.
- B2: negamax alpha-beta with (a) iterative deepening, (b) transposition table probe/store with correct bound handling, (c) move ordering: TT move first, then corners, then history heuristic, then fewer opponent moves (mobility), (d) fail-soft, (e) a switch to turn the TT and ordering ON/OFF independently (needed for failure analysis later).
Both return: value, best move, nodes visited, time in ms. Tests: B1 and B2 must return the same value at depths 1 to 6 on at least 50 random positions (TT off and ordering off first, then on). Show node counts for depth 6 and the pruning efficiency 1 - N_ab/N_minimax.
```

### Prompt 6: Protocol, stats, benchmark harness

```
Phase 4. Add a simple text protocol on stdin/stdout in src/protocol.cpp, e.g.: `new`, `play <move>`, `go depth <d> algo <b1|b2|p1|p2|p3> threads <P>`, `bench <positions_file> <algo> <depth> <threads>`, `perft <d>`, `quit`. Output machine-readable lines like `bestmove e6 value 12 nodes 123456 time_ms 78`. Implement bench mode to read positions (one per line, a 64-char board string plus side) and print one CSV row per position: algo,threads,depth,position_id,value,bestmove,nodes,time_ms. Also write bench/gen_positions.py that generates N seeded random-play positions at move numbers 10 (early), 25 (mid), 45 (late) and writes the files. Use the same seed so every algorithm gets identical positions.
```

### Prompt 7: Thread pool + P1 root splitting

```
Phase 5. Implement src/threadpool.* with P worker threads, a task queue per worker, and work stealing (a simple mutex-protected deque per worker is acceptable; document the choice). Then implement P1 Root Splitting in src/search_root.*: at the root, generate all moves and give each root move to a worker as an independent alpha-beta search with the full window; collect results and pick the best. A shared atomic best-so-far MUST NOT be used for pruning in the basic version (that is what makes root splitting naive). Count total nodes with per-thread counters summed at the end. Show a test that with P=1 it matches B2 and with P=4 the value matches B2. Run with -DTSAN=ON and show there are no data race reports.
```

### Prompt 8: P2 PVS

```
Phase 6. Implement Principal Variation Splitting in src/search_pvs.* following Marsland & Campbell (1982): search the leftmost (PV) path down to the leaf sequentially; then, backing up along the PV, at each PV node search the first child (the PV child) first, then split the remaining sibling moves among the workers using the alpha bound found so far, sharing improved alpha/beta through an atomic so later subtrees benefit when a better bound is found. Handle cutoffs: when one worker causes a beta cutoff, signal the others to stop (atomic stop flag checked at each node). Reuse the thread pool. Verify value equality with B2 on 100 positions, depths 4 to 8, P in {1,2,4}. Run ThreadSanitizer.
```

### Prompt 9: P3 YBWC (main contribution)

```
Phase 7. Implement the Young Brothers Wait Concept in src/search_ybwc.* following Feldmann et al. (1993):
- At EVERY node, the eldest brother (first ordered move) is searched completely and sequentially FIRST.
- Only after the eldest brother returns (and the node is not already cut off) are the younger brothers made available as tasks that idle workers can steal.
- Use a minimum-depth threshold (do not split nodes near the leaves, e.g. remaining depth < 3, configurable) to avoid task overhead.
- Shared per-node state (alpha, beta, best value, best move, number of unfinished children) must be handled with atomics; when a cutoff occurs, set a cancel flag for that node's subtree so stolen siblings stop early.
- The thread that created the split node should help (work on stolen tasks) while waiting rather than blocking.
Add counters: number of splits, number of steals, number of cancelled tasks, idle time per thread. Verify value equality with B2 on 100 positions (TT off), depths 4 to 8, P in {1,2,4,8}. Run ThreadSanitizer and fix any races. Explain in comments how the design avoids deadlock.
```

### Prompt 10: Correctness suite

```
Phase 8. Create tests/test_equality.cpp: for 200 seeded positions (early/mid/late) and depths 4 to 8, assert that P1, P2, P3 with P in {1,2,4,8} return exactly the same value as B2 with TT disabled. With TT enabled, parallel search can legitimately differ in best move on ties, so check the value only at fixed depth and report any mismatches in a log instead of failing silently. Also add a test that runs the FFO endgame positions (if files exist in bench/ffo) with the exact solver mode and compares the result to the expected score in the FFO file. Print a summary table of pass/fail counts.
```

### Prompt 11: Experiment runner

```
Phase 9. Write bench/run_bench.py: for each algorithm in {b2, p1, p2, p3}, P in {1,2,4,8} (b2 only P=1), depth in 6..12, run the engine bench mode on early/mid/late position sets (e.g. 30 positions each; reduce positions at depth >=11), repeat each run 3 times, pin the thread count, and append rows to results/raw.csv with columns: algo, threads, depth, phase, pos_id, repeat, value, bestmove, nodes, time_ms. Add a timeout per position, resume support (skip rows already done), and a progress bar. Then create analysis/compute_metrics.py that computes S_P = T1/TP, E_P = S_P/P, SO_P = N_P/N_1 - 1, pruning efficiency, effective branching factor b* = N1^(1/d), agreement of value with B2, and saves results/summary.csv grouped by algo, P, depth, phase (mean and std).
```

### Prompt 12: Failure analysis

```
Phase 10. Add engine flags to degrade move ordering on purpose: --order=full (TT move + corner + history + mobility), --order=history_only, --order=none, --order=random, --order=reverse (worst-first). Write bench/run_failure.py that runs P1, P2, P3 at P=8 for each ordering setting at depths 8 and 10 and logs the same metrics. Also log YBWC split/steal/cancel counters and per-thread idle time. Produce results/failure.csv and a short markdown note listing where speedup flattens or search overhead explodes, with the numbers.
```

### Prompt 13: Plots

```
Phase 11. Using results/summary.csv and results/failure.csv, produce publication-quality Matplotlib figures (PDF + PNG, readable fonts, labelled axes, error bars, consistent colours per algorithm) in results/figures/: (1) speedup vs P per algorithm with the ideal linear line, (2) efficiency vs P, (3) search overhead vs P, (4) nodes vs depth for B1, B2 (show pruning gain), (5) speedup vs depth at P=8, (6) effect of move-ordering quality on search overhead and speedup, (7) YBWC steals/idle time vs P. Also produce LaTeX-ready tables (booktabs) for the main numbers.
```

### Prompt 14: GUI

```
Phase 12a. Build gui/app.py with Pygame: draws the 8x8 board, lets a human play black or white against the engine, launches the engine as a subprocess speaking the text protocol, and has a side panel showing: algorithm selector (B1/B2/P1/P2/P3), thread count, depth, nodes searched, time, speedup, current value, and the best move. Add a "step-by-step" mode that shows the engine's chosen move and lets me click to advance, and highlight legal moves. Keep the engine and GUI decoupled (GUI only uses the protocol).
```

### Prompt 15: Tournaments

```
Phase 12b. Add a tournament runner (bench/tournament.py) that plays engine-vs-engine matches with colour swaps at equal time control per move (configurable, e.g. 1 s) and seeded random opening positions (first 6 plies random). Opponents: B0 random, B0 greedy, B2, and P3 with P=8. Output win/draw/loss counts, win rate, and mean final disc difference with 95% confidence intervals to results/tournament.csv.
```

### Prompt 16: Report helper

```
Phase 13. Using my project proposal [paste or attach PDF], write the LaTeX skeleton (report/main.tex) with sections: Introduction, Problem and RQs, Background (alpha-beta, node types, PVS, YBWC), Implementation, Experimental setup, Results (RQ1, RQ2, RQ3), Failure analysis, Conclusion, References (APA). Insert placeholders for the figures and tables from results/figures. Do not invent numbers or citations; leave TODO markers where I must paste real data or verify references.
```

## 6. Things to fix in your proposal before submission

- Fill the `[add verified URL]` placeholders for FFO and WTHOR (French Othello Federation site, with access dates).
- Add 1 to 2 recent (2020+) papers on parallel or GPU game-tree search (search Google Scholar).
- Verify the page range for Feldmann et al. (1993).
- FFO and WTHOR files must be downloaded by you manually into `bench/`; Antigravity may not have network access.

## 7. Risks and what to tell your guide if asked

| Risk | Mitigation |
|---|---|
| Data races or deadlocks in YBWC | ThreadSanitizer, simple design first, depth threshold for splitting |
| Parallel value differs from sequential | Compare with TT off for strict equality |
| Fewer than 8 cores | Report up to the core count; state the hardware in the report |
| Noisy timing | 3 repeats, report mean and std, close other programs, fixed CPU governor |
| Deep searches too slow (depth 12) | Fewer positions at depth 11 to 12, use the late-game set |
| Generated code that runs but is wrong | Perft, value-equality tests, manual review of the search code |
