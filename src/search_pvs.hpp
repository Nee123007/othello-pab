#pragma once
#include "board.hpp"
#include "stats.hpp"
#include "threadpool.hpp"

namespace othello {

// P2: Principal Variation Splitting (PVS)
int search_p2_pvs(Board board, int depth, ThreadPool& pool, SearchStats& stats);

} // namespace othello
