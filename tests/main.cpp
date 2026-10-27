#include <iostream>
#include <cassert>
#include <chrono>
#include <vector>
#include <thread>
#include <atomic>
#include <iomanip>
#include "board.hpp"
#include "zobrist.hpp"
#include "tt.hpp"
#include "eval.hpp"
#include "search_seq.hpp"
#include "threadpool.hpp"
#include "search_root.hpp"
#include "search_pvs.hpp"
#include "search_ybwc.hpp"

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

    Board initial;
    int init_score = evaluate(initial);
    assert(init_score == 0);

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

            Board swapped(b.opp, b.me, opponent(b.turn));
            int eval_normal = evaluate(b);
            int eval_swapped = evaluate(swapped);
            assert(eval_normal == -eval_swapped);
        }
    }

    uint64_t b_discs = 0x000000FFFFFFFFFFULL;
    uint64_t w_discs = ~b_discs;
    Board terminal_board(b_discs, w_discs, Color::BLACK);
    assert(terminal_board.is_terminal());
    assert(terminal_board.my_disc_count() == 40);
    assert(terminal_board.opp_disc_count() == 24);
    int term_score = evaluate(terminal_board);
    assert(term_score == TERMINAL_WIN_BASE + 16);

    Board terminal_opp(w_discs, b_discs, Color::WHITE);
    int term_opp_score = evaluate(terminal_opp);
    assert(term_opp_score == -TERMINAL_WIN_BASE - 16);

    std::cout << "PASSED\n";
}

void test_b0_random_and_greedy() {
    std::cout << "[Test 10] Testing B0 Random & Greedy Players... ";
    Board b;
    SearchStats s_rnd, s_grd;

    int r_move = search_b0_random(b, s_rnd, 12345);
    assert(r_move >= 0 && r_move < 64);
    assert(s_rnd.nodes == 1);

    int g_move = search_b0_greedy(b, s_grd);
    assert(g_move >= 0 && g_move < 64);
    assert(s_grd.nodes == 4);
    assert(s_grd.value == 1);

    std::cout << "PASSED\n";
}

void test_b1_b2_equality_and_pruning() {
    std::cout << "[Test 11] Testing B1 (Minimax) vs B2 (Alpha-Beta) Value Equality & Pruning Efficiency:\n";
    TranspositionTable tt(16);

    uint64_t seed = 101;
    for (int game = 0; game < 50; ++game) {
        Board b;
        int plies = 4 + (game % 10);
        for (int p = 0; p < plies; ++p) {
            std::vector<int> moves = b.get_legal_moves_list();
            if (moves.empty()) {
                if (b.is_terminal()) break;
                b.pass();
                moves = b.get_legal_moves_list();
                if (moves.empty()) break;
            }
            seed = seed * 6364136223846793005ULL + 1ULL;
            b.make_move(moves[seed % moves.size()]);
        }

        if (b.is_terminal()) continue;

        for (int depth = 1; depth <= 4; ++depth) {
            SearchStats s_b1, s_b2_raw, s_b2_full;
            search_b1_minimax(b, depth, s_b1);

            search_b2_alphabeta(b, depth, nullptr, s_b2_raw, false, false, OrderMode::NONE);
            assert(s_b1.value == s_b2_raw.value);

            tt.clear();
            search_b2_alphabeta(b, depth, &tt, s_b2_full, true, true, OrderMode::FULL);
            assert(s_b1.value == s_b2_full.value);
        }
    }
    std::cout << "  50 Random Positions Equality (Depths 1 to 4): EXACT MATCH\n";

    Board start;
    SearchStats s_minimax, s_alphabeta;
    search_b1_minimax(start, 5, s_minimax);

    tt.clear();
    search_b2_alphabeta(start, 5, &tt, s_alphabeta, true, true, OrderMode::FULL);

    assert(s_minimax.value == s_alphabeta.value);
    uint64_t n_minimax = s_minimax.nodes.load();
    uint64_t n_ab = s_alphabeta.nodes.load();
    double pruning_gain = 1.0 - (static_cast<double>(n_ab) / static_cast<double>(n_minimax));

    std::cout << "  Depth 5 Benchmarks:\n"
              << "    B1 Minimax Nodes:    " << n_minimax << " (" << s_minimax.time_ms << " ms)\n"
              << "    B2 Alpha-Beta Nodes: " << n_ab << " (" << s_alphabeta.time_ms << " ms)\n"
              << "    Value Match:         " << s_alphabeta.value << " == " << s_minimax.value << " (OK)\n"
              << "    Pruning Efficiency:  " << std::fixed << std::setprecision(2) << (pruning_gain * 100.0) << "%\n" << std::flush;

    assert(pruning_gain > 0.50);
    std::cout << "  Pruning Efficiency Assertion: PASSED\n";
}

void test_threadpool_and_p1_root_splitting() {
    std::cout << "[Test 12] Testing ThreadPool & P1 Root Splitting (P = 1, 4, 8):\n";

    // 1. ThreadPool basic concurrency test
    ThreadPool pool(4);
    assert(pool.size() == 4);
    std::atomic<int> counter{0};
    for (int i = 0; i < 100; ++i) {
        pool.submit([&counter]() {
            counter.fetch_add(1, std::memory_order_relaxed);
        }, i % 4);
    }
    pool.wait_all();
    assert(counter.load() == 100);
    std::cout << "  ThreadPool Concurrency & Work-Stealing: PASSED (100 tasks executed)\n";

    // 2. P1 vs B2 Value Equality Test at P=1 and P=4 on 20 positions
    uint64_t seed = 999;
    ThreadPool pool1(1);
    ThreadPool pool4(4);
    ThreadPool pool8(8);

    for (int game = 0; game < 20; ++game) {
        Board b;
        int plies = 6 + (game % 8);
        for (int p = 0; p < plies; ++p) {
            std::vector<int> moves = b.get_legal_moves_list();
            if (moves.empty()) {
                if (b.is_terminal()) break;
                b.pass();
                moves = b.get_legal_moves_list();
                if (moves.empty()) break;
            }
            seed = seed * 6364136223846793005ULL + 1ULL;
            b.make_move(moves[seed % moves.size()]);
        }

        if (b.is_terminal()) continue;

        for (int depth = 2; depth <= 4; ++depth) {
            SearchStats s_b2, s_p1_1, s_p1_4, s_p1_8;

            search_b2_alphabeta(b, depth, nullptr, s_b2, false, true, OrderMode::FULL);
            search_p1_root(b, depth, pool1, s_p1_1);
            search_p1_root(b, depth, pool4, s_p1_4);
            search_p1_root(b, depth, pool8, s_p1_8);

            assert(s_p1_1.value == s_b2.value);
            assert(s_p1_4.value == s_b2.value);
            assert(s_p1_8.value == s_b2.value);
        }
    }
    std::cout << "  P1 Value Equality vs B2 (P=1, P=4, P=8 across 20 positions): EXACT MATCH\n";

    // 3. Performance & Speedup measurement at Depth 6
    Board start;
    SearchStats s_seq, s_par4;
    search_p1_root(start, 6, pool1, s_seq);
    search_p1_root(start, 6, pool4, s_par4);

    assert(s_par4.value == s_seq.value);
    double speedup = s_seq.time_ms / std::max(s_par4.time_ms, 0.01);
    double sop = (static_cast<double>(s_par4.nodes.load()) / static_cast<double>(s_seq.nodes.load())) - 1.0;

    std::cout << "  Depth 6 Root Splitting Metrics:\n"
              << "    Sequential P=1 Time: " << s_seq.time_ms << " ms | Nodes: " << s_seq.nodes.load() << "\n"
              << "    Parallel P=4 Time:   " << s_par4.time_ms << " ms | Nodes: " << s_par4.nodes.load() << "\n"
              << "    Value Match:         " << s_par4.value << " == " << s_seq.value << " (OK)\n"
              << "    Measured Speedup:    " << std::fixed << std::setprecision(2) << speedup << "x\n"
              << "    Search Overhead SOP: +" << std::fixed << std::setprecision(1) << (sop * 100.0) << "%\n";
    std::cout << "  P1 Root Splitting Verification: PASSED\n";
}

void test_p2_pvs() {
    std::cout << "[Test 13] Testing P2 Principal Variation Splitting (PVS) (P = 1, 2, 4):\n";

    ThreadPool pool1(1);
    ThreadPool pool2(2);
    ThreadPool pool4(4);

    // 1. Strict Value Equality against B2 across 50 random game positions at Depths 2, 3, 4
    uint64_t seed = 777;
    for (int game = 0; game < 50; ++game) {
        Board b;
        int plies = 6 + (game % 10);
        for (int p = 0; p < plies; ++p) {
            std::vector<int> moves = b.get_legal_moves_list();
            if (moves.empty()) {
                if (b.is_terminal()) break;
                b.pass();
                moves = b.get_legal_moves_list();
                if (moves.empty()) break;
            }
            seed = seed * 6364136223846793005ULL + 1ULL;
            b.make_move(moves[seed % moves.size()]);
        }

        if (b.is_terminal()) continue;

        for (int depth = 2; depth <= 4; ++depth) {
            SearchStats s_b2, s_p2_1, s_p2_2, s_p2_4;

            search_b2_alphabeta(b, depth, nullptr, s_b2, false, true, OrderMode::FULL);
            search_p2_pvs(b, depth, pool1, s_p2_1, nullptr, false, true, OrderMode::FULL);
            search_p2_pvs(b, depth, pool2, s_p2_2, nullptr, false, true, OrderMode::FULL);
            search_p2_pvs(b, depth, pool4, s_p2_4, nullptr, false, true, OrderMode::FULL);

            assert(s_p2_1.value == s_b2.value);
            assert(s_p2_2.value == s_b2.value);
            assert(s_p2_4.value == s_b2.value);
        }
    }
    std::cout << "  P2 Value Equality vs B2 (P=1, P=2, P=4 across 50 positions): EXACT MATCH\n";

    // 2. Performance & Speedup measurement at Depth 6
    Board start;
    SearchStats s_seq, s_par4;
    search_p2_pvs(start, 6, pool1, s_seq, nullptr, false, true, OrderMode::FULL);
    search_p2_pvs(start, 6, pool4, s_par4, nullptr, false, true, OrderMode::FULL);

    assert(s_par4.value == s_seq.value);
    double speedup = s_seq.time_ms / std::max(s_par4.time_ms, 0.01);
    double sop = (static_cast<double>(s_par4.nodes.load()) / static_cast<double>(s_seq.nodes.load())) - 1.0;

    std::cout << "  Depth 6 P2 PVS Metrics:\n"
              << "    Sequential P=1 Time: " << s_seq.time_ms << " ms | Nodes: " << s_seq.nodes.load() << "\n"
              << "    Parallel P=4 Time:   " << s_par4.time_ms << " ms | Nodes: " << s_par4.nodes.load() << "\n"
              << "    Value Match:         " << s_par4.value << " == " << s_seq.value << " (OK)\n"
              << "    Measured Speedup:    " << std::fixed << std::setprecision(2) << speedup << "x\n"
              << "    Search Overhead SOP: +" << std::fixed << std::setprecision(1) << (sop * 100.0) << "%\n";
    std::cout << "  P2 PVS Verification: PASSED\n";
}

void test_p3_ybwc() {
    std::cout << "[Test 14] Testing P3 Young Brothers Wait Concept (YBWC) (P = 1, 2, 4, 8):\n";

    ThreadPool pool1(1);
    ThreadPool pool2(2);
    ThreadPool pool4(4);
    ThreadPool pool8(8);

    // 1. Strict Value Equality against B2 across 50 random game positions at Depths 2, 3, 4
    uint64_t seed = 888;
    for (int game = 0; game < 50; ++game) {
        Board b;
        int plies = 6 + (game % 10);
        for (int p = 0; p < plies; ++p) {
            std::vector<int> moves = b.get_legal_moves_list();
            if (moves.empty()) {
                if (b.is_terminal()) break;
                b.pass();
                moves = b.get_legal_moves_list();
                if (moves.empty()) break;
            }
            seed = seed * 6364136223846793005ULL + 1ULL;
            b.make_move(moves[seed % moves.size()]);
        }

        if (b.is_terminal()) continue;

        for (int depth = 2; depth <= 4; ++depth) {
            SearchStats s_b2, s_p3_1, s_p3_2, s_p3_4, s_p3_8;

            search_b2_alphabeta(b, depth, nullptr, s_b2, false, true, OrderMode::FULL);
            search_p3_ybwc(b, depth, pool1, s_p3_1, nullptr, false, true, OrderMode::FULL);
            search_p3_ybwc(b, depth, pool2, s_p3_2, nullptr, false, true, OrderMode::FULL);
            search_p3_ybwc(b, depth, pool4, s_p3_4, nullptr, false, true, OrderMode::FULL);
            search_p3_ybwc(b, depth, pool8, s_p3_8, nullptr, false, true, OrderMode::FULL);

            assert(s_p3_1.value == s_b2.value);
            assert(s_p3_2.value == s_b2.value);
            assert(s_p3_4.value == s_b2.value);
            assert(s_p3_8.value == s_b2.value);
        }
    }
    std::cout << "  P3 Value Equality vs B2 (P=1, P=2, P=4, P=8 across 50 positions): EXACT MATCH\n";

    // 2. Performance & Speedup measurement at Depth 6
    Board start;
    SearchStats s_seq, s_par4;
    search_p3_ybwc(start, 6, pool1, s_seq, nullptr, false, true, OrderMode::FULL);
    search_p3_ybwc(start, 6, pool4, s_par4, nullptr, false, true, OrderMode::FULL);

    assert(s_par4.value == s_seq.value);
    double speedup = s_seq.time_ms / std::max(s_par4.time_ms, 0.01);
    double sop = (static_cast<double>(s_par4.nodes.load()) / static_cast<double>(s_seq.nodes.load())) - 1.0;

    std::cout << "  Depth 6 P3 YBWC Metrics:\n"
              << "    Sequential P=1 Time: " << s_seq.time_ms << " ms | Nodes: " << s_seq.nodes.load() << "\n"
              << "    Parallel P=4 Time:   " << s_par4.time_ms << " ms | Nodes: " << s_par4.nodes.load() << "\n"
              << "    Value Match:         " << s_par4.value << " == " << s_seq.value << " (OK)\n"
              << "    Measured Speedup:    " << std::fixed << std::setprecision(2) << speedup << "x\n"
              << "    Search Overhead SOP: +" << std::fixed << std::setprecision(1) << (sop * 100.0) << "%\n";
    std::cout << "  P3 YBWC Verification: PASSED\n";
}

int main() {
    std::cout << "======================================================\n";
    std::cout << "  Parallel Alpha-Beta Othello Engine: Phase 1..7 Tests\n";
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
    test_b0_random_and_greedy();
    test_b1_b2_equality_and_pruning();
    test_threadpool_and_p1_root_splitting();
    test_p2_pvs();
    test_p3_ybwc();

    std::cout << "======================================================\n";
    std::cout << "  ALL PHASE 1..7 UNIT TESTS PASSED (100% SUCCESS)      \n";
    std::cout << "======================================================\n";
    return 0;
}
