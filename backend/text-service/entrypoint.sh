#!/bin/sh
set -e

echo "[text-service] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[text-service] Starting service..."
exec node dist/main.js
