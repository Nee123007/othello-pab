#!/usr/bin/env python3
"""
Metrics Computation and Statistical Analysis for Parallel Alpha-Beta Othello Engine.
Computes:
- Speedup S_P = T1 / TP
- Parallel Efficiency E_P = S_P / P
- Search Overhead Factor SOP = N_P / N_1 - 1
- Effective Branching Factor b* = N_1^(1/d)
- Value Agreement with Reference Engine B2 (%)
Outputs results/summary.csv with mean and standard deviation grouped by (algo, threads, depth, phase).
"""

import sys
import os
import argparse
import pandas as pd
import numpy as np

def parse_args():
    parser = argparse.ArgumentParser(description="Compute parallel alpha-beta search metrics")
    parser.add_argument("--input", default="results/raw.csv", help="Input raw CSV results path")
    parser.add_argument("--output", default="results/summary.csv", help="Output summary CSV file path")
    return parser.parse_args()

def compute_metrics(raw_csv_path, output_csv_path):
    if not os.path.exists(raw_csv_path):
        print(f"Error: Input file '{raw_csv_path}' not found. Run bench/run_bench.py first.")
        sys.exit(1)

    df = pd.read_csv(raw_csv_path)
    if df.empty:
        print("Warning: Input raw CSV is empty.")
        return

    # Clean numeric types
    df["threads"] = pd.to_numeric(df["threads"])
    df["depth"] = pd.to_numeric(df["depth"])
    df["value"] = pd.to_numeric(df["value"])
    df["nodes"] = pd.to_numeric(df["nodes"])
    df["time_ms"] = pd.to_numeric(df["time_ms"])

    # 1. Compute per-position mean across repeats
    pos_grouped = df.groupby(["algo", "threads", "depth", "phase", "pos_id"]).agg(
        mean_time_ms=("time_ms", "mean"),
        std_time_ms=("time_ms", "std"),
        mean_nodes=("nodes", "mean"),
        value=("value", "first"),
        bestmove=("bestmove", "first")
    ).reset_index()

    # 2. Extract B2 reference values for value agreement and baseline timing
    b2_ref = pos_grouped[pos_grouped["algo"] == "b2"].set_index(["depth", "phase", "pos_id"])

    # 3. Compute baseline T1 and N1 per position
    # Use P=1 of the same algorithm if available, else B2
    p1_baseline = pos_grouped[pos_grouped["threads"] == 1].set_index(["algo", "depth", "phase", "pos_id"])

    def get_baseline_time_and_nodes(row):
        algo = row["algo"]
        depth = row["depth"]
        phase = row["phase"]
        pos_id = row["pos_id"]
        key = (algo, depth, phase, pos_id)
        if key in p1_baseline.index:
            t1 = p1_baseline.loc[key, "mean_time_ms"]
            n1 = p1_baseline.loc[key, "mean_nodes"]
            return t1, n1
        # Fallback to B2 baseline
        b2_key = (depth, phase, pos_id)
        if b2_key in b2_ref.index:
            return b2_ref.loc[b2_key, "mean_time_ms"], b2_ref.loc[b2_key, "mean_nodes"]
        return row["mean_time_ms"], row["mean_nodes"]

    baselines = [get_baseline_time_and_nodes(r) for _, r in pos_grouped.iterrows()]
    pos_grouped["T1"] = [b[0] for b in baselines]
    pos_grouped["N1"] = [b[1] for b in baselines]

    # Speedup: S_P = T1 / T_P
    pos_grouped["speedup"] = pos_grouped["T1"] / pos_grouped["mean_time_ms"].clip(lower=0.001)

    # Parallel Efficiency: E_P = S_P / P
    pos_grouped["efficiency"] = pos_grouped["speedup"] / pos_grouped["threads"]

    # Search Overhead Factor: SOP = N_P / N_1 - 1
    pos_grouped["sop"] = (pos_grouped["mean_nodes"] / pos_grouped["N1"].clip(lower=1.0)) - 1.0

    # Effective Branching Factor: b* = N1^(1/d)
    pos_grouped["branching_factor"] = np.power(pos_grouped["N1"].clip(lower=1.0), 1.0 / pos_grouped["depth"])

    # Value Agreement with B2 reference
    def check_b2_match(row):
        b2_key = (row["depth"], row["phase"], row["pos_id"])
        if b2_key in b2_ref.index:
            ref_val = b2_ref.loc[b2_key, "value"]
            return 1 if row["value"] == ref_val else 0
        return 1

    pos_grouped["b2_match"] = [check_b2_match(r) for _, r in pos_grouped.iterrows()]

    # 4. Group by (algo, threads, depth, phase) to produce summary table
    summary = pos_grouped.groupby(["algo", "threads", "depth", "phase"]).agg(
        positions_count=("pos_id", "count"),
        avg_time_ms=("mean_time_ms", "mean"),
        std_time_ms=("mean_time_ms", "std"),
        avg_nodes=("mean_nodes", "mean"),
        std_nodes=("mean_nodes", "std"),
        speedup_mean=("speedup", "mean"),
        speedup_std=("speedup", "std"),
        efficiency_mean=("efficiency", "mean"),
        sop_mean=("sop", "mean"),
        sop_std=("sop", "std"),
        branching_factor_mean=("branching_factor", "mean"),
        value_agreement_pct=("b2_match", lambda x: np.mean(x) * 100.0)
    ).reset_index()

    # Fill NaN std values (when count == 1)
    summary = summary.fillna(0.0)

    # Save to summary CSV
    os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)
    summary.to_csv(output_csv_path, index=False, float_format="%.4f")
    print(f"Summary metrics successfully written to: {output_csv_path}")

    # Print high-level overview table to terminal
    print("\n" + "=" * 115)
    print("  PARALLEL ALPHA-BETA EXPERIMENT METRICS SUMMARY TABLE")
    print("=" * 115)
    fmt_header = "{:<6} {:>7} {:>6} {:>8} {:>10} {:>10} {:>9} {:>11} {:>11} {:>9}"
    fmt_row    = "{:<6} {:>7} {:>6} {:>8} {:>10.2f} {:>10.0f} {:>8.2f}x {:>10.1f}% {:>10.1f}% {:>8.1f}%"
    print(fmt_header.format("Algo", "Threads", "Depth", "Phase", "Time (ms)", "Nodes", "Speedup", "Efficiency", "Overhead", "B2 Agree"))
    print("-" * 115)

    for _, row in summary.iterrows():
        print(fmt_row.format(
            row["algo"],
            int(row["threads"]),
            int(row["depth"]),
            row["phase"],
            row["avg_time_ms"],
            row["avg_nodes"],
            row["speedup_mean"],
            row["efficiency_mean"] * 100.0,
            row["sop_mean"] * 100.0,
            row["value_agreement_pct"]
        ))
    print("=" * 115)

def main():
    args = parse_args()
    compute_metrics(args.input, args.output)

if __name__ == "__main__":
    main()
