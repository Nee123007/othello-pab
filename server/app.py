import asyncio
import os
import random
from typing import Literal, Optional, Union
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError

from .engine_proc import EngineProcess

MAX_CONCURRENT_GAMES = int(os.environ.get("MAX_GAMES", "4"))
active_games = 0
active_games_lock = asyncio.Lock()

# Pydantic schemas for inbound messages
class NewMessage(BaseModel):
    type: Literal["new"]
    human: Literal["black", "white", "random", "none"] = "black"
    algo: Literal["b2", "p1", "p2", "p3"] = "p3"
    threads: int = Field(default=4, ge=1)
    depth: int = Field(default=8, ge=1, le=12)
    timeMs: Optional[int] = Field(default=None, le=10000)
    algo_black: Optional[Literal["b2", "p1", "p2", "p3"]] = None
    threads_black: Optional[int] = None
    depth_black: Optional[int] = None
    algo_white: Optional[Literal["b2", "p1", "p2", "p3"]] = None
    threads_white: Optional[int] = None
    depth_white: Optional[int] = None
    delay_ms: Optional[int] = 500

class MoveMessage(BaseModel):
    type: Literal["move"]
    sq: int = Field(ge=0, le=63)

class UndoMessage(BaseModel):
    type: Literal["undo"]

class HintMessage(BaseModel):
    type: Literal["hint"]

class StopMessage(BaseModel):
    type: Literal["stop"]

class PauseMessage(BaseModel):
    type: Literal["pause"]

class ResumeMessage(BaseModel):
    type: Literal["resume"]

class StepMessage(BaseModel):
    type: Literal["step"]

class EvalMessage(BaseModel):
    type: Literal["eval"]

class ConfigMessage(BaseModel):
    type: Literal["config"]
    algo: Literal["b2", "p1", "p2", "p3"] = "p3"
    threads: int = Field(default=4, ge=1)
    depth: int = Field(default=8, ge=1, le=12)
    timeMs: Optional[int] = Field(default=None, le=10000)

ClientMessage = Union[
    NewMessage, MoveMessage, UndoMessage, HintMessage, StopMessage,
    PauseMessage, ResumeMessage, StepMessage, EvalMessage, ConfigMessage
]

app = FastAPI(title="Ebon & Ivory Bridge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/system")
async def system_info():
    return {"cpu_count": os.cpu_count() or 4}

class GameSession:
    def __init__(self, websocket: WebSocket, engine: EngineProcess):
        self.ws = websocket
        self.engine = engine
        self.human_color: str = "black"  # "black", "white", "none" (for AI vs AI)
        self.algo: str = "p3"
        self.threads: int = min(4, os.cpu_count() or 4)
        self.depth: int = 8
        self.time_ms: Optional[int] = None

        # Individual AI parameters for AI vs AI
        self.algo_black: str = "p3"
        self.threads_black: int = min(4, os.cpu_count() or 4)
        self.depth_black: int = 6
        self.algo_white: str = "b2"
        self.threads_white: int = 1
        self.depth_white: int = 6
        self.delay_ms: int = 500

        self.is_paused: bool = False
        self.current_turn: str = "black"
        self.status: str = "playing"
        self._turn_task: Optional[asyncio.Task] = None

    def clamp_config(self, algo: str, threads: int, depth: int, time_ms: Optional[int]):
        max_cpus = os.cpu_count() or 4
        self.algo = algo if algo in ["b2", "p1", "p2", "p3"] else "b2"
        self.threads = max(1, min(threads, max_cpus))
        self.depth = max(1, min(depth, 12))
        self.time_ms = min(time_ms, 10000) if time_ms is not None else None

    async def execute_engine_turn(self, single_step: bool = False):
        """Run engine search, forward stream, play move, and update state."""
        max_cpus = os.cpu_count() or 4
        while self.status == "playing" and self.current_turn != self.human_color and not self.is_paused:
            # Select parameters according to turn
            if self.human_color == "none":
                if self.current_turn == "black":
                    algo = self.algo_black
                    threads = self.threads_black
                    depth = self.depth_black
                else:
                    algo = self.algo_white
                    threads = self.threads_white
                    depth = self.depth_white
            else:
                algo = self.algo
                threads = self.threads
                depth = self.depth

            go_cmd = f"go depth {depth} algo {algo} threads {threads}"
            if self.time_ms:
                go_cmd += f" timeMs {self.time_ms}"

            await self.engine.send_command(go_cmd)

            bestmove_sq = -1
            async for msg in self.engine.stream_until_bestmove():
                await self.ws.send_json(msg)
                if msg.get("type") == "bestmove":
                    bestmove_sq = msg.get("sq", -1)
                    break

            if bestmove_sq >= 0:
                await self.engine.send_command(f"play {bestmove_sq}")
                new_state = await self.engine.read_response_line()
                await self.ws.send_json(new_state)

                self.current_turn = new_state.get("turn", "black")
                self.status = new_state.get("status", "playing")

                if self.status == "gameover":
                    score = new_state.get("score", {"black": 0, "white": 0})
                    winner = "draw"
                    if score["black"] > score["white"]:
                        winner = "black"
                    elif score["white"] > score["black"]:
                        winner = "white"
                    await self.ws.send_json({
                        "type": "gameover",
                        "winner": winner,
                        "score": score
                    })
                    break
                elif self.status == "passed":
                    if self.current_turn != self.human_color:
                        continue
                    else:
                        break

                if single_step:
                    break

                # Delay between AI moves in AI vs AI mode so the user can comfortably spectate
                if self.human_color == "none":
                    if self.delay_ms > 0:
                        await asyncio.sleep(self.delay_ms / 1000.0)
            else:
                break

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global active_games
    await websocket.accept()

    async with active_games_lock:
        if active_games >= MAX_CONCURRENT_GAMES:
            await websocket.send_json({
                "type": "error",
                "message": f"Server busy: maximum {MAX_CONCURRENT_GAMES} concurrent sessions reached."
            })
            await websocket.close()
            return
        active_games += 1

    engine = EngineProcess()
    try:
        await engine.start()
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to start engine binary: {str(e)}"
        })
        await websocket.close()
        async with active_games_lock:
            active_games -= 1
        return

    session = GameSession(websocket, engine)

    try:
        # Send initial board state on connect
        await engine.send_command("state")
        init_state = await engine.read_response_line()
        session.current_turn = init_state.get("turn", "black")
        session.status = init_state.get("status", "playing")
        await websocket.send_json(init_state)

        while True:
            raw_msg = await websocket.receive_json()

            msg_type = raw_msg.get("type")
            if not msg_type:
                await websocket.send_json({"type": "error", "message": "Missing 'type' in message"})
                continue

            try:
                if msg_type == "new":
                    msg = NewMessage(**raw_msg)
                    human = msg.human
                    if human == "random":
                        human = random.choice(["black", "white"])
                    session.human_color = human
                    session.clamp_config(msg.algo, msg.threads, msg.depth, msg.timeMs)

                    # Update AI vs AI params if provided
                    max_cpus = os.cpu_count() or 4
                    if msg.algo_black: session.algo_black = msg.algo_black
                    if msg.threads_black: session.threads_black = max(1, min(msg.threads_black, max_cpus))
                    if msg.depth_black: session.depth_black = max(1, min(msg.depth_black, 12))
                    if msg.algo_white: session.algo_white = msg.algo_white
                    if msg.threads_white: session.threads_white = max(1, min(msg.threads_white, max_cpus))
                    if msg.depth_white: session.depth_white = max(1, min(msg.depth_white, 12))
                    if msg.delay_ms is not None: session.delay_ms = max(50, min(msg.delay_ms, 3000))

                    session.is_paused = False
                    await engine.send_command("new")
                    state = await engine.read_response_line()
                    session.current_turn = state.get("turn", "black")
                    session.status = state.get("status", "playing")
                    await websocket.send_json(state)

                    if session.human_color in ["white", "none"]:
                        asyncio.create_task(session.execute_engine_turn())

                elif msg_type == "move":
                    msg = MoveMessage(**raw_msg)
                    await engine.send_command(f"play {msg.sq}")
                    state = await engine.read_response_line()
                    await websocket.send_json(state)

                    if state.get("type") == "state":
                        session.current_turn = state.get("turn", "black")
                        session.status = state.get("status", "playing")

                        if session.status == "gameover":
                            score = state.get("score", {"black": 0, "white": 0})
                            winner = "draw"
                            if score["black"] > score["white"]:
                                winner = "black"
                            elif score["white"] > score["black"]:
                                winner = "white"
                            await websocket.send_json({
                                "type": "gameover",
                                "winner": winner,
                                "score": score
                            })
                        elif session.current_turn != session.human_color:
                            asyncio.create_task(session.execute_engine_turn())

                elif msg_type == "pause":
                    session.is_paused = True
                    await engine.stop_search()
                    await websocket.send_json({"type": "paused"})

                elif msg_type == "resume":
                    session.is_paused = False
                    asyncio.create_task(session.execute_engine_turn())
                    await websocket.send_json({"type": "resumed"})

                elif msg_type == "step":
                    session.is_paused = True
                    asyncio.create_task(session.execute_engine_turn(single_step=True))

                elif msg_type == "undo":
                    await engine.send_command("undo")
                    state = await engine.read_response_line()
                    if state.get("type") == "state" and state.get("turn") != session.human_color and session.human_color != "none":
                        await engine.send_command("undo")
                        state = await engine.read_response_line()
                    await websocket.send_json(state)
                    if state.get("type") == "state":
                        session.current_turn = state.get("turn", "black")
                        session.status = state.get("status", "playing")

                elif msg_type == "hint":
                    go_cmd = f"go depth {session.depth} algo {session.algo} threads {session.threads}"
                    await engine.send_command(go_cmd)
                    async for m in engine.stream_until_bestmove():
                        if m.get("type") == "bestmove":
                            await websocket.send_json(m)
                            break

                elif msg_type == "stop":
                    await engine.stop_search()

                elif msg_type == "eval":
                    await engine.send_command("eval")
                    eval_msg = await engine.read_response_line()
                    await websocket.send_json(eval_msg)

                elif msg_type == "config":
                    msg = ConfigMessage(**raw_msg)
                    session.clamp_config(msg.algo, msg.threads, msg.depth, msg.timeMs)
                    await websocket.send_json({"type": "config_ack", "status": "ok"})

                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {msg_type}"
                    })

            except ValidationError as ve:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Validation error: {ve.errors()}"
                })
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Internal error: {str(e)}"
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": f"Engine failure: {str(e)}"})
        except Exception:
            pass
    finally:
        await engine.kill()
        async with active_games_lock:
            active_games -= 1

# Mount static frontend files if built
web_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "dist"))
if os.path.isdir(web_dist_dir):
    app.mount("/", StaticFiles(directory=web_dist_dir, html=True), name="static")
