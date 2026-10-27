#include "board.hpp"
#include <iostream>
#include <sstream>
#include <cctype>

namespace othello {

Board::Board() : turn(Color::BLACK) {
    // Initial standard Othello position:
    // D4 (sq 27) = White, E4 (sq 28) = Black
    // D5 (sq 35) = Black, E5 (sq 36) = White
    me = (1ULL << 28) | (1ULL << 35);
    opp = (1ULL << 27) | (1ULL << 36);
}

Board::Board(uint64_t me_bb, uint64_t opp_bb, Color side)
    : me(me_bb), opp(opp_bb), turn(side) {}

template<int Shift, uint64_t Mask, bool LeftShift>
inline uint64_t raycast_moves(uint64_t p, uint64_t o, uint64_t empty) {
    uint64_t c;
    if constexpr (LeftShift) {
        c = (p << Shift) & Mask & o;
        c |= (c << Shift) & Mask & o;
        c |= (c << Shift) & Mask & o;
        c |= (c << Shift) & Mask & o;
        c |= (c << Shift) & Mask & o;
        c |= (c << Shift) & Mask & o;
        return (c << Shift) & Mask & empty;
    } else {
        c = (p >> Shift) & Mask & o;
        c |= (c >> Shift) & Mask & o;
        c |= (c >> Shift) & Mask & o;
        c |= (c >> Shift) & Mask & o;
        c |= (c >> Shift) & Mask & o;
        c |= (c >> Shift) & Mask & o;
        return (c >> Shift) & Mask & empty;
    }
}

uint64_t Board::get_legal_moves() const {
    const uint64_t empty = ~(me | opp);
    uint64_t moves = 0;

    // East (+1) & West (-1)
    moves |= raycast_moves<1, NOT_A_FILE, true>(me, opp, empty);
    moves |= raycast_moves<1, NOT_H_FILE, false>(me, opp, empty);

    // South (+8) & North (-8)
    moves |= raycast_moves<8, ~0ULL, true>(me, opp, empty);
    moves |= raycast_moves<8, ~0ULL, false>(me, opp, empty);

    // South-East (+9) & North-West (-9)
    moves |= raycast_moves<9, NOT_A_FILE, true>(me, opp, empty);
    moves |= raycast_moves<9, NOT_H_FILE, false>(me, opp, empty);

    // South-West (+7) & North-East (-7)
    moves |= raycast_moves<7, NOT_H_FILE, true>(me, opp, empty);
    moves |= raycast_moves<7, NOT_A_FILE, false>(me, opp, empty);

    return moves;
}

std::vector<int> Board::get_legal_moves_list() const {
    std::vector<int> list;
    uint64_t moves = get_legal_moves();
    while (moves) {
        int sq = __builtin_ctzll(moves);
        list.push_back(sq);
        moves &= moves - 1;
    }
    return list;
}

uint64_t Board::compute_flips(int sq) const {
    const uint64_t move = 1ULL << sq;
    if ((move & (me | opp)) != 0) return 0; // Square already occupied

    uint64_t total_flips = 0;

    // 8 Raycasting directions: {shift, mask, left_shift}
    struct Dir { int s; uint64_t m; bool left; };
    const Dir dirs[8] = {
        {1, NOT_A_FILE, true},   // East
        {1, NOT_H_FILE, false},  // West
        {8, ~0ULL, true},        // South
        {8, ~0ULL, false},       // North
        {9, NOT_A_FILE, true},   // SouthEast
        {9, NOT_H_FILE, false},  // NorthWest
        {7, NOT_H_FILE, true},   // SouthWest
        {7, NOT_A_FILE, false}   // NorthEast
    };

    for (int i = 0; i < 8; ++i) {
        uint64_t ray = 0;
        uint64_t cur = move;
        while (true) {
            cur = dirs[i].left ? ((cur << dirs[i].s) & dirs[i].m) : ((cur >> dirs[i].s) & dirs[i].m);
            if (cur & opp) {
                ray |= cur;
            } else {
                if (cur & me) {
                    total_flips |= ray;
                }
                break;
            }
        }
    }

    return total_flips;
}

bool Board::make_move(int sq) {
    uint64_t flips = compute_flips(sq);
    if (flips == 0) return false;

    uint64_t move_mask = 1ULL << sq;
    opp ^= flips;
    me |= (move_mask | flips);

    // Toggle side to move (negamax formulation)
    std::swap(me, opp);
    turn = opponent(turn);
    return true;
}

void Board::pass() {
    std::swap(me, opp);
    turn = opponent(turn);
}

bool Board::is_terminal() const {
    if (total_discs() == 64) return true;
    if (get_legal_moves() != 0) return false;

    // Current player cannot move; check if opponent can move
    Board next = *this;
    next.pass();
    return next.get_legal_moves() == 0;
}

int Board::disc_difference() const {
    return my_disc_count() - opp_disc_count();
}

int Board::my_disc_count() const {
    return __builtin_popcountll(me);
}

int Board::opp_disc_count() const {
    return __builtin_popcountll(opp);
}

int Board::total_discs() const {
    return __builtin_popcountll(me | opp);
}

std::string Board::square_to_coord(int sq) {
    if (sq < 0 || sq > 63) return "pass";
    char col = 'a' + (sq % 8);
    char row = '1' + (sq / 8);
    return {col, row};
}

int Board::coord_to_square(const std::string& coord) {
    if (coord.size() < 2) return -1;
    char c = std::tolower(coord[0]);
    char r = coord[1];
    if (c < 'a' || c > 'h' || r < '1' || r > '8') return -1;
    int col = c - 'a';
    int row = r - '1';
    return row * 8 + col;
}

void Board::print() const {
    std::cout << to_string() << "\n";
}

std::string Board::to_string() const {
    std::ostringstream oss;
    oss << "  a b c d e f g h\n";
    uint64_t b = (turn == Color::BLACK) ? me : opp;
    uint64_t w = (turn == Color::WHITE) ? me : opp;

    for (int r = 0; r < 8; ++r) {
        oss << (r + 1) << " ";
        for (int c = 0; c < 8; ++c) {
            int sq = r * 8 + c;
            uint64_t mask = 1ULL << sq;
            if (b & mask) oss << "X ";
            else if (w & mask) oss << "O ";
            else oss << ". ";
        }
        oss << (r + 1) << "\n";
    }
    oss << "  a b c d e f g h\n";
    oss << "Turn: " << (turn == Color::BLACK ? "Black (X)" : "White (O)")
        << " | Score: X=" << __builtin_popcountll(b)
        << " O=" << __builtin_popcountll(w) << "\n";
    return oss.str();
}

uint64_t perft(Board board, int depth, bool passed) {
    if (depth == 0) return 1;

    uint64_t moves = board.get_legal_moves();
    if (moves == 0) {
        if (passed) return 1; // Double pass: terminal state
        board.pass();
        return perft(board, depth - 1, true);
    }

    uint64_t total = 0;
    while (moves) {
        int sq = __builtin_ctzll(moves);
        Board next = board;
        next.make_move(sq);
        total += perft(next, depth - 1, false);
        moves &= moves - 1;
    }
    return total;
}

} // namespace othello
