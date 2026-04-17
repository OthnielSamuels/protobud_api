#!/bin/sh
set -e

# Ensure Prisma always has a datasource URL, even if env_file is missing.
: "${POSTGRES_USER:=protobot}"
: "${POSTGRES_PASSWORD:=protobot}"
: "${POSTGRES_DB:=protobot}"
: "${DATABASE_URL:=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}}"
export DATABASE_URL

echo "[Backend] Running database migrations..."
if node_modules/.bin/prisma migrate deploy; then
	echo "[Backend] Migrations complete."
else
	echo "[Backend] Migration step failed; continuing startup with existing schema."
fi
echo "[Backend] Starting server..."
exec node dist/main
