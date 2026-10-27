# Parallel Alpha-Beta Othello Engine (othello-pab)

A high-performance C++17 game engine and research framework evaluating parallel game-tree search algorithms for Othello:
- **Sequential Baselines ($B_0, B_1, B_2$)**: Random, Greedy, Minimax, and Negamax with $\alpha\beta$ pruning, iterative deepening, and lock-free Zobrist transposition table.
- **Parallel Algorithms ($P_1, P_2, P_3$)**:
  - $P_1$: Root Splitting
  - $P_2$: Principal Variation Splitting (PVS)
  - $P_3$: Young Brothers Wait Concept (YBWC) with work-stealing thread pool.
- **Interactive Pygame GUI**: Human vs AI, AI vs AI (Auto Spectator), and AI vs AI (Step Analysis) with live telemetry.
- **Automated Round-Robin Tournament**: 24-game automated competition between baseline and parallel engines.
- **Academic Research Manuscript**: Complete LaTeX paper in `report/` matching Adani University course specifications.

---

## Quick Navigation

- 📖 **[User & Player Guide (How to Play & Use GUI)](USER_GUIDE.md)**
- 🔬 **[Failure Analysis Report](analysis/failure_analysis.md)**
- 📊 **[Publication Figures & Charts](results/figures/)**
- 📄 **[LaTeX Academic Manuscript](report/main.tex)**

---

## Quick Start (Playing the Game)

Launch the interactive Pygame GUI:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" gui/app.py
```
*(Or simply `python gui/app.py` if python is in your PATH).*

For full instructions on rules, controls, and AI modes, see **[USER_GUIDE.md](USER_GUIDE.md)**.

---

## Build Instructions

### Prerequisites
- CMake 3.16+
- C++17 compliant compiler (GCC 9+, Clang 10+, or MSVC 2019+)
- Python 3.8+ (for Pygame GUI and benchmarks)

### Building the Project
```bash
# Configure build
cmake -B build

# Build engine and unit test executables
cmake --build build

# Run unit tests
./build/tests.exe
```

---

## Running Automated Benchmarks & Tournaments

### Run Round-Robin Tournament (24 Games)
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" bench/tournament.py
```

### Run Scientific Benchmark Suite (90 Positions)
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" bench/run_bench.py
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" analysis/compute_metrics.py
```

### Generate Publication Plots (PDF + PNG)
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" analysis/plots.py
```
