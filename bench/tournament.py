#!/usr/bin/env python3
"""
Phase 12b: Round-Robin Engine Tournament Runner.
Conducts automated engine-vs-engine matches between:
- B0 Random
- B0 Greedy
- B2 (Sequential Alpha-Beta)
- P3 (YBWC at P=8 Cores)

Features:
- Color swapping (each pair plays both Black and White)
- Seeded random opening book (first 4-6 plies random) to test varied positions
- Computes win/draw/loss counts, win rate, and mean disc difference with 95% CI
- Outputs results/tournament_games.csv and results/tournament.csv
"""

import sys
import os
import subprocess
import argparse
import random
from itertools import combinations
import pandas as pd
import numpy as np
from tqdm import tqdm

CONTESTANTS = {
    "B0_Random": {"algo": "b0_random", "depth": 1, "threads": 1},
    "B0_Greedy": {"algo": "b0_greedy", "depth": 1, "threads": 1},
    "B2_AlphaBeta": {"algo": "b2", "depth": 6, "threads": 1},
    "P3_YBWC_P8": {"algo": "p3", "depth": 6, "threads": 8}
}

class OthelloSim:
    def __init__(self):
        self.board = [[0]*8 for _ in range(8)]
        self.board[3][3] = -1
        self.board[3][4] = 1
        self.board[4][3] = 1
        self.board[4][4] = -1
        self.turn = 1 # 1: Black, -1: White

    def get_flips(self, r, c, color):
        if self.board[r][c] != 0: return []
        opp = -color
        flips = []
        for dr, dc in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]:
            cur_r, cur_c = r + dr, c + dc
            path = []
            while 0 <= cur_r < 8 and 0 <= cur_c < 8 and self.board[cur_r][cur_c] == opp:
                path.append((cur_r, cur_c))
                cur_r += dr
                cur_c += dc
            if 0 <= cur_r < 8 and 0 <= cur_c < 8 and self.board[cur_r][cur_c] == color and path:
                flips.extend(path)
        return flips

    def get_legal_moves(self, color=None):
        if color is None: color = self.turn
        legals = []
        for r in range(8):
            for c in range(8):
                if self.get_flips(r, c, color):
                    legals.append((r, c))
        return legals

    def make_move(self, r, c):
        flips = self.get_flips(r, c, self.turn)
        if not flips: return False
        self.board[r][c] = self.turn
        for fr, fc in flips:
            self.board[fr][fc] = self.turn
        self.turn = -self.turn
        return True

    def pass_turn(self):
        self.turn = -self.turn

    def is_game_over(self):
        return len(self.get_legal_moves(1)) == 0 and len(self.get_legal_moves(-1)) == 0

    def counts(self):
        b, w = 0, 0
        for r in range(8):
            for c in range(8):
                if self.board[r][c] == 1: b += 1
                elif self.board[r][c] == -1: w += 1
        return b, w

    def to_board_string(self):
        s = []
        for r in range(8):
            for c in range(8):
                if self.board[r][c] == 1: s.append('X')
                elif self.board[r][c] == -1: s.append('O')
                else: s.append('.')
        turn_ch = 'b' if self.turn == 1 else 'w'
        return "".join(s), turn_ch

def parse_args():
    parser = argparse.ArgumentParser(description="Run Othello engine tournament")
    parser.add_argument("--exe", default="./build/othello.exe", help="Engine executable path")
    parser.add_argument("--games-per-pair", type=int, default=6, help="Total games per pair of contestants (split evenly Black/White)")
    parser.add_argument("--opening-plies", type=int, default=4, help="Number of seeded random opening plies")
    parser.add_argument("--output", default="results/tournament.csv", help="Output tournament standings CSV")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for openings")
    return parser.parse_args()

def play_match(exe_path, p_black_name, p_white_name, opening_plies, seed):
    rng = random.Random(seed)
    sim = OthelloSim()

    # 1. Play random opening plies
    for _ in range(opening_plies):
        moves = sim.get_legal_moves(sim.turn)
        if not moves:
            if sim.is_game_over(): break
            sim.pass_turn()
            moves = sim.get_legal_moves(sim.turn)
            if not moves: break
        chosen = rng.choice(moves)
        sim.make_move(chosen[0], chosen[1])

    # 2. Launch persistent engine process
    proc = subprocess.Popen(
        [exe_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    plies_played = 0
    max_plies = 60

    while not sim.is_game_over() and plies_played < max_plies:
        legals = sim.get_legal_moves(sim.turn)
        if not legals:
            sim.pass_turn()
            continue

        active_player = p_black_name if sim.turn == 1 else p_white_name
        cfg = CONTESTANTS[active_player]

        b_str, turn_ch = sim.to_board_string()
        proc.stdin.write(f"setboard {b_str} {turn_ch}\n")
        proc.stdin.write(f"go depth {cfg['depth']} algo {cfg['algo']} threads {cfg['threads']}\n")
        proc.stdin.flush()

        best_move_str = None
        while True:
            line = proc.stdout.readline()
            if not line: break
            line = line.strip()
            if line.startswith("bestmove"):
                parts = line.split()
                best_move_str = parts[1]
                break

        if not best_move_str or best_move_str == "pass":
            sim.pass_turn()
        else:
            col = ord(best_move_str[0].lower()) - ord('a')
            row = int(best_move_str[1]) - 1
            if not sim.make_move(row, col):
                sim.pass_turn()

        plies_played += 1

    try:
        proc.stdin.write("quit\n")
        proc.stdin.flush()
        proc.terminate()
    except:
        pass

    b_discs, w_discs = sim.counts()
    disc_diff = b_discs - w_discs  # Positive: Black advantage

    if b_discs > w_discs:
        winner = p_black_name
    elif w_discs > b_discs:
        winner = p_white_name
    else:
        winner = "Draw"

    return {
        "black": p_black_name,
        "white": p_white_name,
        "black_discs": b_discs,
        "white_discs": w_discs,
        "disc_diff": disc_diff,
        "winner": winner,
        "plies": plies_played
    }

def main():
    args = parse_args()
    exe_path = os.path.abspath(args.exe)
    if not os.path.exists(exe_path):
        if os.path.exists(exe_path + ".exe"):
            exe_path += ".exe"
        else:
            print(f"Error: Executable '{exe_path}' not found. Build project first.")
            sys.exit(1)

    contestant_names = list(CONTESTANTS.keys())
    pairs = list(combinations(contestant_names, 2))
    total_matches = len(pairs) * args.games_per_pair

    print(f"============================================================")
    print(f"  OTHELLO ENGINE TOURNAMENT: {len(contestant_names)} CONTESTANTS, {total_matches} MATCHES")
    print(f"============================================================")
    for c_name, c_cfg in CONTESTANTS.items():
        print(f"  - {c_name:<15}: algo={c_cfg['algo']}, depth={c_cfg['depth']}, threads={c_cfg['threads']}")
    print(f"============================================================\n")

    matches = []
    game_id = 1

    pbar = tqdm(total=total_matches, desc="Tournament", unit="game")

    for p1, p2 in pairs:
        # Half as P1 Black, half as P2 Black
        half = args.games_per_pair // 2
        for i in range(args.games_per_pair):
            if i < half:
                b_name, w_name = p1, p2
            else:
                b_name, w_name = p2, p1

            match_seed = args.seed + game_id * 101
            pbar.set_postfix_str(f"G{game_id}: {b_name} vs {w_name}")
            res = play_match(exe_path, b_name, w_name, args.opening_plies, match_seed)
            res["game_id"] = game_id
            matches.append(res)
            game_id += 1
            pbar.update(1)

    pbar.close()

    # Save games detail
    df_games = pd.DataFrame(matches)
    games_csv = "results/tournament_games.csv"
    os.makedirs(os.path.dirname(games_csv), exist_ok=True)
    df_games.to_csv(games_csv, index=False)
    print(f"\nIndividual match logs saved to: {games_csv}")

    # Compute Standings
    standings = []
    for c in contestant_names:
        as_black = df_games[df_games["black"] == c]
        as_white = df_games[df_games["white"] == c]

        wins = len(as_black[as_black["winner"] == c]) + len(as_white[as_white["winner"] == c])
        losses = len(as_black[(as_black["winner"] != c) & (as_black["winner"] != "Draw")]) + \
                 len(as_white[(as_white["winner"] != c) & (as_white["winner"] != "Draw")])
        draws = len(as_black[as_black["winner"] == "Draw"]) + len(as_white[as_white["winner"] == "Draw"])
        total_games = wins + losses + draws

        # Margin: (discs for - discs against)
        diffs = list(as_black["black_discs"] - as_black["white_discs"]) + \
                list(as_white["white_discs"] - as_white["black_discs"])

        mean_diff = np.mean(diffs) if diffs else 0.0
        std_diff = np.std(diffs, ddof=1) if len(diffs) > 1 else 0.0
        se_diff = std_diff / np.sqrt(len(diffs)) if diffs else 0.0
        ci_95 = 1.96 * se_diff

        win_rate = (wins + 0.5 * draws) / total_games * 100.0 if total_games else 0.0

        standings.append({
            "contestant": c,
            "games": total_games,
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "win_rate_pct": win_rate,
            "mean_disc_diff": mean_diff,
            "ci_95": ci_95,
            "ci_lower": mean_diff - ci_95,
            "ci_upper": mean_diff + ci_95
        })

    df_standings = pd.DataFrame(standings).sort_values("win_rate_pct", ascending=False)
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    df_standings.to_csv(args.output, index=False, float_format="%.2f")
    print(f"Tournament standings saved to: {args.output}\n")

    # Print Leaderboard Table
    print("=" * 95)
    print("  FINAL TOURNAMENT LEADERBOARD")
    print("=" * 95)
    header = "{:<16} {:>6} {:>6} {:>6} {:>6} {:>10} {:>18} {:>16}"
    print(header.format("Contestant", "Games", "Wins", "Draws", "Losses", "Win Rate", "Mean Disc Diff", "95% Conf Int"))
    print("-" * 95)
    row_fmt = "{:<16} {:>6} {:>6} {:>6} {:>6} {:>9.1f}% {:>+17.2f} [{:>+6.2f}, {:>+6.2f}]"
    for _, r in df_standings.iterrows():
        print(row_fmt.format(
            r["contestant"],
            r["games"],
            r["wins"],
            r["draws"],
            r["losses"],
            r["win_rate_pct"],
            r["mean_disc_diff"],
            r["ci_lower"],
            r["ci_upper"]
        ))
    print("=" * 95)

if __name__ == "__main__":
    main()
