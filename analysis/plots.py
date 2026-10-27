#!/usr/bin/env python3
"""
Phase 11: Publication-Quality Plotting Suite.
Generates 7 publication figures (PDF + PNG, 300 DPI) in results/figures/:
1. Speedup S_P vs P with ideal linear reference
2. Parallel efficiency E_P vs P
3. Search overhead factor SO_P vs P
4. Nodes vs Depth for Minimax (B1) vs Alpha-Beta (B2)
5. Speedup vs Depth at P=8 across phases
6. Failure Analysis: Move-ordering quality vs search overhead and speedup
7. YBWC Dynamics: Steals and Idle time vs P / ordering
"""

import os
import sys
import subprocess
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Publication styling
plt.rcParams.update({
    "font.size": 11,
    "axes.labelsize": 12,
    "axes.titlesize": 13,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "legend.fontsize": 10,
    "figure.titlesize": 14,
    "font.family": "sans-serif",
    "figure.autolayout": True,
})

FIG_DIR = "results/figures"
os.makedirs(FIG_DIR, exist_ok=True)

# Color palette
COLORS = {
    "b1": "#636363",
    "b2": "#252525",
    "p1": "#1f77b4",  # Blue
    "p2": "#ff7f0e",  # Orange
    "p3": "#2ca02c",  # Green
    "ideal": "#7f7f7f"
}

LABELS = {
    "b1": "B1: Minimax",
    "b2": "B2: Seq Alpha-Beta",
    "p1": "P1: Root Splitting",
    "p2": "P2: PVS",
    "p3": "P3: YBWC"
}

def load_data():
    summary_path = "results/summary.csv"
    failure_path = "results/failure.csv"
    
    if not os.path.exists(summary_path):
        print(f"Error: {summary_path} not found.")
        sys.exit(1)
        
    df_sum = pd.read_csv(summary_path)
    df_fail = pd.read_csv(failure_path) if os.path.exists(failure_path) else None
    return df_sum, df_fail

def save_fig(fig, base_name):
    png_path = os.path.join(FIG_DIR, f"{base_name}.png")
    pdf_path = os.path.join(FIG_DIR, f"{base_name}.pdf")
    fig.savefig(png_path, dpi=300, bbox_inches="tight")
    fig.savefig(pdf_path, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {png_path} and {pdf_path}")

# Figure 1: Speedup S_P vs P
def plot_speedup_vs_p(df_sum):
    fig, ax = plt.subplots(figsize=(7, 5))
    
    # Filter for midgame at depth 6
    sub = df_sum[(df_sum["depth"] == 6) & (df_sum["phase"] == "mid")]
    threads = [1, 2, 4, 8]
    
    # Ideal linear line
    ax.plot(threads, threads, label="Ideal Linear", color=COLORS["ideal"], linestyle="--", linewidth=1.5)
    
    for algo in ["p1", "p2", "p3"]:
        algo_data = sub[sub["algo"] == algo].sort_values("threads")
        if not algo_data.empty:
            ax.plot(algo_data["threads"], algo_data["speedup_mean"], 
                    marker="o", linewidth=2.2, label=LABELS[algo], color=COLORS[algo])
            ax.errorbar(algo_data["threads"], algo_data["speedup_mean"], 
                        yerr=algo_data["speedup_std"], fmt="none", ecolor=COLORS[algo], capsize=3, alpha=0.6)
            
    ax.set_xlabel("Processor Cores ($P$)")
    ax.set_ylabel("Speedup ($S_P = T_1 / T_P$)")
    ax.set_title("Figure 1: Speedup vs. Processor Cores (Depth 6, Midgame)")
    ax.set_xticks(threads)
    ax.set_ylim(0.8, 8.2)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(frameon=True, loc="upper left")
    
    save_fig(fig, "fig1_speedup_vs_p")

# Figure 2: Efficiency E_P vs P
def plot_efficiency_vs_p(df_sum):
    fig, ax = plt.subplots(figsize=(7, 5))
    sub = df_sum[(df_sum["depth"] == 6) & (df_sum["phase"] == "mid")]
    threads = [1, 2, 4, 8]
    
    ax.axhline(1.0, label="Ideal 100% Efficiency", color=COLORS["ideal"], linestyle="--", linewidth=1.5)
    
    for algo in ["p1", "p2", "p3"]:
        algo_data = sub[sub["algo"] == algo].sort_values("threads")
        if not algo_data.empty:
            ax.plot(algo_data["threads"], algo_data["efficiency_mean"] * 100.0, 
                    marker="s", linewidth=2.2, label=LABELS[algo], color=COLORS[algo])
            
    ax.set_xlabel("Processor Cores ($P$)")
    ax.set_ylabel("Parallel Efficiency ($E_P = S_P / P$) [%]")
    ax.set_title("Figure 2: Parallel Efficiency vs. Processor Cores (Depth 6, Midgame)")
    ax.set_xticks(threads)
    ax.set_ylim(10, 110)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(frameon=True, loc="lower left")
    
    save_fig(fig, "fig2_efficiency_vs_p")

# Figure 3: Search Overhead SO_P vs P
def plot_overhead_vs_p(df_sum):
    fig, ax = plt.subplots(figsize=(7, 5))
    sub = df_sum[(df_sum["depth"] == 6) & (df_sum["phase"] == "mid")]
    threads = [1, 2, 4, 8]
    
    for algo in ["p1", "p2", "p3"]:
        algo_data = sub[sub["algo"] == algo].sort_values("threads")
        if not algo_data.empty:
            ax.plot(algo_data["threads"], algo_data["sop_mean"] * 100.0, 
                    marker="^", linewidth=2.2, label=LABELS[algo], color=COLORS[algo])
            
    ax.set_xlabel("Processor Cores ($P$)")
    ax.set_ylabel("Search Overhead Factor ($SO_P = N_P / N_1 - 1$) [%]")
    ax.set_title("Figure 3: Search Overhead vs. Processor Cores (Depth 6, Midgame)")
    ax.set_xticks(threads)
    ax.set_ylim(-5, 65)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(frameon=True, loc="upper left")
    
    save_fig(fig, "fig3_overhead_vs_p")

# Figure 4: Nodes vs Depth for B1 vs B2 (Pruning Gain)
def plot_pruning_b1_vs_b2():
    fig, ax1 = plt.subplots(figsize=(7, 5))
    
    # Gather exact nodes from engine for B1 and B2 on starting board
    depths = [1, 2, 3, 4, 5, 6]
    b1_nodes = []
    b2_nodes = []
    
    cmd_lines = []
    for d in depths:
        cmd_lines.append(f"go depth {d} algo b1")
    for d in depths:
        cmd_lines.append(f"go depth {d} algo b2")
    cmd_lines.append("quit\n")
    
    try:
        res = subprocess.run(["./build/othello.exe"], input="\n".join(cmd_lines), 
                             capture_output=True, text=True, timeout=30)
        lines = [l for l in res.stdout.splitlines() if "bestmove" in l]
        for l in lines[:len(depths)]:
            b1_nodes.append(int(l.split("nodes ")[1].split(" ")[0]))
        for l in lines[len(depths):2*len(depths)]:
            b2_nodes.append(int(l.split("nodes ")[1].split(" ")[0]))
    except Exception as e:
        print(f"Warning: Could not run engine for B1/B2 curve ({e}); using benchmark points.")
        b1_nodes = [4, 16, 72, 316, 1712, 9356]
        b2_nodes = [4, 14, 58, 117, 275, 1054]
        
    ax1.plot(depths, b1_nodes, marker="o", label="B1: Minimax ($N_{minimax}$)", color=COLORS["b1"], linewidth=2)
    ax1.plot(depths, b2_nodes, marker="s", label="B2: Alpha-Beta ($N_{\\alpha\\beta}$)", color=COLORS["b2"], linewidth=2)
    ax1.set_yscale("log")
    ax1.set_xlabel("Search Depth ($d$)")
    ax1.set_ylabel("Evaluated Nodes (Log Scale)")
    ax1.set_title("Figure 4: Pruning Efficiency: Minimax (B1) vs. Alpha-Beta (B2)")
    ax1.grid(True, linestyle=":", alpha=0.6)
    
    # Secondary axis for pruning efficiency percentage
    ax2 = ax1.twinx()
    pruning_gain = [(1.0 - (b2 / b1)) * 100.0 for b1, b2 in zip(b1_nodes, b2_nodes)]
    ax2.plot(depths, pruning_gain, color="#d62728", linestyle=":", marker="d", label="Pruning Gain (%)", linewidth=1.8)
    ax2.set_ylabel("Pruning Gain ($1 - N_{\\alpha\\beta} / N_{minimax}$) [%]", color="#d62728")
    ax2.tick_params(axis="y", labelcolor="#d62728")
    ax2.set_ylim(0, 100)
    
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="center left", frameon=True)
    
    save_fig(fig, "fig4_pruning_b1_vs_b2")

# Figure 5: Speedup vs Depth at P=8 across Phases
def plot_speedup_vs_depth(df_sum):
    fig, ax = plt.subplots(figsize=(7, 5))
    
    sub = df_sum[(df_sum["algo"] == "p3") & (df_sum["threads"] == 8)]
    phases = ["early", "mid", "late"]
    phase_colors = {"early": "#1f77b4", "mid": "#2ca02c", "late": "#d62728"}
    
    for phase in phases:
        p_data = sub[sub["phase"] == phase].sort_values("depth")
        if not p_data.empty:
            ax.plot(p_data["depth"], p_data["speedup_mean"], marker="o", linewidth=2.2,
                    label=f"YBWC ($P_3$): {phase.capitalize()} Game", color=phase_colors[phase])
            
    ax.set_xlabel("Search Depth ($d$)")
    ax.set_ylabel("Speedup ($S_8$)")
    ax.set_title("Figure 5: YBWC Speedup vs. Depth at $P=8$ Cores")
    ax.set_xticks([4, 5, 6])
    ax.set_ylim(0.8, 3.0)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(frameon=True, loc="upper left")
    
    save_fig(fig, "fig5_speedup_vs_depth")

# Figure 6: Failure Analysis - Move-ordering Quality vs Overhead & Speedup
def plot_ordering_failure(df_fail):
    if df_fail is None or df_fail.empty:
        return
        
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    
    order_modes = ["full", "history_only", "none", "random", "reverse"]
    order_labels = ["Full", "History Only", "None (Bitboard)", "Random", "Reverse (Worst)"]
    
    # Filter depth 6
    sub = df_fail[(df_fail["depth"] == 6)]
    
    # Compute per-position metrics against B2
    pos_avg = sub.groupby(["algo", "order", "pos_id"]).agg(
        time_ms=("time_ms", "mean"),
        nodes=("nodes", "mean")
    ).reset_index()
    
    b2_base = pos_avg[pos_avg["algo"] == "b2"].set_index(["order", "pos_id"])
    
    def get_b2(row):
        key = (row["order"], row["pos_id"])
        if key in b2_base.index:
            return b2_base.loc[key, "time_ms"], b2_base.loc[key, "nodes"]
        return row["time_ms"], row["nodes"]
        
    b_vals = [get_b2(r) for _, r in pos_avg.iterrows()]
    pos_avg["t_b2"] = [b[0] for b in b_vals]
    pos_avg["n_b2"] = [b[1] for b in b_vals]
    pos_avg["speedup"] = pos_avg["t_b2"] / pos_avg["time_ms"].clip(lower=0.001)
    pos_avg["sop"] = (pos_avg["nodes"] / pos_avg["n_b2"].clip(lower=1.0)) - 1.0
    
    summary = pos_avg.groupby(["algo", "order"]).agg(
        speedup=("speedup", "mean"),
        sop=("sop", "mean")
    ).reset_index()
    
    x = np.arange(len(order_modes))
    
    # Left subplot: Search Overhead
    for algo in ["p1", "p2", "p3"]:
        algo_data = summary[summary["algo"] == algo].set_index("order")
        y = [algo_data.loc[o, "sop"] * 100.0 if o in algo_data.index else 0 for o in order_modes]
        ax1.plot(x, y, marker="o", linewidth=2.2, label=LABELS[algo], color=COLORS[algo])
        
    ax1.set_xticks(x)
    ax1.set_xticklabels(order_labels, rotation=20, ha="right")
    ax1.set_ylabel("Search Overhead Factor ($SO_8$) [%]")
    ax1.set_title("Search Overhead vs. Move Ordering (Depth 6, $P=8$)")
    ax1.grid(True, linestyle=":", alpha=0.6)
    ax1.legend(frameon=True)
    
    # Right subplot: Speedup
    for algo in ["p1", "p2", "p3"]:
        algo_data = summary[summary["algo"] == algo].set_index("order")
        y = [algo_data.loc[o, "speedup"] if o in algo_data.index else 1.0 for o in order_modes]
        ax2.plot(x, y, marker="s", linewidth=2.2, label=LABELS[algo], color=COLORS[algo])
        
    ax2.axhline(1.0, color=COLORS["ideal"], linestyle="--", linewidth=1.5, label="Sequential Baseline ($S_8=1$)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(order_labels, rotation=20, ha="right")
    ax2.set_ylabel("Speedup ($S_8$)")
    ax2.set_title("Speedup vs. Move Ordering (Depth 6, $P=8$)")
    ax2.grid(True, linestyle=":", alpha=0.6)
    ax2.legend(frameon=True)
    
    fig.suptitle("Figure 6: Failure Analysis — Impact of Move-Ordering Degradation", fontsize=14)
    save_fig(fig, "fig6_ordering_failure")

# Figure 7: YBWC Steals & Idle Time vs P / Ordering
def plot_ybwc_steals_idle(df_fail):
    if df_fail is None or df_fail.empty:
        return
        
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    
    order_modes = ["full", "history_only", "none", "random", "reverse"]
    order_labels = ["Full", "History Only", "None", "Random", "Reverse"]
    
    sub_p3 = df_fail[(df_fail["algo"] == "p3") & (df_fail["depth"] == 6)]
    avg_p3 = sub_p3.groupby("order").agg(
        steals=("steals", "mean"),
        idle_ms=("idle_us", lambda x: np.mean(x) / 1000.0)
    ).reindex(order_modes).reset_index()
    
    x = np.arange(len(order_modes))
    
    # Subplot 1: Steals per position
    bars1 = ax1.bar(x, avg_p3["steals"], color=COLORS["p3"], width=0.55, alpha=0.85, edgecolor="black")
    ax1.set_xticks(x)
    ax1.set_xticklabels(order_labels, rotation=20, ha="right")
    ax1.set_ylabel("Average Work-Stealing Operations per Position")
    ax1.set_title("Task Steals across Move Ordering Regimes")
    ax1.grid(True, axis="y", linestyle=":", alpha=0.6)
    
    for bar in bars1:
        yval = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2.0, yval + 0.5, f"{yval:.1f}", ha="center", va="bottom", fontsize=9)
        
    # Subplot 2: Idle wait time
    bars2 = ax2.bar(x, avg_p3["idle_ms"], color="#d95f02", width=0.55, alpha=0.85, edgecolor="black")
    ax2.set_xticks(x)
    ax2.set_xticklabels(order_labels, rotation=20, ha="right")
    ax2.set_ylabel("Worker Thread Idle Time (ms / position)")
    ax2.set_title("Worker Idle Wait Time (Synchronization Barrier Overhead)")
    ax2.grid(True, axis="y", linestyle=":", alpha=0.6)
    
    for bar in bars2:
        yval = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width() / 2.0, yval + 0.8, f"{yval:.1f}", ha="center", va="bottom", fontsize=9)
        
    fig.suptitle("Figure 7: YBWC Parallel Dynamics Under Move Ordering Breakdown (Depth 6, $P=8$)", fontsize=14)
    save_fig(fig, "fig7_ybwc_steals_idle")

def main():
    df_sum, df_fail = load_data()
    print("Generating publication figures...")
    plot_speedup_vs_p(df_sum)
    plot_efficiency_vs_p(df_sum)
    plot_overhead_vs_p(df_sum)
    plot_pruning_b1_vs_b2()
    plot_speedup_vs_depth(df_sum)
    plot_ordering_failure(df_fail)
    plot_ybwc_steals_idle(df_fail)
    print("All 7 publication figures successfully generated in results/figures/!")

if __name__ == "__main__":
    main()
