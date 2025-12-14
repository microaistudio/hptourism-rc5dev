# HP Tourism 2025 Portal – Production Readiness Phase I

This document captures the first production-hardening sprint required to move the current RC3 stack into the “Phase I” production architecture described in `HP_Tourism_2025_Portal_PRD_RC4_v1.md`. The goal of Phase I is to close the functional gaps (form persistence, dashboards, analytics) and install the baseline infrastructure components (Nginx/TLS, MinIO, hardened config) on the single-VM deployment.

---

## Objectives

1. **Reliability of core workflow** – every field captured by the owner form must persist, render in preview/export, and surface in officer dashboards.
2. **Unified deployment surface** – production and staging run behind Nginx with HTTPS, using the same scripts/runbooks.
3. **Object storage upgrade** – replace Replit/local-only uploads with a MinIO/S3-compatible backend plus basic validation.
4. **Foundational hardening** – move configuration into a typed module, secure session handling, add structured logging + `/healthz`.

---

## Deliverables

| # | Area | Deliverable |
|---|------|-------------|
| 1 | **Form Persistence** | ✅ Audit all React form fields → ensure owner/draft schemas accept them → community preview/export reflects full dataset. |
| 2 | **Tehsil Handling** | ✅ Remove forced fallbacks; manual “Other” entries persist; stored value matches LGD or free text. |
| 3 | **Officer Dashboards** | ✅ DA/DTDO endpoints fetch real submissions; filtering logic matches statuses; manual refresh shows latest records. |
| 4 | **Analytics Widgets** | ✅ Live Production cards pull actual counts from `homestay_applications` (no dummy data). |
| 5 | **Nginx + TLS Baseline** | ✅ Automated Nginx config + Certbot issuance; HTTP→HTTPS redirect; `deploy.sh`/docs updated. |
| 6 | **MinIO Integration** | ✅ `ObjectStorageService` abstraction for local + MinIO; upload validation (size, MIME). |
| 7 | **Configuration Module** | ✅ `shared/config.ts` (Zod-validated) with `.env.example` and production template. |
| 8 | **Structured Logging** | ✅ Pino logger with request IDs and `/healthz`; logrotate entries documented. |
| 9 | **Session Hardening** | ✅ Secure cookie flags, optional Redis session store, rate limiting on auth/upload endpoints. |

---

## Work Plan

### Sprint 1 – Functional Reliability
1. **Form whitelist & preview**
   - Map all frontend `name=` fields to backend schema; add missing fields to Zod schemas and persistence layer.
   - Update preview and officer detail views to display all stored fields.
2. **Tehsil persistence fix**
   - Remove auto-reset on hydration; persist manual value or explicit LGD pick.
   - Add request/unit tests to ensure tehsil survives draft saves and submissions.
3. **Dashboards & analytics**
   - Adjust `/api/da/applications` and `/api/dtdo/applications` filters to include new statuses.
   - Replace dummy analytics calculations with live DB queries.

### Sprint 2 – Infrastructure & Hardening
1. **Nginx/TLS automation**
   - Add provisioning script (or Ansible/README steps) to install Nginx, drop site config, set up ACME dir, run `certbot --nginx`.
   - Update deployment docs to use `https://hptourism.osipl.dev` (or environment-specific domain).
2. **Object storage abstraction**
   - Implement S3-compatible client (MinIO) with signed PUT/GET URLs.
   - Provide local filesystem fallback for dev/test; enforce file-type/size rules.
3. **Configuration module**
   - Centralize environment reads in `shared/config.ts` with Zod validation.
   - Document `.env` keys (`DATABASE_URL`, `MINIO_ENDPOINT`, etc.) and provide templates.
4. **Logging & sessions**
   - Introduce pino (or winston) logger; add `pino-http` middleware with request IDs.
   - Create `/healthz` route; configure logrotate entries.
   - Harden sessions (secure cookies, sameSite=lax, optional Redis store), add rate limiting to login/upload.

### Stretch (if time allows)
- ClamAV integration for file scanning.
- Backups: nightly `pg_dump` + MinIO mirror script.
- Basic uptime checker or Prometheus metrics endpoint.

---

## Success Criteria

- Owner → DA → DTDO → payment flow works with fully populated previews and dashboards.
- Production VM can be brought up from a clean image using documented scripts, resulting in:
  - Nginx serving HTTPS with valid cert.
  - Node app running under PM2/systemd with config pulled from `.env`.
  - MinIO running as S3-compatible storage and used by the app for uploads.
- Logs show structured entries; `/healthz` returns 200 with DB/object storage checks.
- Documentation updated (`README`, `deploy.sh`, `.env.example`, `PMD/` runbook).

---

## Open Questions / Dependencies

1. Final domain for production (currently `hptourism.osipl.dev`).
2. Redis availability (needed for session offload and rate limiting).
3. ClamAV deployment location (same VM or dedicated service).
4. Monitoring stack preference (Prometheus/Loki vs. external service).

These will influence Phase II tasks after this initial hardening sprint.

