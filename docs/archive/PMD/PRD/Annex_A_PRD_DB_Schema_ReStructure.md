# Annex A – PRD DB Schema Re-Structure Plan

## Objective
Remove the remaining 2024 structures while keeping the portal stable for ongoing demos. The migration will be executed in small, verifiable slices over the next 2–3 days.

## Phase 0 — Hotfixes Delivered Today
- Tehsil + LGD hierarchy fields persist end‑to‑end (draft ⇒ submit ⇒ dashboards).
- Owner submissions now include ownership type, optional LGD “other” fields, and the preview reflects the full form.

## Phase 1 — Stabilise 2025 Baseline (Day 1)
1. **Run-time verification:** capture Postman collections that prove every page (owner, DA, DTDO) reads/writes through the new payload.  
2. **Data backfill:** script to normalise existing rows (`tehsil`, `block`, `property_ownership`, etc.) so legacy `"Not Provided"` and empty strings become structured values.  
3. **Regression sweep:** confirm payments, certificate generation, and analytics widgets read the richer address fields.

## Phase 2 — Schema Clean-up (Day 2)
1. Drop or archive unused 2024 columns/tables after the backfill (e.g. legacy `rooms` JSON, redundant document URL columns).  
2. Update drizzle schema + migrations; regenerate type-safe clients.  
3. Refresh documentation (PRD + developer onboarding) to reflect the 2025-only schema.

## Phase 3 — UX & API Hardening (Day 3)
1. Enforce stricter validation aligned with HP Tourism 2025 rules (no silent defaults to `"Not Provided"`).  
2. Implement automated tests covering owner submission, DA/DTDO workflow, and payment callback.  
3. Prepare rollback scripts and release notes for production cutover.

## Deployment Notes
- Each phase will ship behind a PM2 restart after a fresh `npm run build` + `esbuild`.
- Coordinate downtime windows with demo schedule; focus on late-night slots for database migrations.
