#!/bin/sh
set -e

echo "[audio-service] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[audio-service] Starting service..."
exec node dist/main.js
