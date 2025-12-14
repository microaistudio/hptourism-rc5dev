#!/bin/bash
# HP Tourism Portal - Database Setup Script
# Creates PostgreSQL user and database
set -e

DB_NAME="${HPTOURISM_DB_NAME:-hptourism}"
DB_USER="${HPTOURISM_DB_USER:-hptourism_user}"
DB_PASS="${HPTOURISM_DB_PASS:-hptourism_secure_password}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

log_info "Creating database user: $DB_USER"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"

log_info "Creating database: $DB_NAME"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
    log_info "Database $DB_NAME already exists"

log_info "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Enable pgcrypto extension (needed for password hashing in seeds)
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

log_success "Database setup complete"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASS"
