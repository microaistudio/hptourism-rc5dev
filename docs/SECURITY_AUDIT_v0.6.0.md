# HP Tourism Portal - Security Audit Report
**Version:** 0.6.0 (RC5 - Security Audit Release)  
**Date:** 2025-12-13  
**Auditor:** Internal Security Review

---

## Executive Summary

| Category | Status | Issues Found |
|----------|--------|--------------|
| NPM Dependencies | ⚠️ MEDIUM | 6 vulnerabilities |
| Authentication | ✅ GOOD | Minor improvements suggested |
| Authorization | ✅ GOOD | Role-based access in place |
| Input Validation | ✅ GOOD | Zod schemas used |
| XSS Protection | ✅ GOOD | No dangerouslySetInnerHTML in app code |
| CSRF Protection | ⚠️ MEDIUM | csurf using vulnerable cookie |
| Session Management | ✅ GOOD | Secure cookie settings |
| Rate Limiting | ✅ GOOD | Applied to auth & uploads |
| File Uploads | ✅ GOOD | Type validation in place |
| Security Headers | ✅ GOOD | Helmet configured |

---

## 1. NPM Dependency Vulnerabilities

### Critical/High Priority

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `glob` | HIGH | Command injection via CLI | `npm audit fix` |
| `jws` | HIGH | HMAC signature verification bypass | `npm audit fix` |
| `esbuild` | MODERATE | Dev server request access | Update to esbuild v0.25+ |

### Moderate Priority

| Package | Issue | Fix |
|---------|-------|-----|
| `cookie` | Out of bounds characters | Update csurf or replace |
| `brace-expansion` | ReDoS vulnerability | `npm audit fix` |
| `on-headers` | HTTP header manipulation | `npm audit fix` |

**Action Required:**
```bash
npm audit fix
```

---

## 2. Authentication Security

### ✅ Strengths
- Bcrypt password hashing with proper salt rounds
- Session-based authentication with PostgreSQL store
- OTP-based login option available
- Rate limiting on login endpoints (`authRateLimiter`)
- Password change requires current password verification

### ⚠️ Concerns

1. **Hardcoded Fallback Session Secret** (Low Risk)
   - Location: `server/routes.ts:346`
   - Issue: `"hp-tourism-secret-dev-only"` used as fallback
   - Impact: Only affects development if SESSION_SECRET not set
   - **Recommendation:** Remove fallback, require env variable

2. **Test Credentials in Code** (Info)
   - Location: `server/routes.ts:1337-1357, 1786-1788, 1829-1845`
   - Issue: Hardcoded `password: "test123"` for dev/seed endpoints
   - Impact: Low - only in admin seed routes
   - **Recommendation:** Move to environment variable

---

## 3. Authorization & Access Control

### ✅ Strengths
- Role-based access control (`requireRole` middleware)
- District-level data isolation for DA/DTDO
- Password re-verification for destructive operations
- Proper separation of admin routes

### Roles Verified
- `property_owner` - Can only access own applications
- `dealing_assistant` - District-scoped access
- `district_tourism_officer` - District-scoped access
- `admin`, `super_admin` - Full system access

---

## 4. Input Validation

### ✅ Strengths
- Zod schemas for form validation
- Type coercion and sanitization utilities
- Max length enforcement on string inputs
- Numeric input preprocessing

### Observed Patterns
- `normalizeStringField()` - Trims and limits length
- `toNullableString()` - Safe null handling
- `preprocessNumericInput()` - NaN protection

---

## 5. SQL Injection Prevention

### ✅ Strengths
- Drizzle ORM with parameterized queries
- Template literals used properly with `sql` tag
- No raw string concatenation in queries

### ⚠️ Minor Concerns
- `sql.raw()` usage in admin routes (password-protected)
  - Location: `server/routes/admin/db.ts:416, 454`
  - Mitigation: Requires super_admin + password verification

---

## 6. XSS Protection

### ✅ Strengths
- No `dangerouslySetInnerHTML` in application code
- Only usage in `chart.tsx` (charting library requirement)
- React's built-in XSS protection

---

## 7. Session Security

### ✅ Strengths (from routes.ts:350-356)
- `httpOnly: true` - Prevents JavaScript access
- `sameSite: "lax"` - CSRF protection
- `secure: configurable` - HTTPS-only in production
- `maxAge: 7 days` - Session expiration
- PostgreSQL session store

---

## 8. Rate Limiting

### ✅ Implemented
| Limiter | Applied To |
|---------|------------|
| `globalRateLimiter` | All routes (index.ts:40) |
| `authRateLimiter` | Login, register, OTP, password reset |
| `uploadRateLimiter` | File uploads |

---

## 9. File Upload Security

### ✅ Strengths
- MIME type validation
- File extension validation
- Size limits per category
- Upload policy from database

### Configured Limits (DEFAULT_UPLOAD_POLICY)
- Documents: PDF only, 2MB max
- Photos: JPEG/PNG + PDF, 2MB max
- Total per application: 20MB

---

## 10. Security Headers

### ✅ Helmet Configured (index.ts:24)
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

---

## Recommendations

### Immediate Actions (Before External Audit)

1. **Fix NPM vulnerabilities**
   ```bash
   npm audit fix
   ```

2. **Remove session secret fallback**
   ```typescript
   // Change from:
   secret: process.env.SESSION_SECRET || "hp-tourism-secret-dev-only"
   // To:
   secret: process.env.SESSION_SECRET!
   ```

3. **Verify cookie settings for production**
   - Ensure `SESSION_COOKIE_SECURE=true` in production
   - Confirm `SESSION_COOKIE_DOMAIN` matches deployment

### Medium Priority

4. **Consider replacing csurf** (deprecated, uses vulnerable cookie)
5. **Add Content-Security-Policy report-uri** for monitoring
6. **Implement login attempt logging** to detect brute force

### Low Priority

7. **Move test credentials to .env.test**
8. **Add security.txt file** for responsible disclosure
9. **Document API rate limits** in API documentation

---

## Verification Checklist

- [x] Helmet security headers enabled
- [x] Session cookies httpOnly
- [x] Password hashing with bcrypt
- [x] Rate limiting on auth endpoints
- [x] Role-based access control
- [x] Input validation with Zod
- [x] File upload validation
- [x] SQL injection prevention (parameterized queries)
- [x] XSS protection (React + no raw HTML)
- [ ] NPM vulnerabilities fixed
- [ ] Session secret fallback removed

---

## Conclusion

The HP Tourism Portal v0.6.0 demonstrates **good security practices** in most areas. The primary concerns are:

1. **NPM dependency vulnerabilities** - Easily fixed with `npm audit fix`
2. **Session secret fallback** - Minor code change required

The application is well-architected for security with proper separation of concerns, role-based access control, and defense-in-depth measures.

**Risk Level:** LOW-MEDIUM (pending NPM fixes)
