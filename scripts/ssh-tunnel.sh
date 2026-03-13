#!/usr/bin/env bash
# SSH Port Forwarding — Lingua Pro
#
# Opens a secure tunnel to the remote server so you can access the app locally:
#   Frontend  →  http://localhost:3000
#   GraphQL   →  http://localhost:4000/graphql
#
# Usage:
#   SSH_HOST=1.2.3.4 bash scripts/ssh-tunnel.sh
#   SSH_HOST=1.2.3.4 SSH_USER=ubuntu bash scripts/ssh-tunnel.sh
#   SSH_HOST=1.2.3.4 SSH_USER=ubuntu SSH_KEY=~/.ssh/id_rsa bash scripts/ssh-tunnel.sh

set -euo pipefail

SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-$(whoami)}"
SSH_KEY="${SSH_KEY:-}"

if [[ -z "$SSH_HOST" ]]; then
  echo "ERROR: SSH_HOST is required" >&2
  echo ""
  echo "Usage: SSH_HOST=<server-ip> bash scripts/ssh-tunnel.sh" >&2
  echo "       SSH_HOST=1.2.3.4 SSH_USER=ubuntu SSH_KEY=~/.ssh/id_rsa bash scripts/ssh-tunnel.sh" >&2
  exit 1
fi

KEY_OPT=()
[[ -n "$SSH_KEY" ]] && KEY_OPT=(-i "$SSH_KEY")

echo ""
echo "Establishing SSH tunnels to ${SSH_USER}@${SSH_HOST}..."
echo ""
echo "  Frontend  →  http://localhost:3000"
echo "  GraphQL   →  http://localhost:4000/graphql"
echo ""
echo "Press Ctrl+C to close all tunnels."
echo ""

# Port mapping:
#   local:3000 → remote:3000  (Next.js frontend)
#   local:4000 → remote:8080  (api-gateway / Apollo GraphQL)
ssh "${KEY_OPT[@]}" \
  -N \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  -L 3000:localhost:3000 \
  -L 4000:localhost:8080 \
  "${SSH_USER}@${SSH_HOST}"
