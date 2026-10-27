#pragma once
#include <vector>
#include <cstdint>
#include "board.hpp"

namespace othello {

enum class OrderMode : uint8_t {
    FULL,          // TT move + Corners + History + Mobility + Positional
    HISTORY_ONLY,  // History heuristic only
    NONE,          // Natural bitboard order
    RANDOM,        // Random shuffle
    REVERSE        // Reversed / worst first
};

class MoveOrdering {
public:
    static void order(const Board& board,
                      std::vector<int>& moves,
                      int tt_best_move,
                      const uint32_t history[2][64],
                      OrderMode mode = OrderMode::FULL);
};

} // namespace othello
