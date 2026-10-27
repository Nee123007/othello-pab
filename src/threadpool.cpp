#include "threadpool.hpp"

namespace othello {

ThreadPool::ThreadPool(size_t /*num_threads*/) {}

ThreadPool::~ThreadPool() {
    stop_.store(true);
}

void ThreadPool::submit(std::function<void()> /*task*/, size_t /*preferred_worker*/) {}

void ThreadPool::wait_all() {}

} // namespace othello
