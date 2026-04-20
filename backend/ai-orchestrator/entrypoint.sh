#!/bin/sh
set -e

echo "[ai-orchestrator] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[ai-orchestrator] Starting service..."
exec node dist/main.js
