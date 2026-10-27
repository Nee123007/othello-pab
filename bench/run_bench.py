#!/usr/bin/env python3
"""
Automated Experiment Benchmark Runner for Parallel Alpha-Beta Othello Engine.
Executes engine benchmark across algorithms, thread counts, depths, and game phases.
Outputs streaming results to results/raw.csv with resume support and progress bars.
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
from tqdm import tqdm

def parse_args():
    parser = argparse.ArgumentParser(description="Run parallel alpha-beta search benchmarks")
    parser.add_argument("--exe", default="./build/othello.exe", help="Path to othello engine executable")
    parser.add_argument("--output", default="results/raw.csv", help="Output raw CSV file path")
    parser.add_argument("--algos", default="b2,p1,p2,p3", help="Comma-separated algorithms to test")
    parser.add_argument("--threads", default="1,2,4,8", help="Comma-separated thread counts")
    parser.add_argument("--depths", default="4,5,6", help="Comma-separated depths to search")
    parser.add_argument("--phases", default="early,mid,late", help="Comma-separated game phases")
    parser.add_argument("--repeats", type=int, default=3, help="Number of repetitions per configuration")
    parser.add_argument("--timeout", type=int, default=180, help="Timeout in seconds per benchmark run")
    return parser.parse_args()

def load_existing_results(output_path):
    existing = set()
    if not os.path.exists(output_path):
        return existing
    try:
        with open(output_path, "r", encoding="utf-8") as f:
            header = f.readline()
            for line in f:
                parts = line.strip().split(",")
                if len(parts) >= 6:
                    key = (parts[0], int(parts[1]), int(parts[2]), parts[3], parts[4], int(parts[5]))
                    existing.add(key)
    except Exception as e:
        print(f"Notice: Could not read existing results ({e}); starting fresh.")
    return existing

def run_benchmark_for_config(exe_path, phase_file, phase_name, algo, depth, threads, repeat, timeout):
    cmd_input = f"bench {phase_file} {algo} {depth} {threads}\nquit\n"
    
    try:
        res = subprocess.run(
            [exe_path],
            input=cmd_input,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        stdout = res.stdout
    except subprocess.TimeoutExpired:
        print(f"\n[TIMEOUT] Run timed out: algo={algo}, threads={threads}, depth={depth}, phase={phase_name}")
        return []
    except Exception as e:
        print(f"\n[ERROR] Execution error: {e}")
        return []

    results = []
    lines = stdout.splitlines()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("Parallel") or line.startswith("algo,"):
            continue
        parts = line.split(",")
        if len(parts) >= 8:
            pos_id = parts[3]
            val = parts[4]
            move = parts[5]
            nodes = parts[6]
            time_ms = parts[7]
            row = {
                "algo": algo,
                "threads": threads,
                "depth": depth,
                "phase": phase_name,
                "pos_id": pos_id,
                "repeat": repeat,
                "value": val,
                "bestmove": move,
                "nodes": nodes,
                "time_ms": time_ms
            }
            results.append(row)
    return results

def main():
    args = parse_args()

    exe_path = os.path.abspath(args.exe)
    if not os.path.exists(exe_path):
        if os.path.exists(exe_path + ".exe"):
            exe_path += ".exe"
        else:
            print(f"Error: Engine executable not found at '{exe_path}'. Build project first.")
            sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    existing_keys = load_existing_results(args.output)
    if existing_keys:
        print(f"Loaded {len(existing_keys)} existing position rows from {args.output} (resume enabled).")

    if not os.path.exists(args.output) or os.path.getsize(args.output) == 0:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write("algo,threads,depth,phase,pos_id,repeat,value,bestmove,nodes,time_ms\n")

    algos = [a.strip() for a in args.algos.split(",") if a.strip()]
    threads_list = [int(t.strip()) for t in args.threads.split(",") if t.strip()]
    depths = [int(d.strip()) for d in args.depths.split(",") if d.strip()]
    phases = [p.strip() for p in args.phases.split(",") if p.strip()]

    work_items = []
    for depth in depths:
        for phase in phases:
            phase_file = f"bench/{phase}.txt"
            if not os.path.exists(phase_file):
                print(f"Warning: Position file '{phase_file}' not found; skipping.")
                continue

            for algo in algos:
                t_counts = [1] if algo == "b2" else threads_list
                for threads in t_counts:
                    for rep in range(1, args.repeats + 1):
                        work_items.append((algo, threads, depth, phase, phase_file, rep))

    print(f"Total benchmark batches scheduled: {len(work_items)}")

    with open(args.output, "a", encoding="utf-8") as outfile:
        pbar = tqdm(work_items, desc="Benchmarking", unit="batch")
        for algo, threads, depth, phase, phase_file, rep in pbar:
            pbar.set_postfix_str(f"{algo} P={threads} d={depth} {phase} r={rep}")

            # Check if all 30 positions for this batch already exist
            already_done = True
            for pos_num in range(1, 31):
                pos_id = f"{phase}_{pos_num:03d}"
                if (algo, threads, depth, phase, pos_id, rep) not in existing_keys:
                    already_done = False
                    break

            if already_done:
                continue

            rows = run_benchmark_for_config(
                exe_path, phase_file, phase, algo, depth, threads, rep, args.timeout
            )

            for r in rows:
                key = (r["algo"], r["threads"], r["depth"], r["phase"], r["pos_id"], r["repeat"])
                if key in existing_keys:
                    continue
                line = (f"{r['algo']},{r['threads']},{r['depth']},{r['phase']},{r['pos_id']},"
                        f"{r['repeat']},{r['value']},{r['bestmove']},{r['nodes']},{r['time_ms']}\n")
                outfile.write(line)
                existing_keys.add(key)
            outfile.flush()

    print(f"\nAll benchmark runs complete! Results saved to {args.output}")

if __name__ == "__main__":
    main()
