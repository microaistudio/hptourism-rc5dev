# Case Consolidation PRD

## Objective

Provide DA and DTDO with a single, linked view that keeps the homestay application, inspection workflow (orders + reports), and registration certificate visible throughout the lifecycle so remarks, documents, and approvals never disappear after each handoff.

## Tasks

1. **Case Bundle API**  
   - Build `GET /api/cases/:applicationId` that returns application details, DA remarks, inspection order, inspection report, and certificate references in one payload.

2. **DTDO Case View**  
   - Add a “Case Summary” tab on the DTDO application review screen that consumes the bundle and shows a timeline, downloadable inspection report, and RC card.

3. **DA Case View**  
   - Mirror the case summary on the DA side so they can revisit remarks, inspection outcomes, and the issued certificate even after forwarding to DTDO.

4. **Cross-link Artifacts**  
   - Ensure inspection orders/reports and certificates consistently store `applicationId` so the bundle endpoint can fetch data deterministically.

5. **Timeline + Downloads**  
   - Surface a chronological timeline (Submitted → DA scrutiny → DTDO review → Inspection → RC) with action badges and download buttons for the inspection report and registration certificate.

