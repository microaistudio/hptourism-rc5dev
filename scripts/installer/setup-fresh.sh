#!/bin/bash
# HP Tourism Portal - Fresh Installation Script
# This script sets up the complete stack on a fresh Ubuntu server
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${HPTOURISM_INSTALL_DIR:-/opt/hptourism}"
APP_PORT="${HPTOURISM_PORT:-5050}"
DB_NAME="${HPTOURISM_DB_NAME:-hptourism}"
DB_USER="${HPTOURISM_DB_USER:-hptourism_user}"
DB_PASS="${HPTOURISM_DB_PASS:-hptourism_secure_$(openssl rand -hex 8)}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "  HP Tourism Portal - Fresh Installation"
echo "  Version: 0.6.1"
echo "============================================"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

log_info "Installation Configuration:"
echo "  App Directory: $APP_DIR"
echo "  App Port: $APP_PORT"
echo "  Database: $DB_NAME"
echo "  DB User: $DB_USER"
echo ""

# ============================================
# 1. Install PostgreSQL
# ============================================
log_info "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    log_success "PostgreSQL already installed: $(psql --version)"
else
    log_info "Installing PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    log_success "PostgreSQL installed"
fi

# ============================================
# 2. Install Nginx
# ============================================
log_info "Checking Nginx..."
if command -v nginx &> /dev/null; then
    log_success "Nginx already installed: $(nginx -v 2>&1)"
else
    log_info "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    log_success "Nginx installed"
fi

# ============================================
# 3. Check Node.js
# ============================================
log_info "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        log_success "Node.js $(node -v) detected"
    else
        log_error "Node.js v20+ required. Found: $(node -v)"
        log_info "Please install Node.js v20 or later manually"
        exit 1
    fi
else
    log_error "Node.js not found"
    log_info "Please install Node.js v20+ manually:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "  apt-get install -y nodejs"
    exit 1
fi

# ============================================
# 4. Install PM2
# ============================================
log_info "Checking PM2..."
if command -v pm2 &> /dev/null; then
    log_success "PM2 already installed"
else
    log_info "Installing PM2..."
    npm install -g pm2
    log_success "PM2 installed"
fi

# ============================================
# 5. Setup Database
# ============================================
log_info "Setting up database..."
source "$SCRIPT_DIR/setup-db.sh"

# ============================================
# 6. Deploy Application
# ============================================
log_info "Deploying application to $APP_DIR..."
mkdir -p "$APP_DIR"

# Copy everything except installer scripts
cp -r dist "$APP_DIR/"
cp -r shared "$APP_DIR/"
cp -r migrations "$APP_DIR/"
cp -r Database "$APP_DIR/"
cp -r node_modules "$APP_DIR/"
cp package.json "$APP_DIR/"
cp ecosystem.config.cjs "$APP_DIR/"
cp drizzle.config.ts "$APP_DIR/"
cp .env.example "$APP_DIR/"
cp start.sh "$APP_DIR/"

# Create .env if not exists
if [ ! -f "$APP_DIR/.env" ]; then
    log_info "Creating .env file..."
    cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=$APP_PORT
HOST=0.0.0.0
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
DATABASE_DRIVER=pg
SESSION_SECRET=hp-tourism-$(openssl rand -hex 24)
SESSION_COOKIE_NAME=hp-tourism.sid
SESSION_COOKIE_SECURE=false
SESSION_STORE=postgres
OBJECT_STORAGE_MODE=local
LOCAL_OBJECT_DIR=$APP_DIR/local-object-storage
CAPTCHA_ENABLED=false
EOF
fi

# Create local storage directory
mkdir -p "$APP_DIR/local-object-storage"
mkdir -p "$APP_DIR/logs"

# Run database migrations
log_info "Running database migrations..."
cd "$APP_DIR"
npx drizzle-kit push

# ============================================
# 7. Seed Database
# ============================================
log_info "Seeding database..."
source "$SCRIPT_DIR/setup-db-seed.sh"

# ============================================
# 8. Configure Nginx
# ============================================
log_info "Configuring Nginx..."
source "$SCRIPT_DIR/setup-nginx.sh"

# ============================================
# 9. Setup PM2
# ============================================
log_info "Setting up PM2..."
cd "$APP_DIR"

# Stop any existing process
pm2 delete hptourism 2>/dev/null || true

# Start application
pm2 start ecosystem.config.cjs --name hptourism

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root

log_success "PM2 configured and application started"

# ============================================
# 10. Health Check
# ============================================
log_info "Waiting for application to start..."
sleep 5

if curl -s http://localhost:$APP_PORT/api/health > /dev/null; then
    log_success "Application health check passed!"
else
    log_warn "Health check failed - application may still be starting"
fi

echo ""
echo "============================================"
echo "  ✅ Installation Complete!"
echo "============================================"
echo ""
echo "Application: http://localhost/"
echo "Direct: http://localhost:$APP_PORT/"
echo ""
echo "Login Credentials:"
echo "  Super Admin: superadmin / Ulan@2025"
echo "  Admin: admin / Admin@2025"
echo ""
echo "Database: $DB_NAME"
echo "DB User: $DB_USER"
echo "DB Password: $DB_PASS"
echo ""
echo "PM2 Commands:"
echo "  pm2 list              - View processes"
echo "  pm2 logs hptourism    - View logs"
echo "  pm2 restart hptourism - Restart app"
echo ""
