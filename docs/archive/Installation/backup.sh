#!/usr/bin/env bash
#
# Creates a timestamped backup of the Postgres database and the object-storage directory.
# Usage: sudo bash Installation/backup.sh [optional-backup-root]

set -euo pipefail

APP_DIR="/opt/hptourism/app"
ENV_FILE="${APP_DIR}/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Ensure ${ENV_FILE} contains the connection string." >&2
  exit 1
fi

LOCAL_STORAGE_DIR="${LOCAL_OBJECT_DIR:-/var/lib/hptourism/storage}"
BACKUP_ROOT="${1:-/var/backups/hptourism}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "$DEST_DIR"

echo "📦 Writing backups to ${DEST_DIR}"

DB_ARCHIVE="${DEST_DIR}/db.sql.gz"
echo "→ Dumping database to ${DB_ARCHIVE}"
pg_dump "${DATABASE_URL}" | gzip > "${DB_ARCHIVE}"

if [[ -d "$LOCAL_STORAGE_DIR" ]]; then
  STORAGE_ARCHIVE="${DEST_DIR}/storage.tar.gz"
  echo "→ Archiving local object storage (${LOCAL_STORAGE_DIR})"
  tar -czf "${STORAGE_ARCHIVE}" -C "${LOCAL_STORAGE_DIR%/*}" "$(basename "$LOCAL_STORAGE_DIR")"
else
  echo "⚠️  Local storage directory ${LOCAL_STORAGE_DIR} not found; skipping object archive."
fi

ls -lh "${DEST_DIR}"
echo "✅ Backup complete."
