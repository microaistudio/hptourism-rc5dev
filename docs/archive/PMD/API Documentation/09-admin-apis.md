# Admin APIs

This document covers all administrative endpoints for system configuration, user management, and platform administration.

---

## Table of Contents

1. [User Management](#user-management)
2. [System Settings](#system-settings)
3. [Communications](#communications)
4. [Database Management](#database-management)
5. [Backup & Restore](#backup--restore)
6. [Analytics & Reports](#analytics--reports)

---

## User Management

### List All Users

Gets all users in the system.

**Endpoint:** `GET /api/admin/users`

**Authentication:** Required (admin, super_admin)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role |
| `district` | string | Filter by district |
| `status` | string | Filter: active / inactive |
| `search` | string | Search by name/username |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Success Response:** `200 OK`

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "john_da",
      "fullName": "John Smith",
      "email": "john@example.com",
      "mobile": "9876543210",
      "role": "dealing_assistant",
      "district": "Shimla",
      "isActive": true,
      "lastLoginAt": "2025-12-11T10:00:00Z",
      "createdAt": "2025-01-15T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

### Create User

Creates a new staff user.

**Endpoint:** `POST /api/admin/users`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "username": "new_da",
  "password": "temporary_password",
  "fullName": "New DA Name",
  "email": "newda@example.com",
  "mobile": "9876543210",
  "role": "dealing_assistant",
  "district": "Shimla",
  "isActive": true
}
```

**Success Response:** `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "username": "new_da",
    "role": "dealing_assistant"
  },
  "message": "User created successfully"
}
```

---

### Update User

Updates user information.

**Endpoint:** `PATCH /api/admin/users/:id`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "fullName": "Updated Name",
  "email": "updated@example.com",
  "district": "Kullu",
  "role": "district_tourism_officer"
}
```

---

### Update User Status

Activates or deactivates a user.

**Endpoint:** `PATCH /api/admin/users/:id/status`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "isActive": false,
  "reason": "User resigned"
}
```

---

### Reset User Password

Resets user password (admin action).

**Endpoint:** `POST /api/admin/users/:id/reset-password`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "newPassword": "new_temporary_password",
  "forceChange": true
}
```

---

## System Settings

### Get All Settings

Gets all system settings.

**Endpoint:** `GET /api/admin/settings`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "settings": {
    "payment": {
      "enabled": true,
      "testMode": false
    },
    "captcha": {
      "enabled": true,
      "type": "math"
    },
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 100
    },
    "uploadPolicy": {
      "maxFileSizeMB": 20,
      "allowedTypes": ["pdf", "jpg", "png"]
    },
    "notifications": {
      "smsEnabled": true,
      "emailEnabled": true
    }
  }
}
```

---

### Update Settings

Updates system settings.

**Endpoint:** `PUT /api/admin/settings/:key`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "value": {
    "enabled": true,
    "config": {...}
  }
}
```

---

### Toggle Payment Workflow

Enables/disables payment requirement.

**Endpoint:** `POST /api/admin/settings/payment/workflow/toggle`

**Authentication:** Required (super_admin)

**Request Body:**

```json
{
  "enabled": true,
  "reason": "Enabling payments for go-live"
}
```

---

### Upload Policy Settings

Get/update file upload policy.

**Endpoint:** `GET /api/settings/upload-policy`

**Endpoint:** `PUT /api/admin/settings/upload-policy`

**Request Body:**

```json
{
  "maxFileSizeMB": 20,
  "maxTotalSizeMB": 100,
  "allowedMimeTypes": [
    "application/pdf",
    "image/jpeg",
    "image/png"
  ],
  "minPhotos": 2,
  "maxPhotos": 10
}
```

---

## Communications

### Get Communication Settings

Gets email and SMS gateway configuration.

**Endpoint:** `GET /api/admin/communications`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "email": {
    "enabled": true,
    "provider": "smtp",
    "config": {
      "host": "smtp.example.com",
      "port": 587,
      "from": "noreply@hptourism.gov.in"
    }
  },
  "sms": {
    "enabled": true,
    "provider": "nic_v2",
    "config": {
      "senderId": "HPTOUR"
    }
  }
}
```

---

### Update Email Settings

**Endpoint:** `PUT /api/admin/communications/email`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "enabled": true,
  "provider": "smtp",
  "host": "smtp.example.com",
  "port": 587,
  "secure": true,
  "username": "user@example.com",
  "password": "password",
  "from": "HP Tourism <noreply@hptourism.gov.in>"
}
```

---

### Update SMS Settings

**Endpoint:** `PUT /api/admin/communications/sms`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "enabled": true,
  "provider": "nic_v2",
  "apiKey": "api_key",
  "senderId": "HPTOUR",
  "templateId": "template_id"
}
```

---

### Test Email

Sends a test email.

**Endpoint:** `POST /api/admin/communications/email/test`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "to": "test@example.com",
  "subject": "Test Email",
  "body": "This is a test email"
}
```

---

### Test SMS

Sends a test SMS.

**Endpoint:** `POST /api/admin/communications/sms/test`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "to": "9876543210",
  "message": "This is a test SMS from HP Tourism"
}
```

---

## Database Management

### Get Database Config

Gets current database configuration.

**Endpoint:** `GET /api/admin/db/config`

**Authentication:** Required (super_admin)

**Success Response:** `200 OK`

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "hptourism",
  "user": "postgres",
  "ssl": false,
  "poolSize": 10,
  "status": "connected"
}
```

---

### Test Database Connection

Tests a database connection configuration.

**Endpoint:** `POST /api/admin/db/config/test`

**Authentication:** Required (super_admin)

**Request Body:**

```json
{
  "host": "new-host.example.com",
  "port": 5432,
  "database": "hptourism_new",
  "user": "postgres",
  "password": "password"
}
```

---

### Get Database Tables

Lists all database tables.

**Endpoint:** `GET /api/admin/db-console/tables`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "tables": [
    {
      "name": "users",
      "rowCount": 1250,
      "sizeBytes": 524288
    },
    {
      "name": "applications",
      "rowCount": 3500,
      "sizeBytes": 10485760
    }
  ]
}
```

---

### Execute SQL Query

Executes a read-only SQL query.

**Endpoint:** `POST /api/admin/db-console/execute`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "query": "SELECT COUNT(*) FROM applications WHERE status = 'approved'",
  "readOnly": true
}
```

**Success Response:** `200 OK`

```json
{
  "columns": ["count"],
  "rows": [{"count": 1250}],
  "rowCount": 1,
  "executionTimeMs": 15
}
```

---

### Reset Database

Resets database (development only).

**Endpoint:** `POST /api/admin/reset-db`

**Authentication:** Required (super_admin)

**Request Body:**

```json
{
  "confirmation": "RESET_DB_CONFIRM",
  "preserveUsers": true
}
```

⚠️ **WARNING:** This is a destructive operation.

---

## Backup & Restore

### Get Backup Settings

**Endpoint:** `GET /api/admin/backup/settings`

**Authentication:** Required (super_admin)

---

### Update Backup Settings

**Endpoint:** `POST /api/admin/backup/settings`

**Request Body:**

```json
{
  "enabled": true,
  "schedule": "0 2 * * *",
  "retention": 30,
  "destination": "local"
}
```

---

### Run Manual Backup

**Endpoint:** `POST /api/admin/backup/run`

**Authentication:** Required (super_admin)

**Request Body:**

```json
{
  "type": "full",
  "includeUploads": true
}
```

---

### List Backups

**Endpoint:** `GET /api/admin/backup/list`

**Authentication:** Required (super_admin)

---

### Download Backup

**Endpoint:** `GET /api/admin/backup/:id/download/:type`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Backup ID |
| `type` | string | db / uploads / full |

---

### Delete Backup

**Endpoint:** `DELETE /api/admin/backup/:id`

**Authentication:** Required (super_admin)

---

## Analytics & Reports

### Dashboard Statistics

**Endpoint:** `GET /api/admin/dashboard/stats`

**Authentication:** Required (super_admin)

**Success Response:** `200 OK`

```json
{
  "applications": {
    "total": 3500,
    "thisMonth": 150,
    "pending": 45,
    "approved": 1250,
    "rejected": 50
  },
  "users": {
    "totalOwners": 2500,
    "totalStaff": 75,
    "activeToday": 120
  },
  "payments": {
    "totalCollected": 7500000,
    "thisMonth": 250000,
    "pending": 125000
  },
  "performance": {
    "avgProcessingDays": 15,
    "completionRate": 0.92
  }
}
```

---

### System Statistics

**Endpoint:** `GET /api/admin/stats`

**Authentication:** Required (super_admin)

**Success Response:** `200 OK`

```json
{
  "system": {
    "uptime": 864000,
    "version": "RC5",
    "environment": "production"
  },
  "database": {
    "size": "1.2 GB",
    "connections": 15,
    "tables": 25
  },
  "storage": {
    "used": "45 GB",
    "total": "100 GB",
    "fileCount": 15000
  }
}
```

---

### Production Stats

**Endpoint:** `GET /api/analytics/production-stats`

**Authentication:** Required (admin roles)

---

### Analytics Dashboard

**Endpoint:** `GET /api/analytics/dashboard`

**Authentication:** Required (admin roles)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromDate` | string | Start date |
| `toDate` | string | End date |
| `district` | string | Filter by district |
| `groupBy` | string | day / week / month |

---

*Document Version: 1.0*  
*Last Updated: December 2025*
