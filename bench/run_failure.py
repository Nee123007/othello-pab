#!/usr/bin/env python3
"""
Phase 10: Failure Analysis Benchmark Runner.
Evaluates parallel search algorithms (P1, P2, P3) at P=8 against sequential B2
under degraded move ordering:
- full (TT + corners + history + mobility)
- history_only
- none (natural bitboard order)
- random (pseudo-random shuffle)
- reverse (worst-first ordering)

Logs detailed metrics (nodes, time, speedup, SOP, splits, steals, cancels, idle time)
to results/failure.csv and prints a comparative summary table.
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
import pandas as pd
import numpy as np
from tqdm import tqdm

def parse_args():
    parser = argparse.ArgumentParser(description="Run degraded move ordering failure analysis")
    parser.add_argument("--exe", default="./build/othello.exe", help="Engine executable path")
    parser.add_argument("--output", default="results/failure.csv", help="Output failure CSV file path")
    parser.add_argument("--algos", default="b2,p1,p2,p3", help="Comma-separated algorithms to test")
    parser.add_argument("--threads", type=int, default=8, help="Thread count for parallel algorithms")
    parser.add_argument("--depths", default="5,6", help="Comma-separated search depths")
    parser.add_argument("--orders", default="full,history_only,none,random,reverse", help="Comma-separated ordering modes")
    parser.add_argument("--positions-per-phase", type=int, default=10, help="Number of positions per phase (early, mid, late)")
    parser.add_argument("--repeats", type=int, default=2, help="Number of repeats per configuration")
    parser.add_argument("--timeout", type=int, default=120, help="Timeout in seconds per benchmark batch")
    return parser.parse_args()

def prepare_failure_positions_file(pos_per_phase=10, output_path="bench/failure_set.txt"):
    """Creates a dedicated failure test set with pos_per_phase positions from early, mid, late."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    lines_written = 0
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("# Failure Analysis Position Set\n")
        out.write("# pos_id,board_string,turn\n")
        for phase in ["early", "mid", "late"]:
            src_file = f"bench/{phase}.txt"
            if not os.path.exists(src_file):
                continue
            count = 0
            with open(src_file, "r", encoding="utf-8") as src:
                for line in src:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    out.write(line + "\n")
                    lines_written += 1
                    count += 1
                    if count >= pos_per_phase:
                        break
    return output_path, lines_written

def run_batch(exe_path, pos_file, algo, depth, threads, order_mode, timeout=120):
    cmd_input = f"bench {pos_file} {algo} {depth} {threads} {order_mode}\nquit\n"
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
        print(f"\n[TIMEOUT] algo={algo}, threads={threads}, depth={depth}, order={order_mode}")
        return []
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return []

    rows = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line or line.startswith("Parallel") or line.startswith("algo,"):
            continue
        parts = line.split(",")
        if len(parts) >= 13:
            # Format: algo,threads,depth,pos_id,value,bestmove,nodes,time_ms,splits,steals,cancels,idle_us,order
            rows.append({
                "algo": parts[0],
                "threads": int(parts[1]),
                "depth": int(parts[2]),
                "pos_id": parts[3],
                "phase": parts[3].split("_")[0] if "_" in parts[3] else "unknown",
                "value": int(parts[4]),
                "bestmove": parts[5],
                "nodes": int(parts[6]),
                "time_ms": float(parts[7]),
                "splits": int(parts[8]),
                "steals": int(parts[9]),
                "cancels": int(parts[10]),
                "idle_us": int(parts[11]),
                "order": parts[12]
            })
    return rows

def main():
    args = parse_args()
    exe_path = os.path.abspath(args.exe)
    if not os.path.exists(exe_path):
        if os.path.exists(exe_path + ".exe"):
            exe_path += ".exe"
        else:
            print(f"Error: Executable '{exe_path}' not found. Build project first.")
            sys.exit(1)

    pos_file, num_pos = prepare_failure_positions_file(args.positions_per_phase)
    print(f"Prepared failure benchmark set with {num_pos} positions in '{pos_file}'.")

    algos = [a.strip() for a in args.algos.split(",") if a.strip()]
    depths = [int(d.strip()) for d in args.depths.split(",") if d.strip()]
    orders = [o.strip() for o in args.orders.split(",") if o.strip()]

    work_items = []
    for depth in depths:
        for order in orders:
            for algo in algos:
                threads = 1 if algo == "b2" else args.threads
                for rep in range(1, args.repeats + 1):
                    work_items.append((algo, threads, depth, order, rep))

    print(f"Total failure benchmark runs scheduled: {len(work_items)}")

    all_rows = []
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    pbar = tqdm(work_items, desc="Failure Analysis", unit="batch")
    for algo, threads, depth, order, rep in pbar:
        pbar.set_postfix_str(f"{algo} P={threads} d={depth} {order} r={rep}")
        rows = run_batch(exe_path, pos_file, algo, depth, threads, order, args.timeout)
        for r in rows:
            r["repeat"] = rep
            all_rows.append(r)

    if not all_rows:
        print("Error: No benchmark results collected.")
        sys.exit(1)

    df = pd.DataFrame(all_rows)
    df.to_csv(args.output, index=False)
    print(f"\nRaw failure results saved to: {args.output}")

    # Compute comparative summary table
    pos_avg = df.groupby(["algo", "threads", "depth", "order", "pos_id"]).agg(
        time_ms=("time_ms", "mean"),
        nodes=("nodes", "mean"),
        splits=("splits", "mean"),
        steals=("steals", "mean"),
        cancels=("cancels", "mean"),
        idle_us=("idle_us", "mean")
    ).reset_index()

    # B2 baseline for each (depth, order, pos_id)
    b2_base = pos_avg[pos_avg["algo"] == "b2"].set_index(["depth", "order", "pos_id"])

    def get_b2_base(row):
        key = (row["depth"], row["order"], row["pos_id"])
        if key in b2_base.index:
            return b2_base.loc[key, "time_ms"], b2_base.loc[key, "nodes"]
        return row["time_ms"], row["nodes"]

    base_vals = [get_b2_base(r) for _, r in pos_avg.iterrows()]
    pos_avg["t_b2"] = [b[0] for b in base_vals]
    pos_avg["n_b2"] = [b[1] for b in base_vals]

    pos_avg["speedup"] = pos_avg["t_b2"] / pos_avg["time_ms"].clip(lower=0.001)
    pos_avg["sop"] = (pos_avg["nodes"] / pos_avg["n_b2"].clip(lower=1.0)) - 1.0

    summary = pos_avg.groupby(["algo", "threads", "depth", "order"]).agg(
        avg_time_ms=("time_ms", "mean"),
        avg_nodes=("nodes", "mean"),
        speedup=("speedup", "mean"),
        sop=("sop", "mean"),
        avg_splits=("splits", "mean"),
        avg_steals=("steals", "mean"),
        avg_cancels=("cancels", "mean"),
        avg_idle_ms=("idle_us", lambda x: np.mean(x) / 1000.0)
    ).reset_index()

    print("\n" + "=" * 125)
    print("  FAILURE ANALYSIS SUMMARY: PERFORMANCE DEGRADATION UNDER FAILING MOVE ORDERING")
    print("=" * 125)
    header = "{:<5} {:>7} {:>5} {:<12} {:>10} {:>10} {:>9} {:>9} {:>8} {:>8} {:>8} {:>10}"
    print(header.format("Algo", "Threads", "Depth", "Order Mode", "Time (ms)", "Nodes", "Speedup", "Overhead", "Splits", "Steals", "Cancels", "Idle (ms)"))
    print("-" * 125)
    row_fmt = "{:<5} {:>7} {:>5} {:<12} {:>10.2f} {:>10.0f} {:>8.2f}x {:>8.1f}% {:>8.1f} {:>8.1f} {:>8.1f} {:>10.2f}"

    for _, r in summary.iterrows():
        print(row_fmt.format(
            r["algo"],
            int(r["threads"]),
            int(r["depth"]),
            r["order"],
            r["avg_time_ms"],
            r["avg_nodes"],
            r["speedup"],
            r["sop"] * 100.0,
            r["avg_splits"],
            r["avg_steals"],
            r["avg_cancels"],
            r["avg_idle_ms"]
        ))
    print("=" * 125)

if __name__ == "__main__":
    main()
