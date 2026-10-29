# Stage 1: Build Frontend (Vite + React + Tailwind)
FROM node:20-slim AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build C++17 parallel Othello engine
FROM debian:bookworm-slim AS engine-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build_src
COPY CMakeLists.txt .
COPY src/ src/
COPY tests/ tests/
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release
RUN cmake --build build --config Release

# Stage 3: Python FastAPI bridge & Web Server
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled engine
COPY --from=engine-builder /build_src/build/othello /app/build/othello
RUN chmod +x /app/build/othello

# Copy built frontend
COPY --from=frontend-builder /web/dist /app/web/dist

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server/ server/

ENV ENGINE_PATH=/app/build/othello
ENV MAX_GAMES=4

EXPOSE 8000

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
