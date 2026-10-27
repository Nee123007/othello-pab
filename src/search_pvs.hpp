#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "threadpool.hpp"
#include "tt.hpp"
#include "ordering.hpp"

namespace othello {

// P2: Principal Variation Splitting (PVS) following Marsland & Campbell (1982)
// Searches PV child first sequentially, then splits younger siblings in parallel
// using null-window search with atomic alpha updates and beta-cutoff cancellation.
int search_p2_pvs(Board board,
                  int depth,
                  ThreadPool& pool,
                  SearchStats& stats,
                  TranspositionTable* tt = nullptr,
                  bool use_tt = false,
                  bool use_ordering = true,
                  OrderMode order_mode = OrderMode::FULL);

} // namespace othello
