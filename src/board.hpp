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

constexpr uint64_t NOT_A_FILE = 0xfefefefefefefefeULL;
constexpr uint64_t NOT_H_FILE = 0x7f7f7f7f7f7f7f7fULL;

struct Board {
    uint64_t me{0};   // Bitboard of player to move
    uint64_t opp{0};  // Bitboard of opponent
    Color turn{Color::BLACK};

    Board();
    Board(uint64_t me_bb, uint64_t opp_bb, Color side);

    // Fast bitboard legal moves generator
    uint64_t get_legal_moves() const;
    std::vector<int> get_legal_moves_list() const;

    // Flip computation and move execution
    uint64_t compute_flips(int sq) const;
    bool make_move(int sq);
    void pass();

    // Terminal detection and evaluation utilities
    bool is_terminal() const;
    int disc_difference() const;
    int my_disc_count() const;
    int opp_disc_count() const;
    int total_discs() const;

    // Pretty printing
    void print() const;
    std::string to_string() const;
    static std::string square_to_coord(int sq);
    static int coord_to_square(const std::string& coord);
};

// Canonical Perft leaf-counter
uint64_t perft(Board board, int depth, bool passed = false);

} // namespace othello
