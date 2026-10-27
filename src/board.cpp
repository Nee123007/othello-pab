#include "board.hpp"
#include <iostream>

namespace othello {

Board::Board() : me(0), opp(0), turn(Color::BLACK) {
    // Initial standard Othello position:
    // D4=27, E4=28, D5=35, E5=36
    // Black: E4, D5. White: D4, E5.
    uint64_t b = (1ULL << 28) | (1ULL << 35);
    uint64_t w = (1ULL << 27) | (1ULL << 36);
    me = b;
    opp = w;
}

Board::Board(uint64_t me_bb, uint64_t opp_bb, Color side)
    : me(me_bb), opp(opp_bb), turn(side) {}

uint64_t Board::get_legal_moves() const {
    // Stub for Phase 0; fully implemented in Phase 1
    return 0;
}

std::vector<int> Board::get_legal_moves_list() const {
    return {};
}

bool Board::make_move(int /*sq*/) {
    return false;
}

void Board::pass() {
    std::swap(me, opp);
    turn = opponent(turn);
}

bool Board::is_terminal() const {
    return false;
}

int Board::disc_difference() const {
    return 0;
}

void Board::print() const {
    std::cout << "Othello Board Stub\n";
}

uint64_t perft(Board /*board*/, int /*depth*/, bool /*passed*/) {
    return 0;
}

} // namespace othello
