#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace othello {

enum class Color : int8_t {
    BLACK = 0,
    WHITE = 1
};

inline Color opponent(Color c) {
    return c == Color::BLACK ? Color::WHITE : Color::BLACK;
}

struct Board {
    uint64_t me{0};
    uint64_t opp{0};
    Color turn{Color::BLACK};

    Board();
    Board(uint64_t me_bb, uint64_t opp_bb, Color side);

    uint64_t get_legal_moves() const;
    std::vector<int> get_legal_moves_list() const;
    bool make_move(int sq);
    void pass();
    bool is_terminal() const;
    int disc_difference() const;
    void print() const;
};

uint64_t perft(Board board, int depth, bool passed = false);

} // namespace othello
