#pragma once
#include <cstdint>
#include "board.hpp"

namespace othello {

struct ZobristTable {
    uint64_t pieces[64][2]; // [sq][0=Black, 1=White]
    uint64_t side_to_move;   // Toggled when it is White's turn

    ZobristTable();

    // Compute complete 64-bit hash from scratch
    uint64_t compute_hash(const Board& board) const;

    // Incremental hash updates
    uint64_t update_move(uint64_t hash, const Board& before, int sq, uint64_t flips) const;
    uint64_t update_pass(uint64_t hash) const;
};

extern const ZobristTable g_zobrist;

} // namespace othello
