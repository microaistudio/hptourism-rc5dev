# RC3 Time Capsule – Nov 3, 2025

This doc captures the current state of the HP Tourism RC3 stack so the next chat session can pick up right away.

## Environment & Deployment
- Repo: `~/Projects/hptourism-rc3`
- Running via PM2 (`sudo pm2 restart hptourism-rc3 --update-env`); only the root-managed PM2 daemon should stay active.
- Test mode payments forced through PM2 env: `HIMKOSH_TEST_MODE=true`, `HIMKOSH_FORCE_TEST_MODE=true` → gateway always receives ₹1.
- HimKosh key lives at `server/himkosh/echallan.key` (IV = key). Checksum logic uses UTF-8 lowercase MD5 over the full pipe string.

## HimKosh Flow Status
- Initiation endpoint `/api/himkosh/initiate` builds the payload (no duplicate head rows, secondary head only when configured).
- GET handler on `/api/himkosh/callback` serves a holding page; POST handler decrypts and updates transactions.
- Cancellation endpoint `/api/himkosh/application/:applicationId/reset` lets DA/DTDO/owners cancel stuck attempts.
- Frontend payment wizard shows status cards, refresh, cancel button, and test-mode notice.

## Officer Search
- New `POST /api/applications/search` supports filters: application #, mobile, Aadhaar, month/year, custom date range. District-level roles are automatically scoped.
- Shared React page `client/src/pages/officer-application-search.tsx` reused by DA & DTDO navigation via `/da/search` and `/dtdo/search`.

## Navigation
- Sidebar (DA/DTDO) now includes “Search Application”.

## Outstanding Ideas / Next Steps
- Complete callback-driven payment confirmation and certificate unlock flow once treasury integration moves past ₹1 tests.
- Continue tightening guardrails on owner application wizard (additional smart inputs across steps 3+).
- Build reporting for returned applications and document versioning.
- Update PM2 to run under non-root user long term (currently root-managed; watch for dual daemons).

Keep this file updated as RC3 evolves. It will be the hand-off context for future sessions.

---

# RC3 Time Capsule – Nov 7, 2025 (Evening Wrap)

## What’s stable
- Owner → DA → DTDO → HimKosh payment → certificate unlock runs end-to-end. Dashboard now shows success/failure banners based on `?payment=` query and highlights the paid application.
- Landing page reverted to the original scenic carousel (CM slide parked for a future design pass).
- Local `main` holds today’s two commits; remote branch `rc3-restore-20251107` mirrors this snapshot.

## Runtime state
- Repo path: `~/Projects/hptourism-rc3`
- PM2 command: `sudo pm2 restart hptourism-rc3 --update-env --node-args="--enable-source-maps"`
- Object storage: `local-object-storage/` (MinIO not in play yet). Keep this folder when backing up.
- Database: PostgreSQL 16 on the VM; dumps/scripts live in `docs/db/`.
- HimKosh config: test mode forced (`HIMKOSH_FORCE_TEST_MODE=true`). Callback handler resides at `/api/himkosh/callback`.

## Phase I (RC4) TODOs for next session
1. **Infra hardening** – introduce Nginx + Certbot, start wiring MinIO/S3 abstraction, and decide on Redis vs Postgres sessions.
2. **Config & secrets** – build `shared/config.ts` with Zod validation and add `.env.example` covering DB, HimKosh, session, object storage, upload policy.
3. **Security polish** – secure cookies (`secure`, `sameSite=lax`), add CSRF for mutating routes, rate limit auth + upload endpoints, plan ClamAV hook for documents.
4. **Observability** – add `/healthz` (DB + storage checks) and move to structured logging (pino) with request IDs/log rotation.
5. **Shared UI snapshot** – create a reusable application-summary component and swap it into DA/DTDO/workflow/owner pages to prevent drift.

### Phase I progress – Nov 8, 2025
- ✅ Config/secrets: introduced `shared/config.ts`, `.env.example`, and env aliasing so app/server/himkosh modules share one schema (ready for PM2/systemd exports).
- ✅ Object storage abstraction: local + MinIO/S3-capable backend with signed PUT/GET URLs; upload endpoint now returns normalized `filePath` pointers consumed by the viewer.
- ✅ Session baseline: middleware now pulls secure cookie flags, SameSite, and idle timeout from config (Postgres store remains default until Redis wiring lands).
- ✅ Security + observability: Redis session option (with fallback), rate-limit + CSRF toggles, ClamAV scanning for local uploads, structured pino logs with request IDs, and `/healthz` covering DB + storage.
- ✅ Infra docs/scripts: added Nginx+Certbot bootstrap (`scripts/setup-nginx-certbot.sh`), systemd/logrotate templates, and backup automation (`scripts/backup.sh`) documented in `DEPLOYMENT.md`.
- ✅ Admin-console guardrails: ClamAV scanning can now be toggled from the Super Admin console (persists to `system_settings`) while still falling back to `.env` defaults; shared summary card is live across owner/DA/DTDO flows and all TypeScript errors are cleared.
- 🟢 Phase I hardening is complete—ready for full end-to-end testing ahead of the Monday dry run.

## Quick reference
- DA login: `7777777771 / test123`
- DTDO login: `8888888881 / test123`
- Owner demo creds listed in `CodeXFiles/KnowledgeBase/TestAccounts.md`
- Payments: owners launch `/applications/:id/payment-himkosh`; cancel/reset endpoints exist if a transaction sticks.

## Parking-lot ideas
- Reintroduce CM Sukhu hero treatment later with a dedicated layout.
- Add automated smoke tests for HimKosh initiate → callback once Phase I stabilizes.
- Script pg_dump + storage sync and document the restore drill.
- Legacy RC onboarding flow: post-launch, create the “existing certificate verification” pipeline so DA/DTDO validate historic RCs, issue the new template, then attach those owners to the standard renewal/cancel/add-room lifecycle.

Use this capsule as the kickoff point next session—focus on Phase I hardening without regressing today’s green RC3 flow.
