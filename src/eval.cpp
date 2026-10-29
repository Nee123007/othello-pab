#include "eval.hpp"
#include <algorithm>

namespace othello {

EvalConfig g_eval_config;

const int POSITIONAL_WEIGHTS[64] = {
    100, -20,  10,   5,   5,  10, -20, 100,
    -20, -40,  -5,  -5,  -5,  -5, -40, -20,
     10,  -5,   2,   2,   2,   2,  -5,  10,
      5,  -5,   2,   0,   0,   2,  -5,   5,
      5,  -5,   2,   0,   0,   2,  -5,   5,
     10,  -5,   2,   2,   2,   2,  -5,  10,
    -20, -40,  -5,  -5,  -5,  -5, -40, -20,
    100, -20,  10,   5,   5,  10, -20, 100
};

namespace {

constexpr uint64_t CORNER_MASK = (1ULL << 0) | (1ULL << 7) | (1ULL << 56) | (1ULL << 63);

struct CornerAdj {
    int corner;
    int adj[3];
};

const CornerAdj CORNER_ADJ_TABLE[4] = {
    {0,  {1, 8, 9}},
    {7,  {6, 14, 15}},
    {56, {48, 49, 57}},
    {63, {54, 55, 62}}
};

int count_stable_discs(uint64_t player, uint64_t /*opponent*/) {
    int stable = 0;

    // Top-left corner (0)
    if (player & (1ULL << 0)) {
        stable++;
        // Top edge: scan right (1..6)
        for (int c = 1; c <= 6; ++c) {
            if (player & (1ULL << c)) stable++;
            else break;
        }
        // Left edge: scan down (8, 16..48)
        for (int r = 1; r <= 6; ++r) {
            if (player & (1ULL << (r * 8))) stable++;
            else break;
        }
    }

    // Top-right corner (7)
    if (player & (1ULL << 7)) {
        stable++;
        // Top edge: scan left (6..1)
        for (int c = 6; c >= 1; --c) {
            if (player & (1ULL << c)) stable++;
            else break;
        }
        // Right edge: scan down (15, 23..55)
        for (int r = 1; r <= 6; ++r) {
            if (player & (1ULL << (r * 8 + 7))) stable++;
            else break;
        }
    }

    // Bottom-left corner (56)
    if (player & (1ULL << 56)) {
        stable++;
        // Bottom edge: scan right (57..62)
        for (int c = 1; c <= 6; ++c) {
            if (player & (1ULL << (56 + c))) stable++;
            else break;
        }
        // Left edge: scan up (48, 40..8)
        for (int r = 6; r >= 1; --r) {
            if (player & (1ULL << (r * 8))) stable++;
            else break;
        }
    }

    // Bottom-right corner (63)
    if (player & (1ULL << 63)) {
        stable++;
        // Bottom edge: scan left (62..57)
        for (int c = 6; c >= 1; --c) {
            if (player & (1ULL << (56 + c))) stable++;
            else break;
        }
        // Right edge: scan up (55, 47..15)
        for (int r = 6; r >= 1; --r) {
            if (player & (1ULL << (r * 8 + 7))) stable++;
            else break;
        }
    }

    return stable;
}

} // anonymous namespace

int eval_corners(const Board& board) {
    int my_c = __builtin_popcountll(board.me & CORNER_MASK);
    int opp_c = __builtin_popcountll(board.opp & CORNER_MASK);
    return 100 * (my_c - opp_c);
}

int eval_positional(const Board& board) {
    int my_pos = 0;
    int opp_pos = 0;

    for (int sq = 0; sq < 64; ++sq) {
        uint64_t mask = 1ULL << sq;
        if (board.me & mask) {
            int w = POSITIONAL_WEIGHTS[sq];
            // Relieve penalty on X/C squares if adjacent corner is already owned by player
            for (const auto& ca : CORNER_ADJ_TABLE) {
                if ((board.me & (1ULL << ca.corner)) != 0) {
                    if (sq == ca.adj[0] || sq == ca.adj[1] || sq == ca.adj[2]) {
                        w = std::max(w, 5);
                    }
                }
            }
            my_pos += w;
        } else if (board.opp & mask) {
            int w = POSITIONAL_WEIGHTS[sq];
            for (const auto& ca : CORNER_ADJ_TABLE) {
                if ((board.opp & (1ULL << ca.corner)) != 0) {
                    if (sq == ca.adj[0] || sq == ca.adj[1] || sq == ca.adj[2]) {
                        w = std::max(w, 5);
                    }
                }
            }
            opp_pos += w;
        }
    }

    return my_pos - opp_pos;
}

int eval_stability(const Board& board) {
    int my_stab = count_stable_discs(board.me, board.opp);
    int opp_stab = count_stable_discs(board.opp, board.me);
    return my_stab - opp_stab;
}

int eval_mobility(const Board& board) {
    int my_moves = __builtin_popcountll(board.get_legal_moves());
    Board opp_board = board;
    opp_board.pass();
    int opp_moves = __builtin_popcountll(opp_board.get_legal_moves());

    if (my_moves + opp_moves == 0) return 0;
    return 100 * (my_moves - opp_moves) / (my_moves + opp_moves);
}

int eval_discs(const Board& board) {
    int total = board.total_discs();
    if (total == 0) return 0;
    return 100 * (board.my_disc_count() - board.opp_disc_count()) / total;
}

int evaluate(const Board& board) {
    // 1. Terminal State Check: exact disc utility dominates
    if (board.is_terminal()) {
        int diff = board.disc_difference();
        if (diff > 0) return TERMINAL_WIN_BASE + diff;
        if (diff < 0) return -TERMINAL_WIN_BASE + diff;
        return 0; // Draw
    }

    // 2. Select phase weights
    int total = board.total_discs();
    const PhaseWeights& w = (total <= 20) ? g_eval_config.opening
                          : (total <= 52) ? g_eval_config.midgame
                                          : g_eval_config.endgame;

    // 3. Compute 5 terms
    int mob = eval_mobility(board);
    int corners = eval_corners(board);
    int pos = eval_positional(board);
    int stab = eval_stability(board);
    int discs = eval_discs(board);

    int score = (w.w_mobility * mob)
              + (w.w_corners * corners) / 100
              + (w.w_positional * pos)
              + (w.w_stability * stab)
              + (w.w_discs * discs);

    return score;
}

EvalBreakdown get_eval_breakdown(const Board& board) {
    EvalBreakdown b;
    if (board.is_terminal()) {
        int diff = board.disc_difference();
        b.phase = "terminal";
        b.mobility = 0;
        b.corners = 0;
        b.positional = 0;
        b.stability = 0;
        b.discs = (diff > 0) ? TERMINAL_WIN_BASE + diff : (diff < 0 ? -TERMINAL_WIN_BASE + diff : 0);
        b.total = b.discs;
        return b;
    }

    int total = board.total_discs();
    const PhaseWeights& w = (total <= 20) ? g_eval_config.opening
                          : (total <= 52) ? g_eval_config.midgame
                                          : g_eval_config.endgame;
    b.phase = (total <= 20) ? "opening" : (total <= 52 ? "midgame" : "endgame");

    int mob = eval_mobility(board);
    int corners = eval_corners(board);
    int pos = eval_positional(board);
    int stab = eval_stability(board);
    int discs = eval_discs(board);

    b.mobility = w.w_mobility * mob;
    b.corners = (w.w_corners * corners) / 100;
    b.positional = w.w_positional * pos;
    b.stability = w.w_stability * stab;
    b.discs = w.w_discs * discs;
    b.total = b.mobility + b.corners + b.positional + b.stability + b.discs;

    return b;
}

} // namespace othello
