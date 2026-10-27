#pragma once
#include <vector>
#include "board.hpp"

namespace othello {

struct MoveOrdering {
    static void order(const Board& board, std::vector<int>& moves, int tt_best_move = -1);
};

} // namespace othello
