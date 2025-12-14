#!/usr/bin/env bash
set -euo pipefail

KEEP_VERSION=""
REMOVE_APP=false
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: sudo cleanup-old-installs.sh [options]

Removes old /opt/homestay-r* directories to keep the VM tidy.

Options:
  --keep <version>   Keep /opt/homestay-<version> (example: --keep r1.0.7)
  --remove-app       Also delete /opt/hptourism/app (use when reinstalling)
  --dry-run          Show what would be removed without deleting
  -h, --help         Print this help text
EOF
}

ensure_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)." >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)
      KEEP_VERSION="${2:-}"
      if [[ -z "$KEEP_VERSION" ]]; then
        echo "--keep requires a version argument (e.g. r1.0.7)" >&2
        exit 1
      fi
      shift 2
      ;;
    --remove-app)
      REMOVE_APP=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

ensure_root

KEEP_DIR=""
if [[ -n "$KEEP_VERSION" ]]; then
  KEEP_DIR="homestay-${KEEP_VERSION}"
fi

delete_path() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    echo "• Skip missing $path"
    return
  fi
  if $DRY_RUN; then
    echo "[dry-run] rm -rf $path"
  else
    echo "Removing $path"
    rm -rf "$path"
  fi
}

HAD_MATCH=false
for dir in /opt/homestay-r*; do
  [[ -d "$dir" ]] || continue
  HAD_MATCH=true
  base=$(basename "$dir")
  if [[ -n "$KEEP_DIR" && "$base" == "$KEEP_DIR" ]]; then
    echo "Keeping $dir"
    continue
  fi
  delete_path "$dir"
done

if ! $HAD_MATCH; then
  echo "No /opt/homestay-r* directories found."
fi

if $REMOVE_APP; then
  delete_path "/opt/hptourism/app"
fi

if $DRY_RUN; then
  echo "Dry run complete – no files were deleted."
fi
