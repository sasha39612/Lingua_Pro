#!/bin/bash
# Health check script — run via cron every 5 minutes.
# Alerts to a Slack webhook if any service is unhealthy.
# Cron entry: */5 * * * * /opt/lingua-pro/scripts/health-check.sh

set -euo pipefail

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
APP_DIR="/opt/lingua-pro"

cd "$APP_DIR"

UNHEALTHY=$(docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps --format json \
  | python3 -c "
import sys, json
services = [json.loads(l) for l in sys.stdin if l.strip()]
bad = [s['Service'] for s in services if s.get('Health', 'healthy') not in ('healthy', '')]
print(' '.join(bad))
" 2>/dev/null || echo "")

if [ -n "$UNHEALTHY" ]; then
  MSG="⚠️ Lingua Pro: unhealthy services on $(hostname): $UNHEALTHY"
  echo "$MSG"
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"$MSG\"}"
  fi
  exit 1
fi

echo "All services healthy."
