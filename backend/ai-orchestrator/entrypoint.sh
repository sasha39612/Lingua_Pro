#!/bin/sh
set -e

DB_URL="${DATABASE_URL:-postgresql://lingua:secret@postgres:5432/ai_orchestrator_db}"

# Extract db name (last path segment, strip query params)
DB_NAME="${DB_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"

# Admin URL for CREATE DATABASE — same host/user/pass but connect to 'postgres' db
ADMIN_URL="${DB_URL%/*}/postgres"

echo "[ai-orchestrator] Ensuring database '${DB_NAME}' exists..."
psql "${ADMIN_URL}" -c "CREATE DATABASE \"${DB_NAME}\";" 2>/dev/null \
  || echo "[ai-orchestrator] Database already exists, continuing..."

echo "[ai-orchestrator] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[ai-orchestrator] Starting service..."
exec node dist/main.js
