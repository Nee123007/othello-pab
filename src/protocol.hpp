#pragma once
#include <string>
#include <vector>
#include <cstdint>
#include "board.hpp"

namespace othello {

void run_protocol(int argc, char* argv[]);
void run_protocol();

// JSON helper utilities
std::string format_hex64(uint64_t val);
std::string format_state_json(const Board& board, int last_move, const std::vector<int>& flipped);
std::string format_legal_json(const std::vector<int>& legal);

} // namespace othello

