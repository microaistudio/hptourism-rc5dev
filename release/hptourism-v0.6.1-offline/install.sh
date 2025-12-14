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
