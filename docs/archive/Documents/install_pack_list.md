# Offline Install Pack List (Ubuntu 24.04 “noble”, amd64)

This is the full list of OS/runtime dependencies the installer needs for a **fully offline** deployment. Bundle these exact versions as `.deb` files and install from a local repo or with `dpkg -i` + `apt-get -f install` pointing at the local pool (no internet required).

## Current offline pack (full, Nov 27, 2025)
- Path: `Offline Install Packs/Release/1.0.1-offline/`
- Contents: `homestay-r1.0.1-offline.tar.gz` (app + deps + installer) and `deps/apt` local repo with all debs below. Offline installer name: `offline-install.sh` (targets `/opt/homestay-r1.0.1-offline`).
- Runtime bundles: Node.js `v20.17.0` tarball, PM2 `6.0.13` tgz (installer skips if Node 20.x / PM2 6.x already present).

## OS packages (deb files)
- nginx `1.24.0-2ubuntu7.5` (~450 KB)
- postgresql-16 `16.10-0ubuntu0.24.04.1` (~15.5 MB)
- postgresql-client-16 `16.10-0ubuntu0.24.04.1` (~1.3 MB)
- postgresql-common `257build1.1` (~160 KB)
- postgresql-client-common `257build1.1` (~100 KB)
- postgresql-contrib `16+257build1.1` (~15 KB)
- libpq5 `16.10-0ubuntu0.24.04.1` (~150 KB)
- fail2ban `1.0.2-3ubuntu0.1` (~410 KB)
- python3-pyasyncore `1.0.2-2` (~10 KB)
- python3-pyinotify `0.9.6-2ubuntu1` (~25 KB)
- whois `5.5.22` (~50 KB)
- ssl-cert `1.1.2ubuntu1` (~20 KB)
- libperl5.38t64 `5.38.2-3.2ubuntu0.2` (~4.6 MB)
- perl `5.38.2-3.2ubuntu0.2` (~220 KB)
- perl-base `5.38.2-3.2ubuntu0.2` (~1.9 MB)
- perl-modules-5.38 `5.38.2-3.2ubuntu0.2` (~2.7 MB)
- libjson-perl `4.10000-1` (~90 KB)
- libjson-xs-perl `4.040-0ubuntu0.24.04.1` (~80 KB)
- libcommon-sense-perl `3.75-3build3` (~30 KB)
- libtypes-serialiser-perl `1.01-1` (~15 KB)
- libllvm17t64 `1:17.0.6-9ubuntu1` (~35 MB)

## Runtime bundles
- Node.js `v20.17.0` (pre-bundled tarball) (~35–40 MB)
- PM2 `6.0.13` (tgz) (~1–2 MB)

## Approx bundle size
All .deb files + Node/PM2 tarballs: **~800 MB – 1.0 GB** (varies slightly by packaging overhead).

## Offline repo layout (recommended)
Place debs under `deps/apt/` and create a local repo:
```
deps/apt/pool/.../*.deb
deps/apt/Packages.gz
deps/apt/Release
```
Generate metadata with `dpkg-scanpackages` (from `dpkg-dev` on a machine with tools):
```
dpkg-scanpackages pool /dev/null | gzip -9c > Packages.gz
```
In `Installation/setup.sh`, before install:
```
echo "deb [trusted=yes] file:///opt/homestay-<ver>/deps/apt ./" > /etc/apt/sources.list.d/homestay-offline.list
apt-get update
apt-get install -y --no-install-recommends <package list> || apt-get -f install -y
```
Also set in the script to avoid network fetches:
```
echo 'Acquire::Retries "0"; Acquire::http::Proxy "false"; Acquire::https::Proxy "false";' > /etc/apt/apt.conf.d/90homestay-offline
```

## One-click offline install (target)
- Tarball contains: app code, Node/PM2 tarballs, the local apt repo above, and installer scripts.
- `Installation/setup.sh` uses only bundled artifacts, registers systemd services, runs migrations/seeds, and starts `homestay-r1.service`.

## Manual fallback (no local repo)
Install debs in one shot:
```
dpkg -i deps/apt/pool/**/*.deb || apt-get -f install -y
```
Ensure `apt-get` is forced offline (no proxies/mirrors).

## Verify after install
- `systemctl status homestay-r1` (app)
- `systemctl status homestay-r1-backup.timer` (backups)
- `psql -U hptourism_user -d hptourism_stg -c "select 1"` (DB)
- `node -v && pm2 -v`
