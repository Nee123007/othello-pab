#include "tt.hpp"

namespace othello {

TranspositionTable::TranspositionTable(size_t /*size_mb*/) {}

TranspositionTable::~TranspositionTable() {
    delete[] table_;
}

void TranspositionTable::clear() {}

bool TranspositionTable::probe(uint64_t /*key*/, int /*depth*/, int /*alpha*/, int /*beta*/, int& /*out_val*/, int& /*out_best_move*/) const {
    return false;
}

void TranspositionTable::store(uint64_t /*key*/, int /*depth*/, int /*val*/, BoundType /*bound*/, int /*best_move*/) {}

} // namespace othello
