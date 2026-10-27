# Othello Parallel Alpha-Beta Engine: User & Player Guide

Welcome to the **Parallel Alpha-Beta Othello Engine** (`othello-pab`). This guide explains how to play the game, use the graphical interface, spectate AI vs AI battles, configure parallel search algorithms, and run automated tournaments and benchmarks.

---

## 1. Quick Start

### Launch the Graphical Game (GUI)
Run the following command in your terminal:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" gui/app.py
```
*(If `python` is already configured in your system environment PATH, `python gui/app.py` works as well).*

---

## 2. Rules of Othello (Reversi)

1. **Board & Pieces**:
   - Played on an $8 \times 8$ grid.
   - The game begins with 4 discs placed in the center: two White discs and two Black discs placed diagonally.
2. **Turns**:
   - **Black (●) always moves first**.
   - Players alternate turns placing one disc of their color onto an empty square.
3. **Outflanking & Flipping**:
   - A move is **legal** only if placing your disc traps ("outflanks") one or more continuous opponent discs between your newly placed disc and an existing disc of your color along any straight line (horizontal, vertical, or diagonal).
   - All trapped opponent discs are flipped to your color.
4. **Passing**:
   - If a player has no legal moves, their turn is automatically passed.
5. **Game Over & Winning**:
   - The game ends when neither player has a legal move (e.g., the board is full or both players must pass).
   - The player with the most discs on the board wins!

---

## 3. Using the Graphical Interface (GUI)

The window has two sections: the **8x8 Board** on the left and the **Control Panel** on the right.

### Board Features
- **Legal Move Dots**: Whenever it is your turn, small **translucent white dots** appear on all squares where you can make a legal move.
- **Click to Play**: Simply click any square with a white dot to place your piece. The trapped discs flip instantly, and the AI immediately calculates its response.
- **Coordinates**: Standard algebraic board labels (`a` to `h` for columns, `1` to `8` for rows).

### Control Panel Options
Click on any of the buttons on the right panel to customize your match:

1. **`Mode` Button**:
   - **`Human (Black) vs AI`**: You play first as Black; AI plays White.
   - **`Human (White) vs AI`**: AI plays first as Black; you play second as White.
   - **`AI vs AI (Auto Spectator)`**: Both sides are played by the AI engine with a 350 ms spectator delay between moves. Watch the AI play against itself while viewing real-time calculations.
   - **`AI vs AI (Step Mode)`**: Interactive move-by-move analysis. Click `>>> Compute Next AI Move <<<` to see the engine calculate its best move (highlighted with a yellow ring on the board), then click `>>> Commit Candidate Move <<<` to execute the move.
2. **`AI Engine` Button**:
   - Cycles through all 7 search algorithms (`b0_random`, `b0_greedy`, `b1`, `b2`, `p1`, `p2`, `p3`).
3. **`Parallel Threads` Button**:
   - Changes the number of CPU cores allocated for parallel search: **1, 2, 4, or 8 cores**.
4. **`Search Depth` (`-` / `+`)**:
   - Adjusts the lookahead search depth from **1** (fast/casual) up to **8-10** (master level).
5. **`New Game` Button**:
   - Resets the board back to the standard opening position.
6. **`Undo` Button**:
   - Undoes your last move and the AI's response, letting you try different tactical lines.

### Live Engine Telemetry
The telemetry box updates continuously after every search:
- **Status**: Thinking, Waiting for Human, or Idle.
- **Player**: Whose turn was evaluated (Black or White).
- **Best Move**: The exact square chosen by the engine (e.g., `D3`, `C4`, `F5`).
- **Score (cp)**: Heuristic evaluation in centipawns (positive favors the player to move).
- **Nodes**: Total game-tree states visited and evaluated.
- **Search Time**: Elapsed calculation time in milliseconds.

---

## 4. The 7 AI Search Algorithms

| ID | Algorithm Name | Description | Recommended Depth |
| :--- | :--- | :--- | :--- |
| **`b0_random`** | **Random Baseline** | Selects a legal move uniformly at random. Useful as an easy opponent or baseline benchmark. | Any |
| **`b0_greedy`** | **Greedy Disc Maximizer** | Looks 1 move ahead and selects the move capturing the maximum discs/static value. | 1 |
| **`b1`** | **Full Minimax** | Complete tree exploration without pruning ($O(b^d)$ nodes). Exponentially slow at depths $\ge 5$. | 1 – 4 |
| **`b2`** | **Alpha-Beta Pruning** | Single-threaded Alpha-Beta with move ordering (Transposition Table, killer moves, mobility scoring). Our sequential reference. | 1 – 8 |
| **`p1`** | **Root Splitting** | Parallel search splitting top-level legal moves across CPU cores. Low overhead, but saturates early due to root move count. | 4 – 8 |
| **`p2`** | **PVS (PV-Split)** | Principal Variation Splitting (Marsland & Campbell 1982). Searches the best PV move first, then parallelizes sibling moves with null windows. | 4 – 8 |
| **`p3`** | **YBWC** | Young Brothers Wait Concept (Feldmann et al. 1993). Eldest brother searched first; younger brothers searched in parallel via work-stealing. Highest parallel efficiency. | 4 – 10 |

---

## 5. Playing via Command Line (CLI)

You can interact directly with the C++ engine executable using the standard text protocol:

```powershell
./build/othello.exe
```

### Supported Commands:
- `new` : Reset board to opening position.
- `setboard <64_chars> <b|w>` : Set custom board layout (`X`=Black, `O`=White, `.`=Empty) and turn.
- `play <square>` : Make a move on the board (e.g., `play d3` or `play c4`).
- `go depth <D> algo <ALGO> threads <P>` : Search for the best move (e.g., `go depth 6 algo p3 threads 8`).
- `perft <D>` : Run move generator performance validation to depth $D$.
- `bench <D>` : Run performance benchmark on the current position.
- `quit` : Exit the engine.

---

## 6. Running Tournaments & Benchmarks

### 1. Automated AI vs AI Round-Robin Tournament
To run an automated 24-game round-robin tournament comparing baseline and parallel engines:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" bench/tournament.py
```
Results and game records are saved in:
- [`results/tournament.csv`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/results/tournament.csv) (leaderboard, win rate, disk margins)
- [`results/tournament_games.csv`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/results/tournament_games.csv) (full move logs of every game)

### 2. Comprehensive Performance Benchmarks
To run the full scientific benchmark across 90 test positions:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" bench/run_bench.py
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" analysis/compute_metrics.py
```
This produces summary speedup $S_P$, efficiency $E_P$, and search overhead $SO_P$ metrics in [`results/summary.csv`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/results/summary.csv).

### 3. Generate Publication Plots
To re-generate all 7 research charts in both vector PDF and 300-DPI PNG:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" analysis/plots.py
```
Figures are saved in [`results/figures/`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/results/figures/).

---

## 7. Research Report Manuscript

The complete academic manuscript matching the FEST ECSCT24301 course specifications is located in:
- Main LaTeX source: [`report/main.tex`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/report/main.tex)
- BibTeX references: [`report/references.bib`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/report/references.bib)
- Embedded tables: [`results/table_summary.tex`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/results/table_summary.tex) and [`results/table_failure.tex`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/results/table_failure.tex)

You can upload the entire [`report/`](file:///c:/Users/yg159/OneDrive/Desktop/FAI/report/) folder directly to Overleaf to compile your submission PDF.

---

## 8. Troubleshooting

- **"Python was not found" Error**:
  Run Python using the explicit absolute path:
  ```powershell
  & "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" gui/app.py
  ```
- **Rebuilding the C++ Engine**:
  ```powershell
  $env:Path = "C:\Users\yg159\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;" + $env:Path
  cmake --build build -j8
  ```
- **Running Unit Tests**:
  ```powershell
  ./build/tests.exe
  ```
