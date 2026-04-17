# 3D Printing Chatbot — Setup & Operations Guide

## Prerequisites

- Docker + Docker Compose v2
- NVIDIA GPU with drivers installed
- `nvidia-container-toolkit` installed (for GPU passthrough)

Verify GPU passthrough works:
```bash
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

---

## Project Structure

```
project/
├── docker-compose.yml
├── .env.example
├── .env                        ← create from .env.example
├── backend/                    ← NestJS source + Dockerfile
│   ├── Dockerfile
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
├── whatsapp-bot/               ← WhatsApp bot source + Dockerfile
│   ├── Dockerfile
│   └── src/
└── ollama/
    └── entrypoint.sh           ← Auto-pulls model on first boot
```

---

## First-Time Setup

### 1. Create your .env file
```bash
cp .env.example .env
# Edit .env and set a strong POSTGRES_PASSWORD
```

### 2. Build and start all services
```bash
docker compose up -d --build
```

On first boot, Ollama will automatically pull the model (~2GB download).
Monitor progress:
```bash
docker compose logs -f ollama
```

### 3. Scan the WhatsApp QR code
```bash
docker compose logs -f whatsapp-bot
```
A QR code will appear in the terminal. Scan it with WhatsApp on your phone.
WhatsApp auth/cache are stored in named Docker volumes, but cleared on each bot startup, so you will re-scan after each fresh startup.

### 4. Verify everything is running
```bash
docker compose ps
curl http://localhost:3000/health
```

---

## Memory Budget Verification

Check live memory usage:
```bash
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

Expected output:
```
NAME                    MEM USAGE / LIMIT     MEM %
printbot-ollama         4–5GB / 5GB           80–100%
printbot-backend        300–600MB / 800MB     40–75%
printbot-whatsapp       200–400MB / 512MB     40–80%
printbot-postgres       100–300MB / 512MB     20–60%
```

---

## Daily Operations

### View operator work queue (conversations awaiting pricing)
```bash
curl http://localhost:3000/pipeline/pending
```

### Get full detail for a conversation
```bash
curl http://localhost:3000/pipeline/conversations/<conversationId>
```

### Finalize an estimate (fill in pricing)
```bash
curl -X POST http://localhost:3000/pipeline/finalize \
  -H "Content-Type: application/json" \
  -d '{
    "estimateId": "<uuid>",
    "items": [
      { "itemId": "<uuid>", "unitPrice": 15.00, "totalPrice": 30.00, "quantity": 2 }
    ],
    "subtotal": 30.00,
    "tax": 3.00,
    "total": 33.00,
    "notes": "PLA print, 2 day turnaround"
  }'
```

### Notify client via WhatsApp
```bash
curl -X POST http://localhost:3000/pipeline/notify \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "<uuid>",
    "message": "Hi! Your quote for the phone stand is ready: $33.00 total. Reply to confirm your order."
  }'
```

### Reject an estimate
```bash
curl -X POST http://localhost:3000/pipeline/estimates/<uuid>/reject \
  -H "Content-Type: application/json" \
  -d '{ "reason": "File format not supported" }'
```

---

## Logs

```bash
# All services
docker compose logs -f

# Individual services
docker compose logs -f nestjs-backend
docker compose logs -f whatsapp-bot
docker compose logs -f ollama
docker compose logs -f postgres
```

---

## Restart & Maintenance

```bash
# Restart a single service (e.g. after config change)
docker compose restart nestjs-backend

# Full restart
docker compose down && docker compose up -d

# Rebuild after code changes
docker compose up -d --build nestjs-backend

# View all volumes
docker volume ls | grep printbot
```

---

## Updating the LLM Model

Edit `.env`:
```
OLLAMA_MODEL=qwen3.5:4b-instruct-q4_K_M
```

Edit `ollama/entrypoint.sh` — the `MODEL=` line must match.

Then restart Ollama:
```bash
docker compose restart ollama
docker compose logs -f ollama  # watch the pull
```

---

## Backup

### Database
```bash
docker exec printbot-postgres pg_dump -U printbot printbot > backup_$(date +%Y%m%d).sql
```

### WhatsApp session (so you don't need to re-scan QR)
```bash
docker run --rm -v printbot_whatsapp_auth:/data -v $(pwd):/backup \
  alpine tar czf /backup/whatsapp_auth_backup.tar.gz /data
```

Note: volumes exist, but bot startup intentionally clears auth/cache each time.

---

## Troubleshooting

**Ollama container is unhealthy after 60s**
→ GPU passthrough may not be working. Check `nvidia-smi` inside the container:
```bash
docker exec printbot-ollama nvidia-smi
```

**WhatsApp bot shows QR repeatedly**
→ The auth volume may be corrupt. Reset it:
```bash
docker compose stop whatsapp-bot
docker volume rm printbot_whatsapp_auth
docker compose up -d whatsapp-bot
```

**NestJS fails with "Database connection failed"**
→ Postgres may still be starting. Wait 10s and check:
```bash
docker compose logs postgres
```

**LLM responses are very slow (>60s)**
→ Model may be loaded in RAM instead of VRAM. Check:
```bash
docker exec printbot-ollama ollama ps
```
If VRAM shows 0, GPU passthrough is not working.
