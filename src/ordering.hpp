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

inline OrderMode parse_order_mode(const std::string& str) {
    if (str == "history_only" || str == "history") return OrderMode::HISTORY_ONLY;
    if (str == "none") return OrderMode::NONE;
    if (str == "random") return OrderMode::RANDOM;
    if (str == "reverse") return OrderMode::REVERSE;
    return OrderMode::FULL;
}

inline std::string order_mode_to_string(OrderMode mode) {
    switch (mode) {
        case OrderMode::FULL: return "full";
        case OrderMode::HISTORY_ONLY: return "history_only";
        case OrderMode::NONE: return "none";
        case OrderMode::RANDOM: return "random";
        case OrderMode::REVERSE: return "reverse";
    }
    return "full";
}

} // namespace othello
