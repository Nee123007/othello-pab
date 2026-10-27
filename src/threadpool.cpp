#include "threadpool.hpp"
#include <algorithm>

namespace othello {

ThreadPool::ThreadPool(size_t num_threads) {
    size_t threads = std::max(size_t(1), num_threads);
    queues_ = std::vector<WorkerQueue>(threads);
    workers_.reserve(threads);

    for (size_t i = 0; i < threads; ++i) {
        workers_.emplace_back(&ThreadPool::worker_loop, this, i);
    }
}

ThreadPool::~ThreadPool() {
    stop_.store(true, std::memory_order_release);
    cv_work_.notify_all();

    for (auto& w : workers_) {
        if (w.joinable()) {
            w.join();
        }
    }
}

void ThreadPool::submit(std::function<void()> task, size_t preferred_worker) {
    pending_tasks_.fetch_add(1, std::memory_order_relaxed);

    size_t target = preferred_worker % queues_.size();
    {
        std::lock_guard<std::mutex> lock(queues_[target].mtx);
        queues_[target].tasks.push_back(std::move(task));
    }
    cv_work_.notify_one();
}

bool ThreadPool::try_steal_and_execute(size_t thief_id) {
    size_t num_workers = queues_.size();

    // 1. Try own queue first
    std::function<void()> task;
    {
        std::unique_lock<std::mutex> lock(queues_[thief_id].mtx, std::try_to_lock);
        if (lock.owns_lock() && !queues_[thief_id].tasks.empty()) {
            task = std::move(queues_[thief_id].tasks.front());
            queues_[thief_id].tasks.pop_front();
        }
    }

    // 2. If own queue empty, steal from others
    if (!task) {
        for (size_t i = 1; i < num_workers; ++i) {
            size_t victim = (thief_id + i) % num_workers;
            std::unique_lock<std::mutex> lock(queues_[victim].mtx, std::try_to_lock);
            if (lock.owns_lock() && !queues_[victim].tasks.empty()) {
                task = std::move(queues_[victim].tasks.back()); // Steal from back
                queues_[victim].tasks.pop_back();
                break;
            }
        }
    }

    if (task) {
        task();
        if (pending_tasks_.fetch_sub(1, std::memory_order_acq_rel) == 1) {
            std::lock_guard<std::mutex> lock(cv_mtx_);
            cv_done_.notify_all();
        }
        return true;
    }

    return false;
}

void ThreadPool::worker_loop(size_t worker_id) {
    while (!stop_.load(std::memory_order_acquire)) {
        if (!try_steal_and_execute(worker_id)) {
            std::unique_lock<std::mutex> lock(cv_mtx_);
            cv_work_.wait(lock, [this]() {
                return stop_.load(std::memory_order_acquire) ||
                       pending_tasks_.load(std::memory_order_relaxed) > 0;
            });
        }
    }

    // Drain remaining tasks before thread exits
    while (try_steal_and_execute(worker_id)) {}
}

void ThreadPool::wait_all() {
    // Calling thread helps execute pending tasks while waiting
    while (pending_tasks_.load(std::memory_order_acquire) > 0) {
        if (!try_steal_and_execute(0)) {
            std::unique_lock<std::mutex> lock(cv_mtx_);
            if (pending_tasks_.load(std::memory_order_acquire) == 0) break;
            cv_done_.wait_for(lock, std::chrono::microseconds(100), [this]() {
                return pending_tasks_.load(std::memory_order_acquire) == 0;
            });
        }
    }
}

} // namespace othello
