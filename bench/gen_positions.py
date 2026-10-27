#!/usr/bin/env python3
"""
Seeded Random-Play Position Generator for Parallel Othello Benchmarks.
Generates reproducible test sets at:
- Early game (ply 10)
- Mid game (ply 25)
- Late game (ply 45)

Format: pos_id,64_char_board,side_to_move
"""

import sys
import os
import random

# Compass directions: (drow, dcol)
DIRECTIONS = [
    (-1, 0), (1, 0), (0, -1), (0, 1),
    (-1, -1), (-1, 1), (1, -1), (1, 1)
]

def create_initial_board():
    board = ['.'] * 64
    board[3 * 8 + 3] = 'O' # D4: White
    board[3 * 8 + 4] = 'X' # E4: Black
    board[4 * 8 + 3] = 'X' # D5: Black
    board[4 * 8 + 4] = 'O' # E5: White
    return board

def get_flips(board, sq, color):
    if board[sq] != '.':
        return []
    opp = 'O' if color == 'X' else 'X'
    r, c = divmod(sq, 8)
    total_flips = []

    for dr, dc in DIRECTIONS:
        flips = []
        cr, cc = r + dr, c + dc
        while 0 <= cr < 8 and 0 <= cc < 8 and board[cr * 8 + cc] == opp:
            flips.append(cr * 8 + cc)
            cr += dr
            cc += dc
        if 0 <= cr < 8 and 0 <= cc < 8 and board[cr * 8 + cc] == color:
            total_flips.extend(flips)

    return total_flips

def get_legal_moves(board, color):
    moves = []
    for sq in range(64):
        if get_flips(board, sq, color):
            moves.append(sq)
    return moves

def make_move(board, sq, color):
    flips = get_flips(board, sq, color)
    if not flips:
        return False
    board[sq] = color
    for f in flips:
        board[f] = color
    return True

def generate_position_at_ply(target_ply, rng):
    board = create_initial_board()
    turn = 'X' # Black starts
    passes_in_row = 0

    for _ in range(target_ply):
        moves = get_legal_moves(board, turn)
        if not moves:
            passes_in_row += 1
            if passes_in_row >= 2:
                # Terminal game reached early, retry
                return None
            turn = 'O' if turn == 'X' else 'X'
            continue

        passes_in_row = 0
        chosen_sq = rng.choice(moves)
        make_move(board, chosen_sq, turn)
        turn = 'O' if turn == 'X' else 'X'

    # Ensure position is not terminal
    if not get_legal_moves(board, turn):
        next_turn = 'O' if turn == 'X' else 'X'
        if not get_legal_moves(board, next_turn):
            return None

    board_str = "".join(board)
    side_char = 'b' if turn == 'X' else 'w'
    return board_str, side_char

def generate_dataset(count=30, seed=42, output_dir="bench"):
    os.makedirs(output_dir, exist_ok=True)
    rng = random.Random(seed)

    phases = [
        ("early", 10),
        ("mid", 25),
        ("late", 45)
    ]

    for phase_name, target_ply in phases:
        filepath = os.path.join(output_dir, f"{phase_name}.txt")
        print(f"Generating {count} {phase_name} positions (ply {target_ply}) -> {filepath}...")

        generated = 0
        attempts = 0
        with open(filepath, "w") as f:
            f.write(f"# Parallel Othello Benchmark Positions: {phase_name} (ply {target_ply}, seed {seed})\n")
            f.write("# pos_id,board_string,turn\n")

            while generated < count and attempts < count * 20:
                attempts += 1
                result = generate_position_at_ply(target_ply, rng)
                if result:
                    board_str, side = result
                    pos_id = f"{phase_name}_{generated + 1:03d}"
                    f.write(f"{pos_id},{board_str},{side}\n")
                    generated += 1

        print(f"  Successfully wrote {generated} positions to {filepath}")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42
    output_dir = sys.argv[3] if len(sys.argv) > 3 else "bench"
    generate_dataset(count=count, seed=seed, output_dir=output_dir)
