# Parallel Alpha-Beta Othello Engine (othello-pab)

A high-performance C++17 game engine evaluating parallel game-tree search algorithms for Othello:
- **Sequential Baseline ($B_0, B_1, B_2$)**: Random, Greedy, Minimax, and Negamax with $\alpha\beta$ pruning, iterative deepening, and lock-free Zobrist transposition table.
- **Parallel Algorithms ($P_1, P_2, P_3$)**:
  - $P_1$: Root Splitting
  - $P_2$: Principal Variation Splitting (PVS)
  - $P_3$: Young Brothers Wait Concept (YBWC) with work-stealing thread pool.

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
ctest --test-dir build --output-on-failure
# Or directly run tests executable:
./build/tests
```

### ThreadSanitizer Build (Linux/macOS or supported Clang)
```bash
cmake -B build -DTSAN=ON
cmake --build build
```

### Running the Engine
```bash
./build/othello
```

### Running the Pygame GUI
```bash
python gui/app.py
```
