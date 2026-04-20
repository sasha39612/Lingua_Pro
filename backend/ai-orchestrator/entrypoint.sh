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
  || echo "[ai-orchestrator] Database already exists or unreachable, continuing..."

echo "[ai-orchestrator] Applying migrations..."
# Apply each migration SQL file directly — bypasses prisma migrate deploy which
# requires prisma.config.ts (Prisma 7 WASM parser rejects all our config formats).
MIGRATIONS_DIR="./prisma/migrations"
for sql_file in "${MIGRATIONS_DIR}"/*/migration.sql; do
  if [ -f "${sql_file}" ]; then
    echo "[ai-orchestrator] Applying ${sql_file}..."
    if psql "${DB_URL}" -f "${sql_file}"; then
      echo "[ai-orchestrator] Applied ${sql_file}"
    else
      echo "[ai-orchestrator] WARNING: ${sql_file} failed (table may already exist) — continuing"
    fi
  fi
done

echo "[ai-orchestrator] Starting service..."
exec node dist/main.js
