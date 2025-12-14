# Bug Fix Batch 01 (Staging Ready)

| Fix | Description | Status on STG | RC3 Action |
| --- | ----------- | ------------- | ---------- |
| 1 | **GSTIN guardrails** – Gold/Diamond applications now block Next/Submit until a valid 15-character GSTIN is entered; inline guidance focuses the GSTIN field instead of surfacing backend errors. | ✅ Deployed (build `npm run build` on 12 Nov 2025) | Reapply same patch set to `client/src/pages/applications/new.tsx` after next RC3 sync. |
| 2 | **Lease deed block** – Step 2 Next button stays disabled whenever `Property Ownership = Lease Deed`, preventing owners from proceeding with unsupported submissions. | ✅ Deployed | Mirror the `isNextDisabled` change + existing inline warning on RC3. |
| 3 | **Safety checklist enforcement** – Next button is disabled until both CCTV and Fire Safety acknowledgements are ticked; removes noisy red toast later in the flow. | ✅ Deployed | Apply the `safetyChecklistFailed` guard to RC3’s wizard. |
| 4 | **Distance placeholders** – Drafts or DB rows that contain `0` now hydrate back to empty fields and show “Distance in KM” placeholders in the wizard and read-only snapshots (no more `0 km` ghosts). | ✅ Deployed (`npm run build` + `pm2 restart hptourism-stg-rc3 --update-env` on 15 Nov 2025) | Ensure RC3+RC3A reuse the same `normalizePositiveNumber` helper before the next DB clone. |
| 5 | **DTDO timeline/inspection 404s** – hpstg showed “Unexpected token `<`” because an old manually started Node process kept serving the pre-fix bundle on port 4000. Killing the rogue PID and restarting PM2 with the rebuilt code restored the `/api/dtdo/...` routes. | ✅ Deployed (15 Nov 2025 @ 09:20 IST) | When copying files to RC trees, always stop stray node instances before restarting PM2 to avoid stale bundles. |

## Verification on STG
1. `npm run build` (already executed) – no lint/build errors.
2. Smoke the application wizard:
   - Select Gold category, try skipping GSTIN → Next/Submit stay disabled and field highlights.
   - Select “Lease Deed” on Step 2 → Next button remains disabled.
   - Leave CCTV/FireSafety unchecked on Step 3 → Next button disabled until both are checked.

## Next Steps
- Keep these changes confined to `hptourism-stg-rc3` until the next RC3 staging batch.
- When ready, cherry-pick the same edits into `hptourism-rc3` and rerun `npm run build`.
- Update the Time Capsule / Delta log after promoting to RC3. 

---

## 2025-11-12 · 19:10 IST — Sprint Guardrails Synced (STG ⇄ RC3)

Both trees now include:
- Gold/Diamond GSTIN guard with inline focus + disabled Next/Submit
- Lease-deed block on Step 2 and mandatory CCTV/Fire safety switches
- Category conflict highlighting (amber warning vs red error)
- Step auto-scroll behavior and default room-row quantity = 1
- PIN code UX: fixed `171-` prefix, suffix-only entry with hints, Next disabled until complete
- SMS/Admin communications log improvements already deployed earlier in the day

`npm run build` completed on STG + RC3 after each batch, keeping the environments byte-for-byte in sync.

---

## 2025-11-15 · 10:15 IST — Distance UX + DTDO API Hygiene
- Added `normalizePositiveNumber()` to the wizard hydration path so any `0` distances or lobby/dining area values render as empty inputs with the “Distance in KM” placeholder. Read-only snapshots now echo the same message instead of `0 km`.
- Rebuilt stg-rc3 and restarted PM2 (`sudo pm2 restart hptourism-stg-rc3 --update-env`) after pruning rogue Node processes that were still bound to port 4000. This ensured `/api/dtdo/applications/:id/timeline` and `/api/dtdo/inspection-report/:id` serve JSON rather than HTML login redirects.
- Lesson learned: whenever the SPA reports “Unexpected token `<`”, first verify no legacy Node process is binding the port before chasing client bugs. Documented the kill/restart sequence in this file for future war rooms.
