#!/bin/sh
set -e

echo "[stats-service] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[stats-service] Starting service..."
exec node dist/server.js
