#!/usr/bin/env python3
"""
Interactive Othello Graphical User Interface (Pygame).
Decoupled frontend communicating with the C++ Othello Engine via text protocol.

Features:
- Modes:
  1. Human vs AI (Play as Black or White)
  2. AI vs AI (Spectator / Auto Battle with visual delay)
  3. AI vs AI (Step-by-Step Analysis)
- Board drawing with disc rendering, coordinates, and legal move indicators.
- Side panel with controls:
  - Algorithm selector (B0 Random, B0 Greedy, B1, B2, P1, P2, P3)
  - Thread count (1, 2, 4, 8)
  - Search depth (1 to 10)
  - Mode toggle: Human vs AI, AI vs AI (Auto), AI vs AI (Step)
- Real-time engine telemetry:
  - Evaluated Nodes, Search Time (ms), Score (cp), Best Move
- New Game, Undo, and Step Advance buttons
"""

import sys
import os
import subprocess
import threading
import queue
import pygame

# Colors
COLOR_BG = (28, 32, 38)
COLOR_BOARD = (34, 139, 34)
COLOR_BOARD_GRID = (20, 90, 20)
COLOR_PANEL = (38, 44, 52)
COLOR_PANEL_BORDER = (55, 63, 75)
COLOR_TEXT_MAIN = (240, 240, 240)
COLOR_TEXT_MUTED = (160, 168, 178)
COLOR_TEXT_HIGHLIGHT = (80, 200, 120)
COLOR_BTN_NORMAL = (50, 60, 72)
COLOR_BTN_HOVER = (68, 82, 98)
COLOR_BTN_ACTIVE = (41, 128, 185)
COLOR_BLACK_DISC = (15, 15, 15)
COLOR_WHITE_DISC = (245, 245, 245)
COLOR_LEGAL_MOVE = (255, 255, 255, 90)
COLOR_BEST_MOVE = (241, 196, 15, 180)

# Board Dimensions
BOARD_SIZE = 8
CELL_SIZE = 75
BOARD_OFFSET_X = 30
BOARD_OFFSET_Y = 30
BOARD_WIDTH = CELL_SIZE * BOARD_SIZE
BOARD_HEIGHT = CELL_SIZE * BOARD_SIZE

WINDOW_WIDTH = BOARD_OFFSET_X * 2 + BOARD_WIDTH + 340
WINDOW_HEIGHT = BOARD_OFFSET_Y * 2 + BOARD_HEIGHT

class EngineBridge:
    def __init__(self, exe_path="./build/othello.exe"):
        self.exe_path = exe_path
        self.process = None
        self.msg_queue = queue.Queue()
        self.running = False
        self.start()

    def start(self):
        if not os.path.exists(self.exe_path):
            if os.path.exists(self.exe_path + ".exe"):
                self.exe_path += ".exe"
            else:
                print(f"Warning: Engine '{self.exe_path}' not found.")
                return

        try:
            self.process = subprocess.Popen(
                [self.exe_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            self.running = True
            threading.Thread(target=self._reader_thread, daemon=True).start()
        except Exception as e:
            print(f"Engine launch error: {e}")

    def _reader_thread(self):
        while self.running and self.process:
            line = self.process.stdout.readline()
            if not line:
                break
            line = line.strip()
            if line:
                self.msg_queue.put(line)

    def send(self, cmd):
        if self.process and self.process.stdin:
            try:
                self.process.stdin.write(cmd + "\n")
                self.process.stdin.flush()
            except Exception as e:
                print(f"Send error: {e}")

    def get_message(self):
        try:
            return self.msg_queue.get_nowait()
        except queue.Empty:
            return None

    def close(self):
        self.running = False
        if self.process:
            try:
                self.send("quit")
                self.process.terminate()
            except:
                pass

class OthelloGame:
    def __init__(self):
        self.board = [[0]*8 for _ in range(8)]
        self.turn = 1  # 1: Black, -1: White
        self.black_count = 2
        self.white_count = 2
        self.history = []
        self.reset()

    def reset(self):
        self.board = [[0]*8 for _ in range(8)]
        self.board[3][3] = -1
        self.board[3][4] = 1
        self.board[4][3] = 1
        self.board[4][4] = -1
        self.turn = 1
        self.history = []
        self.update_counts()

    def update_counts(self):
        b, w = 0, 0
        for r in range(8):
            for c in range(8):
                if self.board[r][c] == 1: b += 1
                elif self.board[r][c] == -1: w += 1
        self.black_count = b
        self.white_count = w

    def get_flips(self, r, c, color):
        if self.board[r][c] != 0:
            return []
        opp = -color
        flips = []
        directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
        for dr, dc in directions:
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
        if not flips:
            return False
        # Save history for undo
        board_copy = [row[:] for row in self.board]
        self.history.append((board_copy, self.turn))

        self.board[r][c] = self.turn
        for fr, fc in flips:
            self.board[fr][fc] = self.turn
        self.turn = -self.turn
        self.update_counts()
        return True

    def pass_turn(self):
        board_copy = [row[:] for row in self.board]
        self.history.append((board_copy, self.turn))
        self.turn = -self.turn

    def undo(self):
        if self.history:
            prev_board, prev_turn = self.history.pop()
            self.board = prev_board
            self.turn = prev_turn
            self.update_counts()
            return True
        return False

    def is_game_over(self):
        return len(self.get_legal_moves(1)) == 0 and len(self.get_legal_moves(-1)) == 0

    def to_board_string(self):
        s = []
        for r in range(8):
            for c in range(8):
                if self.board[r][c] == 1: s.append('X')
                elif self.board[r][c] == -1: s.append('O')
                else: s.append('.')
        side_ch = 'b' if self.turn == 1 else 'w'
        return "".join(s), side_ch

def square_to_coord(sq):
    r = sq // 8
    c = sq % 8
    return f"{chr(ord('a') + c)}{r + 1}"

def coord_to_square(coord):
    if len(coord) != 2: return -1
    c = ord(coord[0].lower()) - ord('a')
    r = int(coord[1]) - 1
    if 0 <= r < 8 and 0 <= c < 8:
        return r * 8 + c
    return -1

def main():
    pygame.init()
    pygame.display.set_caption("Parallel Alpha-Beta Othello Engine (C++17)")
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
    clock = pygame.time.Clock()

    font_title = pygame.font.SysFont("Segoe UI, Arial", 18, bold=True)
    font_bold = pygame.font.SysFont("Segoe UI, Arial", 14, bold=True)
    font_main = pygame.font.SysFont("Segoe UI, Arial", 13)
    font_small = pygame.font.SysFont("Segoe UI, Arial", 11)

    engine = EngineBridge()
    game = OthelloGame()

    # Settings State
    algos = ["b2", "p3", "p2", "p1", "b0_greedy", "b0_random", "b1"]
    algo_idx = 0  # Default B2
    threads_list = [1, 2, 4, 8]
    threads_idx = 2  # Default 4 threads
    depth = 6

    # Game Modes: 0: Human vs AI (Black), 1: Human vs AI (White), 2: AI vs AI (Auto), 3: AI vs AI (Step)
    modes = ["Human (Black) vs AI", "Human (White) vs AI", "AI vs AI (Auto Spectator)", "AI vs AI (Step Mode)"]
    mode_idx = 0

    # Engine Telemetry
    engine_thinking = False
    pending_best_move = None
    last_move_time = pygame.time.get_ticks()
    last_stats = {
        "move": "---",
        "value": 0,
        "nodes": 0,
        "time_ms": 0.0,
        "player": "---"
    }

    def start_engine_search():
        nonlocal engine_thinking
        if engine_thinking or game.is_game_over():
            return
        engine_thinking = True
        algo = algos[algo_idx]
        threads = threads_list[threads_idx]
        b_str, side_ch = game.to_board_string()
        engine.send(f"setboard {b_str} {side_ch}")
        engine.send(f"go depth {depth} algo {algo} threads {threads}")

    running = True
    while running:
        current_time = pygame.time.get_ticks()

        # Check engine responses
        while True:
            msg = engine.get_message()
            if not msg:
                break
            if msg.startswith("bestmove"):
                parts = msg.split()
                move_str = parts[1] if len(parts) > 1 else ""
                val = int(parts[3]) if len(parts) > 3 else 0
                nodes = int(parts[5]) if len(parts) > 5 else 0
                time_ms = float(parts[7]) if len(parts) > 7 else 0.0

                sq = coord_to_square(move_str)
                r, c = (sq // 8, sq % 8) if sq >= 0 else (-1, -1)

                last_stats["move"] = move_str
                last_stats["value"] = val
                last_stats["nodes"] = nodes
                last_stats["time_ms"] = time_ms
                last_stats["player"] = "Black" if game.turn == 1 else "White"

                engine_thinking = False
                last_move_time = current_time

                if mode_idx == 3:  # AI vs AI (Step)
                    pending_best_move = (r, c)
                else:
                    if r >= 0 and c >= 0:
                        game.make_move(r, c)
                    else:
                        game.pass_turn()

        # Determine if it's AI's turn
        is_ai_turn = False
        if not game.is_game_over() and not engine_thinking:
            if mode_idx == 0 and game.turn == -1:  # Human is Black, AI is White
                is_ai_turn = True
            elif mode_idx == 1 and game.turn == 1:  # Human is White, AI is Black
                is_ai_turn = True
            elif mode_idx == 2:  # AI vs AI (Auto)
                if current_time - last_move_time >= 350:  # 350ms delay between plies
                    is_ai_turn = True

        if is_ai_turn and pending_best_move is None:
            if game.get_legal_moves(game.turn):
                start_engine_search()
            else:
                game.pass_turn()

        # Handle Events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos

                # Check click on board (only in Human modes)
                if (BOARD_OFFSET_X <= mx < BOARD_OFFSET_X + BOARD_WIDTH and
                    BOARD_OFFSET_Y <= my < BOARD_OFFSET_Y + BOARD_HEIGHT):
                    col = (mx - BOARD_OFFSET_X) // CELL_SIZE
                    row = (my - BOARD_OFFSET_Y) // CELL_SIZE

                    can_human_move = (mode_idx == 0 and game.turn == 1) or (mode_idx == 1 and game.turn == -1)
                    if can_human_move and not engine_thinking:
                        if game.make_move(row, col):
                            last_move_time = current_time

                # Check Side Panel Button Clicks
                px = BOARD_OFFSET_X * 2 + BOARD_WIDTH
                py = BOARD_OFFSET_Y

                # Game Mode switch button
                if px <= mx <= px + 280 and py + 45 <= my <= py + 75:
                    mode_idx = (mode_idx + 1) % len(modes)
                    pending_best_move = None
                    last_move_time = current_time

                # Algorithm switch button
                if px <= mx <= px + 280 and py + 85 <= my <= py + 115:
                    algo_idx = (algo_idx + 1) % len(algos)

                # Threads switch button
                if px <= mx <= px + 280 and py + 125 <= my <= py + 155:
                    threads_idx = (threads_idx + 1) % len(threads_list)

                # Depth - / +
                if px + 120 <= mx <= px + 150 and py + 165 <= my <= py + 195:
                    depth = max(1, depth - 1)
                if px + 160 <= mx <= px + 190 and py + 165 <= my <= py + 195:
                    depth = min(10, depth + 1)

                # Step Advance button (in Step Mode)
                if mode_idx == 3:
                    if px <= mx <= px + 280 and py + 210 <= my <= py + 245:
                        if pending_best_move is not None:
                            r, c = pending_best_move
                            if r >= 0 and c >= 0: game.make_move(r, c)
                            else: game.pass_turn()
                            pending_best_move = None
                            last_move_time = current_time
                        elif not engine_thinking and not game.is_game_over():
                            if game.get_legal_moves(game.turn):
                                start_engine_search()
                            else:
                                game.pass_turn()

                # New Game button
                if px <= mx <= px + 135 and py + 520 <= my <= py + 555:
                    game.reset()
                    engine.send("new")
                    pending_best_move = None
                    engine_thinking = False
                    last_move_time = current_time

                # Undo button
                if px + 145 <= mx <= px + 280 and py + 520 <= my <= py + 555:
                    if not engine_thinking:
                        game.undo()
                        if mode_idx in [0, 1]:  # In human mode, undo 2 moves
                            game.undo()
                        pending_best_move = None
                        last_move_time = current_time

        # --- DRAWING ---
        screen.fill(COLOR_BG)

        # 1. Draw 8x8 Board
        board_rect = pygame.Rect(BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_WIDTH, BOARD_HEIGHT)
        pygame.draw.rect(screen, COLOR_BOARD, board_rect)
        pygame.draw.rect(screen, COLOR_PANEL_BORDER, board_rect, 3)

        # Grid lines
        for i in range(9):
            x = BOARD_OFFSET_X + i * CELL_SIZE
            y = BOARD_OFFSET_Y + i * CELL_SIZE
            pygame.draw.line(screen, COLOR_BOARD_GRID, (x, BOARD_OFFSET_Y), (x, BOARD_OFFSET_Y + BOARD_HEIGHT), 2)
            pygame.draw.line(screen, COLOR_BOARD_GRID, (BOARD_OFFSET_X, y), (BOARD_OFFSET_X + BOARD_WIDTH, y), 2)

        # Corner guide markers
        for r_m, c_m in [(2,2), (2,6), (6,2), (6,6)]:
            dot_x = BOARD_OFFSET_X + c_m * CELL_SIZE
            dot_y = BOARD_OFFSET_Y + r_m * CELL_SIZE
            pygame.draw.circle(screen, COLOR_BOARD_GRID, (dot_x, dot_y), 4)

        # Draw Discs
        for r in range(8):
            for c in range(8):
                cx = BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE // 2
                cy = BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE // 2
                disc = game.board[r][c]

                if disc != 0:
                    radius = CELL_SIZE // 2 - 5
                    color = COLOR_BLACK_DISC if disc == 1 else COLOR_WHITE_DISC
                    pygame.draw.circle(screen, (30, 30, 30), (cx + 2, cy + 2), radius) # Drop shadow
                    pygame.draw.circle(screen, color, (cx, cy), radius)
                    hl_color = (60, 60, 60) if disc == 1 else (255, 255, 255)
                    pygame.draw.circle(screen, hl_color, (cx - 4, cy - 4), radius // 3)

        # Highlight Legal Moves for Human
        can_human_act = (mode_idx == 0 and game.turn == 1) or (mode_idx == 1 and game.turn == -1)
        if can_human_act and not engine_thinking:
            for r, c in game.get_legal_moves(game.turn):
                cx = BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE // 2
                cy = BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE // 2
                s = pygame.Surface((CELL_SIZE, CELL_SIZE), pygame.SRCALPHA)
                pygame.draw.circle(s, COLOR_LEGAL_MOVE, (CELL_SIZE // 2, CELL_SIZE // 2), 9)
                screen.blit(s, (BOARD_OFFSET_X + c * CELL_SIZE, BOARD_OFFSET_Y + r * CELL_SIZE))

        # Highlight Candidate Move in Step Mode
        if pending_best_move is not None:
            pr, pc = pending_best_move
            if pr >= 0 and pc >= 0:
                s = pygame.Surface((CELL_SIZE, CELL_SIZE), pygame.SRCALPHA)
                pygame.draw.circle(s, COLOR_BEST_MOVE, (CELL_SIZE // 2, CELL_SIZE // 2), 16, 4)
                screen.blit(s, (BOARD_OFFSET_X + pc * CELL_SIZE, BOARD_OFFSET_Y + pr * CELL_SIZE))

        # 2. Draw Side Panel
        px = BOARD_OFFSET_X * 2 + BOARD_WIDTH
        py = BOARD_OFFSET_Y
        panel_rect = pygame.Rect(px - 10, py, 300, BOARD_HEIGHT)
        pygame.draw.rect(screen, COLOR_PANEL, panel_rect, border_radius=8)
        pygame.draw.rect(screen, COLOR_PANEL_BORDER, panel_rect, 2, border_radius=8)

        # Title
        screen.blit(font_title.render("Othello Control Panel", True, COLOR_TEXT_MAIN), (px, py + 12))

        def draw_btn(x, y, w, h, text, is_active=False):
            mouse_x, mouse_y = pygame.mouse.get_pos()
            hover = (x <= mouse_x <= x + w and y <= mouse_y <= y + h)
            btn_col = COLOR_BTN_ACTIVE if is_active else (COLOR_BTN_HOVER if hover else COLOR_BTN_NORMAL)
            r = pygame.Rect(x, y, w, h)
            pygame.draw.rect(screen, btn_col, r, border_radius=6)
            pygame.draw.rect(screen, COLOR_PANEL_BORDER, r, 1, border_radius=6)
            txt = font_bold.render(text, True, COLOR_TEXT_MAIN)
            screen.blit(txt, (x + (w - txt.get_width()) // 2, y + (h - txt.get_height()) // 2))

        # Mode Selector
        draw_btn(px, py + 45, 280, 30, f"Mode: {modes[mode_idx]}", is_active=("AI vs AI" in modes[mode_idx]))

        # Algorithm Selector
        draw_btn(px, py + 85, 280, 30, f"AI Engine: {algos[algo_idx].upper()}")

        # Threads Selector
        draw_btn(px, py + 125, 280, 30, f"Parallel Threads: {threads_list[threads_idx]} Cores")

        # Depth Selector
        screen.blit(font_main.render(f"Search Depth: {depth}", True, COLOR_TEXT_MAIN), (px + 5, py + 172))
        draw_btn(px + 120, py + 165, 30, 30, "-")
        draw_btn(px + 160, py + 165, 30, 30, "+")

        # Step Advance Button (in Step Mode)
        if mode_idx == 3:
            btn_txt = ">>> Commit Candidate Move <<<" if pending_best_move is not None else ">>> Compute Next AI Move <<<"
            draw_btn(px, py + 210, 280, 35, btn_txt, is_active=True)

        # Telemetry Box
        tbox_y = py + 265
        tbox_rect = pygame.Rect(px, tbox_y, 280, 180)
        pygame.draw.rect(screen, (22, 26, 32), tbox_rect, border_radius=6)
        pygame.draw.rect(screen, COLOR_PANEL_BORDER, tbox_rect, 1, border_radius=6)

        screen.blit(font_bold.render("Engine Telemetry", True, COLOR_TEXT_HIGHLIGHT), (px + 10, tbox_y + 8))
        status_txt = "Thinking..." if engine_thinking else ("Waiting for Human" if can_human_act else "Idle")
        screen.blit(font_small.render(f"Status: {status_txt}", True, COLOR_TEXT_MUTED), (px + 10, tbox_y + 32))
        screen.blit(font_main.render(f"Player:        {last_stats['player']}", True, COLOR_TEXT_MAIN), (px + 10, tbox_y + 56))
        screen.blit(font_main.render(f"Best Move:     {last_stats['move'].upper()}", True, COLOR_TEXT_MAIN), (px + 10, tbox_y + 80))
        screen.blit(font_main.render(f"Score:         {last_stats['value']} cp", True, COLOR_TEXT_MAIN), (px + 10, tbox_y + 104))
        screen.blit(font_main.render(f"Nodes:         {last_stats['nodes']:,}", True, COLOR_TEXT_MAIN), (px + 10, tbox_y + 128))
        screen.blit(font_main.render(f"Search Time:   {last_stats['time_ms']:.2f} ms", True, COLOR_TEXT_MAIN), (px + 10, tbox_y + 152))

        # Score & Status Bar
        sbar_y = py + 465
        screen.blit(font_bold.render(f"Black (●): {game.black_count}   White (○): {game.white_count}", True, COLOR_TEXT_MAIN), (px + 10, sbar_y))
        turn_str = "Black's Turn" if game.turn == 1 else "White's Turn"
        if game.is_game_over():
            if game.black_count > game.white_count: turn_str = "Game Over: Black Wins!"
            elif game.white_count > game.black_count: turn_str = "Game Over: White Wins!"
            else: turn_str = "Game Over: Draw!"
        screen.blit(font_main.render(f"State: {turn_str}", True, COLOR_TEXT_HIGHLIGHT), (px + 10, sbar_y + 24))

        # Bottom Action Buttons
        draw_btn(px, py + 520, 135, 35, "New Game")
        draw_btn(px + 145, py + 520, 135, 35, "Undo")

        pygame.display.flip()
        clock.tick(60)

    engine.close()
    pygame.quit()

if __name__ == "__main__":
    main()
