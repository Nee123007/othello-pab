#include "search_seq.hpp"
#include "eval.hpp"
#include "zobrist.hpp"
#include <chrono>
#include <algorithm>
#include <cstring>

namespace othello {

namespace {

constexpr int INF = 1000000;

// Internal recursive Negamax for B1 (Minimax without pruning)
int negamax_b1_internal(Board board, int depth, SearchStats& stats, bool passed) {
    stats.nodes.fetch_add(1, std::memory_order_relaxed);

    if (depth == 0 || board.is_terminal()) {
        return evaluate(board);
    }

    uint64_t moves_bb = board.get_legal_moves();
    if (moves_bb == 0) {
        if (passed) return evaluate(board); // Terminal double pass
        Board next = board;
        next.pass();
        return -negamax_b1_internal(next, depth - 1, stats, true);
    }

    int max_val = -INF;
    while (moves_bb) {
        int sq = __builtin_ctzll(moves_bb);
        Board next = board;
        next.make_move(sq);
        int val = -negamax_b1_internal(next, depth - 1, stats, false);
        if (val > max_val) {
            max_val = val;
        }
        moves_bb &= moves_bb - 1;
    }

    return max_val;
}

// Internal recursive Negamax for B2 (Alpha-Beta pruning)
int negamax_b2_internal(Board board,
                        int depth,
                        int alpha,
                        int beta,
                        TranspositionTable* tt,
                        uint32_t history[2][64],
                        SearchStats& stats,
                        bool use_tt,
                        bool use_ordering,
                        OrderMode order_mode,
                        bool passed) {
    stats.nodes.fetch_add(1, std::memory_order_relaxed);

    if (depth == 0 || board.is_terminal()) {
        return evaluate(board);
    }

    uint64_t hash = 0;
    int tt_val = 0;
    int tt_move = -1;

    if (use_tt && tt) {
        hash = g_zobrist.compute_hash(board);
        if (tt->probe(hash, depth, alpha, beta, tt_val, tt_move)) {
            return tt_val;
        }
    }

    uint64_t moves_bb = board.get_legal_moves();
    if (moves_bb == 0) {
        if (passed) return evaluate(board);
        Board next = board;
        next.pass();
        return -negamax_b2_internal(next, depth - 1, -beta, -alpha, tt, history, stats, use_tt, use_ordering, order_mode, true);
    }

    std::vector<int> moves = board.get_legal_moves_list();
    if (use_ordering) {
        MoveOrdering::order(board, moves, tt_move, history, order_mode);
    }

    int orig_alpha = alpha;
    int best_val = -INF;
    int best_sq = moves[0];

    for (int sq : moves) {
        Board next = board;
        next.make_move(sq);
        int val = -negamax_b2_internal(next, depth - 1, -beta, -alpha, tt, history, stats, use_tt, use_ordering, order_mode, false);

        if (val > best_val) {
            best_val = val;
            best_sq = sq;
        }
        if (val > alpha) {
            alpha = val;
        }
        if (alpha >= beta) {
            if (history) {
                history[static_cast<int>(board.turn)][sq] += depth * depth;
            }
            break; // Beta-cutoff
        }
    }

    if (use_tt && tt) {
        BoundType bound = BoundType::EXACT;
        if (best_val <= orig_alpha) bound = BoundType::UPPER;
        else if (best_val >= beta) bound = BoundType::LOWER;
        tt->store(hash, depth, best_val, bound, best_sq);
    }

    return best_val;
}

} // anonymous namespace

int search_b0_random(const Board& board, SearchStats& stats, uint64_t seed) {
    auto t0 = std::chrono::high_resolution_clock::now();
    stats.reset();

    std::vector<int> moves = board.get_legal_moves_list();
    if (moves.empty()) {
        stats.best_move = -1;
        stats.value = 0;
        return -1;
    }

    int chosen = moves[seed % moves.size()];
    stats.best_move = chosen;
    stats.value = 0;
    stats.nodes = 1;

    auto t1 = std::chrono::high_resolution_clock::now();
    stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return chosen;
}

int search_b0_greedy(const Board& board, SearchStats& stats) {
    auto t0 = std::chrono::high_resolution_clock::now();
    stats.reset();

    std::vector<int> moves = board.get_legal_moves_list();
    if (moves.empty()) {
        stats.best_move = -1;
        stats.value = 0;
        return -1;
    }

    int best_sq = moves[0];
    int max_flips = -1;

    for (int sq : moves) {
        int flips = __builtin_popcountll(board.compute_flips(sq));
        if (flips > max_flips) {
            max_flips = flips;
            best_sq = sq;
        }
    }

    stats.best_move = best_sq;
    stats.value = max_flips;
    stats.nodes = moves.size();

    auto t1 = std::chrono::high_resolution_clock::now();
    stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return best_sq;
}

int search_b1_minimax(Board board, int depth, SearchStats& stats) {
    auto t0 = std::chrono::high_resolution_clock::now();
    stats.reset();
    stats.depth = depth;

    std::vector<int> moves = board.get_legal_moves_list();
    if (moves.empty()) {
        stats.best_move = -1;
        stats.value = evaluate(board);
        return -1;
    }

    int best_sq = moves[0];
    int best_val = -INF;

    for (int sq : moves) {
        Board next = board;
        next.make_move(sq);
        int val = -negamax_b1_internal(next, depth - 1, stats, false);
        if (val > best_val) {
            best_val = val;
            best_sq = sq;
        }
    }

    stats.best_move = best_sq;
    stats.value = best_val;

    auto t1 = std::chrono::high_resolution_clock::now();
    stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return best_sq;
}

int search_b2_alphabeta(Board board,
                        int depth,
                        TranspositionTable* tt,
                        SearchStats& stats,
                        bool use_tt,
                        bool use_ordering,
                        OrderMode order_mode) {
    auto t0 = std::chrono::high_resolution_clock::now();
    stats.reset();
    stats.depth = depth;

    std::vector<int> moves = board.get_legal_moves_list();
    if (moves.empty()) {
        stats.best_move = -1;
        stats.value = evaluate(board);
        return -1;
    }

    uint32_t history[2][64] = {{0}};
    int overall_best_move = moves[0];
    int overall_best_val = -INF;

    // Iterative Deepening from depth 1 to target depth
    for (int d = 1; d <= depth; ++d) {
        int alpha = -INF;
        int beta = INF;
        int d_best_move = moves[0];
        int d_best_val = -INF;

        // Order root moves, placing previous iteration's best move first
        if (use_ordering) {
            MoveOrdering::order(board, moves, overall_best_move, history, order_mode);
        }

        for (int sq : moves) {
            Board next = board;
            next.make_move(sq);
            int val = -negamax_b2_internal(next, d - 1, -beta, -alpha, tt, history, stats, use_tt, use_ordering, order_mode, false);

            if (val > d_best_val) {
                d_best_val = val;
                d_best_move = sq;
            }
            if (val > alpha) {
                alpha = val;
            }
        }

        overall_best_move = d_best_move;
        overall_best_val = d_best_val;

        // Update root state in TT
        if (use_tt && tt) {
            uint64_t root_hash = g_zobrist.compute_hash(board);
            tt->store(root_hash, d, overall_best_val, BoundType::EXACT, overall_best_move);
        }
    }

    stats.best_move = overall_best_move;
    stats.value = overall_best_val;

    auto t1 = std::chrono::high_resolution_clock::now();
    stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return overall_best_move;
}

} // namespace othello
