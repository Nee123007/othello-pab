cmake_minimum_required(VERSION 3.16)
project(othello_pab VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler warnings and optimization flags (-O2 -Wall -Wextra)
if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -O2)
    if(MINGW)
        add_link_options(-static-libgcc -static-libstdc++ -static)
    endif()
endif()

# ThreadSanitizer option (-DTSAN=ON)
option(TSAN "Enable ThreadSanitizer" OFF)
if(TSAN)
    if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        message(STATUS "ThreadSanitizer enabled (-fsanitize=thread)")
        add_compile_options(-fsanitize=thread -g)
        add_link_options(-fsanitize=thread)
    else()
        message(WARNING "ThreadSanitizer not supported with this compiler.")
    endif()
endif()

# Find thread support
find_package(Threads REQUIRED)

# Core engine library sources
set(ENGINE_SOURCES
    src/board.cpp
    src/zobrist.cpp
    src/eval.cpp
    src/tt.cpp
    src/ordering.cpp
    src/search_seq.cpp
    src/threadpool.cpp
    src/search_root.cpp
    src/search_pvs.cpp
    src/search_ybwc.cpp
    src/protocol.cpp
)

# Engine library target
add_library(othello_core STATIC ${ENGINE_SOURCES})
target_include_directories(othello_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_link_libraries(othello_core PUBLIC Threads::Threads)

# Target 1: othello (Main CLI / Protocol engine)
add_executable(othello src/main.cpp)
target_link_libraries(othello PRIVATE othello_core)

# Target 2: tests (Unit test executable)
add_executable(tests tests/main.cpp)
target_link_libraries(tests PRIVATE othello_core)

enable_testing()
add_test(NAME AllTests COMMAND tests)
