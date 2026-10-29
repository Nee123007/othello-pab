import os
import sys
import pytest
from fastapi.testclient import TestClient

from server.app import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

def test_api_system():
    res = client.get("/api/system")
    assert res.status_code == 200
    data = res.json()
    assert "cpu_count" in data
    assert data["cpu_count"] >= 1

def test_websocket_real_engine():
    engine_bin = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "build", "othello.exe" if sys.platform == "win32" else "othello")
    )
    if not os.path.exists(engine_bin):
        pytest.skip("C++ engine binary not compiled yet")

    with client.websocket_connect("/ws") as ws:
        # Initial board state
        init_state = ws.receive_json()
        assert init_state["type"] == "state"
        assert init_state["turn"] == "black"
        assert 19 in init_state["legal"]

        # Test eval
        ws.send_json({"type": "eval"})
        eval_res = ws.receive_json()
        assert eval_res["type"] == "evalbreakdown"
        assert "mobility" in eval_res["terms"]
        assert "total" in eval_res

        # Test unknown message rejection
        ws.send_json({"type": "invalid_unknown_action"})
        err = ws.receive_json()
        assert err["type"] == "error"

        # Test human move: sq 19
        ws.send_json({"type": "move", "sq": 19})
        state_after_human = ws.receive_json()
        assert state_after_human["type"] == "state"
        assert state_after_human["lastMove"] == 19
        assert 27 in state_after_human["flipped"]
        assert state_after_human["turn"] == "white"

        # Now engine should respond with info / bestmove, then state
        msgs = []
        while True:
            m = ws.receive_json()
            msgs.append(m)
            if m["type"] == "state":
                # Engine played its move
                break

        # Check that we received bestmove and final state
        types = [m["type"] for m in msgs]
        assert "bestmove" in types
        assert "state" in types

