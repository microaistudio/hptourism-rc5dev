# HP Tourism eServices - API Documentation

## Overview

The HP Tourism eServices platform provides a comprehensive RESTful API for managing homestay registrations in Himachal Pradesh. This API-first platform is designed for seamless integration with external systems, government portals, and third-party services.

**Base URL:** `https://dev.osipl.dev/api` (Development)  
**Production URL:** `https://live5.osipl.dev/api` (Production)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Request/Response Format](#requestresponse-format)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Modules](#api-modules)
6. [Versioning](#versioning)

---

## Authentication

The API uses **session-based authentication** with secure HTTP-only cookies.

### Authentication Flow

1. **Login** - Authenticate with username/password or OTP
2. **Session** - Receive session cookie for subsequent requests
3. **API Calls** - Include session cookie in all authenticated requests
4. **Logout** - Invalidate session

### Session Headers

All authenticated requests must include the session cookie automatically set by the browser or client.

```
Cookie: connect.sid=<session_token>
```

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `property_owner` | Homestay property owners | Own applications only |
| `dealing_assistant` | District dealing assistants | District-level applications |
| `district_tourism_officer` | DTDO officers | District-level approvals |
| `district_officer` | District officers | District-level access |
| `state_officer` | State-level officers | State-wide access |
| `admin` | System administrators | Admin functions |
| `super_admin` | Super administrators | Full system access |

---

## Request/Response Format

### Content Type

All API requests and responses use JSON format:

```
Content-Type: application/json
Accept: application/json
```

### Standard Response Structure

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Pagination

For list endpoints, use query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `sortBy` | string | varies | Sort field |
| `sortOrder` | string | "desc" | Sort direction (asc/desc) |

**Paginated Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Not authenticated |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `409` | Conflict - Resource already exists |
| `422` | Unprocessable Entity - Validation failed |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `INVALID_CREDENTIALS` | Invalid username/password |
| `SESSION_EXPIRED` | Session has expired |
| `PERMISSION_DENIED` | Insufficient role/permissions |
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ENTRY` | Resource already exists |
| `RATE_LIMITED` | Too many requests |

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| General API | 100 requests | 1 minute |
| File Uploads | 10 requests | 1 minute |
| Public APIs | 30 requests | 1 minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1639094400
```

---

## API Modules

The API is organized into the following modules:

| Module | Document | Description |
|--------|----------|-------------|
| Authentication | [01-authentication.md](01-authentication.md) | Login, OTP, session management |
| Applications | [02-applications.md](02-applications.md) | Homestay application CRUD |
| Documents & Uploads | [03-documents-uploads.md](03-documents-uploads.md) | File upload and management |
| Workflow & Status | [04-workflow-status.md](04-workflow-status.md) | Application status transitions |
| Inspections | [05-inspections.md](05-inspections.md) | Site inspection management |
| Payments (HimKosh) | [06-payments-himkosh.md](06-payments-himkosh.md) | Payment gateway integration |
| Certificates | [07-certificates.md](07-certificates.md) | Certificate generation |
| Public APIs | [08-public-apis.md](08-public-apis.md) | Public endpoints (tracking, verification) |
| Admin APIs | [09-admin-apis.md](09-admin-apis.md) | Administrative functions |
| LGD Integration | [10-lgd-integration.md](10-lgd-integration.md) | Local Government Directory |

---

## Versioning

The API currently uses URL path versioning (implicit v1). Future versions will be indicated in the URL:

```
/api/v1/applications
/api/v2/applications
```

Version deprecation notices will be communicated via:
- API response headers: `X-API-Deprecation-Notice`
- Official documentation updates
- Email notifications to registered integrators

---

## Contact & Support

For API integration support, contact:
- **Technical Support:** api-support@hptourism.gov.in
- **Documentation Issues:** dev@osipl.dev

---

*Document Version: 1.0*  
*Last Updated: December 2025*  
*Platform Version: RC5*
