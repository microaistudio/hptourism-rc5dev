#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-homestay-r1}"
APP_DIR="/opt/hptourism/app"
LOCAL_STORAGE="/var/lib/hptourism/storage"
NGINX_SITE="/etc/nginx/sites-available/${SERVICE_NAME}.conf"
NGINX_LINK="/etc/nginx/sites-enabled/${SERVICE_NAME}.conf"
BACKUP_SERVICE="${SERVICE_NAME}-backup.service"
BACKUP_TIMER="${SERVICE_NAME}-backup.timer"
SYSTEMD_SERVICE="/etc/systemd/system/${SERVICE_NAME}.service"

usage() {
  cat <<EOF
Usage: sudo $(basename "$0") [service-name]

Stops and removes the current homestay deployment (systemd unit, nginx site,
backup timer, and app directories). Defaults to service 'homestay-r1'.
EOF
}

ensure_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root." >&2
    exit 1;
  fi
}

list_unit() {
  local unit="$1"
  systemctl list-unit-files | awk '{print $1}' | grep -Fx "$unit" >/dev/null 2>&1
}

stop_unit() {
  local unit="$1"
  if list_unit "$unit"; then
    systemctl stop "$unit" || true
    systemctl disable "$unit" || true
  fi
}

remove_file() {
  local path="$1"
  if [[ -e "$path" ]]; then
    rm -f "$path"
  fi
}

ensure_root

echo "Stopping services…"
stop_unit "${SERVICE_NAME}.service"
stop_unit "$BACKUP_TIMER"
stop_unit "$BACKUP_SERVICE"

echo "Removing systemd units…"
remove_file "$SYSTEMD_SERVICE"
remove_file "/etc/systemd/system/${BACKUP_SERVICE}"
remove_file "/etc/systemd/system/${BACKUP_TIMER}"
systemctl daemon-reload

echo "Cleaning nginx configuration…"
remove_file "$NGINX_SITE"
remove_file "$NGINX_LINK"
systemctl reload nginx || true

echo "Removing application directories…"
rm -rf "$APP_DIR"
rm -rf "$LOCAL_STORAGE"

echo "Removal complete. You can now extract a fresh release."
