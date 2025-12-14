# Packaging Manifest (Ubuntu 24.04 LTS)

This document lists every component we need to bundle for an **offline installation** of the HP Tourism Homestay portal. Sizes are approximate and were measured on the current staging build (Nov 18 2025).

## 1. Application Artifacts

| Artifact | Version / Commit | Size | Notes |
|----------|------------------|------|-------|
| `node_modules/` | npm lock @ `rest-express@1.0.0` | **516 MB** | Contains all production + dev dependencies (bcrypt, drizzle, pino, etc.). Bundle this directory for offline installs. |
| `dist/` | Build from `npm run build` | **17 MB** | Contains the compiled React frontend (`dist/public`) and bundled server (`dist/index.js`). Rebuild after every code change. |
| `client/`, `server/`, `shared/`, `docs/`, `Installation/`, `Database/` | Git working tree | **24 MB total** | Ship as source for reference + future rebuilds. |
| `local-object-storage/` | Empty placeholder | negligible | Created on first upload; keep directory in package so permissions are pre-set. |
| `logs/` | Created at runtime | n/a | PM2 writes `logs/app.log` (rotating). Package can pre-create folder with correct perms. |

## 2. System Dependencies (must be available offline)

| Dependency | Version | Approx Size | Why we need it |
|------------|---------|-------------|----------------|
| **Node.js** | 22.21.0 (Linux x64) | ~55 MB (binary tarball) | Runtime for the Express API + build tooling. Grab from NodeSource or nodejs.org `node-v22.21.0-linux-x64.tar.xz`. |
| **npm** | 10.9.4 (bundled with Node 22.21.0) | Included with Node | Used only once offline to install local packages (already bundled, but keep CLI available). |
| **pm2** | 6.0.13 (global) | ~3 MB | Process manager + log rotation. Install via bundled `npm install -g pm2` tarball or ship the PM2 binary. |
| **PostgreSQL Server** | 16.x | ~35 MB (`postgresql-16`) | Optional local DB. Provide `.deb` files from Ubuntu repo so installer can seed automatically. |
| **PostgreSQL Client** | 16.x | ~12 MB | Needed even when DB is external (for seeds/backups). |
| **build-essential** | Ubuntu meta package (gcc/g++/make) | ~45 MB | Required to build native modules (bcrypt) during offline npm install. |
| **python3 / pip** | 3.12 (Ubuntu default) | already on 24.04 | Needed by node-gyp; include if target hosts are minimal. |
| **git** | 2.43.x | ~25 MB | Optional if we ship as tarball, required if the installer clones from git. |
| **curl / ca-certificates** | Ubuntu defaults | <5 MB | Used by setup scripts (HimKosh ping, health checks). |
| **systemd service or PM2** | n/a | n/a | We standardize on PM2; no extra systemd unit required. |

> **Object Storage:** By default we operate in `OBJECT_STORAGE_MODE=local`, so no MinIO binary is required. If a deployment wants S3/MinIO, they can point to an existing bucket; the application already supports S3-compatible endpoints. We do not ship MinIO in the default package to keep size down.

## 3. Installer Inputs

| Config | Location | Notes |
|--------|----------|-------|
| `.env` / `db-config.env` | `Database/` | Documented defaults (`postgres/postgres@localhost:5432/hptourism_stg_rc3`). |
| `ecosystem.config.cjs` | repo root | Includes logging flags and DB URL. Installer should template this file. |
| `pm2` scripts | `package.json` | `npm run build`, `pm2 start ecosystem.config.cjs`. |

## 4. Optional Utilities

| Component | Version | Size | Purpose |
|-----------|---------|------|---------|
| `psql` scripts | bundled | tiny | Seeds / migrations (`npx tsx server/seed.ts`). |
| `Installation/setup.sh` | repo | few KB | Automates npm install + PM2 setup (extend to accept `--with-db`). |
| `Installation/backup.sh` | repo | few KB | Backs up DB + storage; update to capture logs once logging finalised. |

Keep this manifest alongside the installer so we can verify everything is accounted for before producing an air-gapped tarball.
