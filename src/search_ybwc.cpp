#include "search_ybwc.hpp"
#include "eval.hpp"
#include "zobrist.hpp"
#include "search_seq.hpp"
#include <chrono>
#include <vector>
#include <atomic>
#include <algorithm>
#include <thread>

namespace othello {

namespace {

// Deadlock Prevention Flag:
// Prevents cyclic task-stealing deadlocks (task inversion) by ensuring threads executing
// a parallel child task search sequentially rather than entering nested split-wait loops.
thread_local bool t_is_parallel_worker = false;

int ybwc_internal(Board board,
                  int depth,
                  int alpha,
                  int beta,
                  ThreadPool& pool,
                  TranspositionTable* tt,
                  uint32_t history[2][64],
                  SearchStats& stats,
                  bool use_tt,
                  bool use_ordering,
                  OrderMode order_mode,
                  const std::atomic<bool>* parent_cutoff,
                  bool passed) {
    // 1. Cooperative early cancellation check
    if (parent_cutoff && parent_cutoff->load(std::memory_order_relaxed)) {
        return beta;
    }

    // 2. Leaf or terminal evaluation
    stats.nodes.fetch_add(1, std::memory_order_relaxed);
    if (depth == 0 || board.is_terminal()) {
        return evaluate(board);
    }

    // 3. Transposition table probe
    uint64_t hash = 0;
    int tt_val = 0;
    int tt_move = -1;
    if (use_tt && tt) {
        hash = g_zobrist.compute_hash(board);
        if (tt->probe(hash, depth, alpha, beta, tt_val, tt_move)) {
            return tt_val;
        }
    }

    // 4. Move generation and pass handling
    uint64_t moves_bb = board.get_legal_moves();
    if (moves_bb == 0) {
        if (passed) return evaluate(board); // Terminal double-pass
        Board next = board;
        next.pass();
        return -ybwc_internal(next, depth - 1, -beta, -alpha, pool, tt, history,
                             stats, use_tt, use_ordering, order_mode, parent_cutoff, true);
    }

    std::vector<int> moves = board.get_legal_moves_list();
    if (use_ordering) {
        MoveOrdering::order(board, moves, tt_move, history, order_mode);
    }

    int orig_alpha = alpha;

    // 5. Young Brothers Wait Concept: Search Eldest Brother (moves[0]) first sequentially
    Board first_next = board;
    first_next.make_move(moves[0]);

    int first_val = -ybwc_internal(first_next, depth - 1, -beta, -alpha, pool, tt, history,
                                  stats, use_tt, use_ordering, order_mode, parent_cutoff, false);

    if (parent_cutoff && parent_cutoff->load(std::memory_order_relaxed)) {
        return beta;
    }

    int best_val = first_val;
    int best_sq = moves[0];

    if (first_val > alpha) {
        alpha = first_val;
    }

    // Eldest Brother Cutoff: If the eldest brother causes a beta-cutoff,
    // younger brothers never need to be searched or dispatched!
    if (alpha >= beta) {
        if (history) {
            history[static_cast<int>(board.turn)][moves[0]] += depth * depth;
        }
        if (use_tt && tt) {
            tt->store(hash, depth, first_val, BoundType::LOWER, moves[0]);
        }
        return first_val;
    }

    if (moves.size() == 1) {
        if (use_tt && tt) {
            tt->store(hash, depth, first_val, BoundType::EXACT, moves[0]);
        }
        return first_val;
    }

    // 6. Younger Brothers Search (moves[1 ... N-1])
    // Eldest brother completed without cutoff: younger brothers are now permitted to search.
    // Deadlock Prevention: worker threads executing parallel tasks search sequentially.
    bool can_split = !t_is_parallel_worker && (depth >= 2) && (pool.size() > 1) &&
                     (!parent_cutoff || !parent_cutoff->load(std::memory_order_relaxed));

    if (can_split) {
        // Parallel Younger Brothers Splitting
        stats.splits.fetch_add(1, std::memory_order_relaxed);
        size_t num_younger = moves.size() - 1;
        std::atomic<int> shared_alpha{alpha};
        std::atomic<int> shared_best_val{best_val};
        std::atomic<int> shared_best_sq{best_sq};
        std::atomic<bool> node_cutoff{false};
        std::atomic<int> remaining{static_cast<int>(num_younger)};

        for (size_t i = 1; i < moves.size(); ++i) {
            int sq = moves[i];
            size_t target_worker = i % pool.size();

            pool.submit([&, sq, target_worker]() {
                t_is_parallel_worker = true;

                if (node_cutoff.load(std::memory_order_relaxed) ||
                    (parent_cutoff && parent_cutoff->load(std::memory_order_relaxed))) {
                    stats.cancels.fetch_add(1, std::memory_order_relaxed);
                    t_is_parallel_worker = false;
                    remaining.fetch_sub(1, std::memory_order_release);
                    return;
                }

                Board next = board;
                next.make_move(sq);

                uint32_t local_history[2][64] = {{0}};

                // Read current shared alpha bound
                int cur_a = shared_alpha.load(std::memory_order_relaxed);

                int score = -ybwc_internal(next, depth - 1, -beta, -cur_a, pool, tt, local_history,
                                          stats, use_tt, use_ordering, order_mode, &node_cutoff, false);

                if (!node_cutoff.load(std::memory_order_relaxed) &&
                    !(parent_cutoff && parent_cutoff->load(std::memory_order_relaxed))) {

                    // Update shared_best_val
                    int old_best = shared_best_val.load(std::memory_order_relaxed);
                    while (score > old_best && !shared_best_val.compare_exchange_weak(old_best, score, std::memory_order_relaxed)) {}

                    if (score == shared_best_val.load(std::memory_order_relaxed)) {
                        shared_best_sq.store(sq, std::memory_order_relaxed);
                    }

                    // Update shared_alpha
                    int old_a = shared_alpha.load(std::memory_order_relaxed);
                    while (score > old_a && !shared_alpha.compare_exchange_weak(old_a, score, std::memory_order_relaxed)) {}

                    // Beta cutoff among younger brothers
                    if (score >= beta) {
                        node_cutoff.store(true, std::memory_order_relaxed);
                    }
                }

                t_is_parallel_worker = false;
                remaining.fetch_sub(1, std::memory_order_release);
            }, target_worker);
        }

        // Active cooperative waiting: calling thread helps execute tasks while waiting
        int backoff = 0;
        while (remaining.load(std::memory_order_acquire) > 0) {
            if (!pool.help_work(0)) {
                if (++backoff > 10) {
                    std::this_thread::sleep_for(std::chrono::microseconds(10));
                } else {
                    std::this_thread::yield();
                }
            } else {
                backoff = 0;
            }
        }

        best_val = shared_best_val.load(std::memory_order_relaxed);
        best_sq = shared_best_sq.load(std::memory_order_relaxed);
    } else {
        // Sequential Younger Brothers Search
        for (size_t i = 1; i < moves.size(); ++i) {
            if (parent_cutoff && parent_cutoff->load(std::memory_order_relaxed)) {
                return beta;
            }

            int sq = moves[i];
            Board next = board;
            next.make_move(sq);

            int score = -ybwc_internal(next, depth - 1, -beta, -alpha, pool, tt, history,
                                      stats, use_tt, use_ordering, order_mode, parent_cutoff, false);

            if (score > best_val) {
                best_val = score;
                best_sq = sq;
            }
            if (score > alpha) {
                alpha = score;
            }
            if (alpha >= beta) {
                if (history) {
                    history[static_cast<int>(board.turn)][sq] += depth * depth;
                }
                break; // Beta cutoff
            }
        }
    }

    if (use_tt && tt) {
        BoundType btype = BoundType::EXACT;
        if (best_val <= orig_alpha) btype = BoundType::UPPER;
        else if (best_val >= beta) btype = BoundType::LOWER;
        tt->store(hash, depth, best_val, btype, best_sq);
    }

    return best_val;
}

} // anonymous namespace

int search_p3_ybwc(Board board,
                   int depth,
                   ThreadPool& pool,
                   SearchStats& stats,
                   TranspositionTable* tt,
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

    if (moves.size() == 1) {
        Board next = board;
        next.make_move(moves[0]);
        SearchStats sub_stats;
        int val = -negamax_b2_internal(next, depth - 1, -INF, INF, tt, nullptr,
                                       sub_stats, use_tt, use_ordering, order_mode, false);
        stats.best_move = moves[0];
        stats.value = val;
        stats.nodes = sub_stats.nodes.load();
        auto t1 = std::chrono::high_resolution_clock::now();
        stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
        return moves[0];
    }

    uint32_t history[2][64] = {{0}};
    int tt_move = -1;
    uint64_t hash = 0;

    if (use_tt && tt) {
        hash = g_zobrist.compute_hash(board);
        int val = 0;
        tt->probe(hash, depth, -INF, INF, val, tt_move);
    }

    if (use_ordering) {
        MoveOrdering::order(board, moves, tt_move, history, order_mode);
    }

    // 1. Search Eldest Root Brother (moves[0]) first sequentially with full window
    Board first_next = board;
    first_next.make_move(moves[0]);

    int first_val = -ybwc_internal(first_next, depth - 1, -INF, INF, pool, tt, history,
                                  stats, use_tt, use_ordering, order_mode, nullptr, false);

    int best_val = first_val;
    int best_sq = moves[0];
    int alpha = first_val;

    // 2. Younger Brothers Search for remaining root moves
    if (moves.size() > 1) {
        if (pool.size() > 1 && depth >= 2) {
            stats.splits.fetch_add(1, std::memory_order_relaxed);
            size_t num_younger = moves.size() - 1;
            std::atomic<int> shared_alpha{alpha};
            std::atomic<int> shared_best_val{best_val};
            std::atomic<int> shared_best_sq{best_sq};
            std::atomic<bool> node_cutoff{false};
            std::atomic<int> remaining{static_cast<int>(num_younger)};

            for (size_t i = 1; i < moves.size(); ++i) {
                int sq = moves[i];
                size_t target_worker = i % pool.size();

                pool.submit([&, sq, target_worker]() {
                    t_is_parallel_worker = true;

                    if (node_cutoff.load(std::memory_order_relaxed)) {
                        stats.cancels.fetch_add(1, std::memory_order_relaxed);
                        t_is_parallel_worker = false;
                        remaining.fetch_sub(1, std::memory_order_release);
                        return;
                    }

                    Board next = board;
                    next.make_move(sq);

                    uint32_t local_history[2][64] = {{0}};

                    // Read current shared alpha bound
                    int cur_a = shared_alpha.load(std::memory_order_relaxed);

                    int score = -ybwc_internal(next, depth - 1, -INF, -cur_a, pool, tt, local_history,
                                              stats, use_tt, use_ordering, order_mode, &node_cutoff, false);

                    if (!node_cutoff.load(std::memory_order_relaxed)) {
                        int old_best = shared_best_val.load(std::memory_order_relaxed);
                        while (score > old_best && !shared_best_val.compare_exchange_weak(old_best, score, std::memory_order_relaxed)) {}

                        if (score == shared_best_val.load(std::memory_order_relaxed)) {
                            shared_best_sq.store(sq, std::memory_order_relaxed);
                        }

                        int old_a = shared_alpha.load(std::memory_order_relaxed);
                        while (score > old_a && !shared_alpha.compare_exchange_weak(old_a, score, std::memory_order_relaxed)) {}
                    }

                    t_is_parallel_worker = false;
                    remaining.fetch_sub(1, std::memory_order_release);
                }, target_worker);
            }

            // Calling thread helps execute tasks while waiting
            int backoff = 0;
            while (remaining.load(std::memory_order_acquire) > 0) {
                if (!pool.help_work(0)) {
                    if (++backoff > 10) {
                        std::this_thread::sleep_for(std::chrono::microseconds(10));
                    } else {
                        std::this_thread::yield();
                    }
                } else {
                    backoff = 0;
                }
            }

            best_val = shared_best_val.load(std::memory_order_relaxed);
            best_sq = shared_best_sq.load(std::memory_order_relaxed);
        } else {
            // Sequential root younger brothers search (P=1)
            for (size_t i = 1; i < moves.size(); ++i) {
                int sq = moves[i];
                Board next = board;
                next.make_move(sq);

                int score = -ybwc_internal(next, depth - 1, -INF, -alpha, pool, tt, history,
                                          stats, use_tt, use_ordering, order_mode, nullptr, false);

                if (score > best_val) {
                    best_val = score;
                    best_sq = sq;
                }
                if (score > alpha) {
                    alpha = score;
                }
            }
        }
    }

    if (use_tt && tt) {
        tt->store(hash, depth, best_val, BoundType::EXACT, best_sq);
    }

    stats.best_move = best_sq;
    stats.value = best_val;
    stats.steals.store(pool.get_steals(), std::memory_order_relaxed);
    stats.idle_time_us.store(pool.get_idle_time_us(), std::memory_order_relaxed);

    auto t1 = std::chrono::high_resolution_clock::now();
    stats.time_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    return best_sq;
}

} // namespace othello
