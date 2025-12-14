# Applications API

This document covers all endpoints related to homestay application management including creation, submission, retrieval, and updates.

---

## Table of Contents

1. [Application Lifecycle](#application-lifecycle)
2. [List Applications](#list-applications)
3. [Get Application Details](#get-application-details)
4. [Create Draft Application](#create-draft-application)
5. [Update Application](#update-application)
6. [Submit Application](#submit-application)
7. [Resubmit After Corrections](#resubmit-after-corrections)
8. [Track Application](#track-application)
9. [Existing RC Onboarding](#existing-rc-onboarding)

---

## Application Lifecycle

```
┌─────────────┐     ┌───────────┐     ┌─────────────────┐
│    Draft    │────▶│ Submitted │────▶│  Under Scrutiny │
└─────────────┘     └───────────┘     └────────┬────────┘
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    ▼                                                      ▼
           ┌────────────────┐                                   ┌──────────────────┐
           │ Sent Back for  │◀──────────────────────────────────│ Forwarded to DTDO│
           │  Corrections   │                                   └────────┬─────────┘
           └───────┬────────┘                                            │
                   │                                                     ▼
                   ▼                                         ┌───────────────────────┐
           ┌─────────────┐                                   │ Inspection Scheduled  │
           │ Resubmitted │                                   └───────────┬───────────┘
           └─────────────┘                                               │
                                                                         ▼
                                                            ┌───────────────────────┐
                                                            │ Inspection Completed  │
                                                            └───────────┬───────────┘
                                                                        │
                                              ┌─────────────────────────┴─────────────┐
                                              ▼                                       ▼
                                    ┌─────────────────┐                     ┌──────────────┐
                                    │ Payment Pending │                     │   Rejected   │
                                    └────────┬────────┘                     └──────────────┘
                                             │
                                             ▼
                                    ┌──────────────┐
                                    │   Approved   │
                                    └──────────────┘
```

---

## List Applications

### Get User's Applications

Returns all applications for the authenticated property owner.

**Endpoint:** `GET /api/applications`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20) |

**Success Response:** `200 OK`

```json
{
  "applications": [
    {
      "id": "uuid",
      "applicationNumber": "HP/SML/2025/00001",
      "propertyName": "Mountain View Homestay",
      "category": "silver",
      "status": "submitted",
      "district": "Shimla",
      "tehsil": "Shimla Urban",
      "totalRooms": 5,
      "totalBeds": 10,
      "submittedAt": "2025-12-10T10:00:00Z",
      "createdAt": "2025-12-09T08:00:00Z",
      "updatedAt": "2025-12-10T10:00:00Z"
    }
  ]
}
```

---

### Get Applications (DA View)

Returns applications for dealing assistant review.

**Endpoint:** `GET /api/da/applications`

**Authentication:** Required (dealing_assistant role)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `district` | string | Filter by district |
| `fromDate` | string | From date (ISO format) |
| `toDate` | string | To date (ISO format) |

**Success Response:** `200 OK`

```json
{
  "applications": [
    {
      "id": "uuid",
      "applicationNumber": "HP/SML/2025/00001",
      "propertyName": "Mountain View Homestay",
      "ownerName": "Rajesh Kumar",
      "ownerMobile": "9876543210",
      "category": "silver",
      "status": "submitted",
      "district": "Shimla",
      "submittedAt": "2025-12-10T10:00:00Z",
      "assignedDaId": "uuid | null"
    }
  ]
}
```

---

### Get Applications (DTDO View)

Returns applications forwarded to DTDO for review/approval.

**Endpoint:** `GET /api/dtdo/applications`

**Authentication:** Required (district_tourism_officer, district_officer)

**Success Response:** `200 OK`

```json
{
  "applications": [
    {
      "id": "uuid",
      "applicationNumber": "HP/SML/2025/00001",
      "propertyName": "Mountain View Homestay",
      "status": "forwarded_to_dtdo",
      "category": "silver",
      "district": "Shimla",
      "forwardedAt": "2025-12-10T14:00:00Z",
      "inspectionStatus": "scheduled | completed | pending"
    }
  ]
}
```

---

## Get Application Details

### Get Single Application

Retrieves complete details of an application.

**Endpoint:** `GET /api/applications/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Application ID |

**Success Response:** `200 OK`

```json
{
  "id": "uuid",
  "applicationNumber": "HP/SML/2025/00001",
  "applicationKind": "new_registration | existing_rc_onboarding | renewal | amendment",
  "status": "string",
  
  "propertyName": "Mountain View Homestay",
  "propertyAddress": "Village Kufri, Near Mall Road",
  "pincode": "171012",
  "district": "Shimla",
  "tehsil": "Shimla Urban",
  "block": "string | null",
  "gramPanchayat": "string | null",
  "urbanBody": "string | null",
  "latitude": "31.0892",
  "longitude": "77.1725",
  
  "category": "silver | gold | diamond",
  "totalRooms": 5,
  "totalBeds": 10,
  "roomDetails": [
    {
      "roomNumber": "101",
      "roomType": "deluxe",
      "bedCount": 2,
      "ratePerNight": 2500,
      "hasAttachedBath": true
    }
  ],
  
  "ownerName": "Rajesh Kumar",
  "ownerMobile": "9876543210",
  "ownerEmail": "rajesh@example.com",
  "ownerAadhaar": "XXXX-XXXX-1234",
  
  "documents": [
    {
      "id": "uuid",
      "documentType": "ownership_proof",
      "fileName": "property_deed.pdf",
      "fileUrl": "/api/documents/uuid",
      "uploadedAt": "2025-12-09T09:00:00Z"
    }
  ],
  
  "photos": [
    {
      "id": "uuid",
      "fileName": "exterior.jpg",
      "fileUrl": "/api/documents/uuid",
      "thumbnailUrl": "/api/documents/uuid/thumbnail"
    }
  ],
  
  "timeline": [
    {
      "action": "submitted",
      "timestamp": "2025-12-10T10:00:00Z",
      "actor": "Rajesh Kumar",
      "remarks": null
    }
  ],
  
  "fees": {
    "registrationFee": 5000,
    "processingFee": 500,
    "totalAmount": 5500
  },
  
  "createdAt": "2025-12-09T08:00:00Z",
  "updatedAt": "2025-12-10T10:00:00Z",
  "submittedAt": "2025-12-10T10:00:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Application not found` | Invalid ID |
| 403 | `Access denied` | Not authorized to view |

---

## Create Draft Application

### Save Draft

Creates or updates an application draft.

**Endpoint:** `POST /api/applications/draft`

**Authentication:** Required (property_owner)

**Request Body:**

```json
{
  "draftId": "uuid (optional, for updating existing draft)",
  
  "propertyName": "string",
  "propertyAddress": "string",
  "pincode": "string (6 digits)",
  "district": "string",
  "tehsil": "string",
  "block": "string (optional)",
  "gramPanchayat": "string (optional)",
  "urbanBody": "string (optional)",
  "latitude": "number (optional)",
  "longitude": "number (optional)",
  
  "category": "silver | gold | diamond",
  "totalRooms": "number",
  "totalBeds": "number",
  "roomDetails": [
    {
      "roomNumber": "string",
      "roomType": "string",
      "bedCount": "number",
      "ratePerNight": "number",
      "hasAttachedBath": "boolean"
    }
  ],
  
  "ownerName": "string",
  "ownerMobile": "string",
  "ownerEmail": "string (optional)",
  "ownerAadhaar": "string (optional)",
  
  "documents": [
    {
      "documentType": "string",
      "fileId": "uuid"
    }
  ],
  
  "photos": ["uuid array"]
}
```

**Success Response:** `201 Created`

```json
{
  "id": "uuid",
  "status": "draft",
  "message": "Draft saved successfully"
}
```

---

### Get Draft

Retrieves a saved draft.

**Endpoint:** `GET /api/applications/draft/:id`

**Authentication:** Required (property_owner)

**Success Response:** `200 OK`

Returns full application draft object.

---

## Submit Application

### Submit for Review

Submits a draft application for processing.

**Endpoint:** `POST /api/applications/:id/submit`

**Authentication:** Required (property_owner)

**Prerequisites:**
- All required fields must be filled
- All required documents must be uploaded
- Minimum 2 property photos

**Success Response:** `200 OK`

```json
{
  "applicationNumber": "HP/SML/2025/00001",
  "status": "submitted",
  "message": "Application submitted successfully",
  "submittedAt": "2025-12-10T10:00:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing required fields` | Incomplete application |
| 400 | `Insufficient documents` | Required docs missing |
| 400 | `Minimum 2 photos required` | Not enough photos |

---

## Resubmit After Corrections

### Resubmit Application

Resubmits an application after making requested corrections.

**Endpoint:** `POST /api/applications/:id/resubmit`

**Authentication:** Required (property_owner)

**Request Body:**

```json
{
  "corrections": {
    "propertyName": "Updated Homestay Name",
    "...": "updated fields"
  },
  "remarks": "I have updated the property documents as requested",
  "consent": true
}
```

**Note:** The `consent` field must be `true` to acknowledge the declaration statement.

**Success Response:** `200 OK`

```json
{
  "status": "resubmitted",
  "message": "Application resubmitted successfully"
}
```

---

## Track Application

### Public Application Tracking

Allows anyone to track an application by number. No authentication required.

**Endpoint:** `GET /api/applications/track`

**Authentication:** None required (Public API)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `applicationNumber` | string | Application number (e.g., HP/SML/2025/00001) |
| `mobile` | string | Registered mobile number (last 4 digits for verification) |

**Success Response:** `200 OK`

```json
{
  "applicationNumber": "HP/SML/2025/00001",
  "propertyName": "Mountain View Homestay",
  "status": "under_scrutiny",
  "statusLabel": "Under Scrutiny",
  "district": "Shimla",
  "category": "silver",
  "submittedAt": "2025-12-10T10:00:00Z",
  "currentStage": "Application is being reviewed by Dealing Assistant",
  "timeline": [
    {
      "stage": "Submitted",
      "timestamp": "2025-12-10T10:00:00Z",
      "completed": true
    },
    {
      "stage": "Under Scrutiny",
      "timestamp": "2025-12-10T11:00:00Z",
      "completed": true
    },
    {
      "stage": "Forwarded to DTDO",
      "timestamp": null,
      "completed": false
    }
  ]
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Application not found` | Invalid application number |
| 400 | `Mobile verification failed` | Wrong mobile number |

---

## Existing RC Onboarding

### Save Existing Owner Draft

For property owners with existing Registration Certificates.

**Endpoint:** `POST /api/existing-owners/draft`

**Authentication:** Required (property_owner)

**Request Body:**

```json
{
  "existingRcNumber": "string",
  "issueDate": "date",
  "expiryDate": "date",
  "propertyName": "string",
  "district": "string",
  "documents": [...],
  "...other fields..."
}
```

---

### Get Existing Owner Draft

**Endpoint:** `GET /api/existing-owners/draft`

**Authentication:** Required (property_owner)

---

### Submit Existing RC Application

**Endpoint:** `POST /api/existing-owners/submit`

**Authentication:** Required (property_owner)

---

## Application Data Schema

### Application Status Values

| Status | Description |
|--------|-------------|
| `draft` | Saved as draft, not submitted |
| `submitted` | Submitted for review |
| `under_scrutiny` | Being reviewed by DA |
| `district_review` | Under district review |
| `sent_back_for_corrections` | Returned for owner corrections |
| `reverted_to_applicant` | Reverted by DA |
| `reverted_by_dtdo` | Reverted by DTDO |
| `resubmitted` | Resubmitted after corrections |
| `forwarded_to_dtdo` | Sent to DTDO for approval |
| `dtdo_review` | Under DTDO review |
| `inspection_scheduled` | Site inspection scheduled |
| `inspection_under_review` | Inspection report under review |
| `inspection_completed` | Inspection completed |
| `payment_pending` | Awaiting fee payment |
| `verified_for_payment` | Payment verified |
| `approved` | Application approved, certificate issued |
| `rejected` | Application rejected |

### Application Category

| Category | Rooms | Rate Range |
|----------|-------|------------|
| `silver` | 1-4 | ₹500 - ₹2,000 |
| `gold` | 5-8 | ₹2,001 - ₹5,000 |
| `diamond` | 9+ | ₹5,001+ |

### Required Documents by Category

**All Categories:**
- Ownership Proof (Revenue Papers)
- Affidavit (Section 29)
- Undertaking (Form-C)
- ID Proof (Aadhaar)

**Gold & Diamond Additional:**
- Commercial Electricity Bill
- Commercial Water Bill

---

*Document Version: 1.0*  
*Last Updated: December 2025*
