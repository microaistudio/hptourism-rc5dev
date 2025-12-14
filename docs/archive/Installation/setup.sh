#!/usr/bin/env bash
#
# Automated installer for the HP Tourism staging environment.
# Run on a fresh Ubuntu 22.04/24.04 VM as root.
#
# Usage:
#   sudo bash Installation/setup.sh

set -euo pipefail

# -------------------------------------------------------------
# Configuration – adjust if needed before running the script
# -------------------------------------------------------------
APP_USER="hptourism"
APP_DIR="/opt/hptourism/app"
LOCAL_STORAGE="/var/lib/hptourism/storage"
SERVICE_NAME="${SERVICE_NAME:-homestay-r1}"
DB_NAME="${DB_NAME:-hptourism_stg}"
DB_USER="${DB_USER:-hptourism_user}"
DB_PASSWORD="${DB_PASSWORD:-hptourism_secure_password}"
DB_HOST="${DB_HOST:-localhost}"
INSTALL_LOCAL_DB="${INSTALL_LOCAL_DB:-true}"
NODE_VERSION="22.x"
NODE_PORT="${NODE_PORT:-4000}"
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' | tr -d '\n')
if [[ -z "$SERVER_IP" ]]; then
  SERVER_IP="127.0.0.1"
fi
SERVER_NAME="${SERVER_NAME:-${SERVER_IP}}"
BACKUP_ROOT="/var/backups/hptourism"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLED_DEPS="${REPO_ROOT}/deps"
LOG_DIR="/var/log/hptourism-installer"
LOG_FILE="${LOG_DIR}/install-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "Installer log: $LOG_FILE"

# -------------------------------------------------------------
# Helper functions
# -------------------------------------------------------------
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ensure_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)." >&2
    exit 1
  fi
}

create_system_user() {
  if id "$APP_USER" >/dev/null 2>&1; then
    echo "User $APP_USER already exists."
  else
    adduser --disabled-password --gecos "" "$APP_USER"
  fi
}

install_packages() {
  echo "Installing OS packages…"
  if compgen -G "$BUNDLED_DEPS/*.deb" >/dev/null; then
    echo "Found bundled .deb files in $BUNDLED_DEPS – installing locally"
    apt-get install -y "$BUNDLED_DEPS"/*.deb || apt-get install -f -y
  else
    echo "Bundled packages not found – falling back to apt repositories"
    apt-get update
    apt-get install -y nginx postgresql-16 postgresql-client-16 postgresql-common libpq5 \
      postgresql-contrib logrotate fail2ban gettext-base rsync
  fi
}

install_node_runtime() {
  if command_exists node; then
    local existing_node
    existing_node=$(node -v | sed 's/^v//')
    if [[ "$existing_node" =~ ^20\\. ]]; then
      echo "Node.js already present ($(node -v)); skipping install."
      return
    fi
    echo "Node.js present ($(node -v)) but not 20.x; will install bundled version if available."
  fi

  local node_tar
  node_tar=$(ls "$BUNDLED_DEPS"/node-v*-linux-x64.tar.xz 2>/dev/null || true)
  if [[ -n "$node_tar" ]]; then
    echo "Installing Node.js from ${node_tar}"
    mkdir -p /usr/local/lib/nodejs
    tar -xJf "$node_tar" -C /usr/local/lib/nodejs
    local node_dir
    node_dir=$(basename "$node_tar" .tar.xz)
    ln -sf /usr/local/lib/nodejs/"$node_dir"/bin/node /usr/local/bin/node
    ln -sf /usr/local/lib/nodejs/"$node_dir"/bin/npm /usr/local/bin/npm
    ln -sf /usr/local/lib/nodejs/"$node_dir"/bin/npx /usr/local/bin/npx
  else
    echo "Bundled Node.js tarball not found; downloading from NodeSource"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash -
    apt-get install -y nodejs
  fi
}

install_pm2() {
  if command_exists pm2; then
    local pm2_ver
    pm2_ver=$(pm2 -v | head -n 1)
    if [[ "$pm2_ver" =~ ^6\\. ]]; then
      echo "PM2 already present (${pm2_ver}); skipping install."
      return
    fi
    echo "PM2 present (${pm2_ver}) but not 6.x; will install bundled version if available."
  fi

  local pm2_pkg
  pm2_pkg=$(ls "$BUNDLED_DEPS"/pm2-*.tgz 2>/dev/null || true)
  if [[ -n "$pm2_pkg" ]]; then
    echo "Installing PM2 from ${pm2_pkg}"
    npm install -g "$pm2_pkg"
  else
    echo "Bundled PM2 package not found; installing from npm registry"
    npm install -g pm2
  fi
}

setup_directories() {
  echo "Creating application directories…"
  mkdir -p "$APP_DIR" "$LOCAL_STORAGE"
  rsync -a --delete "$REPO_ROOT/" "$APP_DIR/"
  chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$LOCAL_STORAGE"

  mkdir -p "$BACKUP_ROOT"
  chmod 750 "$BACKUP_ROOT"
}

setup_postgres() {
  if [[ "${INSTALL_LOCAL_DB}" != "true" ]]; then
    echo "Skipping local PostgreSQL provisioning (INSTALL_LOCAL_DB=${INSTALL_LOCAL_DB})"
    return
  fi
  echo "Configuring PostgreSQL…"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';"

  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
}

seed_reference_data() {
  if [[ "${INSTALL_LOCAL_DB}" != "true" ]]; then
    echo "Skipping database seed (INSTALL_LOCAL_DB=${INSTALL_LOCAL_DB})"
    return
  fi
  echo "Seeding default admin and reference data…"
  local seeds=(
    "${APP_DIR}/Database/admin_accounts_seed.sql"
    "${APP_DIR}/Database/district_staff_seed.sql"
    "${APP_DIR}/Database/ddo_codes_seed.sql"
  )
  for seed in "${seeds[@]}"; do
    if [[ -f "$seed" ]]; then
      echo "  - $(basename "$seed")"
      sudo -u postgres psql "${DB_NAME}" -f "$seed"
    else
      echo "  - $(basename "$seed") not found, skipping"
    fi
  done
}

ensure_session_table() {
  if [[ "${INSTALL_LOCAL_DB}" != "true" ]]; then
    return
  fi
  echo "Ensuring session table exists…"
  sudo -u postgres psql "${DB_NAME}" <<SQL
CREATE TABLE IF NOT EXISTS session (
  sid    varchar PRIMARY KEY,
  sess   json    NOT NULL,
  expire timestamp(6) without time zone NOT NULL
);
SQL
  sudo -u postgres psql "${DB_NAME}" -c "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE session TO ${DB_USER};"
}
setup_env_file() {
  echo "Preparing .env…"
  local template="$APP_DIR/.env.example"
  if [[ ! -f "$template" && -f "$REPO_ROOT/.env.example" ]]; then
    cp "$REPO_ROOT/.env.example" "$template"
  fi
  if [[ ! -f "$APP_DIR/.env" ]]; then
    cp "$template" "$APP_DIR/.env"
    cat <<EOF >> "$APP_DIR/.env"
NODE_ENV=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
OBJECT_STORAGE_MODE=local
LOCAL_OBJECT_DIR=${LOCAL_STORAGE}
LOCAL_MAX_UPLOAD_BYTES=$((20 * 1024 * 1024))
PORT=${NODE_PORT}
SESSION_COOKIE_NAME=hp-tourism.sid
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
SESSION_COOKIE_DOMAIN=
FRONTEND_BASE_URL=http://${SERVER_NAME}
CAPTCHA_ENABLED=false
EOF
  fi
  chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
}

write_db_backup_env() {
  echo "Writing database config for maintenance scripts…"
  cat >"$APP_DIR/Database/db-config.env" <<EOF
# Auto-generated by Installation/setup.sh
POSTGRES_HOST=${DB_HOST}
POSTGRES_PORT=5432
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}
HOMESTAY_RELEASE_ROOT=${APP_DIR}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
EOF
  chown "$APP_USER":"$APP_USER" "$APP_DIR/Database/db-config.env"
}

install_node_modules() {
  echo "Installing Node dependencies…"
  sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm install"
}

run_migrations_and_build() {
  echo "Running database migrations…"
  sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm run db:push"
  echo "Building production bundle…"
  sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm run build"
}

configure_systemd_service() {
  echo "Creating systemd service…"
  cat >/etc/systemd/system/${SERVICE_NAME}.service <<SERVICE
[Unit]
Description=HP Tourism Portal (stg-rc3)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=$(command -v node) dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}.service
  systemctl restart ${SERVICE_NAME}.service
}

configure_nginx() {
  echo "Configuring nginx…"
  local template="${APP_DIR}/Installation/nginx-site.conf"
  local target="/etc/nginx/sites-available/${SERVICE_NAME}.conf"
  if [[ ! -f "$template" ]]; then
    echo "Warning: nginx template not found at ${template}, skipping nginx configuration."
    return
  fi

  export SERVER_NAME NODE_PORT APP_DIR_PATH="$APP_DIR"
  envsubst '${SERVER_NAME} ${NODE_PORT} ${APP_DIR_PATH}' < "$template" > "$target"
  ln -sf "$target" "/etc/nginx/sites-enabled/${SERVICE_NAME}.conf"
  rm -f /etc/nginx/sites-enabled/default || true
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
}

configure_backup_timer() {
  echo "Configuring nightly backups…"
  local backup_service="/etc/systemd/system/${SERVICE_NAME}-backup.service"
  local backup_timer="/etc/systemd/system/${SERVICE_NAME}-backup.timer"

  cat >"$backup_service" <<SERVICE
[Unit]
Description=HP Tourism nightly backup
After=postgresql.service
Wants=postgresql.service

[Service]
Type=oneshot
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=CONFIG_FILE=${APP_DIR}/Database/db-config.env
Environment=BACKUP_ROOT=${BACKUP_ROOT}
Environment=FILES_DIR=${LOCAL_STORAGE}
ExecStart=/bin/bash ${APP_DIR}/Database/scripts/backup.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

  cat >"$backup_timer" <<TIMER
[Unit]
Description=Nightly backup timer for HP Tourism

[Timer]
OnCalendar=*-*-* 02:30:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
TIMER

  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}-backup.timer"
}

print_summary() {
  cat <<SUMMARY

Installation complete.

- App directory: ${APP_DIR}
- Local storage: ${LOCAL_STORAGE}
- Systemd service: ${SERVICE_NAME}
- Nginx server name: ${SERVER_NAME}
- Database: ${DB_NAME} (owner ${DB_USER})
- Backups: ${SERVICE_NAME}-backup.timer (archives in ${BACKUP_ROOT})

Check service status with:
  sudo systemctl status ${SERVICE_NAME}
  sudo systemctl status ${SERVICE_NAME}-backup.timer
  sudo systemctl list-timers | grep ${SERVICE_NAME}-backup || true

SUMMARY
}

# -------------------------------------------------------------
# Main flow
# -------------------------------------------------------------
ensure_root
install_packages
install_node_runtime
install_pm2
create_system_user
setup_directories
setup_postgres
setup_env_file
write_db_backup_env
install_node_modules
run_migrations_and_build
seed_reference_data
ensure_session_table
configure_systemd_service
configure_nginx
configure_backup_timer
print_summary
