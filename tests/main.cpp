#include <iostream>
#include <cassert>
#include "board.hpp"

int main() {
    std::cout << "[Tests] Running Core Engine Unit Tests...\n";

    othello::Board board;
    assert(board.turn == othello::Color::BLACK);
    std::cout << "[Tests] Initial Board State: OK\n";

    std::cout << "[Tests] All Scaffolding Tests Passed (100% Success).\n";
    return 0;
}
