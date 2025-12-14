# Inspections API

This document covers all endpoints related to site inspection scheduling, execution, and report management.

---

## Table of Contents

1. [Inspection Overview](#inspection-overview)
2. [Schedule Inspection](#schedule-inspection)
3. [Inspection Report](#inspection-report)
4. [Owner Acknowledgement](#owner-acknowledgement)
5. [Inspection List](#inspection-list)

---

## Inspection Overview

### Inspection Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Forwarded to    │────▶│ Inspection      │────▶│ Owner           │
│ DTDO            │     │ Scheduled       │     │ Acknowledges    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │ Site Visit      │◀─────────────┘
                        │ Conducted       │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Report          │────▶│ Review &        │
                        │ Submitted       │     │ Decision        │
                        └─────────────────┘     └─────────────────┘
```

---

## Schedule Inspection

### Schedule Site Inspection

Schedules a site inspection for an application.

**Endpoint:** `POST /api/da/applications/:id/schedule-inspection`

**Authentication:** Required (dealing_assistant)

**Request Body:**

```json
{
  "scheduledDate": "2025-12-20",
  "scheduledTime": "10:00",
  "inspectorName": "Inspector Name",
  "inspectorMobile": "9876543210",
  "remarks": "Please ensure property access is available",
  "notifyOwner": true
}
```

**Validation Rules:**

| Field | Rule |
|-------|------|
| `scheduledDate` | Must be future date, within 30 days |
| `scheduledTime` | Valid time format (HH:MM) |
| `inspectorName` | Required, 2-100 characters |
| `inspectorMobile` | Valid 10-digit mobile |

**Success Response:** `200 OK`

```json
{
  "status": "inspection_scheduled",
  "inspection": {
    "scheduledDate": "2025-12-20",
    "scheduledTime": "10:00",
    "inspectorName": "Inspector Name",
    "inspectorMobile": "9876543210"
  },
  "message": "Inspection scheduled successfully",
  "ownerNotified": true
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Invalid date` | Date in past or too far |
| 400 | `Application not ready` | Wrong status |

---

### Reschedule Inspection

Reschedules an existing inspection.

**Endpoint:** `PUT /api/da/applications/:id/reschedule-inspection`

**Authentication:** Required (dealing_assistant)

**Request Body:**

```json
{
  "scheduledDate": "2025-12-22",
  "scheduledTime": "14:00",
  "reason": "Owner requested date change",
  "notifyOwner": true
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Inspection rescheduled",
  "previousDate": "2025-12-20",
  "newDate": "2025-12-22",
  "ownerNotified": true
}
```

---

### Cancel Inspection

Cancels a scheduled inspection.

**Endpoint:** `DELETE /api/da/applications/:id/cancel-inspection`

**Authentication:** Required (dealing_assistant)

**Request Body:**

```json
{
  "reason": "Property not ready for inspection",
  "notifyOwner": true
}
```

---

## Inspection Report

### Submit Inspection Report

Submits the site inspection report.

**Endpoint:** `POST /api/da/inspections/:id/submit-report`

**Authentication:** Required (dealing_assistant)

**Request Body:**

```json
{
  "inspectionDate": "2025-12-20",
  "inspectionTime": "10:30",
  "inspectorName": "Inspector Name",
  
  "propertyVerification": {
    "addressMatches": true,
    "ownerPresent": true,
    "roomCountVerified": true,
    "verifiedRooms": 5,
    "verifiedBeds": 10
  },
  
  "facilityChecklist": {
    "cleanlinessAdequate": true,
    "safetyMeasures": true,
    "waterSupply": true,
    "electricity": true,
    "sanitaryFacilities": true,
    "parking": true,
    "accessRoad": true
  },
  
  "categoryAssessment": {
    "recommendedCategory": "silver",
    "categoryJustification": "Property meets Silver category requirements"
  },
  
  "overallAssessment": {
    "recommendation": "approve | reject | needs_improvement",
    "observations": "Property is well-maintained and suitable for homestay operations",
    "concerns": "None",
    "suggestions": "Consider adding fire extinguisher"
  },
  
  "photos": [
    {
      "type": "exterior",
      "fileId": "uuid",
      "caption": "Front view during inspection"
    }
  ],
  
  "signature": {
    "inspectorSignature": "base64_encoded_image",
    "ownerSignature": "base64_encoded_image"
  }
}
```

**Success Response:** `200 OK`

```json
{
  "status": "inspection_completed",
  "reportId": "uuid",
  "message": "Inspection report submitted successfully",
  "submittedAt": "2025-12-20T12:00:00Z"
}
```

---

### Get Inspection Report

Retrieves the inspection report.

**Endpoint:** `GET /api/applications/:id/inspection-report`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "reportId": "uuid",
  "applicationId": "uuid",
  "status": "submitted",
  
  "scheduledDate": "2025-12-20",
  "actualDate": "2025-12-20",
  "inspectorName": "Inspector Name",
  
  "propertyVerification": {
    "addressMatches": true,
    "ownerPresent": true,
    "roomCountVerified": true,
    "verifiedRooms": 5
  },
  
  "facilityChecklist": {
    "...": "..."
  },
  
  "recommendation": "approve",
  "observations": "Property is well-maintained...",
  
  "photos": [...],
  
  "submittedAt": "2025-12-20T12:00:00Z",
  "submittedBy": "DA Name"
}
```

**Access Control:**

| Role | Access |
|------|--------|
| property_owner | Own application only, after completion |
| dealing_assistant | Own district applications |
| dtdo | Own district applications |
| admin | All applications |

---

### Update Inspection Report

Updates a submitted report (before final approval).

**Endpoint:** `PUT /api/da/inspections/:id/update-report`

**Authentication:** Required (dealing_assistant)

**Request Body:** Same as submit, with changes

---

## Owner Acknowledgement

### Get Inspection Details (Owner View)

Owner views scheduled inspection details.

**Endpoint:** `GET /api/applications/:id/inspection`

**Authentication:** Required (property_owner)

**Success Response:** `200 OK`

```json
{
  "scheduled": true,
  "scheduledDate": "2025-12-20",
  "scheduledTime": "10:00",
  "inspectorName": "Inspector Name",
  "inspectorMobile": "987654XXXX",
  "status": "scheduled | acknowledged | completed",
  "ownerAcknowledged": false,
  "acknowledgedAt": null,
  "instructions": [
    "Please ensure property is accessible",
    "Keep all original documents ready",
    "Owner or authorized person must be present"
  ]
}
```

---

### Acknowledge Inspection

Owner acknowledges the scheduled inspection.

**Endpoint:** `POST /api/applications/:id/acknowledge-inspection`

**Authentication:** Required (property_owner)

**Request Body:**

```json
{
  "acknowledged": true,
  "contactPerson": "Rajesh Kumar",
  "contactMobile": "9876543210",
  "alternateDate": null,
  "remarks": "I will be available at the scheduled time"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Inspection acknowledged",
  "acknowledgedAt": "2025-12-18T10:00:00Z",
  "status": "acknowledged"
}
```

---

### Request Reschedule (Owner)

Owner requests inspection reschedule.

**Endpoint:** `POST /api/applications/:id/request-reschedule`

**Authentication:** Required (property_owner)

**Request Body:**

```json
{
  "preferredDate": "2025-12-22",
  "preferredTime": "14:00",
  "reason": "Out of station on scheduled date"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Reschedule request submitted",
  "status": "pending_approval",
  "requestId": "uuid"
}
```

---

## Inspection List

### Get DA Inspections

Lists all inspections for dealing assistant.

**Endpoint:** `GET /api/da/inspections`

**Authentication:** Required (dealing_assistant)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: scheduled / completed / all |
| `fromDate` | string | From date |
| `toDate` | string | To date |
| `page` | integer | Page number |

**Success Response:** `200 OK`

```json
{
  "inspections": [
    {
      "id": "uuid",
      "applicationId": "uuid",
      "applicationNumber": "HP/SML/2025/00001",
      "propertyName": "Mountain View Homestay",
      "ownerName": "Rajesh Kumar",
      "ownerMobile": "9876543210",
      "address": "Village Kufri, Shimla",
      "scheduledDate": "2025-12-20",
      "scheduledTime": "10:00",
      "status": "scheduled",
      "ownerAcknowledged": true,
      "inspectorName": "Inspector Name"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 15
  },
  "stats": {
    "scheduledToday": 2,
    "scheduledThisWeek": 8,
    "pendingReports": 3
  }
}
```

---

### Get Single Inspection (DA)

Gets detailed inspection record.

**Endpoint:** `GET /api/da/inspections/:id`

**Authentication:** Required (dealing_assistant)

**Success Response:** `200 OK`

```json
{
  "id": "uuid",
  "application": {
    "id": "uuid",
    "applicationNumber": "HP/SML/2025/00001",
    "propertyName": "Mountain View Homestay",
    "category": "silver",
    "totalRooms": 5,
    "address": "Village Kufri, Near Mall Road",
    "latitude": 31.0892,
    "longitude": 77.1725
  },
  "owner": {
    "name": "Rajesh Kumar",
    "mobile": "9876543210",
    "email": "rajesh@example.com"
  },
  "scheduling": {
    "scheduledDate": "2025-12-20",
    "scheduledTime": "10:00",
    "scheduledBy": "DA Name",
    "scheduledAt": "2025-12-15T10:00:00Z"
  },
  "acknowledgement": {
    "acknowledged": true,
    "acknowledgedAt": "2025-12-16T11:00:00Z",
    "contactPerson": "Rajesh Kumar"
  },
  "report": null,
  "documents": [
    {
      "type": "ownership_proof",
      "url": "/api/documents/uuid"
    }
  ]
}
```

---

## Inspection Report Template

### Get Report Template

Gets the inspection report template/checklist.

**Endpoint:** `GET /api/da/inspection-template`

**Authentication:** Required (dealing_assistant)

**Success Response:** `200 OK`

```json
{
  "sections": [
    {
      "id": "property_verification",
      "title": "Property Verification",
      "fields": [
        {"id": "addressMatches", "label": "Address matches records", "type": "boolean"},
        {"id": "ownerPresent", "label": "Owner/representative present", "type": "boolean"},
        {"id": "roomCountVerified", "label": "Room count verified", "type": "boolean"}
      ]
    },
    {
      "id": "facility_checklist",
      "title": "Facility Checklist",
      "fields": [
        {"id": "cleanliness", "label": "Cleanliness standards", "type": "rating", "scale": 5},
        {"id": "safety", "label": "Safety measures", "type": "boolean"},
        {"id": "waterSupply", "label": "Water supply adequate", "type": "boolean"}
      ]
    }
  ],
  "requiredPhotos": [
    {"type": "exterior", "label": "Exterior view", "required": true},
    {"type": "rooms", "label": "Room photos", "required": true, "minCount": 2},
    {"type": "facilities", "label": "Common facilities", "required": false}
  ]
}
```

---

*Document Version: 1.0*  
*Last Updated: December 2025*
