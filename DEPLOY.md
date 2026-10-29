# Deployment & Run Guide — Ebon & Ivory

**Ebon & Ivory** is a full-stack Othello web application backed by a high-performance C++17 parallel alpha-beta engine implementing **Root Splitting (P1)**, **Principal Variation Splitting (P2)**, and **Young Brothers Wait Concept with work stealing (P3)**.

---

## 1. Local Development Setup

### Prerequisites
- **C++ Compiler**: GCC 11+ with C++17 support (`std::thread`, `std::atomic`)
- **CMake**: 3.20+
- **Python**: 3.10+
- **Node.js**: 18+

### Step 1: Compile the C++ Engine
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```
*Output: `build/othello.exe` (Windows) or `build/othello` (Linux/macOS)*

### Step 2: Install Python Dependencies & Start FastAPI Bridge
```bash
pip install -r requirements.txt
uvicorn server.app:app --host 127.0.0.1 --port 8000
```

### Step 3: Start Vite Dev Server
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/ws` and `/api` to port 8000.

---

## 2. Docker Deployment (Recommended for Production)

The project includes a multi-stage `Dockerfile`:
- **Stage 1 (node:20-slim)**: Builds the Vite + React frontend bundle (`web/dist`).
- **Stage 2 (debian:bookworm-slim)**: Compiles the C++17 parallel engine binary with `-O2`.
- **Stage 3 (python:3.12-slim)**: Runs the FastAPI bridge and serves both WebSocket API and static web bundle on port 8000.

### Run with Docker Compose
```bash
docker compose up --build
```
Access the application at [http://localhost:8000](http://localhost:8000).

---

## 3. Cloud Deployment (VPS / Render / Railway / Fly.io)

### Fly.io
```bash
fly launch --name ebon-and-ivory
fly deploy
```

### Environment Variables
| Variable | Default | Description |
| :--- | :--- | :--- |
| `ENGINE_PATH` | `./build/othello` | Path to engine executable |
| `MAX_GAMES` | `4` | Max concurrent engine subprocesses |
| `PORT` | `8000` | HTTP/WS server port |

---

## 4. Running Automated Tests

```bash
# 1. C++ Engine & Equality Verification
./build/tests.exe
./build/test_equality.exe

# 2. Server Bridge & E2E WebSocket Flow
pytest server/tests/ -v

# 3. Frontend Typecheck & Build
cd web && npm run build
```

