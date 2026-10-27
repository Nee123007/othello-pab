#include <iostream>
#include "board.hpp"

namespace othello {
    void run_protocol(int argc, char* argv[]);
}

int main(int argc, char* argv[]) {
    std::cout << "Parallel Alpha-Beta Othello Engine (C++17)\n";
    othello::run_protocol(argc, argv);
    return 0;
}
