# Phase II – Automated Smoke Tests & Recording Hooks

The user wants a “press-one-button” harness that will:

1. Submit ~5 representative applications (owner → DA → DTDO → certificate) so we can catch regressions quickly.
2. Optionally capture the run as a video for demo/training purposes.

This doc sketches how we can wire that up without destabilising production.

## Goals
- Provide a repeatable script (CLI + API bootstrap) that seeds the DB, runs through the workflow, and verifies the final certificate output.
- Make the harness cloud-friendly: it should run on this VM, but also be easy to port to AWS/Azure.
- Leave a hook for later video capture (browser automation or headless recording) without forcing a dependency into the main app.

## Proposed Architecture
1. **Data fixtures**: extend `scripts/seed-mock-data.ts` to accept a manifest of owner profiles + document sets so we can spin up five deterministic applications (mix of urban/rural, silver/gold/diamond, service drafts, etc.).
2. **Workflow driver**: build a Node script under `scripts/e2e-smoke.ts` that calls our REST APIs with service tokens (bypassing UI) to move each application through owner submit → DA scrutiny → DTDO approval → certificate generation. Log each stage with timestamps.
3. **Assertions**: after the run, fetch each certificate via the existing `/api/certificates/:id` (or generate via `certificateGenerator`) and compare against a stored JSON snapshot (category, validity, service type). Fail the run if deltas are detected.
4. **Recording hook** (Phase III): wrap the script with a Playwright harness that launches the actual UI for one “demo” application, using the same fixture data. Playwright can export MP4/WebM for the training videos, but we’ll keep that optional so the CLI can still run headless in CI.
5. **One-button entry point**: `npm run smoke` still runs `scripts/smoke-test.ts`, but the Super Admin Console now exposes a “Run Smoke Test” button that calls `/api/admin/smoke-test/run`. The server first purges any applications/documents created by the smoke owner (so runs don’t collide), then spawns `scripts/run-smoke.sh`, streams stdout/stderr into `docs/smoke-reports/<runId>.log`, and returns status/log data via `/api/admin/smoke-test/status`. The UI tails that log, shows the last report path, and prevents concurrent runs. Future work: extend the scenarios to cover service-center drafts once those APIs land.

## Open Decisions
- Authentication for the automation user(s)—do we reuse the existing “test123” officers or issue dedicated API keys?
- How often should the fixture data reset? (We’re manual-only right now via the admin console; revisit cron/CI scheduling once Phase II stabilises.)
- Where should generated certificates/videos live? (Local disk is easiest now, but AWS/Azure buckets may be better once we migrate.)

With the CLI + admin console trigger in place, the harness is usable on-demand from this VM. Let me know which assumptions need tweaking before we start coding the extended scenarios/video capture hooks.***
