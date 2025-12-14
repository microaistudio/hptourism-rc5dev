# RC3 ↔ STG Delta Log

_Created: 12 Nov 2025 · Maintainer: Codex automation_

## Current Delta
- **Status:** STG ahead (Twilio fallback controls under validation)
- **Notes:** Super Admin communications console is now wired to surface provider-specific data + Twilio test responses on STG. Hold RC3 until end-to-end Twilio verification completes.

## How to Record Future Deltas
1. After a feature or fix lands on STG and passes verification, add a new section dated `YYYY-MM-DD`.
2. Capture:
   - Short title / feature name
   - A brief description (components touched, risk, rollout notes)
   - Open tasks required before RC3 can adopt it (tests, content sign-off, etc.)
3. When the batch is merged into RC3, move the entry to a “Promoted” block or mark it as _Promoted on YYYY-MM-DD_.

```
### 2025-11-15 — OTP SMS templates overhaul
- Scope: client/src/components/...; server/routes.ts
- Status: ✅ Verified on STG, awaiting RC3 batch promotion
- Follow-ups: update knowledge base with new template IDs
```

Keeping this document current ensures we always know why RC3 and STG diverge and what must be bundled into the next promotion.

---

### 2025-11-12 — Communications console (Twilio fallback instrumentation)
- **Scope:** `client/src/components/admin/communications-card.tsx` (React Query fetch + SMS/Email test handlers)
- **Purpose:** Ensure the admin UI actually consumes `/api/admin/communications` JSON and shows Twilio test responses so we can validate the fallback gateway before NIC shares final creds.
- **Extras:** Default SMS test recipient now prefilled to `+91-8091441005` so manual E2E checks are one-click.
- **Status:** ✅ Running on STG-only; awaiting Twilio test confirmation + server log capture.
- **Promotion checklist:** Confirm `/api/admin/communications` responds with JSON on RC3, replay the UI wiring, and log the promotion in this file + Time Capsule.

### 2025-11-12 — Notification control panel + dual email providers
- **Scope:** `server/routes.ts`, `client/src/components/admin/communications-card.tsx`, `client/src/components/admin/notification-rules-card.tsx`, `client/src/pages/admin/super-admin-console.tsx`, `PMD/RC3_STG_Delta_list.md`
- **Highlights:**
  - SMTP card now mirrors the SMS experience—store NIC and Twilio SendGrid profiles side-by-side and switch via dropdown without retyping passwords.
  - New Super Admin “Workflow Notifications” card exposes OTP + workflow milestone templates (submit, DA→DTDO, inspection scheduled, verified for payment) with per-channel toggles and placeholder hints.
  - Server-side notification service persists rules in `system_settings`, renders templates with `{{APPLICATION_ID}}`/`{{OTP}}`, and dispatches via the active SMS/SMTP providers.
  - Application submission, DA forwarding, inspection scheduling, and DTDO verification now emit owner SMS/email automatically when enabled.
- **Status:** ✅ Live on STG with Twilio SMS + SendGrid fallback validated. OTP hook ready for when the OTP endpoint lands.
- **Promotion checklist:** Re-run `npm run build`, copy `client/src/components/admin/notification-rules-card.tsx`, communications card changes, and the new notification endpoints into RC3. Re-test each workflow event (submit/forward/schedule/verify) plus OTP template toggles before unlocking testers.
