#!/bin/bash
set -e

VERSION="0.6.1"
PACK_NAME="hptourism-v${VERSION}-offline"
RELEASE_DIR="release/${PACK_NAME}"

echo "📦 Creating Comprehensive Offline Installer Pack v${VERSION}..."
echo "⚠️  This pack includes node_modules for zero-internet deployment"
echo "✨ Includes: PostgreSQL setup, Nginx config, DB seeding, PM2"

# Clean previous
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# 1. Build production bundle
echo "🔨 Building production bundle..."
npm run build

# 2. Install ALL dependencies (including dev) for complete offline deployment
# This ensures zero missing packages on air-gapped servers
echo "📥 Preparing complete node_modules (all dependencies)..."
cp package.json package-lock.json "$RELEASE_DIR/"
cd "$RELEASE_DIR"
npm ci
cd -

# 3. Copy runtime files
echo "📁 Copying runtime files..."
cp -r dist "$RELEASE_DIR/"
cp -r shared "$RELEASE_DIR/"
cp -r migrations "$RELEASE_DIR/"
cp -r Database "$RELEASE_DIR/"
cp -r scripts/installer "$RELEASE_DIR/"
cp ecosystem.config.cjs "$RELEASE_DIR/"
cp drizzle.config.ts "$RELEASE_DIR/"
cp .env.example "$RELEASE_DIR/"

# 4. Make installer scripts executable
chmod +x "$RELEASE_DIR/installer/"*.sh

# 5. Create main install script (smart detection)
cat > "$RELEASE_DIR/install.sh" << 'INSTALL_SCRIPT'
#!/bin/bash
# HP Tourism Portal v0.6.1 - All-in-One Installer
# Detects fresh install vs upgrade and runs appropriate setup

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "  HP Tourism Portal v0.6.1"
echo "  Comprehensive All-in-One Installer"
echo "============================================"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} This installer must be run as root"
    echo "Usage: sudo ./install.sh"
    exit 1
fi

# Export environment for sub-scripts
export HPTOURISM_INSTALL_DIR="${HPTOURISM_INSTALL_DIR:-/opt/hptourism}"
export HPTOURISM_PORT="${HPTOURISM_PORT:-5050}"
export HPTOURISM_DB_NAME="${HPTOURISM_DB_NAME:-hptourism}"
export HPTOURISM_DB_USER="${HPTOURISM_DB_USER:-hptourism_user}"

# Detect installation type
if [ -d "$HPTOURISM_INSTALL_DIR/dist" ] && [ -f "$HPTOURISM_INSTALL_DIR/.env" ]; then
    echo -e "${BLUE}[INFO]${NC} Existing installation detected at $HPTOURISM_INSTALL_DIR"
    echo ""
    echo "Options:"
    echo "  1) Upgrade existing installation (preserves data)"
    echo "  2) Fresh install (will backup existing)"
    echo "  3) Cancel"
    echo ""
    read -p "Choose option [1/2/3]: " choice
    
    case $choice in
        1)
            echo ""
            source "$SCRIPT_DIR/installer/setup-upgrade.sh"
            ;;
        2)
            echo ""
            echo -e "${YELLOW}[WARN]${NC} Existing installation will be backed up"
            BACKUP_DIR="/opt/hptourism-backup-$(date +%Y%m%d_%H%M%S)"
            mv "$HPTOURISM_INSTALL_DIR" "$BACKUP_DIR"
            echo "Backup saved to: $BACKUP_DIR"
            source "$SCRIPT_DIR/installer/setup-fresh.sh"
            ;;
        *)
            echo "Installation cancelled"
            exit 0
            ;;
    esac
else
    echo -e "${BLUE}[INFO]${NC} No existing installation found"
    echo "Proceeding with fresh installation..."
    echo ""
    source "$SCRIPT_DIR/installer/setup-fresh.sh"
fi
INSTALL_SCRIPT
chmod +x "$RELEASE_DIR/install.sh"

# 6. Create start scripts
cat > "$RELEASE_DIR/start.sh" << 'START_SCRIPT'
#!/bin/bash
export NODE_ENV=production
node dist/index.js
START_SCRIPT
chmod +x "$RELEASE_DIR/start.sh"

# 7. Create README
cat > "$RELEASE_DIR/README.md" << 'README'
# HP Tourism Portal v0.6.1 - Comprehensive All-in-One Installer

## What This Installer Does

On a **fresh Ubuntu server**, this installer will:
1. Install PostgreSQL (if not present)
2. Install Nginx (if not present)
3. Verify Node.js v20+ (manual install required)
4. Create database user and database
5. Deploy application to `/opt/hptourism/`
6. Run database migrations
7. Seed database with admin users, staff accounts, and DDO codes
8. Configure Nginx reverse proxy
9. Set up PM2 process manager with auto-start

## Prerequisites

- Ubuntu 22.04 or 24.04 LTS
- Root access (sudo)
- Node.js v20+ (must be pre-installed)

## Quick Install

```bash
# Extract and install
tar -xzf hptourism-v0.6.1-offline.tar.gz
cd hptourism-v0.6.1-offline
sudo ./install.sh
```

## Installation Options

The installer automatically detects:
- **Fresh Install**: Full stack setup (PostgreSQL, Nginx, App, DB seeding, PM2)
- **Upgrade**: Backup existing → Update code → Migrate DB → Restart

## Default Login Credentials

| User | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | Ulan@2025 |
| Admin | admin | Admin@2025 |

## Environment Variables

Set before running install.sh to customize:
```bash
export HPTOURISM_INSTALL_DIR=/opt/hptourism  # App location
export HPTOURISM_PORT=5050                    # App port
export HPTOURISM_DB_NAME=hptourism            # Database name
export HPTOURISM_DB_USER=hptourism_user       # DB user
```

## Directory Structure
```
├── dist/           # Compiled application
├── node_modules/   # All dependencies (offline)
├── shared/         # Shared types
├── migrations/     # Database migrations
├── Database/       # Seed SQL files
├── installer/      # Setup scripts
│   ├── setup-fresh.sh
│   ├── setup-upgrade.sh
│   ├── setup-db.sh
│   ├── setup-db-seed.sh
│   └── setup-nginx.sh
├── ecosystem.config.cjs  # PM2 config
├── install.sh      # Main entry point
└── start.sh        # Manual start script
```

## PM2 Commands

```bash
pm2 list              # View processes
pm2 logs hptourism    # View logs
pm2 restart hptourism # Restart app
pm2 monit             # Real-time monitoring
```
README

# 8. Calculate size
echo "📊 Calculating package size..."
PACK_SIZE=$(du -sh "$RELEASE_DIR" | cut -f1)
echo "📦 Package size: $PACK_SIZE"

# 8. Create tarball (better for Linux)
echo "🗜️  Creating tarball..."
cd release
tar -czf "${PACK_NAME}.tar.gz" "$PACK_NAME"
TARBALL_SIZE=$(du -sh "${PACK_NAME}.tar.gz" | cut -f1)
cd -

echo ""
echo "============================================"
echo "✅ Offline Installer Pack Created!"
echo "============================================"
echo "Location: release/${PACK_NAME}.tar.gz"
echo "Size: $TARBALL_SIZE (compressed)"
echo ""
echo "To deploy:"
echo "  1. Copy release/${PACK_NAME}.tar.gz to staging server"
echo "  2. Extract: tar -xzf ${PACK_NAME}.tar.gz"
echo "  3. cd ${PACK_NAME} && ./install.sh"
echo ""
