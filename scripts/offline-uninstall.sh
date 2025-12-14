#!/usr/bin/env bash
# Teardown script for the offline Homestay install. Use to revert the VM to a pre-install state.
# Run as root: sudo bash scripts/offline-uninstall.sh
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-homestay-r1}"
APP_ROOT="${APP_ROOT:-/opt/hptourism}"
APP_DIR="${APP_DIR:-${APP_ROOT}/app}"
LOCAL_STORAGE_ROOT="${LOCAL_STORAGE_ROOT:-/var/lib/hptourism}"
LOCAL_STORAGE="${LOCAL_STORAGE:-${LOCAL_STORAGE_ROOT}/storage}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/hptourism}"
APP_USER="${APP_USER:-hptourism}"
DB_NAME="${DB_NAME:-hptourism_stg}"
DB_USER="${DB_USER:-hptourism_user}"
KEEP_DB="${KEEP_DB:-false}"
KEEP_APP_USER="${KEEP_APP_USER:-false}"
KEEP_PACKAGES="${KEEP_PACKAGES:-false}"
REMOVE_NODE_PM2="${REMOVE_NODE_PM2:-false}"
NODE_DIR_DEFAULT="/usr/local/lib/nodejs/node-v20.17.0-linux-x64"

APT_PACKAGES=(
  nginx
  postgresql-16
  postgresql-client-16
  postgresql-common
  postgresql-client-common
  postgresql-contrib
  libpq5
  fail2ban
  python3-pyasyncore
  python3-pyinotify
  whois
  ssl-cert
  libperl5.38t64
  perl
  perl-base
  perl-modules-5.38
  libjson-perl
  libjson-xs-perl
  libcommon-sense-perl
  libtypes-serialiser-perl
  libllvm17t64
)

log() { printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"; }

ensure_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (sudo)." >&2
    exit 1
  fi
}

stop_unit() {
  local unit="$1"
  if systemctl list-unit-files | cut -d' ' -f1 | grep -qx "$unit"; then
    systemctl stop "$unit" || true
    systemctl disable "$unit" || true
  fi
}

remove_unit_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    rm -f "$path"
    systemctl daemon-reload
  fi
}

cleanup_nginx() {
  local site="/etc/nginx/sites-available/${SERVICE_NAME}.conf"
  local link="/etc/nginx/sites-enabled/${SERVICE_NAME}.conf"
  if [[ -e "$site" || -e "$link" ]]; then
    log "Removing nginx site ${SERVICE_NAME}"
    rm -f "$site" "$link"
    if command -v nginx >/dev/null 2>&1 && nginx -t; then
      systemctl reload nginx || true
    fi
  fi
}

drop_database_objects() {
  if [[ "${KEEP_DB}" == "true" ]]; then
    log "KEEP_DB=true – skipping database drop."
    return
  fi

  if ! command -v psql >/dev/null 2>&1 || ! id postgres >/dev/null 2>&1; then
    log "PostgreSQL client or postgres user not available; skipping database cleanup."
    return
  fi

  log "Dropping database ${DB_NAME} (if present)"
  if sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    sudo -u postgres psql -c "DROP DATABASE ${DB_NAME};"
  else
    log "Database ${DB_NAME} not found."
  fi

  log "Dropping role ${DB_USER} (if present)"
  if sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    sudo -u postgres psql -c "DROP ROLE ${DB_USER};"
  else
    log "Role ${DB_USER} not found."
  fi
}

remove_directories() {
  log "Removing application directories"
  rm -rf "$APP_DIR" "$LOCAL_STORAGE" "$BACKUP_ROOT" "/var/log/hptourism-installer"
  for dir in "$APP_ROOT" "$LOCAL_STORAGE_ROOT"; do
    if [[ -d "$dir" ]]; then
      rmdir --ignore-fail-on-non-empty "$dir" || true
    fi
  done
}

remove_app_user() {
  if [[ "${KEEP_APP_USER}" == "true" ]]; then
    log "KEEP_APP_USER=true – skipping user removal."
    return
  fi
  if id "$APP_USER" >/dev/null 2>&1; then
    log "Removing system user ${APP_USER}"
    userdel -r "$APP_USER" 2>/dev/null || userdel "$APP_USER" || true
  fi
}

remove_packages() {
  if [[ "${KEEP_PACKAGES}" == "true" ]]; then
    log "KEEP_PACKAGES=true – skipping apt package removal."
    return
  fi
  log "Removing offline-installed packages (apt purge)"
  apt-get purge -y --auto-remove "${APT_PACKAGES[@]}" || true
  apt-get autoremove -y || true
}

cleanup_node_pm2() {
  if [[ "${REMOVE_NODE_PM2}" != "true" ]]; then
    return
  fi

  log "Removing bundled Node/PM2 (only if installed in ${NODE_DIR_DEFAULT})"
  local node_link
  node_link=$(command -v node || true)
  if [[ -n "$node_link" ]] && [[ "$(readlink -f "$node_link")" == ${NODE_DIR_DEFAULT}/bin/node ]]; then
    rm -f /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
  fi

  if [[ -d "${NODE_DIR_DEFAULT}" ]]; then
    rm -rf "${NODE_DIR_DEFAULT}"
    rmdir --ignore-fail-on-non-empty "/usr/local/lib/nodejs" || true
  fi

  if command -v pm2 >/dev/null 2>&1; then
    local pm2_path
    pm2_path=$(command -v pm2)
    if [[ "$pm2_path" == ${NODE_DIR_DEFAULT}/bin/pm2* ]]; then
      npm uninstall -g pm2 || true
      rm -f "$pm2_path"
    fi
  fi
}

main() {
  ensure_root
  log "Stopping services"
  stop_unit "${SERVICE_NAME}.service"
  stop_unit "${SERVICE_NAME}-backup.timer"
  stop_unit "${SERVICE_NAME}-backup.service"

  log "Removing systemd unit files"
  remove_unit_file "/etc/systemd/system/${SERVICE_NAME}.service"
  remove_unit_file "/etc/systemd/system/${SERVICE_NAME}-backup.service"
  remove_unit_file "/etc/systemd/system/${SERVICE_NAME}-backup.timer"

  cleanup_nginx
  drop_database_objects
  remove_directories
  remove_app_user
  remove_packages
  cleanup_node_pm2

  log "Teardown complete."
}

main "$@"
