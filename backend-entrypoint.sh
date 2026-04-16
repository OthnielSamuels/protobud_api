#!/bin/sh
set -e

echo "[Backend] Running database migrations..."
node_modules/.bin/prisma migrate deploy
echo "[Backend] Migrations complete. Starting server..."
exec node dist/main
