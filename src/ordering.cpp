#include "ordering.hpp"
#include "eval.hpp"
#include <algorithm>

namespace othello {

namespace {

constexpr uint64_t CORNER_MASK = (1ULL << 0) | (1ULL << 7) | (1ULL << 56) | (1ULL << 63);

int score_move_full(const Board& board, int sq, int tt_best_move, const uint32_t history[2][64]) {
    int score = 0;

    // 1. TT best move has highest priority
    if (sq == tt_best_move) {
        return 10000000;
    }

    // 2. Corner occupancy
    if ((1ULL << sq) & CORNER_MASK) {
        score += 1000000;
    }

    // 3. History heuristic
    if (history) {
        score += static_cast<int>(history[static_cast<int>(board.turn)][sq]);
    }

    // 4. Opponent mobility minimization (fewer opponent responses = better)
    Board next = board;
    next.make_move(sq);
    int opp_responses = __builtin_popcountll(next.get_legal_moves());
    score -= opp_responses * 50;

    // 5. Positional grid weight
    score += POSITIONAL_WEIGHTS[sq] * 10;

    return score;
}

} // anonymous namespace

void MoveOrdering::order(const Board& board,
                         std::vector<int>& moves,
                         int tt_best_move,
                         const uint32_t history[2][64],
                         OrderMode mode) {
    if (moves.size() <= 1) return;

    if (mode == OrderMode::NONE) {
        return;
    }

    if (mode == OrderMode::REVERSE) {
        std::reverse(moves.begin(), moves.end());
        return;
    }

    if (mode == OrderMode::HISTORY_ONLY) {
        if (!history) return;
        int t = static_cast<int>(board.turn);
        std::stable_sort(moves.begin(), moves.end(), [&](int a, int b) {
            return history[t][a] > history[t][b];
        });
        return;
    }

    if (mode == OrderMode::FULL) {
        struct ScoredMove {
            int sq;
            int score;
        };

        std::vector<ScoredMove> scored;
        scored.reserve(moves.size());

        for (int sq : moves) {
            scored.push_back({sq, score_move_full(board, sq, tt_best_move, history)});
        }

        std::stable_sort(scored.begin(), scored.end(), [](const ScoredMove& a, const ScoredMove& b) {
            return a.score > b.score;
        });

        for (size_t i = 0; i < moves.size(); ++i) {
            moves[i] = scored[i].sq;
        }
    }
}

} // namespace othello
