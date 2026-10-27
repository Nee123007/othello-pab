#include <iostream>
#include <cassert>
#include <chrono>
#include <vector>
#include "board.hpp"

using namespace othello;

void test_initial_state() {
    std::cout << "[Test 1] Testing Initial Board Setup... ";
    Board b;
    assert(b.turn == Color::BLACK);
    assert(b.my_disc_count() == 2);
    assert(b.opp_disc_count() == 2);
    assert(b.total_discs() == 4);

    uint64_t moves = b.get_legal_moves();
    std::vector<int> move_list = b.get_legal_moves_list();
    assert(move_list.size() == 4);
    assert(__builtin_popcountll(moves) == 4);

    // Initial moves for Black: d3 (19), c4 (26), f5 (37), e6 (44)
    for (int sq : move_list) {
        std::string coord = Board::square_to_coord(sq);
        assert(coord == "d3" || coord == "c4" || coord == "f5" || coord == "e6");
    }
    std::cout << "PASSED\n";
}

void test_move_execution_and_flips() {
    std::cout << "[Test 2] Testing Move Execution & Flips... ";
    Board b;
    int d3 = Board::coord_to_square("d3");
    assert(d3 == 19);

    uint64_t flips = b.compute_flips(d3);
    assert(flips == (1ULL << 27)); // Flips d4 (white)

    bool ok = b.make_move(d3);
    assert(ok);

    // After d3: Black has 4 discs, White has 1 disc, turn is now White
    assert(b.turn == Color::WHITE);
    assert(b.my_disc_count() == 1); // White's perspective
    assert(b.opp_disc_count() == 4); // Black
    assert(b.total_discs() == 5);
    std::cout << "PASSED\n";
}

void test_multi_directional_flips() {
    std::cout << "[Test 3] Testing Multi-Directional Flips on Synthetic Board... ";
    // Center disc at d4 (27). Opponent surrounding it horizontally & vertically.
    // White at c4(26), e4(28), d3(19), d5(35).
    // Black at b4(25), f4(29), d2(11), d6(43).
    // Black places at d4 -> flips all 4 adjacent White discs!
    uint64_t black = (1ULL << 25) | (1ULL << 29) | (1ULL << 11) | (1ULL << 43);
    uint64_t white = (1ULL << 26) | (1ULL << 28) | (1ULL << 19) | (1ULL << 35);
    Board b(black, white, Color::BLACK);

    uint64_t flips = b.compute_flips(27);
    assert(flips == white); // All 4 white discs should flip

    b.make_move(27);
    assert(b.turn == Color::WHITE);
    assert(b.my_disc_count() == 0); // All white discs flipped
    assert(b.opp_disc_count() == 9); // 4 initial + 4 flipped + 1 placed
    std::cout << "PASSED\n";
}

void test_perft() {
    std::cout << "[Test 4] Testing Canonical Perft Verification (Depths 1 to 7):\n";
    const uint64_t expected[] = {
        4ULL,         // Depth 1
        12ULL,        // Depth 2
        56ULL,        // Depth 3
        244ULL,       // Depth 4
        1396ULL,      // Depth 5
        8200ULL,      // Depth 6
        55092ULL      // Depth 7
    };

    Board start;
    for (int d = 1; d <= 7; ++d) {
        auto t0 = std::chrono::high_resolution_clock::now();
        uint64_t count = perft(start, d);
        auto t1 = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();

        std::cout << "  Perft(Depth " << d << ") = " << count
                  << " (Expected: " << expected[d - 1] << ") in " << ms << " ms ... ";
        assert(count == expected[d - 1]);
        std::cout << "PASSED\n";
    }
}

int main() {
    std::cout << "======================================================\n";
    std::cout << "  Parallel Alpha-Beta Othello Engine: Phase 1 Tests   \n";
    std::cout << "======================================================\n";

    test_initial_state();
    test_move_execution_and_flips();
    test_multi_directional_flips();
    test_perft();

    std::cout << "======================================================\n";
    std::cout << "  ALL PHASE 1 UNIT TESTS PASSED (100% SUCCESS)         \n";
    std::cout << "======================================================\n";
    return 0;
}
