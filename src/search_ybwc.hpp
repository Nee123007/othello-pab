#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "threadpool.hpp"

namespace othello {

// P3: Young Brothers Wait Concept (YBWC)
int search_p3_ybwc(Board board, int depth, ThreadPool& pool, SearchStats& stats);

} // namespace othello
