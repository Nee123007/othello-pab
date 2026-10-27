#include <iostream>
#include <cassert>
#include <chrono>
#include <vector>
#include <thread>
#include <atomic>
#include "board.hpp"
#include "zobrist.hpp"
#include "tt.hpp"
#include "eval.hpp"

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
    assert(flips == (1ULL << 27));

    bool ok = b.make_move(d3);
    assert(ok);

    assert(b.turn == Color::WHITE);
    assert(b.my_disc_count() == 1);
    assert(b.opp_disc_count() == 4);
    assert(b.total_discs() == 5);
    std::cout << "PASSED\n";
}

void test_multi_directional_flips() {
    std::cout << "[Test 3] Testing Multi-Directional Flips on Synthetic Board... ";
    uint64_t black = (1ULL << 25) | (1ULL << 29) | (1ULL << 11) | (1ULL << 43);
    uint64_t white = (1ULL << 26) | (1ULL << 28) | (1ULL << 19) | (1ULL << 35);
    Board b(black, white, Color::BLACK);

    uint64_t flips = b.compute_flips(27);
    assert(flips == white);

    b.make_move(27);
    assert(b.turn == Color::WHITE);
    assert(b.my_disc_count() == 0);
    assert(b.opp_disc_count() == 9);
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

void test_zobrist_incremental_vs_scratch() {
    std::cout << "[Test 5] Testing Zobrist Hashing (Incremental vs. Scratch)... ";
    Board b;
    uint64_t h_initial = g_zobrist.compute_hash(b);
    assert(h_initial != 0);

    int d3 = 19;
    uint64_t flips = b.compute_flips(d3);
    uint64_t h_incremental = g_zobrist.update_move(h_initial, b, d3, flips);

    b.make_move(d3);
    uint64_t h_scratch = g_zobrist.compute_hash(b);
    assert(h_incremental == h_scratch);

    Board b_pass = b;
    uint64_t h_before_pass = g_zobrist.compute_hash(b_pass);
    uint64_t h_pass_inc = g_zobrist.update_pass(h_before_pass);
    b_pass.pass();
    uint64_t h_pass_scratch = g_zobrist.compute_hash(b_pass);
    assert(h_pass_inc == h_pass_scratch);

    std::cout << "PASSED\n";
}

void test_transposition_table_round_trip() {
    std::cout << "[Test 6] Testing Transposition Table Store & Probe Round-Trip... ";
    TranspositionTable tt(4);
    assert(tt.size_mb() == 4);

    uint64_t key1 = 0x1122334455667788ULL;
    int depth1 = 6;
    int val1 = 450;
    int move1 = 19;

    tt.store(key1, depth1, val1, BoundType::EXACT, move1);

    int out_val = 0;
    int out_move = -1;

    bool hit = tt.probe(key1, depth1, -1000, 1000, out_val, out_move);
    assert(hit);
    assert(out_val == val1);
    assert(out_move == move1);

    hit = tt.probe(key1, 4, -1000, 1000, out_val, out_move);
    assert(hit);
    assert(out_val == val1);

    hit = tt.probe(key1, 8, -1000, 1000, out_val, out_move);
    assert(!hit);
    assert(out_move == move1);

    hit = tt.probe(0x9999ULL, 4, -1000, 1000, out_val, out_move);
    assert(!hit);
    assert(out_move == -1);

    std::cout << "PASSED\n";
}

void test_transposition_table_bounds_and_replacement() {
    std::cout << "[Test 7] Testing TT Bound Cutoffs & Depth-Preferred Replacement... ";
    TranspositionTable tt(4);

    uint64_t key = 0xAABBCCDDEEFF0011ULL;
    tt.store(key, 5, 200, BoundType::LOWER, 27);

    int val = 0, move = -1;
    bool hit = tt.probe(key, 5, 100, 150, val, move);
    assert(hit);
    assert(val == 200);

    hit = tt.probe(key, 5, 100, 250, val, move);
    assert(!hit);

    tt.store(key, 7, 350, BoundType::EXACT, 35);
    hit = tt.probe(key, 7, -1000, 1000, val, move);
    assert(hit);
    assert(val == 350);
    assert(move == 35);

    std::cout << "PASSED\n";
}

void test_transposition_table_multithreaded_stress() {
    std::cout << "[Test 8] Testing Lock-Free Multi-Threaded TT Stress Test (8 Threads)... ";
    TranspositionTable tt(8);
    const int NUM_THREADS = 8;
    const int OPS_PER_THREAD = 100000;
    std::atomic<bool> start_flag{false};
    std::atomic<int> corruption_count{0};

    auto worker = [&](int tid) {
        while (!start_flag.load(std::memory_order_relaxed)) {}

        uint64_t lcg = 1234567ULL + tid * 99991ULL;
        for (int i = 0; i < OPS_PER_THREAD; ++i) {
            lcg = lcg * 6364136223846793005ULL + 1ULL;
            uint64_t key = lcg;
            int depth = (lcg >> 16) % 12 + 1;
            int val = static_cast<int>((lcg >> 32) % 20001ULL) - 10000;
            int best_move = (lcg >> 48) % 64;
            BoundType bound = static_cast<BoundType>((lcg >> 8) % 3);

            tt.store(key, depth, val, bound, best_move);

            int out_val = 0;
            int out_move = -1;
            bool hit = tt.probe(key, depth, val - 1, val + 1, out_val, out_move);
            if (hit) {
                if (out_val < -10000 || out_val > 10000 || (out_move < 0 || out_move > 63)) {
                    corruption_count.fetch_add(1, std::memory_order_relaxed);
                }
            }
        }
    };

    std::vector<std::thread> threads;
    threads.reserve(NUM_THREADS);
    for (int i = 0; i < NUM_THREADS; ++i) {
        threads.emplace_back(worker, i);
    }

    start_flag.store(true, std::memory_order_release);
    for (auto& t : threads) {
        t.join();
    }

    assert(corruption_count.load() == 0);
    std::cout << "PASSED (0 Corrupted Reads in " << (NUM_THREADS * OPS_PER_THREAD) << " ops)\n";
}

void test_evaluation_symmetry_and_exactness() {
    std::cout << "[Test 9] Testing Evaluation Function (Symmetry & Terminal Exactness)... ";

    // 1. Initial board symmetry: eval(initial) == 0
    Board initial;
    int init_score = evaluate(initial);
    assert(init_score == 0);

    // 2. Color-swapped symmetry on 50 positions reached through game play
    uint64_t seed = 42;
    for (int game = 0; game < 50; ++game) {
        Board b;
        for (int ply = 0; ply < 15; ++ply) {
            std::vector<int> moves = b.get_legal_moves_list();
            if (moves.empty()) {
                if (b.is_terminal()) break;
                b.pass();
                moves = b.get_legal_moves_list();
                if (moves.empty()) break;
            }
            seed = seed * 6364136223846793005ULL + 1ULL;
            int chosen = moves[seed % moves.size()];
            b.make_move(chosen);

            // Test strict negamax symmetry on current state
            Board swapped(b.opp, b.me, opponent(b.turn));
            int eval_normal = evaluate(b);
            int eval_swapped = evaluate(swapped);
            assert(eval_normal == -eval_swapped);
        }
    }

    // 3. Terminal exactness test:
    // Full board with 40 Black, 24 White (diff = +16 for Black)
    uint64_t b_discs = 0x000000FFFFFFFFFFULL; // 40 bits set
    uint64_t w_discs = ~b_discs;              // 24 bits set
    Board terminal_board(b_discs, w_discs, Color::BLACK);
    assert(terminal_board.is_terminal());
    assert(terminal_board.my_disc_count() == 40);
    assert(terminal_board.opp_disc_count() == 24);
    int term_score = evaluate(terminal_board);
    assert(term_score == TERMINAL_WIN_BASE + 16);

    // Swap sides -> must be exact loss
    Board terminal_opp(w_discs, b_discs, Color::WHITE);
    int term_opp_score = evaluate(terminal_opp);
    assert(term_opp_score == -TERMINAL_WIN_BASE - 16);

    std::cout << "PASSED\n";
}

int main() {
    std::cout << "======================================================\n";
    std::cout << "  Parallel Alpha-Beta Othello Engine: Phase 1 & 2 Tests\n";
    std::cout << "======================================================\n";

    test_initial_state();
    test_move_execution_and_flips();
    test_multi_directional_flips();
    test_perft();
    test_zobrist_incremental_vs_scratch();
    test_transposition_table_round_trip();
    test_transposition_table_bounds_and_replacement();
    test_transposition_table_multithreaded_stress();
    test_evaluation_symmetry_and_exactness();

    std::cout << "======================================================\n";
    std::cout << "  ALL PHASE 1 & 2 TESTS PASSED (100% SUCCESS)          \n";
    std::cout << "======================================================\n";
    return 0;
}
