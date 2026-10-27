#pragma once
#include <cstdint>
#include "board.hpp"

namespace othello {

struct PhaseWeights {
    int w_mobility{10};
    int w_corners{100};
    int w_positional{5};
    int w_stability{20};
    int w_discs{2};
};

struct EvalConfig {
    PhaseWeights opening{20, 100, 5, 10, -2}; // Discs <= 20
    PhaseWeights midgame{10, 100, 8, 20, 4};   // Discs 21..52
    PhaseWeights endgame{4, 60, 2, 10, 50};    // Discs > 52
};

extern EvalConfig g_eval_config;

// Positional 8x8 weight matrix
extern const int POSITIONAL_WEIGHTS[64];

// Terminal score scale constant
constexpr int TERMINAL_WIN_BASE = 100000;

// Evaluation function e(s) from Section 5.2
int evaluate(const Board& board);

// Sub-component evaluators (useful for testing & analysis)
int eval_mobility(const Board& board);
int eval_corners(const Board& board);
int eval_positional(const Board& board);
int eval_stability(const Board& board);
int eval_discs(const Board& board);

} // namespace othello
