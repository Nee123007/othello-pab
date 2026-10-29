import json
import math
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from server.app import app

client = TestClient(app)

# ── 1. Unit Tests ─────────────────────────────────────────────

def square_to_coord(sq: int) -> str:
    col = chr(ord('a') + (sq % 8))
    row = str((sq // 8) + 1)
    return f"{col}{row}"

def get_chebyshev_distance(sq1: int, sq2: int) -> int:
    r1, c1 = sq1 // 8, sq1 % 8
    r2, c2 = sq2 // 8, sq2 % 8
    return max(abs(r1 - r2), abs(c1 - c2))

def get_flip_delay_ms(placed_sq: int, flipped_sq: int) -> int:
    return get_chebyshev_distance(placed_sq, flipped_sq) * 60

def test_move_formatting():
    # Corner squares
    assert square_to_coord(0) == "a1"
    assert square_to_coord(7) == "h1"
    assert square_to_coord(56) == "a8"
    assert square_to_coord(63) == "h8"
    # Opening legal moves: [19, 26, 37, 44]
    assert square_to_coord(19) == "d3"
    assert square_to_coord(26) == "c4"
    assert square_to_coord(37) == "f5"
    assert square_to_coord(44) == "e6"

def test_flip_stagger_delays():
    # Distance 1: adjacent square
    assert get_flip_delay_ms(19, 27) == 60   # (2,3) to (3,3)
    # Distance 2: 120ms
    assert get_flip_delay_ms(0, 18) == 120  # (0,0) to (2,2)
    # Distance 7: opposite corner
    assert get_flip_delay_ms(0, 63) == 420  # 7 * 60 = 420ms

def test_ybwc_tree_leaf_counting():
    tree_path = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "data" / "ybwc_tree.json"
    assert tree_path.exists(), "ybwc_tree.json must exist in web/public/data"
    
    with open(tree_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Total leaves in tree (Root splitting expands all)
    total_leaves = sum(len(c["leaves"]) for c in data["children"])
    assert total_leaves == 9, f"Expected 9 total leaves for Figure 1 tree, got {total_leaves}"

    # YBWC: eldest brother searched fully; young brothers cut off at first leaf <= alpha
    eldest = data["children"][0]
    alpha = min(eldest["leaves"]) # returns 5
    assert alpha == 5

    ybwc_count = len(eldest["leaves"]) # 3 leaves
    for child in data["children"][1:]:
        for leaf in child["leaves"]:
            ybwc_count += 1
            if leaf <= alpha:
                break

    assert ybwc_count == 5, f"Expected 5 visited leaves in YBWC, got {ybwc_count}"
    
    # Overhead calculation: 9 / 5 - 1 = 80%
    overhead_pct = round(((total_leaves / ybwc_count) - 1) * 100)
    assert overhead_pct == 80, f"Expected 80% search overhead, got {overhead_pct}%"

def test_csv_to_json_accuracy():
    summary_json = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "data" / "summary.json"
    assert summary_json.exists(), "summary.json must exist"
    with open(summary_json, "r", encoding="utf-8") as f:
        rows = json.load(f)
    assert len(rows) > 0
    first = rows[0]
    assert "algo" in first
    assert "threads" in first
    assert "sop_mean" in first
    assert "speedup_mean" in first

# ── 2. E2E WebSocket Game Flow Tests ─────────────────────────

def test_full_game_flow_undo_and_hint():
    with client.websocket_connect("/ws") as ws:
        # 1. Initial State
        init_state = ws.receive_json()
        assert init_state["type"] == "state"
        assert init_state["turn"] == "black"
        assert init_state["score"] == {"black": 2, "white": 2}

        # 2. Configure new match (P3 YBWC, 2 threads, depth 4)
        ws.send_json({
            "type": "new",
            "human": "black",
            "algo": "p3",
            "threads": 2,
            "depth": 4,
            "timeMs": None
        })
        new_state = ws.receive_json()
        assert new_state["type"] == "state"
        assert new_state["turn"] == "black"

        # 3. Request Hint
        ws.send_json({"type": "hint"})
        hint_msg = ws.receive_json()
        assert hint_msg["type"] == "bestmove"
        assert hint_msg["sq"] in [19, 26, 37, 44]

        # 4. Human Move: 19 (d3)
        ws.send_json({"type": "move", "sq": 19})
        human_state = ws.receive_json()
        assert human_state["type"] == "state"
        assert human_state["lastMove"] == 19
        assert human_state["turn"] == "white"

        # 5. Engine Turn
        engine_msgs = []
        while True:
            m = ws.receive_json()
            engine_msgs.append(m)
            if m["type"] == "state":
                break

        engine_state = engine_msgs[-1]
        assert engine_state["turn"] == "black" # Back to human turn
        assert engine_state["lastMove"] is not None

        # 6. Test Undo: Reverts both engine and human move back to black
        ws.send_json({"type": "undo"})
        undone_state = ws.receive_json()
        assert undone_state["type"] == "state"
        assert undone_state["turn"] == "black"
        assert undone_state["score"] == {"black": 2, "white": 2}

