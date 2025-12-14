#!/usr/bin/env bash
# Manual one-off backup for HomeStay: dumps Postgres and archives object storage.
# Usage:
#   sudo bash scripts/manual-backup.sh
#   BACKUP_ROOT=/var/backups/hptourism/custom LOCAL_STORAGE_DIR=/var/lib/hptourism/storage sudo bash scripts/manual-backup.sh

set -euo pipefail

# Defaults
APP_DIR="${APP_DIR:-/opt/hptourism/app}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/hptourism/manual}"
LOCAL_STORAGE_DIR="${LOCAL_STORAGE_DIR:-/var/lib/hptourism/storage}"

# Load env for DATABASE_URL if present
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] DATABASE_URL is not set. Set it in ${ENV_FILE} or export it before running." >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "$DEST_DIR"

echo "[backup] Writing backups to ${DEST_DIR}"

# Database dump
DB_ARCHIVE="${DEST_DIR}/db.sql.gz"
echo "[backup] Dumping database -> ${DB_ARCHIVE}"
pg_dump "${DATABASE_URL}" | gzip > "${DB_ARCHIVE}"

# Storage archive (optional)
if [[ -d "$LOCAL_STORAGE_DIR" ]]; then
  STORAGE_ARCHIVE="${DEST_DIR}/storage.tar.gz"
  echo "[backup] Archiving storage (${LOCAL_STORAGE_DIR}) -> ${STORAGE_ARCHIVE}"
  tar -czf "${STORAGE_ARCHIVE}" -C "${LOCAL_STORAGE_DIR%/*}" "$(basename "$LOCAL_STORAGE_DIR")"
else
  echo "[backup] ⚠️  Storage directory ${LOCAL_STORAGE_DIR} not found; skipping storage archive."
fi

echo "[backup] Contents:"
ls -lh "${DEST_DIR}"
echo "[backup] Done."
