#pragma once
#include <vector>
#include <thread>
#include <atomic>
#include <functional>
#include <deque>
#include <mutex>
#include <condition_variable>
#include <cstddef>

namespace othello {

class ThreadPool {
public:
    explicit ThreadPool(size_t num_threads = 4);
    ~ThreadPool();

    // Disable copy and assignment
    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator=(const ThreadPool&) = delete;

    // Submit a task to a preferred worker queue
    void submit(std::function<void()> task, size_t preferred_worker = 0);

    // Wait until all submitted tasks complete; calling thread helps execute tasks
    void wait_all();

    // Pool size (number of worker threads)
    size_t size() const { return workers_.size(); }

private:
    struct WorkerQueue {
        std::deque<std::function<void()>> tasks;
        std::mutex mtx;
    };

    void worker_loop(size_t worker_id);
    bool try_steal_and_execute(size_t thief_id);

    std::vector<std::thread> workers_;
    std::vector<WorkerQueue> queues_;

    std::atomic<bool> stop_{false};
    std::atomic<int> pending_tasks_{0};

    std::condition_variable cv_work_;
    std::condition_variable cv_done_;
    std::mutex cv_mtx_;
};

} // namespace othello
