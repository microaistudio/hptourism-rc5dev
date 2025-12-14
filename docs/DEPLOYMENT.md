# HP Tourism Portal – Deployment & Ops Guide (RC4 Phase I)

This guide captures the current production-hardening workflow for staging/prod VMs (single Node.js host with Nginx, TLS, Postgres, PM2/systemd). Follow it end-to-end before cutting over to a new cloud VM.

---

## 1. Prepare the VM

```
sudo apt update && sudo apt upgrade -y
sudo apt install -y git build-essential nodejs npm postgresql-client ufw
sudo adduser --disabled-password --gecos "" appuser
sudo usermod -aG sudo appuser
```

Firewall baseline:

```
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. Clone and install

```
sudo su - appuser
git clone https://github.com/microaistudio/hptourism-r1.git hptourism
cd hptourism
npm install
```

Always run `npm install` after every pull.

---

## 3. Configure environment (.env)

Use `.env.example` as the canonical template:

```
cp .env.example .env
nano .env
```

Populate at minimum:

- `DATABASE_URL` (production Postgres URI)
- `SESSION_SECRET` (>= 32 chars)
- `FRONTEND_BASE_URL`, `HIMKOSH_*` credentials
- `OBJECT_STORAGE_MODE` (`local` for this VM today; `s3` when MinIO/AWS bucket is ready)
- Optional security toggles (`SECURITY_ENABLE_RATE_LIMIT`, `SECURITY_ENABLE_CSRF`, ClamAV host/port, Redis URL)

Drizzle schema migration:

```
npm run db:push
npx tsx server/seed.ts   # idempotent; creates officer/demo accounts
```

---

## 4. Build + launch

```
npm run build
```

### PM2 (default for RC3/RC4 VM)

```
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # follow instructions to persist across reboots
```

### Systemd alternative

Copy `infra/systemd/hptourism.service` to `/etc/systemd/system/`, adjust paths (WorkingDirectory, user), then:

```
sudo systemctl daemon-reload
sudo systemctl enable --now hptourism
```

Logs stream to syslog (via pino). Tail with `journalctl -u hptourism -f`.

---

## 5. Nginx + Certbot

The repo ships a helper script + site template:

```
sudo CERTBOT_EMAIL=ops@example.com ./scripts/setup-nginx-certbot.sh hptourism.osipl.dev 5000
```

What it does:
- Installs Nginx, Certbot, UFW rules
- Copies `infra/nginx/hptourism.conf`, injects domain/port placeholders
- Generates `dhparam.pem`, requests Let’s Encrypt certificates, reloads Nginx

Static bundle location: `/opt/hptourism/app/dist/client`. Ensure PM2/systemd syncs the built artifacts into `/opt/hptourism/app`.

Renewal is handled by `certbot` (systemd timer). Validate with `sudo certbot renew --dry-run`.

---

## 6. Backups & log rotation

### Nightly backup script

```
sudo mkdir -p /var/backups/hptourism
sudo chown appuser:appuser /var/backups/hptourism

sudo tee /etc/cron.d/hptourism-backup <<'CRON'
0 2 * * * appuser BACKUP_ROOT=/var/backups/hptourism \
DATABASE_URL="postgresql://user:pass@localhost:5432/hptourism" \
LOCAL_OBJECT_DIR=/opt/hptourism/app/local-object-storage \
/opt/hptourism/app/scripts/backup.sh >> /var/log/hptourism/backup.log 2>&1
CRON
```

The script (`scripts/backup.sh`) dumps Postgres, tars the local object storage, writes a manifest, and prunes anything older than 14 days (configurable via `RETENTION_DAYS`).

### Logrotate

Deploy `infra/logrotate/hptourism` to `/etc/logrotate.d/hptourism` to rotate Nginx + PM2 logs and keep the disks tidy. It also flushes PM2 logs and reloads Nginx after rotation.

---

## 7. Health, monitoring, runbooks

- `/healthz` now returns DB latency + object-storage readiness; configure uptime checks against `https://hptourism.osipl.dev/healthz`.
- All PM2/systemd logs are JSON (pino) with `reqId` headers; forward them to ELK/Loki via filebeat if available.
- `scripts/setup-nginx-certbot.sh` + `infra/systemd/hptourism.service` serve as living runbooks for new cloud VMs (AWS/Azure). Copy them, adjust domain/paths, and re-run to hydrate a new box.
- For manual failover, rsync `/var/backups/hptourism` + `local-object-storage` to the standby VM, restore `database.sql`, then redeploy the bundle.

---

## 8. Troubleshooting

- **Health endpoint fails:** check Postgres connectivity (`psql $DATABASE_URL`) and object storage path/MinIO creds. `/healthz` status will call out which component is unhealthy.
- **Redis session store fallback:** if Redis is configured but unreachable, the server logs `[session] Failed to initialize Redis store` and reverts to Postgres automatically.
- **File uploads rejected:** review rate-limit counters and ClamAV status (`CLAMAV_ENABLED`). Local uploads are scanned synchronously; infected files are blocked with HTTP 400.
- **Admin dashboard mismatch:** run `psql` and update the user role (see previous version of this doc).
- **Certificate renewal:** `sudo certbot renew --dry-run` to verify timers; check `/var/log/letsencrypt/letsencrypt.log` if renewal fails.

---

## Appendix

- **Schema:** defined in `shared/schema.ts` (Drizzle). Tables: `users`, `homestay_applications`, `documents`, `payments`, `notifications`, `application_actions`, `himkosh_transactions`, etc.
- **Seed accounts:** `scripts/seed-mock-data.ts` and `server/seed.ts` create DA / DTDO / owner demo logins (documented in `CodeXFiles/SESSION_TIME_CAPSULE.md`).
- **Reverse proxy template:** `infra/nginx/hptourism.conf` (placeholders `__DOMAIN__`, `__APP_PORT__`).
- **Backup + logrotate templates:** `scripts/backup.sh`, `infra/logrotate/hptourism`.
- **Systemd template:** `infra/systemd/hptourism.service`.

Keep this file updated as we continue Phase I hardening. Once the GOV DC migration begins, the same automation applies—only the domain, storage backend, and database hosts change.
When pulling new code from Git:

```bash
cd ~/projects/hptourism-r1.1
git pull origin main
npm install           # ← CRITICAL: Always install new dependencies
npm run build
pm2 restart hp-tourism
```

Common mistake: Forgetting to run `npm install` after `git pull` will cause build failures if new packages were added.

---

## Support

For issues or questions:
1. Check logs: Application logs, PostgreSQL logs
2. Review this deployment guide
3. Check `replit.md` for system architecture details

### Common Build Errors

**Error: "Rollup failed to resolve import"**
- Cause: Missing dependencies
- Fix: Run `npm install` before `npm run build`
