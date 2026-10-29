import asyncio
import json
import os
import sys
from typing import AsyncGenerator, Optional, Dict, Any

DEFAULT_ENGINE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "build", "othello.exe" if sys.platform == "win32" else "othello")
)

class EngineProcess:
    def __init__(self, engine_path: Optional[str] = None):
        self.engine_path = engine_path or os.environ.get("ENGINE_PATH", DEFAULT_ENGINE_PATH)
        self.proc: Optional[asyncio.subprocess.Process] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if not os.path.exists(self.engine_path):
            raise FileNotFoundError(f"Engine binary not found at: {self.engine_path}")

        self.proc = await asyncio.create_subprocess_exec(
            self.engine_path,
            "--json",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

    async def is_alive(self) -> bool:
        return self.proc is not None and self.proc.returncode is None

    async def send_command(self, cmd: str) -> None:
        if not await self.is_alive():
            raise RuntimeError("Engine process is not running")
        assert self.proc and self.proc.stdin
        self.proc.stdin.write(f"{cmd.strip()}\n".encode("utf-8"))
        await self.proc.stdin.drain()

    async def read_response_line(self) -> Dict[str, Any]:
        if not await self.is_alive():
            raise RuntimeError("Engine process is not running")
        assert self.proc and self.proc.stdout
        line = await self.proc.stdout.readline()
        if not line:
            raise EOFError("Engine process closed stdout unexpectedly")
        line_str = line.decode("utf-8").strip()
        try:
            return json.loads(line_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Engine emitted invalid JSON: {line_str}") from e

    async def stream_until_bestmove(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream info messages until bestmove is encountered."""
        while await self.is_alive():
            msg = await self.read_response_line()
            yield msg
            if msg.get("type") == "bestmove":
                break

    async def stop_search(self) -> None:
        if await self.is_alive():
            await self.send_command("stop")

    async def kill(self) -> None:
        if self.proc:
            try:
                if self.proc.returncode is None:
                    try:
                        assert self.proc.stdin
                        self.proc.stdin.write(b"quit\n")
                        await self.proc.stdin.drain()
                        await asyncio.wait_for(self.proc.wait(), timeout=0.2)
                    except Exception:
                        self.proc.kill()
                        await self.proc.wait()
            except Exception:
                pass
            finally:
                self.proc = None

