# Install Package Build Notes (Offline Pack r1.0.1-offline)

## Structure (release folder)
- `homestay-r1.0.1-offline.tar.gz` (+ `.sha256`) – app bundle, node_modules, dist, installer scripts.
- `deps/apt/` – local apt repo (Packages, Release, pool/*.deb).
- `offline-install.sh` – runs with local apt only, installs deps, unpacks, runs `Installation/setup.sh`.
- `offline-uninstall.sh` – removes service, app, DB/role, and packaged deps.
- `README_OFFLINE.md` – usage/refresh instructions.

## Known fixes/pitfalls
- Session cookie now honors env: default `SESSION_COOKIE_SECURE=false`, `SAMESITE=lax`, name `hp-tourism.sid`; cookies set correctly on HTTP.
- Backup dir: installer creates `/var/backups/hptourism`; backup timer runs cleanly.
- Apt repo perms: installer re-chowns/chmods `deps/apt` before `apt-get update` to avoid `_apt` permission errors.
- Captcha: defaults to disabled (`CAPTCHA_ENABLED=false`); set keys and enable if required.
- Node engine warnings: bundled Node 20.17.0 triggers npm engine warnings (vite/jsdom prefer 20.19.x); safe to ignore.

## Group 1 – Preinstalled/OS Stack (bundled debs)
| Component | Version (pinned) | Approx Size |
|-----------|------------------|-------------|
| nginx | 1.24.0-2ubuntu7.5 | ~0.5 MB |
| postgresql-16 | 16.10-0ubuntu0.24.04.1 | ~15.5 MB |
| postgresql-client-16 | 16.10-0ubuntu0.24.04.1 | ~1.3 MB |
| postgresql-common | 257build1.1 | ~0.2 MB |
| postgresql-client-common | 257build1.1 | ~0.1 MB |
| postgresql-contrib | 16+257build1.1 | ~0.02 MB |
| libpq5 | 16.10-0ubuntu0.24.04.1 | ~0.15 MB |
| fail2ban | 1.0.2-3ubuntu0.1 | ~0.4 MB |
| python3-pyasyncore | 1.0.2-2 | ~0.01 MB |
| python3-pyinotify | 0.9.6-2ubuntu1 | ~0.03 MB |
| whois | 5.5.22 | ~0.05 MB |
| ssl-cert | 1.1.2ubuntu1 | ~0.02 MB |
| perl stack (perl, perl-base, perl-modules-5.38, libperl5.38t64) | 5.38.2-3.2ubuntu0.2 | ~9 MB total |
| Perl JSON deps (libjson-perl, libjson-xs-perl, libcommon-sense-perl, libtypes-serialiser-perl) | as above | ~0.25 MB total |
| libllvm17t64 | 1:17.0.6-9ubuntu1 | ~35 MB |
| Local apt metadata (Packages/Release) | — | negligible |

## Group 2 – Application/Runtime Stack (bundled in tarball)
| Component | Version / Notes | Approx Size |
|-----------|-----------------|-------------|
| Application source + dist + configs | homestay r1.0.1-offline | ~25 MB (sources) / ~17 MB (dist) |
| node_modules | snapshot from package-lock | ~500 MB (packed into tarball; total pack folder ~320 MB) |
| Node.js | v20.17.0 (linux-x64 tarball) | ~35–40 MB |
| PM2 | 6.0.13 (tgz) | ~1–2 MB |
| Installer scripts | `Installation/setup.sh`, `offline-install.sh`, `offline-uninstall.sh` | <1 MB |
| Seeds/DB artifacts | Database folder (schema + seeds) | ~0.2 MB |
| Assets (images/docs) | bundled in app | included in tarball |

## Deploy steps (offline)
```bash
cd "/home/subhash.thakur.india/Projects/Offline Install Packs/Release/1.0.1-offline"
sudo bash offline-install.sh
# Verify: systemctl status homestay-r1; curl http://localhost/api/auth/login/options
```

## Uninstall
```bash
cd "/home/subhash.thakur.india/Projects/Offline Install Packs/Release/1.0.1-offline"
sudo bash offline-uninstall.sh
```
