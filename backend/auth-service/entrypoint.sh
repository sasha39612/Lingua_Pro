#!/bin/sh
set -e

echo "[auth-service] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[auth-service] Starting service..."
exec node dist/main.js
