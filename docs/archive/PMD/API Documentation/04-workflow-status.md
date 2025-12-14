# Workflow & Status API

This document covers all endpoints related to application workflow management, status transitions, and officer actions.

---

## Table of Contents

1. [Status Overview](#status-overview)
2. [DA (Dealing Assistant) Actions](#da-dealing-assistant-actions)
3. [DTDO Actions](#dtdo-actions)
4. [Send Back for Corrections](#send-back-for-corrections)
5. [Timeline & Audit](#timeline--audit)

---

## Status Overview

### Application Statuses

| Status | Description | Actor |
|--------|-------------|-------|
| `draft` | Application saved but not submitted | Owner |
| `submitted` | Submitted for review | Owner |
| `under_scrutiny` | Being reviewed by DA | DA |
| `district_review` | Under district-level review | DA |
| `sent_back_for_corrections` | Returned to owner for fixes | DA/DTDO |
| `reverted_to_applicant` | Reverted by DA | DA |
| `reverted_by_dtdo` | Reverted by DTDO | DTDO |
| `resubmitted` | Resubmitted after corrections | Owner |
| `forwarded_to_dtdo` | Sent to DTDO for approval | DA |
| `dtdo_review` | Under DTDO review | DTDO |
| `inspection_scheduled` | Site inspection scheduled | DA/DTDO |
| `inspection_under_review` | Inspection report being reviewed | DA/DTDO |
| `inspection_completed` | Inspection completed | DA |
| `payment_pending` | Awaiting fee payment | Owner |
| `verified_for_payment` | Payment verified | System |
| `approved` | Approved, certificate issued | DTDO |
| `rejected` | Application rejected | DTDO |

---

## DA (Dealing Assistant) Actions

### Get DA Dashboard Stats

Gets statistics for dealing assistant dashboard.

**Endpoint:** `GET /api/da/dashboard/stats`

**Authentication:** Required (dealing_assistant)

**Success Response:** `200 OK`

```json
{
  "pendingReview": 15,
  "underScrutiny": 8,
  "sentBack": 3,
  "resubmitted": 2,
  "forwardedToDtdo": 12,
  "inspectionScheduled": 5,
  "inspectionCompleted": 4,
  "totalProcessed": 150,
  "avgProcessingDays": 12
}
```

---

### Forward to DTDO

Forwards an application to DTDO for approval.

**Endpoint:** `POST /api/da/applications/:id/forward`

**Authentication:** Required (dealing_assistant)

**Request Body:**

```json
{
  "remarks": "Application complete. All documents verified. Recommended for approval.",
  "recommendation": "approve | reject | needs_inspection"
}
```

**Success Response:** `200 OK`

```json
{
  "status": "forwarded_to_dtdo",
  "message": "Application forwarded to DTDO",
  "forwardedAt": "2025-12-11T14:00:00Z"
}
```

---

### Revert to Applicant

Sends application back to owner for corrections.

**Endpoint:** `POST /api/da/applications/:id/revert`

**Authentication:** Required (dealing_assistant)

**Request Body:**

```json
{
  "reason": "Document clarity issues",
  "clarificationRequested": "Please upload a clearer copy of the ownership documents. The current copy is illegible.",
  "fieldsToCorrect": ["documents.ownership_proof", "propertyAddress"]
}
```

**Success Response:** `200 OK`

```json
{
  "status": "reverted_to_applicant",
  "message": "Application sent back for corrections",
  "notificationSent": true
}
```

---

### Assign to Self

DA assigns an application to themselves.

**Endpoint:** `POST /api/da/applications/:id/assign`

**Authentication:** Required (dealing_assistant)

**Success Response:** `200 OK`

```json
{
  "assignedTo": "DA Name",
  "assignedAt": "2025-12-11T10:00:00Z"
}
```

---

## DTDO Actions

### Get DTDO Dashboard Stats

Gets statistics for DTDO dashboard.

**Endpoint:** `GET /api/dtdo/dashboard/stats`

**Authentication:** Required (district_tourism_officer, district_officer)

**Success Response:** `200 OK`

```json
{
  "pendingDecision": 12,
  "inspectionPending": 5,
  "inspectionScheduled": 3,
  "inspectionCompleted": 4,
  "paymentPending": 6,
  "approved": 120,
  "rejected": 8,
  "totalThisMonth": 25
}
```

---

### Approve Application

DTDO approves an application.

**Endpoint:** `POST /api/dtdo/applications/:id/approve`

**Authentication:** Required (district_tourism_officer, district_officer)

**Request Body:**

```json
{
  "remarks": "All requirements met. Application approved.",
  "skipPayment": false,
  "validityYears": 2
}
```

**Success Response:** `200 OK`

```json
{
  "status": "payment_pending",
  "message": "Application approved. Awaiting payment.",
  "approvedAt": "2025-12-11T15:00:00Z",
  "feeAmount": 5500
}
```

For existing RC onboarding (no payment required):

```json
{
  "status": "approved",
  "certificateNumber": "HPHS/SML/2025/00001",
  "message": "Application approved. Certificate issued.",
  "approvedAt": "2025-12-11T15:00:00Z"
}
```

---

### Reject Application

DTDO rejects an application.

**Endpoint:** `POST /api/dtdo/applications/:id/reject`

**Authentication:** Required (district_tourism_officer, district_officer)

**Request Body:**

```json
{
  "reason": "Property does not meet safety requirements",
  "remarks": "Detailed reason for rejection...",
  "canReapply": true,
  "reapplyAfterDays": 90
}
```

**Success Response:** `200 OK`

```json
{
  "status": "rejected",
  "message": "Application rejected",
  "rejectedAt": "2025-12-11T15:00:00Z",
  "canReapply": true,
  "reapplyDate": "2026-03-11"
}
```

---

### Revert to DA

DTDO sends application back to DA for additional work.

**Endpoint:** `POST /api/dtdo/applications/:id/revert-to-da`

**Authentication:** Required (district_tourism_officer, district_officer)

**Request Body:**

```json
{
  "remarks": "Need updated inspection report",
  "action": "conduct_inspection | verify_documents | get_clarification"
}
```

---

### Revert to Applicant (DTDO)

DTDO sends application directly back to owner.

**Endpoint:** `POST /api/dtdo/applications/:id/revert`

**Authentication:** Required (district_tourism_officer, district_officer)

**Request Body:**

```json
{
  "remarks": "Additional documents required",
  "clarificationRequested": "Please provide commercial electricity bill"
}
```

---

## Send Back for Corrections

### Request Corrections (OTP Verification)

For critical corrections, OTP verification may be required.

**Endpoint:** `POST /api/sendback/request-otp`

**Authentication:** Required (dealing_assistant, district_tourism_officer)

**Request Body:**

```json
{
  "applicationId": "uuid",
  "action": "revert | reject"
}
```

**Success Response:** `200 OK`

```json
{
  "otpSent": true,
  "expiresIn": 300,
  "message": "OTP sent to your registered mobile"
}
```

---

### Verify OTP and Execute Action

**Endpoint:** `POST /api/sendback/verify-otp`

**Authentication:** Required (dealing_assistant, district_tourism_officer)

**Request Body:**

```json
{
  "applicationId": "uuid",
  "otp": "123456",
  "action": "revert",
  "remarks": "Reason for action"
}
```

---

## Timeline & Audit

### Get Application Timeline

Gets complete action history for an application.

**Endpoint:** `GET /api/applications/:id/timeline`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "timeline": [
    {
      "id": "uuid",
      "action": "submitted",
      "timestamp": "2025-12-10T10:00:00Z",
      "actor": {
        "name": "Rajesh Kumar",
        "role": "property_owner"
      },
      "remarks": null,
      "previousStatus": "draft",
      "newStatus": "submitted"
    },
    {
      "id": "uuid",
      "action": "assigned",
      "timestamp": "2025-12-10T10:30:00Z",
      "actor": {
        "name": "DA Name",
        "role": "dealing_assistant"
      },
      "remarks": null
    },
    {
      "id": "uuid",
      "action": "forwarded_to_dtdo",
      "timestamp": "2025-12-10T14:00:00Z",
      "actor": {
        "name": "DA Name",
        "role": "dealing_assistant"
      },
      "remarks": "Documents verified. Recommended for approval.",
      "previousStatus": "under_scrutiny",
      "newStatus": "forwarded_to_dtdo"
    }
  ]
}
```

---

### Get Audit Logs

Gets detailed audit logs for an application.

**Endpoint:** `GET /api/applications/:id/audit`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "auditLogs": [
    {
      "id": "uuid",
      "entityType": "application",
      "entityId": "uuid",
      "action": "status_change",
      "previousValue": {"status": "draft"},
      "newValue": {"status": "submitted"},
      "performedBy": "uuid",
      "performedByName": "Rajesh Kumar",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2025-12-10T10:00:00Z"
    }
  ]
}
```

---

### Get Review History

Gets correction/review history.

**Endpoint:** `GET /api/applications/:id/reviews`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "reviews": [
    {
      "id": "uuid",
      "type": "correction_request",
      "requestedBy": "DA Name",
      "requestedAt": "2025-12-10T12:00:00Z",
      "reason": "Document clarity issues",
      "fieldsAffected": ["documents.ownership_proof"],
      "response": {
        "submittedAt": "2025-12-10T16:00:00Z",
        "changes": ["Uploaded new ownership document"]
      }
    }
  ],
  "totalCorrections": 1,
  "currentCorrectionPending": false
}
```

---

## Workflow Configuration

### Get Workflow Settings

**Endpoint:** `GET /api/public/settings/payment-workflow`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "paymentRequired": true,
  "inspectionRequired": true,
  "dtdoApprovalRequired": true,
  "autoApproveExistingRc": false,
  "maxCorrectionAttempts": 3,
  "slaWorkingDays": 30
}
```

---

## Notifications

Status changes trigger automatic notifications:

| Status Change | Notification To | Channel |
|---------------|-----------------|---------|
| Submitted | Owner, DA | SMS, Email, In-App |
| Sent Back | Owner | SMS, Email, In-App |
| Forwarded to DTDO | DTDO, Owner | SMS, Email, In-App |
| Inspection Scheduled | Owner | SMS, Email, In-App |
| Payment Pending | Owner | SMS, Email, In-App |
| Approved | Owner | SMS, Email, In-App |
| Rejected | Owner | SMS, Email, In-App |

---

*Document Version: 1.0*  
*Last Updated: December 2025*
