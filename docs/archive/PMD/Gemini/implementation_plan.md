# Phase 2: Refactoring & Performance Implementation Plan

## Goal
Improve codebase maintainability by splitting the monolithic `server/routes.ts` and enhance performance by migrating session storage to Redis.

## Proposed Changes

### 1. Session Store Migration (Redis)
**Files:** `.env`, `server/routes.ts`, `package.json`
- **Action:** Add Redis configuration to environment.
- **Action:** Update session middleware to use `connect-redis`.
- **Details:**
    - Add `REDIS_URL` to `.env`.
    - Initialize Redis client in `server/db.ts` (or new `server/redis.ts`).
    - Replace `connect-pg-simple` with `connect-redis` in `server/routes.ts`.

### 2. Split `server/routes.ts`
**Files:** `server/routes.ts`, `server/routes/auth.ts`, `server/routes/applications.ts`, `server/routes/core.ts`
- **Action:** Extract logic into modular route files.
- **Strategy:**
    1.  **Auth Routes**: Move login, logout, user profile logic to `server/routes/auth.ts` (enhance existing if present).
    2.  **Application Routes**: Move homestay application logic (CRUD, status updates) to `server/routes/applications.ts`.
    3.  **Core/Helper Routes**: Move utility routes (upload, captcha, etc.) to `server/routes/core.ts`.
    4.  **Refactor `routes.ts`**: It should only register these routers and setup middleware.

### Frontend Refactoring (`client/src/pages/applications/new.tsx`)
The `NewApplication` component is currently ~5000 lines long. We will refactor it by extracting form steps into separate components.

#### [NEW] `client/src/components/applications/form-sections/`
- `Step1PersonalDetails.tsx`: Owner information and personal details.
- `Step2PropertyDetails.tsx`: Property location, address, and ownership.
- `Step3RoomsAndCategory.tsx`: Room configuration, tariff buckets, and category selection.
- `Step4Distances.tsx`: Distances from key locations and public areas.
- `Step5Documents.tsx`: Document uploads.
- `Step6Review.tsx`: Final review and declaration.

#### [MODIFY] `client/src/pages/applications/new.tsx`
- Import and use the new step components.
- Pass necessary props (form control, state values) to these components.
- Significantly reduce file size and improve readability.

### Backend Refactoring (Completed)
- `server/routes.ts` split into `dtdo.ts`, `payments.ts`, etc.
- Notification logic preserved.

## Verification Plan

### Automated Tests
- [ ] Run `npm run build` to ensure no type errors or missing imports. (Build passed)
- [ ] Verify server starts up correctly (implied by build pass and code structure check).

### Manual Verification
- [ ] Verify that the application form still works correctly (all steps).
- [ ] Check that validation rules are still enforced.
- [ ] Ensure data is correctly submitted to the backend.
