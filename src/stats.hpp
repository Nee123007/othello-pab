#pragma once
#include <cstdint>
#include <atomic>

namespace othello {

struct SearchStats {
    std::atomic<uint64_t> nodes{0};
    int depth{0};
    int value{0};
    int best_move{-1};
    double time_ms{0.0};

    void reset() {
        nodes.store(0, std::memory_order_relaxed);
        depth = 0;
        value = 0;
        best_move = -1;
        time_ms = 0.0;
    }
};

} // namespace othello
