# Certificates API

This document covers all endpoints related to certificate generation, download, and management.

---

## Table of Contents

1. [Certificate Overview](#certificate-overview)
2. [Generate Certificate](#generate-certificate)
3. [Download Certificate](#download-certificate)
4. [Certificate Verification](#certificate-verification)
5. [Certificate Management](#certificate-management)

---

## Certificate Overview

### Certificate Types

| Type | Description | Validity |
|------|-------------|----------|
| `new_registration` | New homestay registration | 2 years |
| `existing_rc_onboarding` | Existing RC digitization | Until original expiry |
| `renewal` | Renewal of expired certificate | 2 years |
| `amendment` | Amendment to existing certificate | Remaining validity |

### Certificate Number Format

```
HPHS/{DISTRICT_CODE}/{YEAR}/{SEQUENCE}

Example: HPHS/SML/2025/00001
```

- `HPHS` - HP Homestay prefix
- `SML` - District code (3 letters)
- `2025` - Year of issuance
- `00001` - Sequential number (5 digits)

---

## Generate Certificate

### Generate Certificate (Automatic)

Certificate is automatically generated when payment is confirmed.

**Trigger:** Payment confirmation from HimKosh

**Process:**
1. Payment verified
2. Certificate number generated
3. Certificate PDF created
4. Application status → `approved`
5. Owner notified via SMS/Email

---

### Regenerate Certificate (Admin)

Regenerates certificate PDF (in case of errors).

**Endpoint:** `POST /api/admin/applications/:id/regenerate-certificate`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "reason": "Owner name spelling correction",
  "corrections": {
    "ownerName": "Corrected Name"
  }
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Certificate regenerated",
  "certificateNumber": "HPHS/SML/2025/00001",
  "generatedAt": "2025-12-15T10:00:00Z",
  "previousVersion": 1,
  "currentVersion": 2
}
```

---

## Download Certificate

### Download Certificate PDF

Downloads the official registration certificate.

**Endpoint:** `GET /api/applications/:id/certificate`

**Authentication:** Required (owner of application, admin)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | pdf | Output format (pdf) |
| `download` | boolean | true | Force download vs inline |

**Success Response:** `200 OK`

Returns PDF file with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="HPHS-SML-2025-00001.pdf"
Content-Length: 125000
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Certificate not found` | Not approved yet |
| 403 | `Access denied` | Not authorized |

---

### Get Certificate Metadata

Gets certificate details without downloading PDF.

**Endpoint:** `GET /api/applications/:id/certificate/info`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "certificateNumber": "HPHS/SML/2025/00001",
  "propertyName": "Mountain View Homestay",
  "ownerName": "Rajesh Kumar",
  "category": "silver",
  "categoryLabel": "Silver Category",
  "issuedAt": "2025-12-15T10:00:00Z",
  "validFrom": "2025-12-15",
  "validUntil": "2027-12-14",
  "status": "active",
  "district": "Shimla",
  "totalRooms": 5,
  "address": "Village Kufri, Near Mall Road, Shimla - 171012",
  "qrCode": "base64_encoded_qr_image",
  "verificationUrl": "https://hptourism.gov.in/verify?cert=HPHS/SML/2025/00001",
  "downloadUrl": "/api/applications/uuid/certificate"
}
```

---

### Download Certificate (By Number)

Download certificate using certificate number (for owners who lost link).

**Endpoint:** `GET /api/certificates/:certificateNumber/download`

**Authentication:** Required (verified owner)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `certificateNumber` | string | Certificate number (URL encoded) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `mobile` | string | Registered mobile for verification |

**Success Response:** Returns PDF file

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Certificate not found` | Invalid number |
| 403 | `Verification failed` | Mobile doesn't match |

---

## Certificate Verification

### Public Verification

See [Public APIs - Certificate Verification](08-public-apis.md#certificate-verification)

---

### Internal Verification

Verifies certificate with full details (for officers).

**Endpoint:** `GET /api/certificates/:certificateNumber/verify-full`

**Authentication:** Required (dealing_assistant, dtdo, admin)

**Success Response:** `200 OK`

```json
{
  "valid": true,
  "certificate": {
    "certificateNumber": "HPHS/SML/2025/00001",
    "propertyName": "Mountain View Homestay",
    "ownerName": "Rajesh Kumar",
    "ownerMobile": "9876543210",
    "ownerEmail": "rajesh@example.com",
    "ownerAadhaar": "XXXX-XXXX-1234",
    "category": "silver",
    "district": "Shimla",
    "tehsil": "Shimla Urban",
    "address": "Full address...",
    "totalRooms": 5,
    "totalBeds": 10,
    "latitude": 31.0892,
    "longitude": 77.1725,
    "issuedAt": "2025-12-15T10:00:00Z",
    "validUntil": "2027-12-14T23:59:59Z",
    "status": "active",
    "issuedBy": "DTDO Name",
    "applicationId": "uuid"
  },
  "application": {
    "applicationNumber": "HP/SML/2025/00001",
    "submittedAt": "2025-12-01T10:00:00Z",
    "approvedAt": "2025-12-15T10:00:00Z",
    "paymentStatus": "completed",
    "grn": "GRN123456789"
  },
  "inspection": {
    "inspectedAt": "2025-12-10T10:00:00Z",
    "inspectorName": "Inspector Name",
    "recommendation": "approve"
  }
}
```

---

## Certificate Management

### List Certificates (Admin)

Lists all issued certificates.

**Endpoint:** `GET /api/admin/certificates`

**Authentication:** Required (admin, super_admin)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `district` | string | Filter by district |
| `category` | string | Filter by category |
| `status` | string | Filter: active / expired / revoked |
| `fromDate` | string | Issued from date |
| `toDate` | string | Issued to date |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Success Response:** `200 OK`

```json
{
  "certificates": [
    {
      "certificateNumber": "HPHS/SML/2025/00001",
      "propertyName": "Mountain View Homestay",
      "ownerName": "Rajesh Kumar",
      "category": "silver",
      "district": "Shimla",
      "issuedAt": "2025-12-15T10:00:00Z",
      "validUntil": "2027-12-14",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  },
  "stats": {
    "totalActive": 1200,
    "totalExpired": 50,
    "issuedThisMonth": 45
  }
}
```

---

### Revoke Certificate

Revokes an existing certificate.

**Endpoint:** `POST /api/admin/certificates/:certificateNumber/revoke`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "reason": "Fraudulent application detected",
  "effectiveDate": "2025-12-20",
  "notifyOwner": true
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Certificate revoked",
  "certificateNumber": "HPHS/SML/2025/00001",
  "revokedAt": "2025-12-20T00:00:00Z",
  "revokedBy": "Admin Name"
}
```

---

### Extend Certificate Validity

Extends certificate validity (special cases).

**Endpoint:** `POST /api/admin/certificates/:certificateNumber/extend`

**Authentication:** Required (super_admin)

**Request Body:**

```json
{
  "newValidUntil": "2028-12-14",
  "reason": "COVID extension per government order",
  "orderReference": "GO/Tourism/2025/123"
}
```

---

### Export Certificates

Exports certificates data for reporting.

**Endpoint:** `GET /api/admin/certificates/export`

**Authentication:** Required (admin, super_admin)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | csv / xlsx / pdf |
| `district` | string | Filter by district |
| `fromDate` | string | From date |
| `toDate` | string | To date |

**Success Response:** `200 OK`

Returns file in requested format.

---

## Certificate Template

The certificate includes:

1. **Header**
   - Government of Himachal Pradesh emblem
   - Department of Tourism title
   - "Homestay Registration Certificate"

2. **Certificate Details**
   - Certificate number
   - QR code (links to verification)
   - Issue date
   - Validity period

3. **Property Information**
   - Property name
   - Full address
   - Category (Silver/Gold/Diamond)
   - Total rooms and beds

4. **Owner Information**
   - Owner name
   - Contact details

5. **Footer**
   - Issuing authority signature
   - Terms and conditions
   - Verification URL

---

## QR Code

Each certificate includes a QR code that encodes:

```
https://hptourism.gov.in/verify?cert=HPHS/SML/2025/00001
```

When scanned:
- Links to public verification page
- Shows certificate status
- Confirms authenticity

---

*Document Version: 1.0*  
*Last Updated: December 2025*
