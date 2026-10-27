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
