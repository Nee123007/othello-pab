#pragma once
#include <vector>
#include <thread>
#include <atomic>
#include <functional>
#include <deque>
#include <mutex>
#include <condition_variable>
#include <cstddef>
#include <memory>

namespace othello {

enum class WorkerState : uint8_t {
    IDLE = 0,
    BUSY = 1,
    STEALING = 2
};

class ThreadPool {
public:
    explicit ThreadPool(size_t num_threads = 4);
    ~ThreadPool();

    // Disable copy and assignment
    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator=(const ThreadPool&) = delete;

    // Submit a task to a preferred worker queue
    void submit(std::function<void()> task, size_t preferred_worker = 0);

    // Help execute one task (from own queue or stolen from others). Returns true if a task was run.
    bool help_work(size_t worker_id = 0);

    // Wait until all submitted tasks complete; calling thread helps execute tasks
    void wait_all();

    // Pool size (number of worker threads)
    size_t size() const { return workers_.size(); }

    // Diagnostics (Phase 10 & Web Lab)
    uint64_t get_steals() const { return steals_.load(std::memory_order_relaxed); }
    uint64_t get_idle_time_us() const { return idle_time_us_.load(std::memory_order_relaxed); }
    WorkerState get_worker_state(size_t worker_id) const;
    uint64_t get_worker_nodes(size_t worker_id) const;
    void add_worker_nodes(size_t worker_id, uint64_t count);
    void set_worker_state(size_t worker_id, WorkerState state);

    void reset_stats();

    static ThreadPool* active_pool();

private:
    struct WorkerQueue {
        std::deque<std::function<void()>> tasks;
        std::mutex mtx;
    };

    void worker_loop(size_t worker_id);
    bool try_steal_and_execute(size_t thief_id);

    std::vector<std::thread> workers_;
    std::vector<WorkerQueue> queues_;

    std::unique_ptr<std::atomic<uint64_t>[]> worker_nodes_;
    std::unique_ptr<std::atomic<uint8_t>[]> worker_states_;

    std::atomic<bool> stop_{false};
    std::atomic<int> pending_tasks_{0};
    std::atomic<uint64_t> steals_{0};
    std::atomic<uint64_t> idle_time_us_{0};

    std::condition_variable cv_work_;
    std::condition_variable cv_done_;
    std::mutex cv_mtx_;
};

extern thread_local int t_thread_worker_id;

} // namespace othello
