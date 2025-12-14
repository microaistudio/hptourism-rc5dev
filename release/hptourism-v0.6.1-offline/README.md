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
