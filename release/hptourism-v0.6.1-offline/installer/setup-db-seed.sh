#!/bin/bash
# HP Tourism Portal - Database Seeding Script
# Seeds database with admin, staff, DDO codes
set -e

DB_NAME="${HPTOURISM_DB_NAME:-hptourism}"
DB_USER="${HPTOURISM_DB_USER:-hptourism_user}"
DB_PASS="${HPTOURISM_DB_PASS:-hptourism_secure_password}"
APP_DIR="${HPTOURISM_INSTALL_DIR:-/opt/hptourism}"

PGPASSWORD="$DB_PASS"
export PGPASSWORD

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
SEED_DIR="$APP_DIR/Database"

if [ ! -d "$SEED_DIR" ]; then
    SEED_DIR="$(dirname "$0")/../../Database"
fi

if [ ! -d "$SEED_DIR" ]; then
    log_warn "Database seed directory not found"
    exit 0
fi

# Seed admin accounts
if [ -f "$SEED_DIR/admin_accounts_seed.sql" ]; then
    log_info "Seeding admin accounts..."
    psql "$DB_URL" -f "$SEED_DIR/admin_accounts_seed.sql" 2>&1 | grep -v "^$" || true
    log_success "Admin accounts seeded"
fi

# Seed district staff
if [ -f "$SEED_DIR/district_staff_seed.sql" ]; then
    log_info "Seeding district staff (DA/DTDO)..."
    psql "$DB_URL" -f "$SEED_DIR/district_staff_seed.sql" 2>&1 | grep -v "^$" || true
    log_success "District staff seeded"
fi

# Seed DDO codes (clean \restrict lines)
if [ -f "$SEED_DIR/ddo_codes_seed.sql" ]; then
    log_info "Seeding DDO codes..."
    grep -v '\\restrict\|\\unrestrict' "$SEED_DIR/ddo_codes_seed.sql" > /tmp/ddo_codes_clean.sql
    psql "$DB_URL" -f /tmp/ddo_codes_clean.sql 2>&1 | grep -v "^$" || true
    rm -f /tmp/ddo_codes_clean.sql
    log_success "DDO codes seeded"
fi

# Seed LGD data if exists
if [ -f "$SEED_DIR/lgd_schema.sql" ]; then
    log_info "Seeding LGD data (districts, tehsils, blocks)..."
    psql "$DB_URL" -f "$SEED_DIR/lgd_schema.sql" 2>&1 | grep -v "^$" || true
    log_success "LGD data seeded"
fi

# Verify
log_info "Verifying seeded data..."
ADMIN_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM users WHERE role IN ('super_admin', 'admin');" | tr -d ' ')
STAFF_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM users WHERE role IN ('dealing_assistant', 'district_tourism_officer');" | tr -d ' ')
DDO_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM ddo_codes;" 2>/dev/null | tr -d ' ' || echo "0")

echo ""
log_success "Database seeding complete:"
echo "  Admin users: $ADMIN_COUNT"
echo "  Staff users: $STAFF_COUNT"
echo "  DDO codes: $DDO_COUNT"
