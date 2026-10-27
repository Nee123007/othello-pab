#include <iostream>
#include <string>
#include "board.hpp"

namespace othello {

void run_protocol() {
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line == "quit") {
            break;
        } else if (line == "new") {
            std::cout << "readyok\n";
        }
    }
}

} // namespace othello
