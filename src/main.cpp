#include <iostream>
#include "board.hpp"

namespace othello {
    void run_protocol();
}

int main() {
    std::cout << "Parallel Alpha-Beta Othello Engine (C++17)\n";
    othello::run_protocol();
    return 0;
}
