#pragma once
#include <cstdint>
#include <atomic>
#include <cstddef>

namespace othello {

enum class BoundType : uint8_t {
    EXACT = 0,
    LOWER = 1,
    UPPER = 2
};

struct TTEntry {
    uint64_t key_xor_data{0};
    uint64_t data{0};
};

class TranspositionTable {
public:
    explicit TranspositionTable(size_t size_mb = 16);
    ~TranspositionTable();

    void clear();
    bool probe(uint64_t key, int depth, int alpha, int beta, int& out_val, int& out_best_move) const;
    void store(uint64_t key, int depth, int val, BoundType bound, int best_move);

private:
    TTEntry* table_{nullptr};
    size_t num_entries_{0};
};

} // namespace othello
