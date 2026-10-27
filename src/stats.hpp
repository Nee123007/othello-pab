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

    // Parallel search & YBWC diagnostics (Phase 10)
    std::atomic<uint64_t> splits{0};
    std::atomic<uint64_t> steals{0};
    std::atomic<uint64_t> cancels{0};
    std::atomic<uint64_t> idle_time_us{0};

    void reset() {
        nodes.store(0, std::memory_order_relaxed);
        depth = 0;
        value = 0;
        best_move = -1;
        time_ms = 0.0;
        splits.store(0, std::memory_order_relaxed);
        steals.store(0, std::memory_order_relaxed);
        cancels.store(0, std::memory_order_relaxed);
        idle_time_us.store(0, std::memory_order_relaxed);
    }
};

} // namespace othello
