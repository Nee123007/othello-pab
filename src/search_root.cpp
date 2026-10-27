#include "search_root.hpp"
#include "search_seq.hpp"
#include "eval.hpp"
#include <chrono>
#include <vector>

namespace othello {

namespace {

struct MoveResult {
    int sq{-1};
    int score{-INF};
    uint64_t nodes{0};
};

} // anonymous namespace

int search_p1_root(Board board, int depth, ThreadPool& pool, SearchStats& stats) {
    auto t0 = std::chrono::high_resolution_clock::now();
    stats.reset();
    stats.depth = depth;

    std::vector<int> moves = board.get_legal_moves_list();
    if (moves.empty()) {
        stats.best_move = -1;
        stats.value = evaluate(board);
        return -1;
    }

    // Root move ordering
    MoveOrdering::order(board, moves, -1, nullptr, OrderMode::FULL);

    std::vector<MoveResult> results(moves.size());
    size_t num_workers = pool.size();

    // Dispatch each root move to thread pool as independent search with full window
    for (size_t i = 0; i < moves.size(); ++i) {
        int sq = moves[i];
        size_t target_worker = i % num_workers;

        pool.submit([&results, i, sq, board, depth]() {
            Board next = board;
            next.make_move(sq);

            SearchStats sub_stats;
            // Independent alpha-beta search with full (-INF, INF) window:
            // No shared atomic pruning between workers (pure naive Root Splitting)
            int val = -negamax_b2_internal(next, depth - 1, -INF, INF, nullptr, nullptr, sub_stats, false, true, OrderMode::FULL, false);

            results[i].sq = sq;
            results[i].score = val;
            results[i].nodes = sub_stats.nodes.load();
        }, target_worker);
    }

    // Wait for all root workers to complete
    pool.wait_all();

    // Select the best move and sum total nodes across all threads
    int best_val = -INF;
    int best_sq = moves[0];
    uint64_t total_nodes = 0;

    for (size_t i = 0; i < results.size(); ++i) {
        total_nodes += results[i].nodes;
        if (results[i].score > best_val) {
            best_val = results[i].score;
            best_sq = results[i].sq;
        }
    }

    stats.best_move = best_sq;
    stats.value = best_val;
    stats.nodes = total_nodes;

    auto t1 = std::chrono::high_resolution_clock::now();
    stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return best_sq;
}

} // namespace othello
