#include "threadpool.hpp"
#include <algorithm>
#include <chrono>

namespace othello {

thread_local int t_thread_worker_id = -1;

static ThreadPool* s_active_pool = nullptr;

ThreadPool* ThreadPool::active_pool() {
    return s_active_pool;
}

ThreadPool::ThreadPool(size_t num_threads) {
    size_t threads = std::max(size_t(1), num_threads);
    queues_ = std::vector<WorkerQueue>(threads);
    workers_.reserve(threads);

    worker_nodes_ = std::make_unique<std::atomic<uint64_t>[]>(threads);
    worker_states_ = std::make_unique<std::atomic<uint8_t>[]>(threads);
    for (size_t i = 0; i < threads; ++i) {
        worker_nodes_[i].store(0, std::memory_order_relaxed);
        worker_states_[i].store(static_cast<uint8_t>(WorkerState::IDLE), std::memory_order_relaxed);
    }

    s_active_pool = this;

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

    if (s_active_pool == this) {
        s_active_pool = nullptr;
    }
}

WorkerState ThreadPool::get_worker_state(size_t worker_id) const {
    if (worker_id < queues_.size() && worker_states_) {
        return static_cast<WorkerState>(worker_states_[worker_id].load(std::memory_order_relaxed));
    }
    return WorkerState::IDLE;
}

uint64_t ThreadPool::get_worker_nodes(size_t worker_id) const {
    if (worker_id < queues_.size() && worker_nodes_) {
        return worker_nodes_[worker_id].load(std::memory_order_relaxed);
    }
    return 0;
}

void ThreadPool::add_worker_nodes(size_t worker_id, uint64_t count) {
    if (worker_id < queues_.size() && worker_nodes_) {
        worker_nodes_[worker_id].fetch_add(count, std::memory_order_relaxed);
    }
}

void ThreadPool::set_worker_state(size_t worker_id, WorkerState state) {
    if (worker_id < queues_.size() && worker_states_) {
        worker_states_[worker_id].store(static_cast<uint8_t>(state), std::memory_order_relaxed);
    }
}

void ThreadPool::reset_stats() {
    steals_.store(0, std::memory_order_relaxed);
    idle_time_us_.store(0, std::memory_order_relaxed);
    for (size_t i = 0; i < queues_.size(); ++i) {
        if (worker_nodes_) worker_nodes_[i].store(0, std::memory_order_relaxed);
        if (worker_states_) worker_states_[i].store(static_cast<uint8_t>(WorkerState::IDLE), std::memory_order_relaxed);
    }
}

void ThreadPool::submit(std::function<void()> task, size_t preferred_worker) {
    pending_tasks_.fetch_add(1, std::memory_order_relaxed);

    size_t target = preferred_worker % queues_.size();
    {
        std::lock_guard<std::mutex> lock(queues_[target].mtx);
        queues_[target].tasks.push_back(std::move(task));
    }
    cv_work_.notify_all();
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
        set_worker_state(thief_id, WorkerState::STEALING);
        for (size_t i = 1; i < num_workers; ++i) {
            size_t victim = (thief_id + i) % num_workers;
            std::unique_lock<std::mutex> lock(queues_[victim].mtx, std::try_to_lock);
            if (lock.owns_lock() && !queues_[victim].tasks.empty()) {
                task = std::move(queues_[victim].tasks.back()); // Steal from back
                queues_[victim].tasks.pop_back();
                steals_.fetch_add(1, std::memory_order_relaxed);
                break;
            }
        }
    }

    if (task) {
        set_worker_state(thief_id, WorkerState::BUSY);
        task();
        set_worker_state(thief_id, WorkerState::IDLE);

        if (pending_tasks_.fetch_sub(1, std::memory_order_acq_rel) == 1) {
            std::lock_guard<std::mutex> lock(cv_mtx_);
            cv_done_.notify_all();
        }
        return true;
    }

    set_worker_state(thief_id, WorkerState::IDLE);
    return false;
}

void ThreadPool::worker_loop(size_t worker_id) {
    t_thread_worker_id = static_cast<int>(worker_id);

    while (!stop_.load(std::memory_order_acquire)) {
        if (!try_steal_and_execute(worker_id)) {
            set_worker_state(worker_id, WorkerState::IDLE);
            auto t_wait_start = std::chrono::steady_clock::now();
            std::unique_lock<std::mutex> lock(cv_mtx_);
            cv_work_.wait(lock, [this]() {
                return stop_.load(std::memory_order_acquire) ||
                       pending_tasks_.load(std::memory_order_relaxed) > 0;
            });
            auto t_wait_end = std::chrono::steady_clock::now();
            uint64_t us = std::chrono::duration_cast<std::chrono::microseconds>(t_wait_end - t_wait_start).count();
            idle_time_us_.fetch_add(us, std::memory_order_relaxed);
        }
    }

    // Drain remaining tasks before thread exits
    while (try_steal_and_execute(worker_id)) {}
}

bool ThreadPool::help_work(size_t worker_id) {
    if (queues_.empty()) return false;
    return try_steal_and_execute(worker_id % queues_.size());
}

void ThreadPool::wait_all() {
    // Calling thread helps execute pending tasks while waiting
    while (pending_tasks_.load(std::memory_order_acquire) > 0) {
        if (!help_work(0)) {
            std::unique_lock<std::mutex> lock(cv_mtx_);
            if (pending_tasks_.load(std::memory_order_acquire) == 0) break;
            cv_done_.wait_for(lock, std::chrono::microseconds(100), [this]() {
                return pending_tasks_.load(std::memory_order_acquire) == 0;
            });
        }
    }
}

} // namespace othello
