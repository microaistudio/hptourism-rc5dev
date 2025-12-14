# Production Readiness Roadmap

This roadmap prioritizes the findings from the audit into actionable steps.

## Phase 1: Critical Security & Stability (Immediate)
**Goal:** Secure the application and prevent common attacks/failures.

1.  **Secure Session Cookies**
    - [ ] Update `server/routes.ts` to set `secure: true` in production.
    - [ ] Set `sameSite: "lax"`.
    - [ ] Verify Nginx `X-Forwarded-Proto` header.
2.  **Implement Security Headers**
    - [ ] Install `helmet`.
    - [ ] Configure `helmet` in `server/index.ts`.
3.  **Database Hardening**
    - [ ] Update `server/db.ts` to use explicit connection pool limits (max connections, timeouts).

## Phase 2: Refactoring & Performance (Short Term)
**Goal:** Improve maintainability and reduce technical debt.

1.  **Split `server/routes.ts`**
    - [ ] Extract Authentication routes -> `server/routes/auth.ts`
    - [ ] Extract Application routes -> `server/routes/applications.ts`
    - [ ] Extract remaining logic until `routes.ts` is just a registry.
2.  **Session Store Migration**
    - [ ] Switch from `connect-pg-simple` to `connect-redis` (using existing Redis instance).
3.  **Frontend Component Split**
    - [ ] Refactor `new.tsx` (Application Form) into sub-components (e.g., `PersonalDetails`, `PropertyDetails`).

## Phase 3: Advanced Hardening (Medium Term)
**Goal:** Defense-in-depth and monitoring.

1.  **CORS & Rate Limiting**
    - [ ] Implement strict app-level CORS.
    - [ ] Audit and tune rate limiters for all endpoints.
2.  **Observability**
    - [ ] Add `/health` endpoint with deep checks (DB, Redis).
    - [ ] Add request tracing (OpenTelemetry or simple request IDs).
