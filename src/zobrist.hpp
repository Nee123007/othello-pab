#pragma once
#include <cstdint>
#include "board.hpp"

namespace othello {

struct ZobristTable {
    uint64_t pieces[64][2]; // [sq][color]
    uint64_t side_to_move;

    ZobristTable();
    uint64_t compute_hash(const Board& board) const;
};

extern const ZobristTable g_zobrist;

} // namespace othello
