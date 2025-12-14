# Homestay Release Package (R1)

This document lists every artifact bundled inside the offline installer so a single run on Ubuntu 24.04 produces a working portal. Sizes are approximate (from the current repo snapshot).

| Component | Version / Source | Size* | Purpose / Notes |
|-----------|------------------|-------|-----------------|
| Application source (`client/`, `server/`, `shared/`, configs) | Repo: `hptourism-stg-rc3` | 24 MB | React front-end, Express API, shared schema, configs. |
| Build artifacts (`dist/`, `dist/index.js`) | Vite 5.4.20 + esbuild bundle | 17 MB (FE) / 0.5 MB (BE) | Production-ready static assets + bundled Node server. |
| Node.js runtime + npm | Node 20.x LTS tarball | ≈ 50 MB | Required to run the server, seeds, and build scripts. |
| Node dependencies (`node_modules/`) | `package-lock.json` snapshot | 516 MB | All JS dependencies (React, Tailwind, @tanstack, lucide, etc.). |
| PM2 process manager | PM2 5.x | 5 MB | Runs the Node services; installer registers it with systemd. |
| PostgreSQL | Postgres 16 server & client (`postgresql-16`, `postgresql-client-16`) | ≈ 50 MB | Primary DB (`homestay_r1`). |
| DB artifacts (`Database/` folder) | Schema + seeds | 116 KB | `full_schema.sql`, admin & DA/DTDO seeds, DDO mapping, LGD dump, backup script. |
| Upload store | `local-object-storage/` | 75 MB | Default file storage path (can be remounted elsewhere). |
| Backup tooling | `Database/scripts/backup.sh`, system `pg_dump`, `tar`, `find`, optional `rsync` | < 2 MB scripts | Nightly DB + file backups with 7‑day retention (configurable). |
| nginx | nginx 1.24 + site template | ≈ 3 MB | Reverse proxy + TLS termination; proxies `/api` to PM2 cluster. |
| Process config | `ecosystem.config.cjs`, `ecosystem.local.cjs`, PM2 startup script | < 50 KB | Defines cluster workers, ports (4000), and log paths. |
| Docs / Install scripts | `Installation/README.md`, `Installation/setup.sh`, `docs/` | < 1 MB | Step-by-step installer + references. |
| SMS/Payment references | `docs/`, `PMD/`, LGD XML | 8 MB | Canonical references (HimKosh, SMS, LGD). |

*Sizes rounded to the nearest megabyte; they will vary slightly after pruning logs or adding assets.

## Installer Responsibilities

1. **Prerequisite check** – validate Ubuntu 24.04, disk space, core utilities (`bash`, `sudo`, `tar`, `find`, `curl`).
2. **Unpack package** – copy bundle to `/home/subhash.thakur.india/homestay1` (default release root).
3. **PostgreSQL setup** – install Postgres 16, create DB `homestay_r1`, load `full_schema.sql`, run `admin_accounts`, `district_staff`, `ddo_codes`, and `lgd_schema` seeds. Credentials default to `postgres/postgres`.
4. **Node / npm / dependencies** – install Node 20.x, extract `node_modules`, place `.env` pointing at `homestay_r1`.
5. **PM2 services** – install PM2 globally, run `pm2 start ecosystem.config.cjs`, and execute `pm2 startup systemd && pm2 save` so services restart on boot.
6. **nginx reverse proxy** – install nginx, place `/etc/nginx/sites-available/hptourism.conf`, enable site, reload. HTTP works immediately; TLS can be added via Certbot later.
7. **File storage** – ensure `local-object-storage/` exists (or mount external disk there); update `config/storage` if needed.
8. **Backups** – register `Database/scripts/backup.sh` via cron/systemd timer so nightly dumps land in `/home/subhash.thakur.india/homestay1/backups/`.
9. **Smoke tests** – run `npm run build` (optional), hit `/api/health` through nginx, verify DB connection and PM2 status.

After installer completes, accessing `http://<server-ip>/` should show the portal. Super Admin credentials default to `superadmin@himachaltourism.gov.in / ulan@2025` (change immediately).

## Packaging Steps

Use the helper script to build a tarball that includes the compiled frontend, backend, `node_modules`, installer, database artifacts, and documentation. Pass the release tag you want to stamp (for example `r1.0.0`):

```bash
cd /home/subhash.thakur.india/Projects/hptourism-stg-rc3
# Populate deps/ with the offline .deb files + Node/PM2 tarballs
scripts/fetch-deps.sh
scripts/package-release.sh r1.0.0
# ➜ release/homestay-r1.0.0.tar.gz and matching .sha256 checksum
```

The script runs `npm run build`, copies the curated list of directories/files listed above, and drops the archive under `release/` so it can be handed to the installer team.

## Optional Extras

- **MinIO / remote storage** – not bundled by default. If required, ship MinIO binaries + config and update `storage.ts` to use S3 credentials.
- **TLS automation** – include Certbot for Let’s Encrypt if the deployment has outbound internet; otherwise document manual certificate install under nginx.
- **Monitoring / log rotation** – PM2 provides basic rotation; for deeper monitoring include `pm2-logrotate` or systemd journald directives as needed.

Keep this manifest in sync whenever we add/remove components so the release engineer knows exactly what the installer must provision.
