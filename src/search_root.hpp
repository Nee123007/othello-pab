#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "threadpool.hpp"

namespace othello {

// P1: Root Splitting parallel alpha-beta
// Distributes each legal root move to a worker thread as an independent search with full window
int search_p1_root(Board board, int depth, ThreadPool& pool, SearchStats& stats);

} // namespace othello
