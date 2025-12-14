# Production Readiness Audit

**Date:** November 23, 2025
**Auditor:** Gemini Agent

## Executive Summary
The codebase is functional but requires significant improvements to meet production standards for security, maintainability, and scalability. Key areas of concern are the monolithic `routes.ts` file, insecure session cookie configuration, and missing standard security headers.

## 1. Refactoring & Maintainability

### 🚨 Critical Issues
- **Monolithic `server/routes.ts`**: This file is **2,877 lines** long. It handles route registration, session setup, helper functions, and business logic. This makes it:
    - Hard to read and navigate.
    - Prone to merge conflicts.
    - Difficult to test in isolation.
- **Large Frontend Components**:
    - `client/src/pages/applications/new.tsx`: **5,038 lines**. This is unmaintainable.
    - `client/src/pages/admin/super-admin-console.tsx`: **2,658 lines**.

### Recommendations
1.  **Split `server/routes.ts`**: Break this into modular route files (e.g., `server/routes/auth.ts`, `server/routes/applications.ts`, `server/routes/admin/*.ts`). We have started this but much remains.
2.  **Refactor Frontend**: Extract logic into custom hooks and UI into smaller, reusable components.

## 2. Session Management

### 🚨 Critical Issues
- **Insecure Cookie Configuration**:
    ```typescript
    cookie: {
      secure: false, // ❌ CRITICAL: Cookies sent over plain HTTP
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    }
    ```
    Production cookies **MUST** be `secure: true` (requires HTTPS).
- **Session Store**: Currently uses `connect-pg-simple` (Postgres). While reliable, it adds load to the primary database.
- **Missing `SameSite`**: Not explicitly configured, defaulting to browser behavior.

### Recommendations
1.  **Enable Secure Cookies**: Set `secure: app.get("env") === "production"`. Ensure Nginx is configured to pass `X-Forwarded-Proto` headers.
2.  **Migrate to Redis**: Since `redis` and `connect-redis` are already in `package.json`, switch to Redis for faster session handling and to offload the DB.
3.  **Set `SameSite`**: Explicitly set `sameSite: "lax"` or `"strict"`.

## 3. Client-Server Hardening (Security)

### 🚨 Critical Issues
- **Missing Security Headers**: `helmet` is **NOT** installed or used. This leaves the app vulnerable to common attacks (XSS, clickjacking, etc.).
- **CORS Configuration**: Relying solely on Nginx for CORS. App-level CORS configuration is recommended for defense-in-depth.
- **CSRF Protection**: `csurf` is in `package.json` but its usage needs verification across all state-changing routes.

### Recommendations
1.  **Install & Configure Helmet**: Add `helmet` middleware to set secure HTTP headers (HSTS, X-Frame-Options, etc.).
2.  **Configure CORS**: Use `cors` package to strictly define allowed origins.
3.  **Audit Rate Limiting**: Ensure `globalRateLimiter` covers all routes and `authRateLimiter` is applied to all login/sensitive endpoints.

## 4. Stability & Reliability

### ⚠️ Areas for Improvement
- **Database Connection**: `server/db.ts` uses default pool settings. In production, this can lead to connection exhaustion.
- **Logging**: Uses `pino`. Ensure logs are structured and include `requestId` for tracing across services.
- **Error Handling**: Global error handler exists but could be enhanced to sanitize error messages further in production.

### Recommendations
1.  **Configure DB Pool**: Explicitly set `max`, `idleTimeoutMillis`, and `connectionTimeoutMillis` in `server/db.ts`.
2.  **Health Checks**: Ensure `/health` or `/api/health` endpoint exists and checks DB connectivity.
