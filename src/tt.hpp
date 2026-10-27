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
    std::atomic<uint64_t> key_xor_data{0};
    std::atomic<uint64_t> data{0};
};

class TranspositionTable {
public:
    explicit TranspositionTable(size_t size_mb = 16);
    ~TranspositionTable();

    // Disable copy
    TranspositionTable(const TranspositionTable&) = delete;
    TranspositionTable& operator=(const TranspositionTable&) = delete;

    void clear();
    void increment_age() { age_++; }

    // Lock-free probe: returns true if entry exists and satisfies cutoff
    bool probe(uint64_t key, int depth, int alpha, int beta, int& out_val, int& out_best_move) const;

    // Probes for best move hint regardless of depth cutoff
    int probe_best_move(uint64_t key) const;

    // Lock-free store with XOR validation
    void store(uint64_t key, int depth, int val, BoundType bound, int best_move);

    size_t capacity() const { return num_entries_; }
    size_t size_mb() const { return (num_entries_ * sizeof(TTEntry)) / (1024 * 1024); }

private:
    TTEntry* table_{nullptr};
    size_t num_entries_{0};
    size_t mask_{0};
    uint8_t age_{0};
};

} // namespace othello
