#!/bin/bash
# Daily PostgreSQL backup via pg_dumpall inside the running postgres container.
# Saves a gzipped dump to $BACKUP_DIR, then prunes files older than RETENTION_DAYS.
# Cron: 0 3 * * * /opt/lingua-pro/scripts/backup.sh >> /var/log/lingua-backup.log 2>&1

set -euo pipefail

APP_DIR="/opt/lingua-pro"
BACKUP_DIR="$APP_DIR/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M")
OUTFILE="$BACKUP_DIR/lingua_backup_${TIMESTAMP}.sql.gz"

cd "$APP_DIR"

# Load POSTGRES_USER from .env (needed for pg_dumpall -U flag)
if [ -f "$APP_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a; source "$APP_DIR/.env"; set +a
fi

POSTGRES_USER="${POSTGRES_USER:-lingua}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting backup → $OUTFILE"

docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec -T postgres \
  pg_dumpall -U "$POSTGRES_USER" \
  | gzip > "$OUTFILE"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup complete ($(du -sh "$OUTFILE" | cut -f1))"

# Prune old backups
find "$BACKUP_DIR" -name "lingua_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruned backups older than ${RETENTION_DAYS} days"
