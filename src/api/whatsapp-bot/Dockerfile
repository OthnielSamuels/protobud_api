# =============================================================
# WhatsApp Bot — Puppeteer-ready Dockerfile
# Target: ≤ 512MB RAM
# Uses system Chromium (saves ~300MB vs bundled)
# =============================================================

FROM node:20-slim

# Minimal Chromium dependency set for headless operation
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Skip bundled Chromium download — use system package instead
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src/ ./src/

# Auth and cache dirs — backed by Docker volumes
RUN mkdir -p .wwebjs_auth .wwebjs_cache

# Non-root user with access to audio/video (Chromium requirement)
RUN groupadd -r botuser && useradd -r -g botuser -G audio,video botuser \
    && chown -R botuser:botuser /app

USER botuser

EXPOSE 3001

CMD ["node", "src/index.js"]
