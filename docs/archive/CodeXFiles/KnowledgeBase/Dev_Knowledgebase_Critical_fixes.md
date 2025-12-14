# Dev Knowledgebase – Critical Fixes

## 2025-11-05 · Tehsil kept reverting to “Not Provided”

- **Symptoms**: Every save/submit overwrote the selected Tehsil with `Not Provided`, DA/DTDO dashboards showed blanks, and validations continued to fail for owners even when they picked a value. Issue reproduced through owner UI, Postman, and PM2 logs (`Tehsil is required`).
- **Root Cause**: Backend draft/submit handler forced a fallback string whenever `tehsil` evaluated to falsy, so the actual payload sent by the client was discarded. Additional side-effect: `tehsilOther` and other new fields never persisted because of the same whitelist gap.
- **Resolution**:
  1. Updated `server/routes.ts` to stop coercing the field to the fallback and expanded the persistence mapping (including `tehsilOther` and related optional fields).
  2. Rebuilt the bundle (`npm run build`) and restarted PM2 so the new handlers served live traffic.
  3. Re-tested owner draft/submit flows plus DA/DTDO dashboards to ensure the stored value matched the request.
- **Validation**: Created a fresh application, saved draft, reopened, and inspected `/api/applications/:id` payload and DA queue—both reflected the selected Tehsil. Form no longer triggered validation errors.
- **Carry-forward**: When introducing new application fields, double-check the server DTO mapping before build/restart. Add regression calls in Postman (or automated tests) to compare request vs. stored JSON for critical fields.

## 2025-11-06 · DA application detail returned 500 (“Application not found”)

- **Symptoms**: DA scrutiny cards and detail views broke with “Application not found” despite records existing. Curling `/api/da/applications/:id` returned HTTP 500 with `"Failed to fetch application details"`.
- **Root Cause**: During the analytics refactor we referenced `currentUser` inside `/api/analytics/dashboard` without fetching it. DA dashboards call analytics first; the exception aborted the request pipeline so the front-end fell back to the generic “not found” state.
- **Resolution**:
  1. Restored the missing `currentUser = await storage.getUser(userId)` lookup in `server/routes.ts:3274` before district scoping.
  2. Rebuilt and redeployed (PM2 restart with `--update-env --node-args="--enable-source-maps"`). The old bundle was still running until this step, which masked earlier code fixes.
  3. Verified via curl that `/api/da/applications/:id` returned 200 and `/api/analytics/dashboard` responded successfully.
- **Validation**: DA login (`7777777771/test123`) → refreshed dashboards → scrutiny cards opened normally. Postman/cURL regression checks captured a clean 200 response with full payload.
- **Carry-forward**: After backend edits, always rebuild before testing against PM2. Keep an eye on logs for `ReferenceError`/`is not defined` after large refactors, and add smoke tests for officer role APIs so breaking analytics/district scoping gets caught immediately.

> Keep extending this KB whenever we burn significant investigation time (>2 hours) so future incidents resolve faster.

## 2025-11-07 · New owners saw blank `/applications/new`

- **Symptoms**: Immediately after registering, clicking “New Application” showed a white screen with `ReferenceError: Cannot access 'At' before initialization`. Network tab revealed `/api/profile` returned 404 on brand-new accounts.
- **Root Cause**: When we added the profile auto-population flow (earlier on 7 Nov), the front-end assumed every owner already had a profile row. The request threw and cratered the bundle before React could render, so first-time owners could never create their application.
- **Resolution**:
  1. Updated `GET /api/profile` to return `null` instead of 404 for users without a saved profile (server/routes.ts).
  2. Guarded the front-end query in `client/src/pages/applications/new.tsx` so it treats missing profiles as expected and skips the auto-fill logic until the user creates one.
  3. Rebuilt + restarted PM2 to serve the patched bundle.
- **Validation**: Created a fresh owner account, hit `/applications/new`, and confirmed the form renders with default values. Existing owners still see their profile data auto-filled.
- **Carry-forward**: Anytime we depend on optional data (profiles, settings, etc.), handle the “not created yet” case both server- and client-side before deploying.

## 2025-11-07 · Mandatory safety amenities missing on application form

- **Symptoms**: During inspection dry-runs we realized owners could proceed without declaring CCTV coverage or fire-safety equipment. Those items are mandatory and inspectors flagged almost every submission for the same reason.
- **Root Cause**: The amenities step only collected optional checkboxes and never enforced the safety prerequisites.
- **Resolution**: Added explicit “CCTV Surveillance” and “Fire Safety Equipment” amenity toggles, defaulted them to false, surfaced guidance text, and blocked the step progression unless both are selected.
- **Validation**: Hit `/applications/new` → Step 3, tried to continue without selecting the safety toggles, saw the blocking toast; after selecting both, navigation continues all the way to submission. Existing drafts now show the requirement and can be updated.
- **Carry-forward**: Anytime inspections have “non-negotiable” hardware, it needs to be enforced at the data capture layer as well, otherwise every inspection cycle is wasted chasing the same correction.
