#include "board.hpp"
#include <iostream>

namespace othello {
void run_protocol(int argc, char *argv[]);
}

int main(int argc, char *argv[]) {
  bool json_mode = false;
  for (int i = 1; i < argc; ++i) {
    if (argv[i] && std::string(argv[i]) == "--json") {
      json_mode = true;
      break;
    }
  }
  if (!json_mode) {
    std::cout << "Parallel Alpha-Beta Othello Engine (C++17)\n";
  }
  othello::run_protocol(argc, argv);
  return 0;
}
