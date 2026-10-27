#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "tt.hpp"

namespace othello {

// B0: Random player
int search_b0_random(const Board& board, SearchStats& stats);

// B0: Greedy (max flips) player
int search_b0_greedy(const Board& board, SearchStats& stats);

// B1: Plain depth-limited Minimax / Negamax without pruning
int search_b1_minimax(Board board, int depth, SearchStats& stats);

// B2: Sequential Alpha-Beta with Iterative Deepening, TT, and Move Ordering
int search_b2_alphabeta(Board board, int depth, TranspositionTable& tt, SearchStats& stats, bool use_tt = true, bool use_ordering = true);

} // namespace othello
