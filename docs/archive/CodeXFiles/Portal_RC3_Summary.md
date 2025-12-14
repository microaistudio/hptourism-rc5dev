# Portal RC3 Summary

## Snapshot
- **Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Branch**: $(git rev-parse --abbrev-ref HEAD)
- **Commit (after tagging)**: pending RC3 restore commit

## Functional Coverage
- Owner → DA → DTDO → Payment → Certificate flows verified end-to-end on RC3.
- HimKosh callback auto-redirects owners to `/dashboard` with query flags so certificates can be downloaded without manual navigation.
- Inspection scheduling limited to 15-minute slots; safety checklist enforced; Tehsil + LGD fixes persisted.
- Analytics/workflow monitor share the same data snapshot; DA/DTDO detail pages use the enhanced summary cards.

## Local Services
- **PostgreSQL 16** running on this VM (service `postgresql`). DB name/user/password stored in `.env`. `drizzle` migrations applied.
- **Local Object Storage**: `local-object-storage/` directory contains subfolders per document type used by ObjectUploader when MinIO/S3 is unavailable.
- **PM2 App**: `pm2 list` shows `hptourism-rc3` started via `ecosystem.config.cjs` with `node dist/index.js` bundle. Logs at `~/.pm2/logs/`.
- **Server Log**: `server.log` captures recent API output plus HimKosh scraper events.

## Environment Files
- `.env` in repo root (not committed) carries DB, session secret, HimKosh creds.
- `ecosystem.config.cjs`/`ecosystem.local.cjs` hold PM2 settings for prod/local.
- `shared/appSettings.ts` + `shared/uploadPolicy.ts` capture runtime-configurable settings that map to DB `system_settings` rows.

## Payment Notes
- HimKosh integration lives under `server/himkosh`. Callback issues certificates immediately and tags app as `approved`.
- Owner dashboard listens for `?payment=success|failed` and surfaces banners + CTA.
- `local-object-storage/property-photos` etc. keep uploaded artifacts referenced by DB.

## Restore Guidance
1. **Database**: restore latest `pg_dump` (see `docs/db/` for commands) or copy from `/var/lib/postgresql/` if VM-level snapshot used.
2. **Files**: copy `local-object-storage/` to preserve documents/photos.
3. **App Code**: checkout the `rc3-restore-point` branch or `RC3_RESTORE_POINT` tag (created in this session) and run `npm ci && npm run build`.
4. **PM2**: `pm2 stop hptourism-rc3 && pm2 delete hptourism-rc3 && pm2 start ecosystem.config.cjs --update-env` after artifacts restored.

## Credentials Reference (masked)
- Owner test accounts: `ownerA/B/...` with `test123` (see `CodeXFiles/KnowledgeBase/TestAccounts.md`).
- DA (`7777777771/test123`), DTDO (`8888888881/test123`).

## Pending RC4 Tasks
- Phase 1 infra hardening (Nginx/Certbot, MinIO, Redis) once DB reset completes.
- Move to shared "application snapshot" response + component to keep dashboards in sync.
- Harden HimKosh config migration + env validation module.

