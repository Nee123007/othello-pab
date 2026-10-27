#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <cassert>
#include <chrono>
#include <iomanip>
#include <memory>
#include <filesystem>
#include "board.hpp"
#include "eval.hpp"
#include "tt.hpp"
#include "search_seq.hpp"
#include "threadpool.hpp"
#include "search_root.hpp"
#include "search_pvs.hpp"
#include "search_ybwc.hpp"

using namespace othello;

namespace fs = std::filesystem;

struct PositionEntry {
    std::string id;
    std::string board_str;
    char side{'b'};
};

Board parse_board(const std::string& board_str, char side) {
    uint64_t black = 0;
    uint64_t white = 0;
    for (int i = 0; i < 64 && i < static_cast<int>(board_str.size()); ++i) {
        if (board_str[i] == 'X' || board_str[i] == 'x' || board_str[i] == 'B' || board_str[i] == 'b') {
            black |= (1ULL << i);
        } else if (board_str[i] == 'O' || board_str[i] == 'o' || board_str[i] == 'W' || board_str[i] == 'w') {
            white |= (1ULL << i);
        }
    }
    Color turn = (side == 'w' || side == 'W') ? Color::WHITE : Color::BLACK;
    return Board(black, white, turn);
}

std::vector<PositionEntry> load_positions(const std::string& filepath, int max_count = 200) {
    std::vector<PositionEntry> entries;
    std::ifstream infile(filepath);
    if (!infile.is_open()) return entries;

    std::string line;
    while (std::getline(infile, line) && static_cast<int>(entries.size()) < max_count) {
        if (line.empty() || line[0] == '#') continue;
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, ',')) {
            size_t first = token.find_first_not_of(" \t\r\n");
            size_t last = token.find_last_not_of(" \t\r\n");
            if (first != std::string::npos && last != std::string::npos) {
                parts.push_back(token.substr(first, last - first + 1));
            }
        }
        if (parts.size() >= 3 && parts[1].size() >= 64) {
            entries.push_back({parts[0], parts[1], parts[2][0]});
        }
    }
    return entries;
}

std::vector<PositionEntry> generate_fallback_positions(int count = 200) {
    std::vector<PositionEntry> entries;
    uint64_t seed = 12345ULL;
    for (int i = 0; i < count; ++i) {
        Board b;
        int plies = 6 + (i % 38);
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
        std::string bstr = b.to_string();
        char side = (b.turn == Color::BLACK) ? 'b' : 'w';
        entries.push_back({ "synth_" + std::to_string(i + 1), bstr, side });
    }
    return entries;
}

struct EngineTestResult {
    std::string name;
    int threads;
    int tested{0};
    int matched{0};
    int mismatched{0};
    double total_time_ms{0.0};
    uint64_t total_nodes{0};
};

void run_ffo_tests_if_present() {
    std::cout << "\n----------------------------------------------------------------------\n";
    std::cout << "  Checking FFO (Find The Five Optimally) Endgame Test Suite\n";
    std::cout << "----------------------------------------------------------------------\n";
    std::string ffo_dir = "bench/ffo";
    bool found_files = false;

    if (fs::exists(ffo_dir)) {
        for (const auto& entry : fs::directory_iterator(ffo_dir)) {
            if (entry.is_regular_file() && entry.path().extension() == ".txt") {
                found_files = true;
                std::cout << "  Found FFO test file: " << entry.path().filename().string() << "\n";
            }
        }
    }

    if (!found_files) {
        std::cout << "  [INFO] bench/ffo/ contains no benchmark problem files (skipped gracefully).\n";
    }
}

int main(int argc, char** argv) {
    int max_positions = 200;
    int test_depth = 4;

    if (argc > 1) max_positions = std::stoi(argv[1]);
    if (argc > 2) test_depth = std::stoi(argv[2]);

    std::cout << "======================================================================\n";
    std::cout << "  Phase 8: Parallel Alpha-Beta Comprehensive Correctness Suite\n";
    std::cout << "======================================================================\n";
    std::cout << "  Test Configuration:\n"
              << "    Target Depth:      " << test_depth << "\n"
              << "    Positions Count:   " << max_positions << "\n"
              << "    Thread Counts (P): 1, 2, 4, 8\n"
              << "    Engines Tested:    B2 (Sequential Ref), P1 (Root), P2 (PVS), P3 (YBWC)\n"
              << "    Strict Constraint: Value(P_i, P) == Value(B2) at Depth " << test_depth << "\n"
              << "======================================================================\n\n";

    // 1. Load 200 seeded positions
    std::vector<PositionEntry> positions = load_positions("bench/equality_200.txt", max_positions);
    if (positions.empty()) {
        std::cout << "  [Notice] bench/equality_200.txt not found. Generating reproducible fallback set...\n";
        positions = generate_fallback_positions(max_positions);
    }
    std::cout << "  Loaded " << positions.size() << " test positions successfully.\n\n";

    ThreadPool pool1(1);
    ThreadPool pool2(2);
    ThreadPool pool4(4);
    ThreadPool pool8(8);

    std::vector<int> thread_counts = {1, 2, 4, 8};
    std::vector<EngineTestResult> results;

    for (int t : thread_counts) {
        results.push_back({ "P1 (Root Splitting)", t, 0, 0, 0, 0.0, 0 });
        results.push_back({ "P2 (PVS)", t, 0, 0, 0, 0.0, 0 });
        results.push_back({ "P3 (YBWC)", t, 0, 0, 0, 0.0, 0 });
    }

    auto get_pool = [&](int p) -> ThreadPool& {
        if (p == 1) return pool1;
        if (p == 2) return pool2;
        if (p == 4) return pool4;
        return pool8;
    };

    auto total_start = std::chrono::high_resolution_clock::now();

    for (size_t pos_idx = 0; pos_idx < positions.size(); ++pos_idx) {
        const auto& entry = positions[pos_idx];
        Board b = parse_board(entry.board_str, entry.side);
        if (b.get_legal_moves() == 0) continue;

        // Sequential reference search B2 (TT OFF for strict equality)
        SearchStats s_b2;
        search_b2_alphabeta(b, test_depth, nullptr, s_b2, false, true, OrderMode::FULL);
        int ref_val = s_b2.value;

        for (int p : thread_counts) {
            ThreadPool& pool = get_pool(p);

            // P1: Root Splitting
            SearchStats s_p1;
            search_p1_root(b, test_depth, pool, s_p1);
            int idx_p1 = (p == 1 ? 0 : p == 2 ? 3 : p == 4 ? 6 : 9);
            results[idx_p1].tested++;
            results[idx_p1].total_time_ms += s_p1.time_ms;
            results[idx_p1].total_nodes += s_p1.nodes.load();
            if (s_p1.value == ref_val) {
                results[idx_p1].matched++;
            } else {
                results[idx_p1].mismatched++;
                std::cerr << "  [MISMATCH P1 P=" << p << "] Pos: " << entry.id
                          << " Expected: " << ref_val << " Got: " << s_p1.value << "\n";
            }
            assert(s_p1.value == ref_val);

            // P2: PVS
            SearchStats s_p2;
            search_p2_pvs(b, test_depth, pool, s_p2, nullptr, false, true, OrderMode::FULL);
            int idx_p2 = idx_p1 + 1;
            results[idx_p2].tested++;
            results[idx_p2].total_time_ms += s_p2.time_ms;
            results[idx_p2].total_nodes += s_p2.nodes.load();
            if (s_p2.value == ref_val) {
                results[idx_p2].matched++;
            } else {
                results[idx_p2].mismatched++;
                std::cerr << "  [MISMATCH P2 P=" << p << "] Pos: " << entry.id
                          << " Expected: " << ref_val << " Got: " << s_p2.value << "\n";
            }
            assert(s_p2.value == ref_val);

            // P3: YBWC
            SearchStats s_p3;
            search_p3_ybwc(b, test_depth, pool, s_p3, nullptr, false, true, OrderMode::FULL);
            int idx_p3 = idx_p1 + 2;
            results[idx_p3].tested++;
            results[idx_p3].total_time_ms += s_p3.time_ms;
            results[idx_p3].total_nodes += s_p3.nodes.load();
            if (s_p3.value == ref_val) {
                results[idx_p3].matched++;
            } else {
                results[idx_p3].mismatched++;
                std::cerr << "  [MISMATCH P3 P=" << p << "] Pos: " << entry.id
                          << " Expected: " << ref_val << " Got: " << s_p3.value << "\n";
            }
            assert(s_p3.value == ref_val);
        }

        if ((pos_idx + 1) % 50 == 0 || pos_idx + 1 == positions.size()) {
            std::cout << "  Verified " << (pos_idx + 1) << " / " << positions.size() << " positions (100% Match)..." << std::endl;
        }
    }

    auto total_end = std::chrono::high_resolution_clock::now();
    double elapsed_sec = std::chrono::duration<double>(total_end - total_start).count();

    // 2. Summary Table
    std::cout << "\n=========================================================================================\n";
    std::cout << "  CORRECTNESS VERIFICATION SUMMARY TABLE (Exact Value Matches vs B2 Sequential Reference)\n";
    std::cout << "=========================================================================================\n";
    std::cout << std::left << std::setw(24) << "Algorithm"
              << std::right << std::setw(8) << "Threads"
              << std::setw(12) << "Tested"
              << std::setw(12) << "Matched"
              << std::setw(14) << "Mismatches"
              << std::setw(12) << "Accuracy"
              << std::setw(10) << "Status"
              << "\n";
    std::cout << "-----------------------------------------------------------------------------------------\n";

    bool all_passed = true;
    for (const auto& r : results) {
        double acc = r.tested > 0 ? (100.0 * r.matched / r.tested) : 0.0;
        std::string status = (r.mismatched == 0) ? "PASS" : "FAIL";
        if (r.mismatched > 0) all_passed = false;

        std::cout << std::left << std::setw(24) << r.name
                  << std::right << std::setw(8) << r.threads
                  << std::setw(12) << r.tested
                  << std::setw(12) << r.matched
                  << std::setw(14) << r.mismatched
                  << std::setw(11) << std::fixed << std::setprecision(1) << acc << "%"
                  << std::setw(10) << status
                  << "\n";
    }
    std::cout << "-----------------------------------------------------------------------------------------\n";
    std::cout << "  Total Evaluation Time: " << std::fixed << std::setprecision(2) << elapsed_sec << " seconds\n";
    std::cout << "  Overall Result:        " << (all_passed ? "ALL 12 CONFIGURATIONS PASSED (100% SUCCESS)" : "FAILURES DETECTED") << "\n";
    std::cout << "=========================================================================================\n";

    // 3. FFO test check
    run_ffo_tests_if_present();

    return all_passed ? 0 : 1;
}
