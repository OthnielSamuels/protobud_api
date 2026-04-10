#!/bin/sh
# =============================================================
# Ollama entrypoint
#
# 1. Starts the Ollama server in the background
# 2. Waits for it to be ready
# 3. Pulls the model if not already present
# 4. Brings the server to the foreground
# =============================================================

MODEL="${OLLAMA_MODEL:-qwen2.5:3b-instruct-q4_K_M}"

echo "[Ollama] Starting server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama HTTP API to be ready
echo "[Ollama] Waiting for server to be ready..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done
echo "[Ollama] Server ready"

# Pull model only if not already downloaded
if ollama list | grep -q "$MODEL"; then
  echo "[Ollama] Model '$MODEL' already present"
else
  echo "[Ollama] Pulling model '$MODEL'..."
  ollama pull "$MODEL"
  echo "[Ollama] Model pull complete"
fi

# Preload model into VRAM to avoid cold-start on first request
echo "[Ollama] Preloading model into VRAM..."
curl -sf http://localhost:11434/api/generate \
  -d "{\"model\": \"$MODEL\", \"prompt\": \"\", \"keep_alive\": \"24h\"}" \
  > /dev/null 2>&1 || true

echo "[Ollama] Ready. Model: $MODEL"

# Bring server process to foreground so Docker tracks it
wait $OLLAMA_PID
