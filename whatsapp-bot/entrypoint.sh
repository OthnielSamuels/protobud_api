#!/bin/sh
set -e

echo "[entrypoint] Clearing WhatsApp auth and cache..."
rm -rf /app/.wwebjs_auth/* /app/.wwebjs_cache/*

echo "[entrypoint] Starting WhatsApp bot..."
exec node src/index.js
