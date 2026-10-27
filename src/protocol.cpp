#include <iostream>
#include <string>
#include <sstream>
#include <fstream>
#include <vector>
#include <chrono>
#include <iomanip>
#include "board.hpp"
#include "eval.hpp"
#include "tt.hpp"
#include "search_seq.hpp"
#include "search_root.hpp"
#include "search_pvs.hpp"
#include "search_ybwc.hpp"
#include "stats.hpp"

namespace othello {

namespace {

Board parse_board_string(const std::string& board_str, char side_char) {
    uint64_t b = 0;
    uint64_t w = 0;
    for (size_t i = 0; i < 64 && i < board_str.size(); ++i) {
        char ch = board_str[i];
        if (ch == 'X' || ch == 'x' || ch == 'B' || ch == 'b' || ch == '1') {
            b |= (1ULL << i);
        } else if (ch == 'O' || ch == 'o' || ch == 'W' || ch == 'w' || ch == '2') {
            w |= (1ULL << i);
        }
    }
    Color turn = (side_char == 'W' || side_char == 'w' || side_char == '2') ? Color::WHITE : Color::BLACK;
    uint64_t me = (turn == Color::BLACK) ? b : w;
    uint64_t opp = (turn == Color::BLACK) ? w : b;
    return Board(me, opp, turn);
}

void execute_go(Board& current_board, TranspositionTable& tt, int depth, const std::string& algo, int threads, OrderMode order_mode) {
    SearchStats stats;
    int move = -1;

    if (algo == "b0_random") {
        move = search_b0_random(current_board, stats);
    } else if (algo == "b0_greedy") {
        move = search_b0_greedy(current_board, stats);
    } else if (algo == "b1" || algo == "minimax") {
        move = search_b1_minimax(current_board, depth, stats);
    } else if (algo == "b2" || algo == "alphabeta") {
        move = search_b2_alphabeta(current_board, depth, &tt, stats, true, true, order_mode);
    } else if (algo == "p1" || algo == "p2" || algo == "p3") {
        ThreadPool pool(threads);
        if (algo == "p1") {
            move = search_p1_root(current_board, depth, pool, stats, order_mode);
        } else if (algo == "p2") {
            move = search_p2_pvs(current_board, depth, pool, stats, &tt, true, true, order_mode);
        } else {
            move = search_p3_ybwc(current_board, depth, pool, stats, &tt, true, true, order_mode);
        }
    } else {
        // Default to B2
        move = search_b2_alphabeta(current_board, depth, &tt, stats, true, true, order_mode);
    }

    std::string coord = Board::square_to_coord(move);
    std::cout << "bestmove " << coord
              << " value " << stats.value
              << " nodes " << stats.nodes.load()
              << " time_ms " << std::fixed << std::setprecision(2) << stats.time_ms
              << " splits " << stats.splits.load()
              << " steals " << stats.steals.load()
              << " cancels " << stats.cancels.load()
              << " idle_us " << stats.idle_time_us.load()
              << " order " << order_mode_to_string(order_mode)
              << "\n" << std::flush;
}

void execute_bench(const std::string& filepath, const std::string& algo, int depth, int threads, OrderMode order_mode, TranspositionTable& tt) {
    std::ifstream infile(filepath);
    if (!infile.is_open()) {
        std::cerr << "Error: Could not open benchmark positions file: " << filepath << "\n";
        return;
    }

    std::cout << "algo,threads,depth,position_id,value,bestmove,nodes,time_ms,splits,steals,cancels,idle_us,order\n" << std::flush;

    std::unique_ptr<ThreadPool> pool;
    if (algo == "p1" || algo == "p2" || algo == "p3") {
        pool = std::make_unique<ThreadPool>(threads);
    }

    std::string line;
    int pos_id = 0;

    while (std::getline(infile, line)) {
        if (line.empty() || line[0] == '#') continue;

        // Parse format: id,board_string,turn or board_string turn
        std::stringstream ss(line);
        std::string part1, part2, part3;
        std::string board_str;
        char side_char = 'b';
        std::string id_str = std::to_string(pos_id++);

        std::vector<std::string> tokens;
        std::string tok;
        while (std::getline(ss, tok, ',')) {
            // Trim whitespace
            size_t first = tok.find_first_not_of(" \t\r\n");
            size_t last = tok.find_last_not_of(" \t\r\n");
            if (first != std::string::npos && last != std::string::npos) {
                tokens.push_back(tok.substr(first, last - first + 1));
            }
        }

        if (tokens.size() >= 3) {
            id_str = tokens[0];
            board_str = tokens[1];
            side_char = tokens[2].empty() ? 'b' : tokens[2][0];
        } else if (tokens.size() == 2) {
            board_str = tokens[0];
            side_char = tokens[1].empty() ? 'b' : tokens[1][0];
        } else {
            // Space delimited fallback
            std::stringstream ss2(line);
            ss2 >> board_str >> side_char;
        }

        if (board_str.size() < 64) continue;

        Board b = parse_board_string(board_str, side_char);
        SearchStats stats;
        int move = -1;

        if (algo == "b0_random") {
            move = search_b0_random(b, stats);
        } else if (algo == "b0_greedy") {
            move = search_b0_greedy(b, stats);
        } else if (algo == "b1") {
            move = search_b1_minimax(b, depth, stats);
        } else if (algo == "b2") {
            tt.clear();
            move = search_b2_alphabeta(b, depth, &tt, stats, true, true, order_mode);
        } else if (pool) {
            pool->reset_stats();
            if (algo == "p1") move = search_p1_root(b, depth, *pool, stats, order_mode);
            else if (algo == "p2") move = search_p2_pvs(b, depth, *pool, stats, &tt, true, true, order_mode);
            else move = search_p3_ybwc(b, depth, *pool, stats, &tt, true, true, order_mode);
        }

        std::string move_coord = Board::square_to_coord(move);
        std::cout << algo << ","
                  << threads << ","
                  << depth << ","
                  << id_str << ","
                  << stats.value << ","
                  << move_coord << ","
                  << stats.nodes.load() << ","
                  << std::fixed << std::setprecision(2) << stats.time_ms << ","
                  << stats.splits.load() << ","
                  << stats.steals.load() << ","
                  << stats.cancels.load() << ","
                  << stats.idle_time_us.load() << ","
                  << order_mode_to_string(order_mode)
                  << "\n" << std::flush;
    }
}

} // anonymous namespace

void run_protocol(int argc, char* argv[]) {
    OrderMode default_order = OrderMode::FULL;
    for (int i = 1; i < argc; ++i) {
        if (!argv[i]) continue;
        std::string arg = argv[i];
        if (arg.rfind("--order=", 0) == 0) {
            default_order = parse_order_mode(arg.substr(8));
        }
    }

    Board current_board;
    TranspositionTable tt(16); // 16 MB default table

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        std::stringstream ss(line);
        std::string cmd;
        ss >> cmd;

        if (cmd == "quit" || cmd == "exit") {
            break;
        } else if (cmd == "new") {
            current_board = Board();
            tt.clear();
            std::cout << "readyok\n" << std::flush;
        } else if (cmd == "print") {
            current_board.print();
        } else if (cmd == "play") {
            std::string coord;
            ss >> coord;
            if (coord == "pass") {
                current_board.pass();
                std::cout << "playok\n" << std::flush;
            } else {
                int sq = Board::coord_to_square(coord);
                if (sq >= 0 && current_board.make_move(sq)) {
                    std::cout << "playok\n" << std::flush;
                } else {
                    std::cout << "illegal move\n" << std::flush;
                }
            }
        } else if (cmd == "setboard") {
            std::string board_str;
            char side_char = 'b';
            ss >> board_str >> side_char;
            current_board = parse_board_string(board_str, side_char);
            tt.clear();
            std::cout << "boardok\n" << std::flush;
        } else if (cmd == "perft") {
            int d = 1;
            ss >> d;
            auto t0 = std::chrono::high_resolution_clock::now();
            uint64_t count = perft(current_board, d);
            auto t1 = std::chrono::high_resolution_clock::now();
            double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
            std::cout << "perft " << d << " nodes " << count << " time_ms " << ms << "\n" << std::flush;
        } else if (cmd == "go") {
            int depth = 6;
            std::string algo = "b2";
            int threads = 1;
            OrderMode order_mode = default_order;

            std::string key;
            while (ss >> key) {
                if (key == "depth") {
                    ss >> depth;
                } else if (key == "algo") {
                    ss >> algo;
                } else if (key == "threads") {
                    ss >> threads;
                } else if (key == "order") {
                    std::string om;
                    ss >> om;
                    order_mode = parse_order_mode(om);
                }
            }

            execute_go(current_board, tt, depth, algo, threads, order_mode);
        } else if (cmd == "bench") {
            std::string filepath;
            std::string algo = "b2";
            int depth = 6;
            int threads = 1;
            std::string order_str;

            ss >> filepath >> algo >> depth >> threads;
            OrderMode order_mode = default_order;
            if (ss >> order_str) {
                order_mode = parse_order_mode(order_str);
            }
            execute_bench(filepath, algo, depth, threads, order_mode, tt);
        } else {
            std::cout << "unknown command: " << cmd << "\n" << std::flush;
        }
    }
}

void run_protocol() {
    run_protocol(0, nullptr);
}

} // namespace othello
