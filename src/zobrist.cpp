#include "zobrist.hpp"

namespace othello {

ZobristTable::ZobristTable() : side_to_move(0) {
    uint64_t state = 104729ULL;
    for (int sq = 0; sq < 64; ++sq) {
        for (int c = 0; c < 2; ++c) {
            state = state * 6364136223846793005ULL + 1442695040888963407ULL;
            pieces[sq][c] = state;
        }
    }
    state = state * 6364136223846793005ULL + 1442695040888963407ULL;
    side_to_move = state;
}

uint64_t ZobristTable::compute_hash(const Board& /*board*/) const {
    return 0;
}

const ZobristTable g_zobrist;

} // namespace othello
