#include "tt.hpp"
#include <algorithm>
#include <cstring>

namespace othello {

namespace {

inline uint64_t pack_data(int32_t val, uint8_t depth, BoundType bound, int8_t best_move, uint8_t age) {
    return (static_cast<uint64_t>(static_cast<uint32_t>(val)) << 32)
         | (static_cast<uint64_t>(depth) << 24)
         | (static_cast<uint64_t>(static_cast<uint8_t>(bound)) << 16)
         | (static_cast<uint64_t>(static_cast<uint8_t>(best_move)) << 8)
         | static_cast<uint64_t>(age);
}

inline void unpack_data(uint64_t data, int32_t& val, int& depth, BoundType& bound, int& best_move, uint8_t& age) {
    val = static_cast<int32_t>(data >> 32);
    depth = static_cast<int>((data >> 24) & 0xFF);
    bound = static_cast<BoundType>((data >> 16) & 0xFF);
    uint8_t bm = static_cast<uint8_t>((data >> 8) & 0xFF);
    best_move = (bm == 0xFF) ? -1 : static_cast<int>(bm);
    age = static_cast<uint8_t>(data & 0xFF);
}

// Find nearest power of two <= val
size_t floor_power_of_two(size_t val) {
    if (val == 0) return 1;
    size_t p = 1;
    while ((p << 1) <= val) {
        p <<= 1;
    }
    return p;
}

} // anonymous namespace

TranspositionTable::TranspositionTable(size_t size_mb) {
    size_t target_bytes = std::max(size_t(1), size_mb) * 1024 * 1024;
    size_t total_entries = target_bytes / sizeof(TTEntry);
    num_entries_ = floor_power_of_two(total_entries);
    mask_ = num_entries_ - 1;

    table_ = new TTEntry[num_entries_];
    clear();
}

TranspositionTable::~TranspositionTable() {
    delete[] table_;
}

void TranspositionTable::clear() {
    for (size_t i = 0; i < num_entries_; ++i) {
        table_[i].key_xor_data.store(0, std::memory_order_relaxed);
        table_[i].data.store(0, std::memory_order_relaxed);
    }
}

bool TranspositionTable::probe(uint64_t key, int depth, int alpha, int beta, int& out_val, int& out_best_move) const {
    size_t idx = key & mask_;
    const TTEntry& entry = table_[idx];

    uint64_t k_xor_d = entry.key_xor_data.load(std::memory_order_acquire);
    uint64_t data = entry.data.load(std::memory_order_relaxed);

    // XOR trick validation: detects collisions and torn writes from concurrent threads
    if ((k_xor_d ^ data) != key) {
        out_best_move = -1;
        return false;
    }

    int32_t val;
    int entry_depth;
    BoundType bound;
    int best_move;
    uint8_t age;
    unpack_data(data, val, entry_depth, bound, best_move, age);

    out_best_move = best_move;

    if (entry_depth >= depth) {
        if (bound == BoundType::EXACT) {
            out_val = val;
            return true;
        }
        if (bound == BoundType::LOWER && val >= beta) {
            out_val = val;
            return true;
        }
        if (bound == BoundType::UPPER && val <= alpha) {
            out_val = val;
            return true;
        }
    }

    return false;
}

int TranspositionTable::probe_best_move(uint64_t key) const {
    size_t idx = key & mask_;
    const TTEntry& entry = table_[idx];

    uint64_t k_xor_d = entry.key_xor_data.load(std::memory_order_acquire);
    uint64_t data = entry.data.load(std::memory_order_relaxed);

    if ((k_xor_d ^ data) != key) {
        return -1;
    }

    int32_t val;
    int entry_depth;
    BoundType bound;
    int best_move;
    uint8_t age;
    unpack_data(data, val, entry_depth, bound, best_move, age);

    return best_move;
}

void TranspositionTable::store(uint64_t key, int depth, int val, BoundType bound, int best_move) {
    size_t idx = key & mask_;
    TTEntry& entry = table_[idx];

    uint64_t k_xor_d = entry.key_xor_data.load(std::memory_order_relaxed);
    uint64_t old_data = entry.data.load(std::memory_order_relaxed);

    bool same_key = ((k_xor_d ^ old_data) == key);

    if (same_key) {
        int32_t old_val;
        int old_depth;
        BoundType old_bound;
        int old_best_move;
        uint8_t old_age;
        unpack_data(old_data, old_val, old_depth, old_bound, old_best_move, old_age);

        // Depth-preferred replacement policy:
        // Do not replace with a shallower search unless the existing entry is from an older generation or new bound is EXACT
        if (depth < old_depth && age_ == old_age && bound != BoundType::EXACT) {
            // Keep the previous best move if the new one didn't specify one
            return;
        }
        if (best_move == -1) {
            best_move = old_best_move;
        }
    }

    int8_t bm_byte = (best_move < 0 || best_move > 63) ? -1 : static_cast<int8_t>(best_move);
    uint64_t new_data = pack_data(val, static_cast<uint8_t>(depth), bound, bm_byte, age_);

    // Lock-free XOR trick write:
    // data is written first, then key_xor_data with release ordering
    entry.data.store(new_data, std::memory_order_relaxed);
    entry.key_xor_data.store(key ^ new_data, std::memory_order_release);
}

} // namespace othello
