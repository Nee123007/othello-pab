#include "zobrist.hpp"

namespace othello {

namespace {
uint64_t splitmix64(uint64_t& state) {
    state += 0x9e3779b97f4a7c15ULL;
    uint64_t z = state;
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
    z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
    return z ^ (z >> 31);
}
} // anonymous namespace

ZobristTable::ZobristTable() : side_to_move(0) {
    uint64_t seed = 0x517cc1b727220a95ULL;
    for (int sq = 0; sq < 64; ++sq) {
        pieces[sq][0] = splitmix64(seed); // Black piece
        pieces[sq][1] = splitmix64(seed); // White piece
    }
    side_to_move = splitmix64(seed);
}

uint64_t ZobristTable::compute_hash(const Board& board) const {
    uint64_t hash = 0;
    uint64_t black_discs = (board.turn == Color::BLACK) ? board.me : board.opp;
    uint64_t white_discs = (board.turn == Color::WHITE) ? board.me : board.opp;

    while (black_discs) {
        int sq = __builtin_ctzll(black_discs);
        hash ^= pieces[sq][0];
        black_discs &= black_discs - 1;
    }

    while (white_discs) {
        int sq = __builtin_ctzll(white_discs);
        hash ^= pieces[sq][1];
        white_discs &= white_discs - 1;
    }

    if (board.turn == Color::WHITE) {
        hash ^= side_to_move;
    }

    return hash;
}

uint64_t ZobristTable::update_move(uint64_t hash, const Board& before, int sq, uint64_t flips) const {
    int moving_color = (before.turn == Color::BLACK) ? 0 : 1;
    int opponent_color = 1 - moving_color;

    // 1. Place newly placed disc
    hash ^= pieces[sq][moving_color];

    // 2. Flipped discs change from opponent_color to moving_color
    uint64_t temp_flips = flips;
    while (temp_flips) {
        int f = __builtin_ctzll(temp_flips);
        hash ^= pieces[f][opponent_color] ^ pieces[f][moving_color];
        temp_flips &= temp_flips - 1;
    }

    // 3. Toggle side to move
    hash ^= side_to_move;

    return hash;
}

uint64_t ZobristTable::update_pass(uint64_t hash) const {
    return hash ^ side_to_move;
}

const ZobristTable g_zobrist;

} // namespace othello
