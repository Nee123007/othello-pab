#include "protocol.hpp"
#include <iostream>
#include <string>
#include <sstream>
#include <fstream>
#include <vector>
#include <chrono>
#include <iomanip>
#include <memory>
#include <mutex>
#include <thread>
#include <atomic>
#include <cstdio>
#include <cctype>
#include "board.hpp"
#include "eval.hpp"
#include "tt.hpp"
#include "zobrist.hpp"
#include "search_seq.hpp"
#include "search_root.hpp"
#include "search_pvs.hpp"
#include "search_ybwc.hpp"
#include "stats.hpp"
#include "threadpool.hpp"

namespace othello {

std::string format_hex64(uint64_t val) {
    char buf[20];
    std::snprintf(buf, sizeof(buf), "0x%016llx", static_cast<unsigned long long>(val));
    return std::string(buf);
}

std::string format_legal_json(const std::vector<int>& legal) {
    std::string s = "{\"type\":\"legal\",\"legal\":[";
    for (size_t i = 0; i < legal.size(); ++i) {
        if (i > 0) s += ",";
        s += std::to_string(legal[i]);
    }
    s += "]}";
    return s;
}

std::string format_state_json(const Board& board, int last_move, const std::vector<int>& flipped) {
    uint64_t black_bb = (board.turn == Color::BLACK) ? board.me : board.opp;
    uint64_t white_bb = (board.turn == Color::BLACK) ? board.opp : board.me;
    int black_score = __builtin_popcountll(black_bb);
    int white_score = __builtin_popcountll(white_bb);

    std::vector<int> legal = board.get_legal_moves_list();

    std::string status = "playing";
    if (board.is_terminal()) {
        status = "gameover";
    } else if (legal.empty()) {
        status = "passed";
    }

    std::string s = "{";
    s += "\"type\":\"state\",";
    s += "\"black\":\"" + format_hex64(black_bb) + "\",";
    s += "\"white\":\"" + format_hex64(white_bb) + "\",";
    s += "\"turn\":\"" + std::string(board.turn == Color::BLACK ? "black" : "white") + "\",";

    s += "\"legal\":[";
    for (size_t i = 0; i < legal.size(); ++i) {
        if (i > 0) s += ",";
        s += std::to_string(legal[i]);
    }
    s += "],";

    if (last_move >= 0) {
        s += "\"lastMove\":" + std::to_string(last_move) + ",";
    } else {
        s += "\"lastMove\":null,";
    }

    s += "\"flipped\":[";
    for (size_t i = 0; i < flipped.size(); ++i) {
        if (i > 0) s += ",";
        s += std::to_string(flipped[i]);
    }
    s += "],";

    s += "\"score\":{\"black\":" + std::to_string(black_score) + ",\"white\":" + std::to_string(white_score) + "},";
    s += "\"status\":\"" + status + "\"";
    s += "}";
    return s;
}

namespace {

std::mutex g_cout_mtx;

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

std::unique_ptr<ThreadPool> s_pool;
ThreadPool& get_pool(size_t threads) {
    if (!s_pool || s_pool->size() != threads) {
        s_pool = std::make_unique<ThreadPool>(threads);
    }
    return *s_pool;
}

std::vector<int> extract_pv(const Board& board, TranspositionTable* tt, int root_best_move, int max_depth) {
    std::vector<int> pv;
    if (root_best_move >= 0 && root_best_move < 64) {
        pv.push_back(root_best_move);
    }
    if (!tt) return pv;
    Board b = board;
    if (!pv.empty()) {
        if (!(b.get_legal_moves() & (1ULL << pv[0]))) return pv;
        b.make_move(pv[0]);
    }
    for (int step = 1; step < max_depth && step < 16; ++step) {
        uint64_t h = g_zobrist.compute_hash(b);
        int val = 0, m = -1;
        if (tt->probe(h, 0, -INF, INF, val, m) && m >= 0 && m < 64) {
            if (b.get_legal_moves() & (1ULL << m)) {
                pv.push_back(m);
                b.make_move(m);
            } else break;
        } else break;
    }
    return pv;
}

std::string format_info_json(int depth, uint64_t nodes, uint64_t nps, int value,
                             const std::vector<int>& pv, double elapsed_ms,
                             ThreadPool* pool, int threads,
                             uint64_t splits, uint64_t steals, uint64_t cancels) {
    std::string s = "{";
    s += "\"type\":\"info\",";
    s += "\"depth\":" + std::to_string(depth) + ",";
    s += "\"nodes\":" + std::to_string(nodes) + ",";
    s += "\"nps\":" + std::to_string(nps) + ",";
    s += "\"value\":" + std::to_string(value) + ",";

    s += "\"pv\":[";
    for (size_t i = 0; i < pv.size(); ++i) {
        if (i > 0) s += ",";
        s += std::to_string(pv[i]);
    }
    s += "],";

    s += "\"elapsedMs\":" + std::to_string(static_cast<uint64_t>(elapsed_ms)) + ",";

    s += "\"threads\":[";
    int num_threads = std::max(1, threads);
    for (int i = 0; i < num_threads; ++i) {
        if (i > 0) s += ",";
        uint64_t t_nodes = 0;
        std::string state_str = "idle";
        if (pool && static_cast<size_t>(i) < pool->size()) {
            t_nodes = pool->get_worker_nodes(i);
            WorkerState ws = pool->get_worker_state(i);
            if (ws == WorkerState::BUSY) state_str = "busy";
            else if (ws == WorkerState::STEALING) state_str = "stealing";
            else state_str = "idle";
        } else if (i == 0) {
            t_nodes = nodes;
            state_str = "busy";
        }
        s += "{\"id\":" + std::to_string(i) + ",\"nodes\":" + std::to_string(t_nodes) + ",\"state\":\"" + state_str + "\"}";
    }
    s += "],";

    s += "\"splits\":" + std::to_string(splits) + ",";
    s += "\"steals\":" + std::to_string(steals) + ",";
    s += "\"cancels\":" + std::to_string(cancels);
    s += "}";
    return s;
}

std::string format_bestmove_json(int sq, int value, uint64_t nodes, double time_ms) {
    std::string s = "{";
    s += "\"type\":\"bestmove\",";
    s += "\"sq\":" + std::to_string(sq) + ",";
    s += "\"value\":" + std::to_string(value) + ",";
    s += "\"nodes\":" + std::to_string(nodes) + ",";
    s += "\"timeMs\":" + std::to_string(static_cast<uint64_t>(time_ms));
    s += "}";
    return s;
}

std::string format_evalbreakdown_json(const Board& board) {
    EvalBreakdown eb = get_eval_breakdown(board);
    std::string s = "{";
    s += "\"type\":\"evalbreakdown\",";
    s += "\"phase\":\"" + eb.phase + "\",";
    s += "\"terms\":{";
    s += "\"mobility\":" + std::to_string(eb.mobility) + ",";
    s += "\"corners\":" + std::to_string(eb.corners) + ",";
    s += "\"positional\":" + std::to_string(eb.positional) + ",";
    s += "\"stability\":" + std::to_string(eb.stability) + ",";
    s += "\"discs\":" + std::to_string(eb.discs);
    s += "},";
    s += "\"total\":" + std::to_string(eb.total);
    s += "}";
    return s;
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
        ThreadPool& pool = get_pool(threads);
        pool.reset_stats();
        if (algo == "p1") {
            move = search_p1_root(current_board, depth, pool, stats, order_mode);
        } else if (algo == "p2") {
            move = search_p2_pvs(current_board, depth, pool, stats, &tt, true, true, order_mode);
        } else {
            move = search_p3_ybwc(current_board, depth, pool, stats, &tt, true, true, order_mode);
        }
    } else {
        move = search_b2_alphabeta(current_board, depth, &tt, stats, true, true, order_mode);
    }

    std::string coord = Board::square_to_coord(move);
    std::lock_guard<std::mutex> lk(g_cout_mtx);
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

    ThreadPool* pool = nullptr;
    if (algo == "p1" || algo == "p2" || algo == "p3") {
        pool = &get_pool(threads);
    }

    std::string line;
    int pos_id = 0;

    while (std::getline(infile, line)) {
        if (line.empty() || line[0] == '#') continue;

        std::stringstream ss(line);
        std::string board_str;
        char side_char = 'b';
        std::string id_str = std::to_string(pos_id++);

        std::vector<std::string> tokens;
        std::string tok;
        while (std::getline(ss, tok, ',')) {
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
    bool json_mode = false;
    OrderMode default_order = OrderMode::FULL;

    for (int i = 1; i < argc; ++i) {
        if (!argv[i]) continue;
        std::string arg = argv[i];
        if (arg == "--json") {
            json_mode = true;
        } else if (arg.rfind("--order=", 0) == 0) {
            default_order = parse_order_mode(arg.substr(8));
        }
    }

    Board current_board;
    TranspositionTable tt(16); // 16 MB default table
    std::vector<Board> board_history;
    int last_move = -1;
    std::vector<int> last_flipped;

    std::atomic<bool> search_in_progress{false};
    std::thread search_thread;

    auto wait_search_done = [&]() {
        if (search_thread.joinable()) {
            search_thread.join();
        }
    };

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        std::stringstream ss(line);
        std::string cmd;
        ss >> cmd;

        if (cmd == "quit" || cmd == "exit") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();
            break;
        } else if (cmd == "stop") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();
        } else if (cmd == "new") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();
            current_board = Board();
            tt.clear();
            board_history.clear();
            last_move = -1;
            last_flipped.clear();
            if (json_mode) {
                std::lock_guard<std::mutex> lk(g_cout_mtx);
                std::cout << format_state_json(current_board, last_move, last_flipped) << "\n" << std::flush;
            } else {
                std::cout << "readyok\n" << std::flush;
            }
        } else if (cmd == "legal") {
            std::vector<int> legal = current_board.get_legal_moves_list();
            if (json_mode) {
                std::lock_guard<std::mutex> lk(g_cout_mtx);
                std::cout << format_legal_json(legal) << "\n" << std::flush;
            } else {
                for (size_t i = 0; i < legal.size(); ++i) {
                    if (i > 0) std::cout << " ";
                    std::cout << Board::square_to_coord(legal[i]);
                }
                std::cout << "\n" << std::flush;
            }
        } else if (cmd == "print") {
            current_board.print();
        } else if (cmd == "state") {
            if (json_mode) {
                std::lock_guard<std::mutex> lk(g_cout_mtx);
                std::cout << format_state_json(current_board, last_move, last_flipped) << "\n" << std::flush;
            } else {
                current_board.print();
            }
        } else if (cmd == "undo") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();
            if (!board_history.empty()) {
                current_board = board_history.back();
                board_history.pop_back();
                last_move = -1;
                last_flipped.clear();
                if (json_mode) {
                    std::lock_guard<std::mutex> lk(g_cout_mtx);
                    std::cout << format_state_json(current_board, last_move, last_flipped) << "\n" << std::flush;
                } else {
                    std::cout << "undook\n" << std::flush;
                }
            } else {
                if (json_mode) {
                    std::lock_guard<std::mutex> lk(g_cout_mtx);
                    std::cout << "{\"type\":\"error\",\"message\":\"no moves to undo\"}\n" << std::flush;
                } else {
                    std::cout << "error no moves to undo\n" << std::flush;
                }
            }
        } else if (cmd == "eval") {
            if (json_mode) {
                std::lock_guard<std::mutex> lk(g_cout_mtx);
                std::cout << format_evalbreakdown_json(current_board) << "\n" << std::flush;
            } else {
                EvalBreakdown eb = get_eval_breakdown(current_board);
                std::cout << "phase: " << eb.phase
                          << " mobility: " << eb.mobility
                          << " corners: " << eb.corners
                          << " positional: " << eb.positional
                          << " stability: " << eb.stability
                          << " discs: " << eb.discs
                          << " total: " << eb.total
                          << "\n" << std::flush;
            }
        } else if (cmd == "play") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();

            std::string coord;
            ss >> coord;

            if (coord == "pass") {
                if (current_board.get_legal_moves() == 0 && !current_board.is_terminal()) {
                    board_history.push_back(current_board);
                    current_board.pass();
                    last_move = -1;
                    last_flipped.clear();
                    if (json_mode) {
                        std::lock_guard<std::mutex> lk(g_cout_mtx);
                        std::cout << format_state_json(current_board, last_move, last_flipped) << "\n" << std::flush;
                    } else {
                        std::cout << "playok\n" << std::flush;
                    }
                } else {
                    if (json_mode) {
                        std::lock_guard<std::mutex> lk(g_cout_mtx);
                        std::cout << "{\"type\":\"error\",\"message\":\"illegal move: legal moves exist\"}\n" << std::flush;
                    } else {
                        std::cout << "illegal move\n" << std::flush;
                    }
                }
            } else {
                int sq = -1;
                bool is_num = true;
                for (char c : coord) {
                    if (!std::isdigit(static_cast<unsigned char>(c))) {
                        is_num = false;
                        break;
                    }
                }
                if (is_num && !coord.empty()) {
                    sq = std::stoi(coord);
                } else {
                    sq = Board::coord_to_square(coord);
                }

                if (sq >= 0 && sq < 64 && (current_board.get_legal_moves() & (1ULL << sq))) {
                    board_history.push_back(current_board);
                    uint64_t flips_bb = current_board.compute_flips(sq);
                    std::vector<int> flips_list;
                    while (flips_bb) {
                        flips_list.push_back(__builtin_ctzll(flips_bb));
                        flips_bb &= flips_bb - 1;
                    }

                    current_board.make_move(sq);
                    last_move = sq;
                    last_flipped = flips_list;

                    if (json_mode) {
                        std::lock_guard<std::mutex> lk(g_cout_mtx);
                        std::cout << format_state_json(current_board, last_move, last_flipped) << "\n" << std::flush;
                    } else {
                        std::cout << "playok\n" << std::flush;
                    }
                } else {
                    if (json_mode) {
                        std::lock_guard<std::mutex> lk(g_cout_mtx);
                        std::cout << "{\"type\":\"error\",\"message\":\"illegal move\"}\n" << std::flush;
                    } else {
                        std::cout << "illegal move\n" << std::flush;
                    }
                }
            }
        } else if (cmd == "setboard") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();

            std::string board_str;
            char side_char = 'b';
            ss >> board_str >> side_char;
            current_board = parse_board_string(board_str, side_char);
            tt.clear();
            board_history.clear();
            last_move = -1;
            last_flipped.clear();
            if (json_mode) {
                std::lock_guard<std::mutex> lk(g_cout_mtx);
                std::cout << format_state_json(current_board, last_move, last_flipped) << "\n" << std::flush;
            } else {
                std::cout << "boardok\n" << std::flush;
            }
        } else if (cmd == "perft") {
            int d = 1;
            ss >> d;
            auto t0 = std::chrono::high_resolution_clock::now();
            uint64_t count = perft(current_board, d);
            auto t1 = std::chrono::high_resolution_clock::now();
            double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
            std::cout << "perft " << d << " nodes " << count << " time_ms " << ms << "\n" << std::flush;
        } else if (cmd == "go") {
            g_search_stop.store(true, std::memory_order_release);
            wait_search_done();

            int depth = 6;
            std::string algo = "b2";
            int threads = 1;
            int time_ms = 0;
            OrderMode order_mode = default_order;

            std::string key;
            while (ss >> key) {
                if (key == "depth") {
                    ss >> depth;
                } else if (key == "algo") {
                    ss >> algo;
                } else if (key == "threads") {
                    ss >> threads;
                } else if (key == "time" || key == "timeMs") {
                    ss >> time_ms;
                } else if (key == "order") {
                    std::string om;
                    ss >> om;
                    order_mode = parse_order_mode(om);
                }
            }

            if (!json_mode) {
                execute_go(current_board, tt, depth, algo, threads, order_mode);
            } else {
                g_search_stop.store(false, std::memory_order_release);
                search_in_progress.store(true, std::memory_order_release);

                search_thread = std::thread([&current_board, &tt, depth, algo, threads, time_ms, order_mode, &search_in_progress]() {
                    Board b_copy = current_board;
                    SearchStats stats;
                    stats.reset();

                    ThreadPool* pool = nullptr;
                    if (algo == "p1" || algo == "p2" || algo == "p3") {
                        pool = &get_pool(threads);
                        pool->reset_stats();
                    }

                    std::atomic<bool> search_completed{false};
                    auto t_start = std::chrono::steady_clock::now();

                    // Optional timer thread if time_ms > 0
                    std::thread timer_thread;
                    if (time_ms > 0) {
                        timer_thread = std::thread([time_ms, &search_completed]() {
                            auto t0 = std::chrono::steady_clock::now();
                            while (!search_completed.load(std::memory_order_relaxed)) {
                                std::this_thread::sleep_for(std::chrono::milliseconds(5));
                                auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                                    std::chrono::steady_clock::now() - t0).count();
                                if (elapsed >= time_ms) {
                                    g_search_stop.store(true, std::memory_order_release);
                                    break;
                                }
                            }
                        });
                    }

                    // Background info monitor streaming lines every 100ms
                    std::thread monitor_thread([&]() {
                        // Quick initial report after 15 ms
                        for (int k = 0; k < 3 && !search_completed.load(std::memory_order_relaxed); ++k) {
                            std::this_thread::sleep_for(std::chrono::milliseconds(5));
                        }
                        if (!search_completed.load(std::memory_order_relaxed)) {
                            auto now = std::chrono::steady_clock::now();
                            double elapsed = std::chrono::duration<double, std::milli>(now - t_start).count();
                            uint64_t cur_nodes = stats.nodes.load(std::memory_order_relaxed);
                            uint64_t nps = elapsed > 0 ? static_cast<uint64_t>(cur_nodes * 1000.0 / elapsed) : 0;
                            int d = stats.depth > 0 ? stats.depth : 1;
                            int val = stats.value;
                            int root_move = stats.best_move;
                            std::vector<int> pv = extract_pv(b_copy, &tt, root_move, d);
                            uint64_t splits = stats.splits.load(std::memory_order_relaxed);
                            uint64_t steals = stats.steals.load(std::memory_order_relaxed);
                            uint64_t cancels = stats.cancels.load(std::memory_order_relaxed);

                            std::string info_line = format_info_json(d, cur_nodes, nps, val, pv, elapsed,
                                                                     pool, threads, splits, steals, cancels);
                            {
                                std::lock_guard<std::mutex> lk(g_cout_mtx);
                                std::cout << info_line << "\n" << std::flush;
                            }
                        }

                        while (!search_completed.load(std::memory_order_relaxed)) {
                            // Sleep up to 100ms in 10ms intervals for responsive cancellation
                            for (int i = 0; i < 10 && !search_completed.load(std::memory_order_relaxed); ++i) {
                                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                            }
                            if (search_completed.load(std::memory_order_relaxed)) break;

                            auto now = std::chrono::steady_clock::now();
                            double elapsed = std::chrono::duration<double, std::milli>(now - t_start).count();
                            uint64_t cur_nodes = stats.nodes.load(std::memory_order_relaxed);
                            uint64_t nps = elapsed > 0 ? static_cast<uint64_t>(cur_nodes * 1000.0 / elapsed) : 0;
                            int d = stats.depth > 0 ? stats.depth : 1;
                            int val = stats.value;
                            int root_move = stats.best_move;
                            std::vector<int> pv = extract_pv(b_copy, &tt, root_move, d);
                            uint64_t splits = stats.splits.load(std::memory_order_relaxed);
                            uint64_t steals = stats.steals.load(std::memory_order_relaxed);
                            uint64_t cancels = stats.cancels.load(std::memory_order_relaxed);

                            std::string info_line = format_info_json(d, cur_nodes, nps, val, pv, elapsed,
                                                                     pool, threads, splits, steals, cancels);
                            {
                                std::lock_guard<std::mutex> lk(g_cout_mtx);
                                std::cout << info_line << "\n" << std::flush;
                            }
                        }
                    });

                    // Execute algorithm
                    int move = -1;
                    if (algo == "b0_random") {
                        move = search_b0_random(b_copy, stats);
                    } else if (algo == "b0_greedy") {
                        move = search_b0_greedy(b_copy, stats);
                    } else if (algo == "b1" || algo == "minimax") {
                        move = search_b1_minimax(b_copy, depth, stats);
                    } else if (algo == "b2" || algo == "alphabeta") {
                        move = search_b2_alphabeta(b_copy, depth, &tt, stats, true, true, order_mode);
                    } else if (algo == "p1") {
                        move = search_p1_root(b_copy, depth, *pool, stats, order_mode);
                    } else if (algo == "p2") {
                        move = search_p2_pvs(b_copy, depth, *pool, stats, &tt, true, true, order_mode);
                    } else if (algo == "p3") {
                        move = search_p3_ybwc(b_copy, depth, *pool, stats, &tt, true, true, order_mode);
                    } else {
                        move = search_b2_alphabeta(b_copy, depth, &tt, stats, true, true, order_mode);
                    }

                    search_completed.store(true, std::memory_order_release);

                    if (timer_thread.joinable()) timer_thread.join();
                    if (monitor_thread.joinable()) monitor_thread.join();

                    {
                        std::lock_guard<std::mutex> lk(g_cout_mtx);
                        std::cout << format_bestmove_json(move, stats.value, stats.nodes.load(), stats.time_ms)
                                  << "\n" << std::flush;
                    }

                    search_in_progress.store(false, std::memory_order_release);
                });
            }
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
            if (json_mode) {
                std::lock_guard<std::mutex> lk(g_cout_mtx);
                std::cout << "{\"type\":\"error\",\"message\":\"unknown command: " + cmd + "\"}\n" << std::flush;
            } else {
                std::cout << "unknown command: " << cmd << "\n" << std::flush;
            }
        }
    }

    g_search_stop.store(true, std::memory_order_release);
    wait_search_done();
}

void run_protocol() {
    run_protocol(0, nullptr);
}

} // namespace othello
