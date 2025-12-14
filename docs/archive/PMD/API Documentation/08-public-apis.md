# Public APIs

This document covers all public-facing endpoints that do not require authentication. These are suitable for integration with external portals, citizen services, and third-party systems.

---

## Table of Contents

1. [Application Tracking](#application-tracking)
2. [Certificate Verification](#certificate-verification)
3. [Property Search](#property-search)
4. [Platform Stats](#platform-stats)
5. [Location Data](#location-data)

---

## Application Tracking

### Track Application Status

Allows citizens to track their application status without logging in.

**Endpoint:** `GET /api/applications/track`

**Authentication:** None required (Public API)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationNumber` | string | Yes | Application number (e.g., HP/SML/2025/00001) |
| `mobile` | string | No | Mobile number for verification (last 4 digits) |

**Example Request:**

```
GET /api/applications/track?applicationNumber=HP/SML/2025/00001&mobile=3210
```

**Success Response:** `200 OK`

```json
{
  "found": true,
  "applicationNumber": "HP/SML/2025/00001",
  "propertyName": "Mountain View Homestay",
  "ownerName": "R**** K****",
  "district": "Shimla",
  "category": "silver",
  "status": "under_scrutiny",
  "statusLabel": "Under Scrutiny by Dealing Assistant",
  "submittedAt": "2025-12-10T10:00:00Z",
  "currentStage": 2,
  "totalStages": 6,
  "estimatedDays": 30,
  "timeline": [
    {
      "stage": 1,
      "name": "Application Submitted",
      "status": "completed",
      "completedAt": "2025-12-10T10:00:00Z",
      "description": "Application received successfully"
    },
    {
      "stage": 2,
      "name": "Under Scrutiny",
      "status": "in_progress",
      "startedAt": "2025-12-10T10:05:00Z",
      "description": "Being reviewed by Dealing Assistant"
    },
    {
      "stage": 3,
      "name": "DTDO Review",
      "status": "pending",
      "description": "Awaiting DTDO approval"
    },
    {
      "stage": 4,
      "name": "Site Inspection",
      "status": "pending",
      "description": "Inspection to be scheduled"
    },
    {
      "stage": 5,
      "name": "Payment",
      "status": "pending",
      "description": "Fee payment"
    },
    {
      "stage": 6,
      "name": "Certificate Issued",
      "status": "pending",
      "description": "Registration certificate"
    }
  ],
  "remarks": null,
  "nextAction": "Your application is being reviewed. No action required from your side."
}
```

**Error Responses:**

| Status | Response | Description |
|--------|----------|-------------|
| 404 | `{"found": false, "message": "Application not found"}` | Invalid application number |
| 400 | `{"error": "Invalid application number format"}` | Malformed number |

### Rate Limiting

- 30 requests per minute per IP
- Consider caching responses for 5 minutes

---

## Certificate Verification

### Verify Certificate

Allows anyone to verify the authenticity of a homestay registration certificate.

**Endpoint:** `GET /api/certificates/verify`

**Authentication:** None required (Public API)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `certificateNumber` | string | Yes | Certificate number (e.g., HPHS/SML/2025/00001) |
| `propertyName` | string | No | Property name for additional verification |

**Example Request:**

```
GET /api/certificates/verify?certificateNumber=HPHS/SML/2025/00001
```

**Success Response:** `200 OK`

```json
{
  "valid": true,
  "certificate": {
    "certificateNumber": "HPHS/SML/2025/00001",
    "propertyName": "Mountain View Homestay",
    "ownerName": "Rajesh Kumar",
    "category": "silver",
    "categoryLabel": "Silver Category",
    "district": "Shimla",
    "tehsil": "Shimla Urban",
    "address": "Village Kufri, Near Mall Road, Shimla - 171012",
    "totalRooms": 5,
    "totalBeds": 10,
    "issuedAt": "2025-12-15T10:00:00Z",
    "validUntil": "2027-12-14T23:59:59Z",
    "status": "active",
    "qrCodeUrl": "/api/certificates/HPHS-SML-2025-00001/qr"
  },
  "verification": {
    "verifiedAt": "2025-12-20T14:30:00Z",
    "verificationId": "VER-123456789"
  }
}
```

**Invalid Certificate Response:**

```json
{
  "valid": false,
  "message": "Certificate not found or invalid",
  "suggestion": "Please check the certificate number and try again"
}
```

**Expired Certificate Response:**

```json
{
  "valid": false,
  "message": "Certificate has expired",
  "certificate": {
    "certificateNumber": "HPHS/SML/2023/00001",
    "expiredAt": "2024-12-14T23:59:59Z",
    "status": "expired"
  }
}
```

---

### Get Certificate QR Code

Returns a QR code image for certificate verification.

**Endpoint:** `GET /api/certificates/:certificateNumber/qr`

**Authentication:** None required (Public API)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `certificateNumber` | string | Certificate number (hyphenated) |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | integer | 256 | QR code size in pixels |
| `format` | string | png | Image format (png, svg) |

**Success Response:** `200 OK`

Returns QR code image with headers:
```
Content-Type: image/png
Cache-Control: public, max-age=86400
```

The QR code encodes: `https://hptourism.gov.in/verify?cert=HPHS/SML/2025/00001`

---

## Property Search

### Search Registered Properties

Search for registered homestays in Himachal Pradesh.

**Endpoint:** `GET /api/public/properties`

**Authentication:** None required (Public API)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `district` | string | Filter by district |
| `category` | string | Filter by category (silver/gold/diamond) |
| `search` | string | Search by property name |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20, max: 50) |

**Example Request:**

```
GET /api/public/properties?district=Shimla&category=gold&page=1&limit=10
```

**Success Response:** `200 OK`

```json
{
  "properties": [
    {
      "id": "uuid",
      "propertyName": "Mountain View Homestay",
      "category": "gold",
      "categoryLabel": "Gold Category",
      "district": "Shimla",
      "tehsil": "Shimla Urban",
      "area": "Kufri",
      "totalRooms": 6,
      "rateRange": "₹2,500 - ₹4,000",
      "amenities": ["WiFi", "Parking", "Meals"],
      "certificateNumber": "HPHS/SML/2025/00001",
      "registeredSince": "2025-12-15",
      "rating": 4.5,
      "thumbnailUrl": "/api/properties/uuid/thumbnail"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16
  },
  "filters": {
    "districts": ["Shimla", "Kullu", "Manali", "..."],
    "categories": ["silver", "gold", "diamond"]
  }
}
```

---

### Get Property Details (Public)

Get public details of a registered property.

**Endpoint:** `GET /api/public/properties/:id`

**Authentication:** None required (Public API)

**Success Response:** `200 OK`

```json
{
  "id": "uuid",
  "propertyName": "Mountain View Homestay",
  "description": "A beautiful homestay with mountain views...",
  "category": "gold",
  "district": "Shimla",
  "tehsil": "Shimla Urban",
  "address": "Village Kufri, Near Mall Road",
  "pincode": "171012",
  "contactPhone": "98765XXXXX",
  "contactEmail": "contact@example.com",
  "totalRooms": 6,
  "totalBeds": 12,
  "amenities": [
    "Free WiFi",
    "Free Parking",
    "Home Cooked Meals",
    "Hot Water",
    "Heating"
  ],
  "photos": [
    {
      "url": "/api/public/properties/uuid/photos/1",
      "thumbnail": "/api/public/properties/uuid/photos/1/thumb",
      "caption": "Exterior View"
    }
  ],
  "roomTypes": [
    {
      "type": "Deluxe Room",
      "beds": 2,
      "rate": 3000,
      "available": 3
    }
  ],
  "certificate": {
    "number": "HPHS/SML/2025/00001",
    "validUntil": "2027-12-14",
    "verifyUrl": "/api/certificates/verify?certificateNumber=HPHS/SML/2025/00001"
  },
  "location": {
    "latitude": 31.0892,
    "longitude": 77.1725,
    "mapUrl": "https://maps.google.com/?q=31.0892,77.1725"
  }
}
```

---

## Platform Stats

### Get Public Statistics

Returns aggregate statistics for the platform.

**Endpoint:** `GET /api/public/stats`

**Authentication:** None required (Public API)

**Success Response:** `200 OK`

```json
{
  "totalRegisteredProperties": 1250,
  "totalRooms": 8500,
  "totalBeds": 17000,
  "byCategory": {
    "silver": 750,
    "gold": 350,
    "diamond": 150
  },
  "byDistrict": {
    "Shimla": 320,
    "Kullu": 280,
    "Kangra": 210,
    "Manali": 180,
    "...": "..."
  },
  "recentApprovals": 45,
  "lastUpdated": "2025-12-20T00:00:00Z"
}
```

---

## Location Data

### Get Districts

Returns list of districts in Himachal Pradesh.

**Endpoint:** `GET /api/public/districts`

**Authentication:** None required (Public API)

**Success Response:** `200 OK`

```json
{
  "districts": [
    {"code": "SML", "name": "Shimla"},
    {"code": "KLU", "name": "Kullu"},
    {"code": "KGR", "name": "Kangra"},
    {"code": "MND", "name": "Mandi"},
    {"code": "HMR", "name": "Hamirpur"},
    {"code": "SLN", "name": "Solan"},
    {"code": "UNA", "name": "Una"},
    {"code": "BLR", "name": "Bilaspur"},
    {"code": "CBA", "name": "Chamba"},
    {"code": "SRM", "name": "Sirmaur"},
    {"code": "KNR", "name": "Kinnaur"},
    {"code": "LHL", "name": "Lahaul & Spiti"}
  ]
}
```

---

### Get Tehsils

Returns tehsils for a district.

**Endpoint:** `GET /api/public/districts/:district/tehsils`

**Authentication:** None required (Public API)

**Success Response:** `200 OK`

```json
{
  "district": "Shimla",
  "tehsils": [
    {"code": "SMU", "name": "Shimla Urban"},
    {"code": "SMR", "name": "Shimla Rural"},
    {"code": "JUB", "name": "Jubbal"},
    {"code": "ROH", "name": "Rohru"},
    {"code": "THO", "name": "Theog"},
    {"code": "RMP", "name": "Rampur Bushahr"}
  ]
}
```

---

## Integration Guidelines

### For Government Portals

1. **CORS:** Public APIs support CORS for approved domains.

2. **Caching:** Responses can be cached for up to 5 minutes.

3. **Rate Limits:** 30 requests per minute per IP.

4. **Attribution:** When displaying data, include:
   > "Data from HP Tourism eServices Portal"

### For Tourism Aggregators

1. Contact `api-support@hptourism.gov.in` for higher rate limits.

2. Use pagination for large result sets.

3. Implement retry logic with exponential backoff.

### Response Codes Summary

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 404 | Not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

*Document Version: 1.0*  
*Last Updated: December 2025*
