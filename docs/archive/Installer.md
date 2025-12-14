# Homestay Installer Guide

This document explains how our release tarballs are structured and how to install them on a fresh VM without internet access. Use it whenever you promote a new build to a staging box.

## Package Layout

Each tarball is named `homestay-r<version>.tar.gz` and unpacks to `/opt/homestay-r<version>`. Inside you will find:

| Path | Purpose |
| --- | --- |
| `client/`, `server/`, `shared/`, `dist/`, `node_modules/` | Application code and the production build. |
| `Installation/` | Deployment assets, including `setup.sh` and the nginx template. |
| `Database/`, `migrations/`, `seed_data/` | SQL schema, migration scripts, and helper utilities. |
| `deps/` | Offline dependencies (`*.deb` packages, Node.js tarball, PM2 tgz, etc.). The installer uses these first and only falls back to apt if something is missing. |
| `.env.example`, `drizzle.config.ts`, `package*.json`, `ecosystem*.cjs`, `docs/`, `infra/`, etc. | Configuration and documentation that is required post-install. |

The `release/` folder on the build machine also contains:

- `homestay-r<version>.tar.gz.sha256`: checksum using only the archive name so it can be verified anywhere.
- `unpack-release.sh`: helper that extracts the tarball into the chosen target directory.

## Installation Workflow

1. **Copy artifacts to the VM**
   - `homestay-r<version>.tar.gz`
   - `homestay-r<version>.tar.gz.sha256`
   - `unpack-release.sh`

2. **Verify integrity**
   ```bash
   cd ~/Projects/Setup
   sha256sum -c homestay-r<version>.tar.gz.sha256
   ```

3. **Extract**
   ```bash
   sudo bash unpack-release.sh homestay-r<version>.tar.gz /opt
   cd /opt/homestay-r<version>
   ```

4. **Run the installer**
   ```bash
   sudo bash Installation/setup.sh
   ```

   The script must run as root and performs the following:
   - Installs OS packages from `deps/` (nginx, PostgreSQL 16, libpq, fail2ban, etc.). If a file is missing it falls back to apt.
   - Installs Node.js + PM2 from `deps/` to `/usr/local`.
   - Creates the `hptourism` system user, `/opt/hptourism/app`, and `/var/lib/hptourism/storage`.
   - Copies the entire release tree into `/opt/hptourism/app`.
   - Sets up PostgreSQL (`hptourism_stg` DB, `hptourism_user` role) when `INSTALL_LOCAL_DB=true`.
   - Generates `.env` from `.env.example`, fills database + storage defaults, and writes `Database/db-config.env`.
   - Runs `npm install`, `npm run db:push` (using bundled `drizzle.config.ts`), and `npm run build`.
   - Configures the `hptourism-stg.service` systemd unit, nginx site, and nightly backup timer. The installer auto-detects the VM's primary IP via `hostname -I` and uses it as the nginx `server_name`, so you can immediately browse to `http://<server-ip>/`.

5. **Review**
   - Installer logs live under `/var/log/hptourism-installer/install-*.log`.
   - Check service status: `sudo systemctl status hptourism-stg`.

## Troubleshooting Tips

- If apt tries to reach the network, confirm the required `.deb` or Node tarball exists under `/opt/homestay-r<version>/deps`.
- `.env` creation failures usually mean `.env.example` was removed; regenerate the release and ensure it is present.
- `npm run db:push` needs `drizzle.config.ts` in the release root; verify the tarball contains it.
- To rerun the installer, remove `/opt/homestay-r<version>` and `/opt/hptourism/app` (if safe) before extracting again to avoid stale files.

## Cleaning Up Old Builds

Keep the `~/Projects/Setup` folder tidy to avoid confusion:
```bash
rm -f homestay-r*.tar.gz homestay-r*.tar.gz.sha256
```
Only the active tarball and checksum should remain before copying to the VM.

---

Document history:
- `r1.0.5`: Added offline dependency packaging (`deps/` + `.env.example` + `drizzle.config.ts`) and formalized these instructions.
