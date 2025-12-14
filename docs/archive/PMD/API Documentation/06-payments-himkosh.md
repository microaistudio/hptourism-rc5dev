# Payments API - HimKosh Integration

This document covers all payment-related endpoints, HimKosh gateway integration, and transaction management.

---

## Table of Contents

1. [Payment Overview](#payment-overview)
2. [Initiate Payment](#initiate-payment)
3. [Payment Callback](#payment-callback)
4. [Check Payment Status](#check-payment-status)
5. [Payment History](#payment-history)
6. [Fee Calculation](#fee-calculation)
7. [HimKosh Configuration](#himkosh-configuration)

---

## Payment Overview

The HP Tourism eServices platform integrates with **HimKosh** - the Himachal Pradesh Government's payment gateway for collecting registration fees.

### Payment Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Application     │────▶│ Payment Pending │────▶│ Initiate Payment│
│ Approved        │     │                 │     │ (API Call)      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Payment         │◀────│ HimKosh Gateway │
                        │ Confirmation    │     │ (Redirect)      │
                        └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Certificate     │
                        │ Generated       │
                        └─────────────────┘
```

---

## Initiate Payment

### Start HimKosh Payment

Initiates a payment transaction with HimKosh gateway.

**Endpoint:** `POST /api/applications/:id/payment/initiate`

**Authentication:** Required (property_owner)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Application ID |

**Prerequisites:**
- Application status must be `payment_pending`
- Fee amount must be calculated

**Success Response:** `200 OK`

```json
{
  "transactionId": "HP2025121100001",
  "applicationId": "uuid",
  "amount": 5500,
  "currency": "INR",
  "merchantCode": "HIMKOSH230",
  "redirectUrl": "https://himkosh.hp.nic.in/epay/...",
  "expiresAt": "2025-12-11T11:00:00Z",
  "paymentDetails": {
    "registrationFee": 5000,
    "processingFee": 500,
    "totalAmount": 5500
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Payment not required` | Application not at payment stage |
| 400 | `Payment already completed` | Already paid |
| 500 | `Gateway error` | HimKosh connection failed |

---

### Get Payment Form Data

Gets encrypted form data for HimKosh submission.

**Endpoint:** `GET /api/applications/:id/payment-himkosh`

**Authentication:** Required (property_owner)

**Success Response:** `200 OK`

```json
{
  "formAction": "https://himkosh.hp.nic.in/eGras/process-epay.do",
  "formData": {
    "deptID": "230",
    "merchantCode": "HIMKOSH230",
    "serviceCode": "TSM",
    "ddoCode": "CTO00-068",
    "headOfAccount": "1452-00-800-01",
    "encryptedData": "encrypted_payload_string",
    "checksum": "checksum_string"
  },
  "amount": 5500,
  "transactionId": "HP2025121100001"
}
```

---

## Payment Callback

### HimKosh Callback

Receives payment confirmation from HimKosh gateway.

**Endpoint:** `POST /api/himkosh/callback`

**Authentication:** None (Webhook from HimKosh)

**Validation:** Request signature verification

**Request Body (from HimKosh):**

```json
{
  "encData": "encrypted_response_data",
  "checksum": "response_checksum"
}
```

**Decrypted Payload Contains:**

```json
{
  "transactionId": "HP2025121100001",
  "grn": "GRN123456789",
  "amount": "5500.00",
  "status": "S",
  "bankRefNum": "BANK123456",
  "txnDate": "2025-12-11",
  "txnTime": "10:30:45"
}
```

**Status Codes from HimKosh:**

| Code | Meaning |
|------|---------|
| `S` | Success |
| `F` | Failed |
| `P` | Pending |
| `C` | Cancelled |

**Success Response:** `200 OK`

Redirects to:
- On Success: `/dashboard?payment=success&application=<id>`
- On Failure: `/dashboard?payment=failed&application=<id>`

---

### Verify Payment Status

Manually verify payment status with HimKosh.

**Endpoint:** `GET /api/applications/:id/payment/verify`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "verified": true,
  "status": "completed",
  "grn": "GRN123456789",
  "amount": 5500,
  "paidAt": "2025-12-11T10:30:45Z",
  "bankReference": "BANK123456"
}
```

---

## Check Payment Status

### Get Payment Status

Gets current payment status for an application.

**Endpoint:** `GET /api/applications/:id/payment/status`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "applicationId": "uuid",
  "paymentRequired": true,
  "paymentStatus": "pending | completed | failed | refunded",
  "amount": 5500,
  "transactions": [
    {
      "id": "uuid",
      "transactionId": "HP2025121100001",
      "amount": 5500,
      "status": "pending",
      "initiatedAt": "2025-12-11T10:00:00Z",
      "completedAt": null
    }
  ]
}
```

---

## Payment History

### Get Transaction History

Gets all payment transactions for an application.

**Endpoint:** `GET /api/applications/:id/transactions`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "transactions": [
    {
      "id": "uuid",
      "transactionId": "HP2025121100001",
      "type": "registration_fee",
      "amount": 5500,
      "status": "completed",
      "gatewayResponse": {
        "grn": "GRN123456789",
        "bankRef": "BANK123456"
      },
      "initiatedAt": "2025-12-11T10:00:00Z",
      "completedAt": "2025-12-11T10:30:45Z"
    }
  ]
}
```

---

### Get User Payment History

Gets all payments made by the current user.

**Endpoint:** `GET /api/payments/history`

**Authentication:** Required (property_owner)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `fromDate` | string | From date |
| `toDate` | string | To date |

**Success Response:** `200 OK`

```json
{
  "payments": [
    {
      "applicationNumber": "HP/SML/2025/00001",
      "propertyName": "Mountain View Homestay",
      "amount": 5500,
      "status": "completed",
      "grn": "GRN123456789",
      "paidAt": "2025-12-11T10:30:45Z"
    }
  ],
  "totalAmount": 5500,
  "totalTransactions": 1
}
```

---

## Fee Calculation

### Calculate Registration Fee

Calculates the fee based on category and rooms.

**Endpoint:** `POST /api/fees/calculate`

**Authentication:** Required

**Request Body:**

```json
{
  "category": "silver | gold | diamond",
  "totalRooms": 5,
  "totalBeds": 10
}
```

**Success Response:** `200 OK`

```json
{
  "breakdown": {
    "baseRegistrationFee": 5000,
    "roomFee": 0,
    "processingFee": 500,
    "gstAmount": 0
  },
  "totalAmount": 5500,
  "category": "silver",
  "feeStructure": {
    "silver": {
      "baseFee": 5000,
      "perRoomFee": 0,
      "maxRooms": 4
    },
    "gold": {
      "baseFee": 7500,
      "perRoomFee": 500,
      "maxRooms": 8
    },
    "diamond": {
      "baseFee": 10000,
      "perRoomFee": 1000,
      "maxRooms": null
    }
  }
}
```

---

### Get Fee Structure

Gets the current fee structure configuration.

**Endpoint:** `GET /api/settings/fee-structure`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "feeStructure": {
    "silver": {
      "baseFee": 5000,
      "perRoomFee": 0,
      "roomRange": "1-4"
    },
    "gold": {
      "baseFee": 7500,
      "perRoomFee": 500,
      "roomRange": "5-8"
    },
    "diamond": {
      "baseFee": 10000,
      "perRoomFee": 1000,
      "roomRange": "9+"
    }
  },
  "processingFee": 500,
  "gstPercentage": 0
}
```

---

## HimKosh Configuration

### Admin: Get HimKosh Settings

Gets current HimKosh gateway configuration.

**Endpoint:** `GET /api/admin/payments/himkosh`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "enabled": true,
  "testMode": false,
  "merchantCode": "HIMKOSH230",
  "departmentId": "230",
  "serviceCode": "TSM",
  "ddoCode": "CTO00-068",
  "headOfAccount": "1452-00-800-01",
  "returnUrl": "https://live5.osipl.dev/api/himkosh/callback",
  "lastUpdated": "2025-12-01T10:00:00Z"
}
```

---

### Admin: Update HimKosh Settings

Updates HimKosh gateway configuration.

**Endpoint:** `PUT /api/admin/payments/himkosh`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "enabled": true,
  "testMode": false,
  "merchantCode": "HIMKOSH230",
  "departmentId": "230",
  "serviceCode": "TSM",
  "ddoCode": "CTO00-068",
  "headOfAccount": "1452-00-800-01"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "HimKosh settings updated successfully"
}
```

---

### Admin: Test HimKosh Connection

Tests connectivity with HimKosh gateway.

**Endpoint:** `POST /api/admin/payments/himkosh/test`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "status": "connected",
  "responseTime": 245,
  "message": "HimKosh gateway is reachable"
}
```

---

## Integration Notes

### For Finance Systems

1. **GRN (Government Receipt Number):** Store the GRN for reconciliation with treasury records.

2. **Transaction IDs:** Our system generates unique transaction IDs in format: `HP{YYYYMMDD}{SEQUENCE}`

3. **Reconciliation API:** For bulk reconciliation, use the admin transactions export endpoint.

4. **Refunds:** Refunds are processed manually through the treasury system. Update status via admin API.

### Error Handling

Payment failures should be handled gracefully:
- Allow retry for failed transactions
- Provide clear error messages to users
- Log all gateway interactions for audit

### Test Mode

In test mode (`testMode: true`):
- No actual payments are processed
- Use test credentials provided by HimKosh
- Simulated success/failure responses

---

*Document Version: 1.0*  
*Last Updated: December 2025*
