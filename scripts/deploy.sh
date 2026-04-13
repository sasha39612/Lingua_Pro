#!/bin/bash
# Pull latest images and restart services.
# Called by GitHub Actions or run manually on the server.
# Usage: bash scripts/deploy.sh [IMAGE_TAG]

set -euo pipefail

APP_DIR="/opt/lingua-pro"
IMAGE_TAG="${1:-latest}"

cd "$APP_DIR"

echo "==> Logging in to GHCR..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

export IMAGE_TAG="$IMAGE_TAG"

echo "==> Pulling images (tag: $IMAGE_TAG)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

echo "==> Removing stale stopped containers..."
docker container prune -f

echo "==> Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build --remove-orphans

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deploy complete (tag: $IMAGE_TAG)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
