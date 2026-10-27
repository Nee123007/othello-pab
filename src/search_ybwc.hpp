#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "threadpool.hpp"
#include "tt.hpp"
#include "ordering.hpp"

namespace othello {

// P3: Young Brothers Wait Concept (YBWC) following Feldmann et al. (1993)
// Eldest brother is searched first sequentially at every internal node.
// Younger brothers are parallelized only if the eldest brother did not cause a cutoff.
int search_p3_ybwc(Board board,
                   int depth,
                   ThreadPool& pool,
                   SearchStats& stats,
                   TranspositionTable* tt = nullptr,
                   bool use_tt = false,
                   bool use_ordering = true,
                   OrderMode order_mode = OrderMode::FULL);

} // namespace othello
