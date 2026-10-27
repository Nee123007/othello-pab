#pragma once
#include <vector>
#include <thread>
#include <atomic>
#include <functional>
#include <deque>
#include <mutex>

namespace othello {

class ThreadPool {
public:
    explicit ThreadPool(size_t num_threads = 4);
    ~ThreadPool();

    void submit(std::function<void()> task, size_t preferred_worker = 0);
    void wait_all();
    size_t size() const { return workers_.size(); }

private:
    std::vector<std::thread> workers_;
    std::atomic<bool> stop_{false};
};

} // namespace othello
