#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "tt.hpp"
#include "ordering.hpp"

namespace othello {

// B0: Random player
int search_b0_random(const Board& board, SearchStats& stats, uint64_t seed = 42);

// B0: Greedy (maximum immediate disc flips) player
int search_b0_greedy(const Board& board, SearchStats& stats);

// B1: Plain depth-limited Minimax / Negamax without pruning (exponential baseline)
int search_b1_minimax(Board board, int depth, SearchStats& stats);

// B2: Sequential Alpha-Beta Reference Engine:
// Iterative Deepening, Zobrist Transposition Table, Move Ordering, Fail-soft
int search_b2_alphabeta(Board board,
                        int depth,
                        TranspositionTable* tt,
                        SearchStats& stats,
                        bool use_tt = true,
                        bool use_ordering = true,
                        OrderMode order_mode = OrderMode::FULL);

constexpr int INF = 1000000;

// Internal recursive Negamax alpha-beta for sequential reference and parallel subtrees
int negamax_b2_internal(Board board,
                        int depth,
                        int alpha,
                        int beta,
                        TranspositionTable* tt,
                        uint32_t history[2][64],
                        SearchStats& stats,
                        bool use_tt,
                        bool use_ordering,
                        OrderMode order_mode,
                        bool passed = false);

} // namespace othello
