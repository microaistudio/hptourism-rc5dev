#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
DATABASE_DIR=$(dirname "$SCRIPT_DIR")
REPO_ROOT=$(dirname "$DATABASE_DIR")
CONFIG_FILE=${CONFIG_FILE:-"$DATABASE_DIR/db-config.env"}

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[backup] missing config file: $CONFIG_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$CONFIG_FILE"
set +a

BACKUP_ROOT=${BACKUP_ROOT:-"${HOMESTAY_RELEASE_ROOT:-$REPO_ROOT}/backups"}
FILES_DIR=${FILES_DIR:-"$REPO_ROOT/local-object-storage"}
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_DIR="$BACKUP_ROOT/db"
FILES_BACKUP_DIR="$BACKUP_ROOT/files"
mkdir -p "$DB_BACKUP_DIR" "$FILES_BACKUP_DIR"

export PGPASSWORD=${POSTGRES_PASSWORD:-postgres}
DB_NAME=${POSTGRES_DB:-homestay_r1}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_USER=${POSTGRES_USER:-postgres}

DB_DUMP_FILE="$DB_BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
FILES_ARCHIVE="$FILES_BACKUP_DIR/object_store_${TIMESTAMP}.tar.gz"

echo "[backup] dumping database $DB_NAME -> $DB_DUMP_FILE"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$DB_DUMP_FILE"

echo "[backup] archiving uploads from $FILES_DIR -> $FILES_ARCHIVE"
tar -czf "$FILES_ARCHIVE" -C "$FILES_DIR" .

echo "[backup] pruning files older than $RETENTION_DAYS days in $BACKUP_ROOT"
find "$BACKUP_ROOT" -type f -mtime +"$RETENTION_DAYS" -print -delete

echo "[backup] done"
