# Phase II – Owner Service Flows (Renewal / Add Rooms / Delete Rooms)

This note condenses the policy requirements from `PMD/SOW & WF Docs/01.Home stay 2025.txt` (rules 4–8) and the stakeholder conversations so far, so every Phase II change has a single reference point.

## Goals for Phase II.1

- Let approved homestay owners trigger exactly one post-approval service at a time (Renewal, Add Rooms, Delete Rooms) from the dashboard Service Center.
- Re-use the existing DA/DTDO workflow for these service drafts—no parallel pipelines.
- Keep the VM self-contained: whatever we wire up here must be cloneable to AWS/Azure later without changing the behaviour.

## Requirements Snapshot

### Renewal (Rule 6 – Homestay Rules 2025)
- Owners must submit Form‑B within **90 days** before the current certificate expiry; late renewals are out-of-scope for now.
- Renewal fee equals the base registration fee matrix (Rule 7); HimKosh heads remain the same.
- Renewals inherit the current certificate’s validity—paying early does not extend beyond the original expiry date.
- Annexure‑II documents must be refreshed; the previous certificate must be uploaded with the request.

### Add Rooms
- Only allowed for applications in `approved` status with an active certificate.
- Total rooms after the change must stay within the statutory cap of 6 (and 12 beds).
- Requires payment of the full registration fee even for a single added room.
- Validity does **not** extend; future renewals cover the expanded inventory.
- Room mix deltas (single/double/family) should be captured for DA/DTDO scrutiny.

### Delete Rooms
- No fee (₹0) but the request must run through the officer workflow for verification.
- Owners must upload updated floor plans/inventory to avoid confusion on tariffs and facilities.
- At least one room must remain active after deletion.

## Cross-cutting Constraints

- Only one active service request per base application; new requests are blocked until the previous one is approved/rejected.
- Service drafts always inherit property + ownership metadata from the parent application (locked in the wizard).
- Payments: Renewal and Add Rooms share the same heads and fee calculator; Delete Rooms is fee-exempt but still logged.
- Admin/notification/audit logs must tag the `applicationKind` so officers and dashboards can differentiate a fresh registration from an amendment.
- Service Center should surface eligibility (expiry, room counts, active requests) before the owner starts a draft.

## Open Questions

1. Should renewal requests support document-only updates beyond Annexure‑II (e.g., tweaking amenities) or remain strictly read-only outside the upload step?
2. For Add/Delete rooms, do we always trigger a fresh inspection order, or only when DA flags discrepancies?
3. How should certificate PDFs reflect mid-cycle amendments (e.g., “inherited certificate” language) until the Phase II certificate redesign ships?

These can be resolved while wiring the remaining features; leave TODOs referencing this brief if a decision is pending.
