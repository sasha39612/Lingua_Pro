#!/bin/bash
# One-time server setup for a fresh Ubuntu 24.04 Hetzner instance.
# Run as root: bash bootstrap-server.sh

set -euo pipefail

echo "==> Installing Docker..."
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable --now docker

echo "==> Installing Docker Compose v2 CLI plugin..."
DOCKER_COMPOSE_VERSION="v2.27.0"
curl -fsSL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "==> Installing Nginx + Certbot..."
apt-get install -y -q nginx certbot python3-certbot-nginx

echo "==> Installing Nginx..."
systemctl enable --now nginx

echo "==> Creating app directory..."
mkdir -p /opt/lingua-pro
cd /opt/lingua-pro

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. Clone the repo:  git clone <repo-url> ."
echo "  2. Copy env:        cp .env.example .env && nano .env"
echo "  3. Get SSL cert:    bash scripts/ssl-init.sh YOUR_DOMAIN your@email.com"
echo "  4. Deploy:          bash scripts/deploy.sh"
