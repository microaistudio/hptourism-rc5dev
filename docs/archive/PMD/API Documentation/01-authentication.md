# Authentication API

This document covers all authentication-related endpoints including login, registration, OTP verification, and session management.

---

## Table of Contents

1. [User Registration](#user-registration)
2. [Password Login](#password-login)
3. [OTP Login](#otp-login)
4. [Session Management](#session-management)
5. [CAPTCHA](#captcha)
6. [Password Management](#password-management)

---

## User Registration

### Register New User

Creates a new property owner account.

**Endpoint:** `POST /api/auth/register`

**Authentication:** None required

**Request Body:**

```json
{
  "username": "string (required, unique)",
  "password": "string (min 6 characters)",
  "fullName": "string (required)",
  "email": "string (optional, valid email format)",
  "mobile": "string (required, 10 digits)",
  "aadhaar": "string (optional, 12 digits)",
  "captchaAnswer": "string (required, if CAPTCHA enabled)"
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| `username` | 3-50 characters, alphanumeric, underscores allowed |
| `password` | Minimum 6 characters |
| `mobile` | Exactly 10 digits, Indian mobile number |
| `email` | Valid email format (optional) |
| `aadhaar` | Exactly 12 digits (optional) |

**Success Response:** `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "fullName": "string",
    "email": "string",
    "mobile": "string",
    "role": "property_owner",
    "isActive": true,
    "createdAt": "2025-12-11T10:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Username already taken` | Username exists |
| 400 | `Invalid captcha` | CAPTCHA verification failed |
| 400 | `Validation error` | Input validation failed |

---

## Password Login

### Login with Password

Authenticates user with username and password.

**Endpoint:** `POST /api/auth/login`

**Authentication:** None required

**Request Body:**

```json
{
  "username": "string (required)",
  "password": "string (required)",
  "captchaAnswer": "string (required, if CAPTCHA enabled)"
}
```

**Success Response:** `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "fullName": "string",
    "email": "string",
    "mobile": "string",
    "role": "property_owner | dealing_assistant | district_tourism_officer | ...",
    "district": "string | null",
    "isActive": true,
    "lastLoginAt": "2025-12-11T10:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Invalid credentials` | Wrong username/password |
| 401 | `Invalid captcha` | CAPTCHA verification failed |
| 403 | `Account disabled` | User account is deactivated |

---

## OTP Login

### Check OTP Login Availability

Check if OTP login is available for the platform.

**Endpoint:** `GET /api/auth/otp/availability`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "allowed": true,
  "smsEnabled": true,
  "emailEnabled": true
}
```

---

### Request OTP

Initiates OTP-based login by sending OTP to user's registered mobile/email.

**Endpoint:** `POST /api/auth/otp/request`

**Authentication:** None required

**Request Body:**

```json
{
  "identifier": "string (username or mobile number)",
  "captchaAnswer": "string (required, if CAPTCHA enabled)"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "OTP sent successfully",
  "otpSentTo": {
    "mobile": "******7890",
    "email": "j***@example.com"
  },
  "expiresIn": 300
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `User not found` | No user with that identifier |
| 400 | `No mobile/email configured` | Can't send OTP |
| 429 | `Too many requests` | Rate limited (5/min) |

---

### Verify OTP

Verifies the OTP and creates a session.

**Endpoint:** `POST /api/auth/otp/verify`

**Authentication:** None required

**Request Body:**

```json
{
  "identifier": "string (username or mobile number)",
  "otp": "string (6 digits)"
}
```

**Success Response:** `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "fullName": "string",
    "role": "string",
    "...": "..."
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Invalid OTP` | OTP doesn't match |
| 400 | `OTP expired` | OTP has expired (5 min validity) |
| 429 | `Too many attempts` | Maximum 3 attempts per OTP |

---

## Session Management

### Get Current User

Returns the currently authenticated user's details.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "fullName": "string",
    "email": "string | null",
    "mobile": "string | null",
    "role": "string",
    "district": "string | null",
    "isActive": true,
    "createdAt": "timestamp",
    "lastLoginAt": "timestamp"
  }
}
```

**Error Response:** `401 Unauthorized`

```json
{
  "error": "Not authenticated"
}
```

---

### Logout

Destroys the current session.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

---

## CAPTCHA

### Get CAPTCHA Challenge

Retrieves a new CAPTCHA challenge for login/registration.

**Endpoint:** `GET /api/captcha`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "challenge": "What is 15 + 7?",
  "expiresIn": 300
}
```

**Note:** The answer must be submitted with the login/registration request within 5 minutes.

---

### Check CAPTCHA Status

Check if CAPTCHA is enabled for the platform.

**Endpoint:** `GET /api/auth/captcha-status`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "enabled": true,
  "type": "math"
}
```

---

## Password Management

### Change Password

Changes the current user's password.

**Endpoint:** `POST /api/owner/change-password`

**Authentication:** Required (property_owner)

**Alternative Endpoints:**
- `POST /api/staff/change-password` (for staff users)
- `POST /api/da/change-password` (for dealing assistants)
- `POST /api/dtdo/change-password` (for DTDO officers)

**Request Body:**

```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (min 6 characters)"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Current password incorrect` | Wrong current password |
| 400 | `Password too short` | Min 6 characters required |

---

## Integration Notes

### For External Systems

1. **Session Cookies:** Store the `connect.sid` cookie from successful login responses for subsequent API calls.

2. **Token Expiry:** Default session timeout is 24 hours. Implement token refresh logic if needed.

3. **Rate Limiting:** Login endpoints are rate-limited to 5 requests per minute per IP.

4. **OTP Channels:** OTP can be sent via SMS and/or Email depending on system configuration.

---

*Document Version: 1.0*  
*Last Updated: December 2025*
