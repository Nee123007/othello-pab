#pragma once
#include "board.hpp"

namespace othello {

struct EvalWeights {
    int w_mobility{10};
    int w_corners{100};
    int w_positional{5};
    int w_stability{20};
    int w_discs{2};
};

int evaluate(const Board& board);

} // namespace othello
