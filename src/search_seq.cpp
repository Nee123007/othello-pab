#include "search_seq.hpp"

namespace othello {

int search_b0_random(const Board& /*board*/, SearchStats& /*stats*/) {
    return -1;
}

int search_b0_greedy(const Board& /*board*/, SearchStats& /*stats*/) {
    return -1;
}

int search_b1_minimax(Board /*board*/, int /*depth*/, SearchStats& /*stats*/) {
    return -1;
}

int search_b2_alphabeta(Board /*board*/, int /*depth*/, TranspositionTable& /*tt*/, SearchStats& /*stats*/, bool /*use_tt*/, bool /*use_ordering*/) {
    return -1;
}

} // namespace othello
