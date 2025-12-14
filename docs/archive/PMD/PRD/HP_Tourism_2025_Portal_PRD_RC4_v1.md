# HP Tourism 2025 Portal — Production Readiness Plan (RC4 v1)

> Purpose: capture the technical scope required to take the current demo-ready HP Tourism homestay portal to a production-grade deployment on a single VM, while keeping the existing lightweight setup running for end-to-end testing.

---

## 1. Current State Overview

| Layer | What We Have Today | Key Gaps |
| --- | --- | --- |
| **Application** | Node.js 22 + Express API (ESM), React/Vite front-end, Drizzle ORM, session auth (connect-pg-simple). | Minimal configuration management, limited request validation, console logging only. |
| **Database** | PostgreSQL 16 (local) with Drizzle schema. | No automated backups or monitoring; session store still on Postgres. |
| **Object Storage** | Replit sidecar integration in code, but unavailable on VM → uploads fail. | Need S3-compatible service (MinIO) or robust local fallback. |
| **Security** | Sessions not marked `secure/sameSite`, no rate limiting or CSRF guards, no virus scanning on uploads. | Harden cookies, add throttling, integrate ClamAV. |
| **Ops/Monitoring** | PM2 used manually; no startup persistence, minimal log management, no health checks. | Systemd/pm2 startup script, log rotation, health endpoint and uptime monitor. |

---

## 2. Target Architecture (Single VM Option)

Matches the Option B recommendation for 200–300 applications/day (~50–100k per year).

| Layer | Components | Notes |
| --- | --- | --- |
| **OS & Security** | Ubuntu 24.04 LTS, UFW firewall, fail2ban, SSH key auth only. | Harden base image. |
| **Reverse Proxy** | Nginx + Certbot TLS termination. | Rate limit, compression, serve static bundle. |
| **Application** | Node.js 22 LTS (systemd or PM2), Express API, React build in `/opt/hptourism/app`. | `.env` managed centrally. |
| **Database** | PostgreSQL 16 with daily `pg_dump` + WAL retention. | Stored on NVMe, cron backups. |
| **Cache / Sessions** | Redis 7 (recommended) for session store + rate limiting. | Optional but improves performance. |
| **Object Storage** | MinIO single-node, S3 API, server-side encryption, lifecycle rules. | Stores Annexure-II documents. |
| **Security** | ClamAV for upload scanning, file size/type limits, request validation. | Scans triggered pre- or post-upload. |
| **Observability** | Structured JSON logs (pino/winston), logrotate + Promtail/Grafana or basic uptime monitor hitting `/healthz`. | Alerts on failures. |

---

## 3. Application Changes Required

### 3.1 Configuration & Secrets
- Create `shared/config.ts` (or similar) to load `.env`, validate via Zod, and expose typed configuration (database, redis, object storage, session, security).
- Add `.env.example` and production template; avoid scattered `process.env` reads.

### 3.2 Object Storage & Upload Flow
- Replace Replit-specific `ObjectStorageService` with pluggable backends:
  - **Local fallback** (in place now) for end-to-end validation.
  - **MinIO/S3** for production using `@aws-sdk/client-s3` + signed URLs.
- Enforce upload size/MIME restrictions; reject unsupported file types before generating URLs.
- Persist metadata (version, checksum, uploadedBy) in `documents` table.

### 3.3 Security Hardening
- Migrate session store to Redis (`connect-redis`) or tighten Postgres store with TTL cleanup; mark session cookie `secure`, `sameSite=lax`, `httpOnly`.
- Add CSRF protection (token via `csurf` or double-submit cookie) on mutating routes.
- Rate-limit sensitive endpoints (login, file upload, draft save).
- Audit all API inputs using Zod schemas (already partially in place).

### 3.4 Logging & Monitoring
- Introduce structured logger (pino) with request IDs and error stack traces; unify log format.
- Add `/healthz` endpoint returning DB and object storage status.
- Configure logrotate for app/pm2/nginx/minio/postgres logs.
- Optional: Prometheus metrics endpoint + Grafana dashboards.

### 3.5 Build/Deploy Flow
- Standardize build command (`npm ci && npm run build`) and start (`node dist/index.js`).
- Provide deployment script or Ansible playbook to set up VM consistently (users, directories, systemd units).
- For PM2 users: enable `pm2 startup` + `pm2 save`, ensure environment variables are managed securely.

### 3.6 Backups & Maintenance
- Nightly `pg_dump` with retention (e.g., 30 days) stored locally and copied to secondary storage.
- MinIO bucket mirrored using `mc mirror` or similar.
- Document restoration procedure, including rotated secrets.

---

## 4. Implementation Plan

### Phase 0 — Prep & Assessment
- [x] Inventory current components, DB schema, existing builds.
- [x] Document gaps (this plan).

### Phase 1 — Base Infrastructure (this VM)
1. System updates, install Node.js 22, Nginx, Certbot, Redis (optional), Postgres (done), ClamAV.
2. Install & configure MinIO (`/opt/minio/data`), create bucket, admin creds.
3. Harden OS: UFW rules (80/443/22 only), fail2ban, disable password SSH.
4. Create service user (`appuser`) and directories (`/opt/hptourism/app`, `/var/backups/hptourism`).

### Phase 2 — App Hardening
1. Implement config module and environment schema.
2. Integrate object storage abstraction (local + S3/minio backends).
3. Add upload guards (size, type, ClamAV scan).
4. Migrate session handling & apply security improvements (cookies, rate limit, CSRF).
5. Add structured logging + request IDs.

### Phase 3 — Operations & Tooling
1. Systemd units (or hardened PM2 scripts) for Node app, Redis, MinIO, ClamAV.
2. Log rotation, backup cron jobs (Postgres + MinIO mirror).
3. Monitoring: configure `/healthz`, uptime monitor, optional Prometheus/Loki.
4. Create deployment & rollback runbooks.

### Phase 4 — QA & Launch
1. End-to-end manual tests (owner → district → state).  
2. Automated smoke tests + load testing (k6 or JMeter).  
3. Security checks (OWASP ZAP baseline, manual pen test).  
4. Cutover: point DNS to VM, enable HTTPS via Certbot, final data migration if needed.

---

## 5. Immediate Testing Plan (Current Lightweight Setup)

We now have a local object-storage fallback to keep the workflow unblocked:

1. **Owner Flow**: create/continue draft, upload documents (verify files appear under `local-object-storage/<type>s/`), submit application.
2. **District Officer**: review submitted application, download documents (served via `/api/local-object/download/:id`), add remarks and forward.
3. **State Officer**: final approval/rejection process, ensure status transitions and notifications work.
4. **Document Integrity**: download an uploaded file and confirm contents, then delete/re-upload to test replacement logic.
5. **Audit**: query `documents` and `application_actions` tables to ensure metadata is captured as expected.

This ensures the business workflow works even before the full MinIO/Nginx setup is in place.

---

## 6. Deliverables Checklist

- [ ] Config module + `.env` templates published in repo.
- [ ] Object storage abstraction (local + S3/MinIO) with validation and ClamAV integration.
- [ ] Hardened Express middleware (rate limit, CSRF, security headers).
- [ ] Structured logging, `/healthz`, log rotation.
- [ ] Deployment automation (systemd/PM2 scripts, Nginx config), documented runbook.
- [ ] Backup scripts for PostgreSQL and MinIO, verified restore procedure.
- [ ] Monitoring/alerting in place.
- [ ] QA test plan and results documented.

---

## 7. Next Steps

1. **Finish functional testing** using the current local-storage setup (owner → district → state workflows).
2. **Provision production stack components** (MinIO, Redis, Nginx) per Phase 1.
3. **Implement code changes** outlined in Phases 2 & 3.
4. **Run QA** and plan cutover with stakeholders.

Once the code hardening and infrastructure setup are complete, we’ll be ready to migrate from this VM’s lightweight config to the full production-grade deployment.
