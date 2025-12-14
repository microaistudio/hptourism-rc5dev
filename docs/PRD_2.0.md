# Product Requirements Document (PRD) v2.0
## HP Tourism Digital Ecosystem - Multi-Role Workflow System

**Document Version:** 2.0  
**Date:** October 31, 2025  
**Status:** Planning Phase  
**Author:** HP Tourism Development Team  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Objectives](#goals--objectives)
4. [User Roles & Personas](#user-roles--personas)
5. [Application Status Workflow](#application-status-workflow)
6. [Data Architecture](#data-architecture)
7. [Feature Requirements by Role](#feature-requirements-by-role)
8. [User Interface Specifications](#user-interface-specifications)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Success Metrics](#success-metrics)

---

## 1. Executive Summary

The HP Tourism Digital Ecosystem currently supports property owner registration with a complete 6-page ANNEXURE-I compliant form and draft save functionality. **Version 2.0** expands the system to support the complete homestay approval workflow involving multiple government roles (Dealing Assistant, District Tourism Development Officer, State Officer) as per the official Homestay Module Process Flow.

### Key Enhancements
- **Multi-role workflow management** spanning 16 distinct application statuses
- **Inspection scheduling & reporting system** with document management
- **Timeline audit trail** for complete application journey tracking
- **Role-specific dashboards** with actionable queues and SLA monitoring
- **Automated certificate generation** upon successful payment completion

---

## 2. Problem Statement

### Current State
Property owners can register and submit homestay applications, but the system lacks:
- Government officer roles to process applications
- Application scrutiny and verification workflows
- Inspection scheduling and report management
- Payment verification and certificate issuance
- Audit trail and timeline tracking

### Desired State
A complete end-to-end system where:
- Applications flow automatically through defined approval stages
- Each role has clear responsibilities and actionable dashboards
- Inspections are scheduled, conducted, and documented digitally
- Certificates are auto-generated upon payment verification
- Complete audit trail maintains transparency and accountability

---

## 3. Goals & Objectives

### Primary Goals
1. **Reduce processing time** from 30+ days to under 15 days through digitization
2. **Eliminate manual handoffs** with automated routing and notifications
3. **Improve transparency** with real-time status tracking for applicants
4. **Ensure compliance** with HP Homestay Rules 2025 throughout the workflow

### Secondary Goals
1. Enable data-driven decision making with analytics dashboards
2. Reduce paper-based documentation and physical file movement
3. Create audit-ready digital records for all applications
4. Support mobile-friendly inspection report uploads

---

## 4. User Roles & Personas

### 4.1 Property Owner (Applicant)
**System Role:** `property_owner` ✓ (Already Implemented)

**Persona:** Ram Singh, 45, homestay owner from Manali
- Limited technical expertise
- Wants clear guidance on requirements
- Needs to track application progress easily
- May need to respond to objections/clarifications

**Capabilities:**
- Register and create account
- Complete 6-page ANNEXURE-I form
- Upload required ANNEXURE-II documents
- Save drafts and resume later
- Submit application for review
- View application status and timeline
- Respond to objections/clarification requests
- Make fee payments online
- Download registration certificate

---

### 4.2 Dealing Assistant (DA)
**System Role:** `dealing_assistant` ⚠️ **NEW ROLE**

**Persona:** Priya Sharma, 32, District Tourism Office staff
- Handles 10-15 applications daily
- First point of scrutiny for applications
- Conducts field inspections
- Tech-savvy, uses mobile for field work

**Capabilities:**
- View queue of new applications (district-specific)
- Scrutinize applications and documents
- Forward to DTDO with remarks
- Send back to applicant with corrections needed
- Schedule and conduct physical inspections
- Upload inspection reports (PDF/JPG) from mobile
- Track pending tasks and SLA deadlines
- Generate inspection schedules/routes

**Key Workflows:**
1. **Scrutiny Workflow**
   - Open application from queue
   - Review form fields for completeness
   - Verify uploaded documents (ANNEXURE-II)
   - Check for eligibility (room rates, category alignment)
   - Decision: Forward to DTDO OR Revert to Applicant

2. **Inspection Workflow**
   - Receive inspection order from DTDO
   - Visit property on scheduled date
   - Complete inspection checklist (offline/online)
   - Take photos and measurements
   - Upload comprehensive inspection report

---

### 4.3 District Tourism Development Officer (DTDO)
**System Role:** `district_tourism_officer` ⚠️ **RENAME from `district_officer`**

**Persona:** Dr. Rajesh Kumar, 48, Senior officer managing district tourism
- Final approval authority at district level
- Manages 3-4 Dealing Assistants
- Accountability for certificate issuance quality
- Reviews 20-30 applications weekly

**Capabilities:**
- View prioritized application queue (district-specific)
- Review applications forwarded by DA
- Make final decisions: Accept, Reject, or Revert
- Schedule inspections with date/time
- Review inspection reports submitted by DAs
- Raise objections on inspection findings
- Verify applications for payment
- View district-level analytics and SLA performance
- Escalate complex cases to State Officer

**Key Workflows:**
1. **Application Review Workflow**
   - Open application forwarded by DA
   - Review DA's scrutiny remarks
   - Verify eligibility and compliance
   - Decision: Accept (→ Schedule Inspection) OR Reject OR Revert to Applicant

2. **Inspection Report Review Workflow**
   - Open completed inspection report
   - Review DA's findings and photos
   - Check compliance with category standards
   - Decision: Verified for Payment OR Raise Objection OR Reject

---

### 4.4 State Officer
**System Role:** `state_officer` ✓ (Already Exists)

**Persona:** Ms. Kavita Verma, 52, State Tourism Department official
- Handles escalations and appeals
- Cross-district oversight and analytics
- Policy enforcement
- Reviews 5-10 escalated cases monthly

**Capabilities:**
- View all applications statewide
- Handle escalated/appealed applications
- Override district-level decisions (with justification)
- View comparative analytics across districts
- Monitor SLA compliance statewide
- Access complete audit trails
- Generate reports for senior management

---

### 4.5 System Administrator
**System Role:** `admin` ✓ (Already Exists)

**Persona:** Amit Thakur, 35, IT administrator
- Manages user accounts and roles
- System configuration
- Handles technical issues
- Monitors system health

**Capabilities:**
- Create/manage user accounts
- Assign roles and districts
- Configure system parameters (fees, SLAs, etc.)
- View system-wide analytics
- Access all application data for troubleshooting
- Generate audit reports
- Manage districts and DDO codes

---

## 5. Application Status Workflow

### 5.1 Status State Machine

The application progresses through **16 distinct statuses** with defined transitions:

| # | Status | Description | Owner Role | Next Possible States |
|---|--------|-------------|------------|---------------------|
| 1 | `draft` | Applicant working on form | property_owner | submitted, withdrawn |
| 2 | `submitted` | Submitted, awaiting DA | property_owner | under_scrutiny |
| 3 | `under_scrutiny` | DA reviewing | dealing_assistant | forwarded_to_dtdo, reverted_to_applicant |
| 4 | `reverted_to_applicant` | Sent back for corrections | property_owner | submitted |
| 5 | `forwarded_to_dtdo` | DA approved, sent to DTDO | dealing_assistant | dtdo_review |
| 6 | `dtdo_review` | DTDO reviewing | district_tourism_officer | inspection_scheduled, rejected, reverted_to_applicant |
| 7 | `inspection_scheduled` | Inspection date set | district_tourism_officer | inspection_in_progress |
| 8 | `inspection_in_progress` | DA conducting inspection | dealing_assistant | inspection_completed |
| 9 | `inspection_completed` | Report uploaded by DA | dealing_assistant | inspection_under_review |
| 10 | `inspection_under_review` | DTDO reviewing report | district_tourism_officer | objection_raised, verified_for_payment, rejected |
| 11 | `objection_raised` | Issues found in inspection | property_owner | inspection_scheduled (re-inspection) |
| 12 | `verified_for_payment` | Approved, awaiting payment | property_owner | payment_completed |
| 13 | `payment_completed` | Payment verified | system | certificate_issued |
| 14 | `certificate_issued` | Certificate generated | system | (terminal state) |
| 15 | `rejected` | Permanently rejected | system | (terminal state) |
| 16 | `withdrawn` | Applicant withdrew | property_owner | (terminal state) |

### 5.2 Process Flow Diagram

```
APPLICANT JOURNEY:
┌─────────────┐
│   Draft     │
└──────┬──────┘
       │ Submit
       ▼
┌─────────────┐     Revert      ┌──────────────────┐
│  Submitted  │◄────────────────│Reverted to       │
└──────┬──────┘                 │Applicant         │
       │                        └──────────────────┘
       │ DA Scrutinizes                ▲
       ▼                               │
┌─────────────┐     Revert             │
│Under        │────────────────────────┘
│Scrutiny     │
└──────┬──────┘
       │ DA Forwards
       ▼
┌─────────────┐     Revert      ┌──────────────────┐
│Forwarded to │────────────────►│Reverted to       │
│DTDO         │                 │Applicant         │
└──────┬──────┘                 └──────────────────┘
       │
       │ DTDO Reviews
       ▼
┌─────────────┐
│DTDO Review  │──────► Reject
└──────┬──────┘
       │ Accept & Schedule
       ▼
┌─────────────┐
│Inspection   │
│Scheduled    │
└──────┬──────┘
       │ DA Conducts
       ▼
┌─────────────┐
│Inspection   │
│In Progress  │
└──────┬──────┘
       │ DA Uploads Report
       ▼
┌─────────────┐
│Inspection   │
│Completed    │
└──────┬──────┘
       │ DTDO Reviews Report
       ▼
┌─────────────┐
│Inspection   │──────► Objection Raised ──► Re-Inspection
│Under Review │──────► Reject
└──────┬──────┘
       │ Approve
       ▼
┌─────────────┐
│Verified for │
│Payment      │
└──────┬──────┘
       │ Applicant Pays
       ▼
┌─────────────┐
│Payment      │
│Completed    │
└──────┬──────┘
       │ Auto-Generate
       ▼
┌─────────────┐
│Certificate  │
│Issued       │
└─────────────┘
```

### 5.3 Timeline & SLA Expectations

| Stage | Expected Duration | SLA Alert Threshold |
|-------|-------------------|---------------------|
| Submitted → Under Scrutiny | 2 business days | 3 days |
| Under Scrutiny → Forwarded to DTDO | 3 business days | 5 days |
| DTDO Review → Inspection Scheduled | 2 business days | 4 days |
| Inspection Scheduled → Completed | 7 business days | 10 days |
| Inspection Report → DTDO Review | 1 business day | 2 days |
| DTDO Review → Payment Verification | 2 business days | 3 days |
| Payment → Certificate Issued | 1 business day (auto) | 2 days |
| **Total End-to-End** | **15-20 business days** | **30 days** |

---

## 6. Data Architecture

### 6.1 New Database Tables

#### 6.1.1 Application Assignments
**Purpose:** Track which officer/role currently owns an application

```typescript
application_assignments {
  id: serial PRIMARY KEY,
  applicationId: integer NOT NULL REFERENCES homestay_applications(id),
  assignedToRole: varchar NOT NULL, // 'dealing_assistant', 'district_tourism_officer', etc.
  assignedToUserId: integer REFERENCES users(id),
  assignedAt: timestamp NOT NULL DEFAULT now(),
  priority: varchar, // 'normal', 'urgent', 'overdue'
  notes: text,
  
  INDEX (applicationId),
  INDEX (assignedToRole, assignedAt),
  INDEX (assignedToUserId)
}
```

#### 6.1.2 Application Timeline
**Purpose:** Complete audit trail of all status changes and actions

```typescript
application_timeline {
  id: serial PRIMARY KEY,
  applicationId: integer NOT NULL REFERENCES homestay_applications(id),
  statusFrom: varchar,
  statusTo: varchar NOT NULL,
  actorRole: varchar NOT NULL,
  actorUserId: integer REFERENCES users(id),
  actorName: varchar NOT NULL, // Denormalized for audit
  actionType: varchar NOT NULL, // 'status_change', 'comment', 'document_upload', 'payment'
  remarks: text,
  attachments: jsonb, // Array of document references
  isVisibleToApplicant: boolean DEFAULT true,
  createdAt: timestamp NOT NULL DEFAULT now(),
  
  INDEX (applicationId, createdAt DESC),
  INDEX (statusTo, createdAt),
  INDEX (actorUserId)
}
```

#### 6.1.3 Inspection Orders
**Purpose:** Schedule and track physical property inspections

```typescript
inspection_orders {
  id: serial PRIMARY KEY,
  applicationId: integer NOT NULL REFERENCES homestay_applications(id),
  orderedByDTDO: integer NOT NULL REFERENCES users(id),
  assignedToDA: integer REFERENCES users(id),
  scheduledDate: date NOT NULL,
  scheduledTime: varchar, // '10:00 AM - 12:00 PM'
  inspectionAddress: text NOT NULL,
  inspectionInstructions: text,
  routeNotes: jsonb, // For batch inspection routing
  status: varchar NOT NULL, // 'scheduled', 'in_progress', 'completed', 'cancelled'
  createdAt: timestamp NOT NULL DEFAULT now(),
  updatedAt: timestamp,
  
  INDEX (applicationId),
  INDEX (assignedToDA, scheduledDate),
  INDEX (status, scheduledDate)
}
```

#### 6.1.4 Inspection Reports
**Purpose:** Store inspection findings and compliance checks

```typescript
inspection_reports {
  id: serial PRIMARY KEY,
  applicationId: integer NOT NULL REFERENCES homestay_applications(id),
  inspectionOrderId: integer NOT NULL REFERENCES inspection_orders(id),
  uploadedByDA: integer NOT NULL REFERENCES users(id),
  inspectionDate: date NOT NULL,
  
  // Compliance Checklist (JSON)
  complianceChecks: jsonb NOT NULL,
  /* Example structure:
  {
    "room_size_compliant": true,
    "washroom_attached": true,
    "fire_safety_equipment": false,
    "parking_available": true,
    "accessibility_features": true,
    "hygiene_standards": true,
    "amenities_match_category": true
  }
  */
  
  // DA's observations
  daRemarks: text NOT NULL,
  daRecommendation: varchar, // 'approve', 'approve_with_conditions', 'reject'
  
  // Uploaded documents
  reportDocuments: jsonb NOT NULL, // PDFs, photos
  
  // DTDO review
  dtdoReviewStatus: varchar, // 'pending', 'approved', 'objection_raised', 'rejected'
  dtdoRemarks: text,
  reviewedAt: timestamp,
  reviewedBy: integer REFERENCES users(id),
  
  uploadedAt: timestamp NOT NULL DEFAULT now(),
  
  INDEX (applicationId),
  INDEX (inspectionOrderId),
  INDEX (uploadedByDA, uploadedAt)
}
```

#### 6.1.5 Objections & Clarifications
**Purpose:** Manage objections raised and responses from applicants

```typescript
objections {
  id: serial PRIMARY KEY,
  applicationId: integer NOT NULL REFERENCES homestay_applications(id),
  raisedByRole: varchar NOT NULL, // 'dealing_assistant', 'district_tourism_officer'
  raisedByUserId: integer NOT NULL REFERENCES users(id),
  raisedByName: varchar NOT NULL,
  objectionType: varchar NOT NULL, // 'document_issue', 'inspection_finding', 'eligibility', 'other'
  objectionText: text NOT NULL,
  requiredAction: text, // What applicant needs to do
  
  // Applicant response
  applicantResponse: text,
  applicantDocuments: jsonb, // Supporting documents from applicant
  respondedAt: timestamp,
  
  // Resolution
  resolutionStatus: varchar NOT NULL DEFAULT 'pending', // 'pending', 'resolved', 'withdrawn'
  resolvedByRole: varchar,
  resolvedByUserId: integer REFERENCES users(id),
  resolutionRemarks: text,
  resolvedAt: timestamp,
  
  createdAt: timestamp NOT NULL DEFAULT now(),
  
  INDEX (applicationId, resolutionStatus),
  INDEX (raisedByUserId),
  INDEX (createdAt DESC)
}
```

### 6.2 Schema Updates to Existing Tables

#### 6.2.1 Users Table
**Add new role and district assignment:**

```typescript
users {
  // ... existing fields ...
  role: varchar NOT NULL, // Add 'dealing_assistant', 'district_tourism_officer'
  assignedDistrict: varchar, // For DA and DTDO, NULL for others
  assignedDistrictCode: varchar, // DDO code for payments
  
  // New fields for officers
  employeeId: varchar UNIQUE,
  designation: varchar,
  department: varchar,
  officeAddress: text,
  isActive: boolean DEFAULT true,
}
```

#### 6.2.2 Homestay Applications Table
**Add workflow tracking fields:**

```typescript
homestay_applications {
  // ... existing fields ...
  
  // Current status tracking
  currentStatus: varchar NOT NULL DEFAULT 'draft',
  currentOwnerRole: varchar, // Who is currently handling it
  currentOwnerUserId: integer REFERENCES users(id),
  lastActionAt: timestamp,
  
  // Payment tracking
  paymentDueDate: date,
  paymentCompletedAt: timestamp,
  paymentReferenceNumber: varchar,
  
  // Certificate tracking
  certificateNumber: varchar UNIQUE,
  certificateIssuedAt: timestamp,
  certificateUrl: varchar, // Object storage URL
  
  // SLA tracking
  submittedAt: timestamp,
  firstReviewAt: timestamp,
  inspectionScheduledAt: timestamp,
  inspectionCompletedAt: timestamp,
  paymentVerifiedAt: timestamp,
  
  // Flags
  isSLABreached: boolean DEFAULT false,
  isEscalated: boolean DEFAULT false,
  escalatedTo: integer REFERENCES users(id),
}
```

---

## 7. Feature Requirements by Role

### 7.1 Property Owner Features

#### 7.1.1 Enhanced Dashboard
**Current:** Application list with Draft/Submitted statuses  
**New Requirements:**

**Dashboard Cards:**
1. **Pending Clarifications** (Priority 1)
   - Count: Applications in `reverted_to_applicant` or `objection_raised` status
   - Action: Click to view objections and respond
   - Visual: Red/orange alert badge

2. **Payment Pending** (Priority 2)
   - Count: Applications in `verified_for_payment` status
   - Action: Click to make payment
   - Visual: Yellow badge, shows amount due

3. **Under Review** (Priority 3)
   - Count: Applications in scrutiny/review/inspection stages
   - Action: View timeline
   - Visual: Blue badge

4. **Completed** (Priority 4)
   - Count: Applications in `certificate_issued` status
   - Action: Download certificate
   - Visual: Green badge

**Application List Table:**
- Add **Status Badge** column (color-coded)
- Add **Last Updated** column
- Add **Action Required** column (Yes/No with icon)
- Add **Quick Actions** dropdown: View Timeline, Respond to Objection, Make Payment, Download Certificate

#### 7.1.2 Application Timeline View
**User Story:** "As an applicant, I want to see the complete journey of my application so I understand what stage it's at and what's coming next."

**Requirements:**
- Vertical timeline showing all status changes
- Each entry shows: Date, Status, Actor (DA/DTDO name), Remarks
- Expandable sections for detailed remarks
- Document attachments shown inline
- Estimated next step and timeline
- Visual progress bar (overall completion %)

**UI Components:**
- Timeline component (vertical with connecting lines)
- Status badges (color-coded icons)
- Expandable accordion for remarks
- Document preview modal

#### 7.1.3 Objection Response Interface
**User Story:** "As an applicant, when my application is sent back with objections, I need a clear interface to understand what's wrong and how to fix it."

**Requirements:**
- Display objection details prominently
- Show required actions as checklist
- Allow text response per objection
- Support uploading additional documents
- Submit response button (changes status back to `submitted`)
- Save draft response

**UI Components:**
- Alert card showing objection summary
- Expandable objection details
- File uploader for supporting documents
- Text area for response
- Submit and Save Draft buttons

---

### 7.2 Dealing Assistant (DA) Features

#### 7.2.1 DA Dashboard
**User Story:** "As a DA, I need a prioritized queue of applications requiring my attention organized by urgency and type of action needed."

**Dashboard Cards:**
1. **New Submissions** (Count of `submitted` status in my district)
2. **Pending Scrutiny** (Count of `under_scrutiny` assigned to me)
3. **Inspections This Week** (Count from `inspection_orders` where assignedToDA = me)
4. **Report Upload Pending** (Count of `inspection_completed` missing report)
5. **SLA Alerts** (Count of overdue tasks)

**Priority Queue Table:**
Columns:
- Application ID (clickable)
- Property Name
- Category (Diamond/Gold/Silver badge)
- Current Status
- Days Since Submission
- SLA Status (Green/Yellow/Red indicator)
- Priority (Auto-calculated: Urgent/Normal)
- Quick Action button

Filters:
- Status dropdown
- District (if DA handles multiple)
- Date range
- Priority level

Sorting:
- Default: SLA Status + Days Since Submission (most urgent first)
- Optional: Application ID, Property Name, Category

#### 7.2.2 Application Scrutiny Interface
**User Story:** "As a DA, I need to review application form data and uploaded documents side-by-side to verify completeness and accuracy before forwarding to DTDO."

**Layout:**
- **Left Panel (60%):** Application form data in read-only view
  - All 6 pages of form data organized in collapsible sections
  - Highlight missing or incomplete fields in yellow
  - Show calculated fee summary
  
- **Right Panel (40%):** Documents viewer
  - Tabs for each ANNEXURE-II document type
  - PDF/Image viewer with zoom and download
  - Checklist: "Revenue Papers ✓", "Affidavit ✓", etc.
  - Flag missing documents

**Scrutiny Checklist:**
- [ ] Property details complete and accurate
- [ ] Owner Aadhaar verified
- [ ] Category matches room rate (auto-check)
- [ ] All mandatory documents uploaded
- [ ] Documents are readable and valid
- [ ] GSTIN provided (if Diamond/Gold)
- [ ] Total beds ≤ 12
- [ ] District and location type correct

**Action Panel (Bottom):**
Three action buttons:
1. **Forward to DTDO** (Green button)
   - Requires: All checklist items marked
   - Opens modal to add DA remarks (optional)
   - Changes status to `forwarded_to_dtdo`
   - Auto-assigns to DTDO of the district
   
2. **Send Back to Applicant** (Orange button)
   - Opens modal to add objections/remarks (required)
   - Select objection type from dropdown
   - Detail what needs to be corrected
   - Changes status to `reverted_to_applicant`
   - Sends notification to applicant

3. **Save Progress** (Gray button)
   - Keeps status as `under_scrutiny`
   - Saves any notes/checklist progress

#### 7.2.3 Inspection Report Upload Interface
**User Story:** "As a DA, after conducting a physical inspection, I need to upload my findings, photos, and compliance checklist from my mobile or desktop."

**Form Fields:**
1. **Inspection Date** (date picker)
2. **Inspection Start Time** and **End Time**
3. **Compliance Checklist** (toggles)
   - Room size matches declared (Yes/No)
   - Washrooms attached (Count: ___)
   - Fire safety equipment present (Yes/No)
   - Parking space available (Yes/No)
   - Accessibility features (Yes/No/NA)
   - Hygiene standards met (Yes/No)
   - Amenities match category (Yes/No)
   - Building safety (Yes/No)

4. **DA Observations** (Rich text area)
   - What was observed during inspection
   - Any discrepancies from application
   - Positive aspects
   - Areas of concern

5. **DA Recommendation** (Radio buttons)
   - ○ Approve
   - ○ Approve with Conditions
   - ○ Reject

6. **Upload Documents**
   - Inspection Report PDF (optional but recommended)
   - Property Photos (minimum 5)
   - Measurement Sketches (if applicable)
   - Other Supporting Documents
   
   **File Requirements:**
   - Formats: PDF, JPG, JPEG, PNG
   - Max size: 10MB per file
   - Total limit: 50MB per application

7. **Submit Button**
   - Validates all required fields
   - Changes status to `inspection_completed`
   - Notifies DTDO
   - Auto-assigns application to DTDO for review

**Mobile Optimization:**
- Camera integration for direct photo capture
- Offline mode: Save locally and upload when online
- GPS coordinates auto-captured with photos
- Voice-to-text for observations

---

### 7.3 DTDO Features

#### 7.3.1 DTDO Dashboard
**User Story:** "As a DTDO, I need a comprehensive view of all applications in my district organized by what needs my immediate attention."

**Dashboard Cards:**
1. **Pending Review** (Count of `forwarded_to_dtdo` + `dtdo_review`)
2. **Inspection Reports Awaiting Review** (Count of `inspection_completed`)
3. **Verified for Payment** (Count of `verified_for_payment` awaiting payment)
4. **SLA Breaches** (Count of applications exceeding SLA thresholds)
5. **Certificates Issued This Month** (Count of `certificate_issued` in current month)

**Metrics Row:**
- Average Processing Time (days)
- Approval Rate (%)
- Rejection Rate (%)
- Applications This Month (count)

**Priority Queue Table:**
Columns:
- Application ID
- Property Name & Location
- Category badge
- Current Status
- Assigned DA name
- Days in Current Status
- SLA Indicator
- Quick Action

Tabs:
- **Pending My Review** (forwarded_to_dtdo)
- **Awaiting Inspection** (inspection_scheduled, inspection_in_progress)
- **Inspection Reports** (inspection_completed)
- **Payment Pending** (verified_for_payment)
- **All Applications**

#### 7.3.2 Application Review Interface
**User Story:** "As a DTDO, when reviewing an application forwarded by the DA, I need to see all details, DA's remarks, and make a final decision on whether to approve for inspection or reject."

**Layout:**
- **Top Panel:** Application summary card
  - Property Name, Category, Location
  - Applicant Name, Mobile, Email
  - Submission Date, Days Pending
  - DA who forwarded (name + photo)

- **Main Content (Tabs):**
  1. **Application Form** - All 6 pages in read-only
  2. **Documents** - ANNEXURE-II documents viewer
  3. **DA Scrutiny Report** - DA's remarks and checklist
  4. **Timeline** - Complete application journey
  5. **Objection History** (if any previous objections)

**Decision Panel (Bottom - Fixed):**
Four action buttons:

1. **Accept & Schedule Inspection** (Green)
   - Opens inspection scheduling modal
   - Select DA from dropdown (in my district)
   - Pick inspection date (calendar)
   - Pick time slot (dropdown)
   - Add inspection instructions (optional text)
   - Submit → Changes status to `inspection_scheduled`
   - Creates entry in `inspection_orders` table
   - Sends notification to selected DA

2. **Reject Application** (Red)
   - Opens rejection modal
   - Select rejection reason from dropdown:
     - Ineligible location
     - Room rate doesn't match category
     - Incomplete documents
     - Structural issues
     - Other (specify)
   - Add detailed rejection remarks (required, min 50 chars)
   - Confirm rejection (requires re-typing application ID)
   - Submit → Changes status to `rejected`
   - Sends notification to applicant with reason

3. **Send Back to Applicant** (Orange)
   - Opens objection modal
   - Select objection type
   - Detail required corrections
   - Submit → Changes status to `reverted_to_applicant`
   - Creates entry in `objections` table

4. **Need More Info from DA** (Gray)
   - Opens modal to add questions for DA
   - Keeps status as `dtdo_review`
   - Sends notification to DA
   - DA can add clarification comments

#### 7.3.3 Inspection Scheduling Modal
**Components:**
- **DA Selection**
  - Dropdown showing all DAs in district
  - Shows DA workload (inspections this week)
  - Sort by availability

- **Date Picker**
  - Calendar view
  - Highlight holidays/weekends
  - Show existing inspections (to avoid conflicts)
  - Min: Tomorrow, Max: 30 days from now

- **Time Slot**
  - Dropdown: Morning (9-12), Afternoon (12-3), Evening (3-6)

- **Route Planning** (Optional enhancement)
  - If multiple inspections same day/area
  - Map view showing inspection locations
  - Suggested route order

- **Instructions**
  - Text area for specific things DA should check
  - Templates available: Diamond checklist, Gold checklist, Silver checklist

- **Notification Preview**
  - Shows email/SMS that will be sent to applicant
  - Shows email that will be sent to DA

**Submit Actions:**
- Create `inspection_orders` entry
- Change application status to `inspection_scheduled`
- Send notifications
- Add timeline entry
- Show success message with inspection ID

#### 7.3.4 Inspection Report Review Interface
**User Story:** "As a DTDO, after the DA submits an inspection report, I need to review the findings, photos, and compliance checklist to make a final decision."

**Layout:**
- **Top: Application Summary** (same as review interface)

- **Main Content - 3 Column Layout:**
  
  **Left Column (30%):** Declared in Application
  - Property area: 1500 sq ft
  - Rooms: 2 Double, 1 Suite
  - Category: Gold
  - Amenities: AC, WiFi, Parking
  
  **Center Column (40%):** Inspection Findings
  - Actual property area: 1450 sq ft ✓
  - Actual rooms: 2 Double, 1 Suite ✓
  - Category compliance: Yes ✓
  - Amenities verified: All present ✓
  - Additional findings: New mountain view deck added
  
  **Right Column (30%):** Compliance Status
  - Room size: ✓ Pass
  - Washrooms: ✓ Pass (3 attached)
  - Fire safety: ✗ Fail (extinguisher expired)
  - Parking: ✓ Pass (3 car spaces)
  - Hygiene: ✓ Pass
  - Overall: ⚠️ Pass with conditions

- **DA's Detailed Report:**
  - Observations (rich text)
  - Recommendation (badge)
  - Uploaded documents (photo gallery + PDFs)

- **Photo Gallery:**
  - Grid view of all inspection photos
  - Click to enlarge
  - Photos categorized: Rooms, Washrooms, Common Areas, Exterior, Other

**Decision Panel:**
Three action buttons:

1. **Verify for Payment** (Green)
   - All compliance checks passed (or minor issues acceptable)
   - Opens modal:
     - Confirm category (can downgrade if needed)
     - Confirm fee amount
     - Add DTDO remarks
     - Check: "I certify this property meets HP Homestay standards"
   - Submit → Changes status to `verified_for_payment`
   - Calculates payment amount based on category + location
   - Sends payment request notification to applicant

2. **Raise Objection** (Orange)
   - Inspection reveals issues needing correction
   - Opens objection modal:
     - List non-compliant items (multi-select from checklist)
     - Detail what needs to be corrected
     - Set deadline for corrections (date picker)
     - Option: Re-inspection required (checkbox)
   - Submit → Changes status to `objection_raised`
   - Creates `objections` entry
   - If re-inspection: Can schedule new inspection after objection resolved

3. **Reject** (Red)
   - Major compliance failures
   - Same rejection flow as application review
   - Changes status to `rejected`

**Enhancement: Comparison View**
- Side-by-side comparison of application photos vs inspection photos
- Highlight discrepancies automatically (using image diff)

---

### 7.4 State Officer Features

#### 7.4.1 State Officer Dashboard
**User Story:** "As a State Officer, I need a statewide view of the homestay approval system to identify bottlenecks, monitor district performance, and handle escalated cases."

**Analytics Cards (Top Row):**
1. **Statewide Applications This Month**
   - Total count with trend arrow (vs last month)
   - Breakdown: Submitted, Under Review, Approved, Rejected

2. **Average Processing Time**
   - Across all districts (in days)
   - Target: 15 days
   - Current: 18 days (🔴 3 days over)

3. **Approval Rate**
   - % of submitted applications that get approved
   - Target: >75%
   - Current: 68%

4. **Escalated Cases**
   - Count requiring state officer attention
   - Pending my action

**District Performance Table:**
Columns:
- District Name
- Total Applications (this month)
- Pending (count)
- Average Processing Time (days)
- Approval Rate (%)
- SLA Compliance (%)
- DTDO Name
- Performance Indicator (🟢🟡🔴)

Sorting: Default by SLA Compliance (worst first)

**Visualizations:**
1. **Applications by District** (Bar chart)
   - X-axis: Districts
   - Y-axis: Count
   - Color: Status (Pending/Approved/Rejected)

2. **Processing Time Trend** (Line chart)
   - X-axis: Weeks
   - Y-axis: Average days
   - Multiple lines for top 5 districts
   - Threshold line at 15 days

3. **Category Distribution** (Pie chart)
   - Diamond, Gold, Silver
   - Shows statewide distribution

**Escalated Applications Queue:**
- Applications flagged for state officer review
- Filter by: District, Escalation Reason, Date Range
- Actions: Review, Override Decision, Send Back to DTDO

#### 7.4.2 Analytics & Reports
**Monthly Report Generation:**
- Select month/date range
- Select districts (all or specific)
- Report includes:
  - Total applications received
  - Approved/Rejected breakdown
  - Average processing time
  - SLA compliance %
  - Revenue generated (fees collected)
  - District-wise performance
- Export as PDF or Excel

**Custom Analytics:**
- Filter applications by multiple criteria
- Generate charts on demand
- Export data for external analysis

---

### 7.5 Admin Features

#### 7.5.1 User Management
**Capabilities:**
1. **Create User Accounts**
   - Role selection (DA, DTDO, State Officer, Property Owner)
   - Assign district (for DA/DTDO)
   - Set employee ID and designation
   - Initial password (reset on first login)

2. **Manage Existing Users**
   - Search by name, email, role, district
   - Edit user details
   - Deactivate/reactivate accounts
   - Reset passwords
   - View user activity logs

3. **Role Assignment**
   - Change user roles (with audit trail)
   - Transfer applications when changing DA/DTDO

4. **District Management**
   - Create/edit district records
   - Assign DDO codes for payments
   - Set district-specific fees (if applicable)

#### 7.5.2 System Configuration
1. **Fee Structure Management**
   - Edit fees for Diamond/Gold/Silver categories
   - Edit fees by location type (MC/TCP/GP)
   - Set GST rate
   - Effective date for fee changes

2. **SLA Configuration**
   - Set threshold days for each stage
   - Configure alert triggers
   - Define escalation rules

3. **Document Templates**
   - Upload certificate template
   - Upload inspection report template
   - Email notification templates

4. **System Parameters**
   - File upload limits
   - Supported file formats
   - Session timeout
   - Notification preferences

#### 7.5.3 Audit & Monitoring
1. **Application Audit Logs**
   - View complete timeline for any application
   - Filter by application ID, date, actor
   - Export audit trail as PDF

2. **User Activity Logs**
   - Track login/logout
   - Track actions performed
   - Flag suspicious activity

3. **System Health Dashboard**
   - Database size and performance
   - File storage usage
   - API response times
   - Error logs

---

## 8. User Interface Specifications

### 8.1 Dashboard Design Patterns

**Consistent Elements Across All Dashboards:**
1. **Top Navigation Bar**
   - HP Tourism Logo (left)
   - Page Title (center)
   - User Profile Dropdown (right)
     - Name and Role
     - Settings
     - Logout

2. **Sidebar Navigation** (Role-specific menu items)
   - Dashboard (home icon)
   - Applications / Queue (list icon)
   - Analytics / Reports (chart icon)
   - Settings (gear icon)

3. **Dashboard Content Area**
   - **Metrics Cards Row** (4-5 cards, equal width)
     - Icon (left)
     - Metric Name
     - Large Number (count)
     - Trend Indicator (optional: +5% vs last month)
     - Click action (filter main table)
   
   - **Main Content Table**
     - Search bar (top right)
     - Filters dropdown (top left)
     - Table with sortable columns
     - Pagination (bottom)
     - Rows per page selector

4. **Color Coding for Status Badges**
   - Draft: Gray (#6B7280)
   - Submitted/Under Review: Blue (#3B82F6)
   - Reverted/Objection: Orange (#F59E0B)
   - Approved/Verified: Green (#10B981)
   - Rejected: Red (#EF4444)
   - Payment: Yellow (#EAB308)
   - Certificate Issued: Emerald (#059669)

### 8.2 Form & Modal Patterns

**Decision Modal Standard Structure:**
```
┌────────────────────────────────────────────────┐
│ [Icon] Modal Title                        [X]  │
├────────────────────────────────────────────────┤
│                                                │
│  Explanation text (why this action needed)     │
│                                                │
│  Form Fields:                                  │
│  ┌──────────────────────────────────────────┐ │
│  │ Select Reason            [Dropdown ▼]    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Detailed Remarks                          │ │
│  │                                           │ │
│  │ (Text area)                               │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  [ ] Checkbox: I confirm this action          │
│                                                │
│  [Cancel]              [Submit Action Button] │
│  (Gray)                        (Color-coded)   │
└────────────────────────────────────────────────┘
```

**File Upload Component:**
- Drag-and-drop zone
- Click to browse
- Show upload progress (%)
- Preview thumbnails for images
- File name, size, delete button
- Validation messages (file type, size)

### 8.3 Responsive Design Requirements

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
1. **Dashboard Cards:** Stack vertically (full width)
2. **Tables:** 
   - Horizontal scroll for columns
   - OR card view (each row becomes a card)
3. **Sidebar:** Collapse to hamburger menu
4. **Forms:** Full width inputs, stacked fields
5. **Modals:** Full screen on mobile

**Touch Optimizations:**
- Minimum touch target: 44px × 44px
- Adequate spacing between buttons
- Swipe gestures for table rows (reveal actions)

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Set up database schema and role infrastructure

**Tasks:**
1. ✅ Create 5 new database tables (assignments, timeline, inspections, reports, objections)
2. ✅ Update `users` table schema (add DA and DTDO roles, district assignment)
3. ✅ Update `homestay_applications` table (add status tracking fields)
4. ✅ Create database migration scripts
5. ✅ Run migrations and test with seed data
6. ✅ Update TypeScript types in `shared/schema.ts`
7. ✅ Create role-based route guards

**Deliverables:**
- Database schema updated and deployed
- Role enums and types defined
- Seed script for test users (1 Admin, 2 DTDOs, 4 DAs, 5 Property Owners)

**Success Criteria:**
- Database passes migration without errors
- Can create users with new roles
- Application status field accepts all 16 statuses

---

### Phase 2: Dealing Assistant Workflow (Weeks 3-4)
**Goal:** Build complete DA workflow from scrutiny to inspection report upload

**Tasks:**
1. ✅ Create DA dashboard page
   - Design metrics cards
   - Build priority queue table
   - Implement filters and search
2. ✅ Build application scrutiny interface
   - Form data viewer (read-only)
   - Documents viewer with tabs
   - Scrutiny checklist
   - Forward to DTDO action
   - Send back to applicant action
3. ✅ Implement inspection report upload
   - Multi-step form (details, checklist, photos)
   - File upload handling (object storage)
   - Mobile-responsive design
4. ✅ Create API endpoints
   - GET /api/da/queue (applications for my district)
   - POST /api/da/forward-to-dtdo
   - POST /api/da/revert-to-applicant
   - POST /api/da/inspection-report
5. ✅ Implement timeline tracking
   - Create timeline entry on status change
   - Store actor details and remarks
6. ✅ Add notification system
   - Notify DTDO when application forwarded
   - Notify applicant when reverted

**Deliverables:**
- Fully functional DA dashboard
- Scrutiny workflow operational
- Inspection report upload working
- Timeline entries created automatically

**Success Criteria:**
- DA can see queue of applications in their district
- DA can scrutinize and forward to DTDO
- DA can upload inspection reports with photos
- Timeline shows all actions

---

### Phase 3: DTDO Workflow (Weeks 5-6)
**Goal:** Build DTDO review, inspection scheduling, and approval workflow

**Tasks:**
1. ✅ Create DTDO dashboard
   - Enhanced metrics cards
   - Multi-tab queue (Pending Review, Inspection Reports, etc.)
   - SLA breach indicators
2. ✅ Build application review interface
   - Comprehensive application viewer
   - DA remarks display
   - Accept & Schedule Inspection action
   - Reject application action
   - Send back to applicant action
3. ✅ Create inspection scheduling modal
   - DA selection dropdown
   - Date/time picker
   - Instructions field
   - Create inspection order
4. ✅ Build inspection report review interface
   - Side-by-side comparison (declared vs actual)
   - Photo gallery viewer
   - Compliance checklist review
   - Verify for payment action
   - Raise objection action
5. ✅ Implement objections system
   - Create objection record
   - Notify applicant
   - Track resolution status
6. ✅ Create API endpoints
   - GET /api/dtdo/queue
   - POST /api/dtdo/schedule-inspection
   - POST /api/dtdo/verify-for-payment
   - POST /api/dtdo/raise-objection
   - POST /api/dtdo/reject-application

**Deliverables:**
- DTDO dashboard with all queues
- Application review workflow complete
- Inspection scheduling functional
- Inspection report review operational
- Objection management working

**Success Criteria:**
- DTDO sees all applications in their district
- DTDO can schedule inspections
- DTDO can review inspection reports
- DTDO can verify applications for payment
- Objections are tracked and visible to applicant

---

### Phase 4: Enhanced Property Owner Experience (Weeks 7-8)
**Goal:** Update property owner dashboard and add response mechanisms

**Tasks:**
1. ✅ Enhance property owner dashboard
   - Add "Pending Clarifications" card
   - Add "Payment Pending" card
   - Improve application status display
2. ✅ Build application timeline view
   - Vertical timeline component
   - Show all status changes
   - Display remarks from officers
   - Show attached documents
3. ✅ Create objection response interface
   - Display objection details
   - Text response field
   - Upload supporting documents
   - Submit response action
4. ✅ Implement resubmission workflow
   - When applicant responds to objection
   - Change status back to `submitted`
   - Notify DA/DTDO
5. ✅ Create API endpoints
   - GET /api/owner/application-timeline/:id
   - GET /api/owner/objections/:applicationId
   - POST /api/owner/respond-to-objection

**Deliverables:**
- Enhanced property owner dashboard
- Timeline view component
- Objection response system
- Resubmission workflow

**Success Criteria:**
- Owner sees pending clarifications clearly
- Owner can view complete application journey
- Owner can respond to objections with documents
- Responses trigger workflow continuation

---

### Phase 5: Payment Integration & Certificate Generation (Weeks 9-10)
**Goal:** Integrate payment gateways and auto-generate certificates

**Tasks:**
1. ✅ Payment flow for verified applications
   - Display payment amount (category + location + GST)
   - Show payment due date
   - Multiple gateway options (HimKosh, Razorpay, UPI)
2. ✅ Payment verification
   - Manual verification by DTDO (for UPI)
   - Auto-verification for online gateways
   - Update application status to `payment_completed`
3. ✅ Certificate generation
   - Design certificate template (PDF)
   - Auto-populate applicant and property details
   - Generate unique certificate number
   - Store certificate in object storage
   - Update application status to `certificate_issued`
4. ✅ Certificate download
   - Display on property owner dashboard
   - Download as PDF
   - Send via email
5. ✅ Create API endpoints
   - GET /api/payments/details/:applicationId
   - POST /api/payments/initiate
   - POST /api/payments/verify (callback)
   - POST /api/certificates/generate
   - GET /api/certificates/download/:applicationId

**Deliverables:**
- Payment gateway integration complete
- Certificate auto-generation working
- Certificate download available

**Success Criteria:**
- Applicant can make payment via multiple gateways
- Payment updates application status automatically
- Certificate is generated immediately after payment
- Certificate is downloadable by applicant

---

### Phase 6: State Officer & Analytics (Weeks 11-12)
**Goal:** Build state-level oversight and analytics dashboards

**Tasks:**
1. ✅ Create state officer dashboard
   - Statewide metrics cards
   - District performance table
   - Visualizations (charts)
2. ✅ Build escalation handling
   - Escalate application action (DTDO → State Officer)
   - State officer review interface
   - Override decision capability
3. ✅ Implement analytics reports
   - Monthly report generation
   - Custom date range reports
   - Export to PDF/Excel
4. ✅ Create district comparison views
   - Side-by-side district performance
   - Processing time comparison
   - Approval rate comparison
5. ✅ Create API endpoints
   - GET /api/state/analytics
   - GET /api/state/district-performance
   - GET /api/state/escalated-applications
   - POST /api/state/override-decision
   - GET /api/reports/generate

**Deliverables:**
- State officer dashboard with analytics
- Escalation workflow complete
- Report generation functional

**Success Criteria:**
- State officer sees statewide view
- Can compare district performance
- Can handle escalated cases
- Reports are generated accurately

---

### Phase 7: Notifications & Alerts (Week 13)
**Goal:** Comprehensive notification system for all stakeholders

**Tasks:**
1. ✅ Email notification templates
   - Application submitted (to DA)
   - Application forwarded (to DTDO)
   - Inspection scheduled (to Applicant + DA)
   - Objection raised (to Applicant)
   - Payment verification (to Applicant)
   - Certificate issued (to Applicant)
2. ✅ SMS notifications (via NIC SMS Gateway - future)
   - Critical alerts only
   - Inspection reminders
   - Payment reminders
3. ✅ In-app notifications
   - Notification bell icon in header
   - Unread count badge
   - Notification list dropdown
   - Mark as read functionality
4. ✅ SLA breach alerts
   - Auto-flag applications exceeding thresholds
   - Email to DTDO and State Officer
   - Visual indicators on dashboards
5. ✅ Create API endpoints
   - GET /api/notifications (user-specific)
   - POST /api/notifications/mark-read
   - POST /api/notifications/send (internal)

**Deliverables:**
- Email notifications for all workflow transitions
- In-app notification system
- SLA breach alerting

**Success Criteria:**
- All stakeholders receive timely notifications
- In-app notification center functional
- SLA breaches are flagged and visible

---

### Phase 8: Testing & Refinement (Week 14)
**Goal:** End-to-end testing and bug fixes

**Tasks:**
1. ✅ Complete workflow testing
   - Test happy path: Draft → Certificate Issued
   - Test rejection path
   - Test objection/resubmission path
   - Test all role transitions
2. ✅ Performance testing
   - Load 1000+ applications
   - Test query performance
   - Optimize slow queries
3. ✅ Security testing
   - Test role-based access control
   - Test data isolation (district-specific)
   - Penetration testing (if possible)
4. ✅ User acceptance testing
   - Get feedback from sample users (1 of each role)
   - Fix critical bugs
   - Improve UI/UX based on feedback
5. ✅ Mobile testing
   - Test all interfaces on mobile devices
   - Test inspection report upload from mobile
   - Fix responsive design issues

**Deliverables:**
- All critical bugs fixed
- Performance optimized
- Security validated
- UAT feedback incorporated

**Success Criteria:**
- Complete workflow functions end-to-end
- No critical bugs
- All role dashboards work on mobile
- Performance is acceptable (pages load < 3s)

---

### Phase 9: Documentation & Training (Week 15)
**Goal:** Create user guides and conduct training

**Tasks:**
1. ✅ Create user manuals
   - Property Owner Guide
   - Dealing Assistant Guide
   - DTDO Guide
   - State Officer Guide
   - Admin Guide
2. ✅ Video tutorials
   - How to submit application (Property Owner)
   - How to scrutinize application (DA)
   - How to review and schedule inspection (DTDO)
   - How to upload inspection report (DA)
3. ✅ Conduct training sessions
   - Train DAs (2-hour session)
   - Train DTDOs (2-hour session)
   - Train State Officers (1-hour session)
4. ✅ Create FAQ document
   - Common questions by role
   - Troubleshooting tips

**Deliverables:**
- User manuals for all roles
- Video tutorials (5 videos, 5-10 min each)
- Training completion certificates
- FAQ document

**Success Criteria:**
- All users have access to documentation
- Training sessions completed
- Users can perform basic tasks independently

---

### Phase 10: Deployment & Go-Live (Week 16)
**Goal:** Deploy to production and launch

**Tasks:**
1. ✅ Production database setup
   - Replicate schema to production
   - Backup strategy
   - Monitoring setup
2. ✅ Deploy application
   - Deploy backend API
   - Deploy frontend
   - Configure domain and SSL
3. ✅ Create production users
   - All DAs (15 districts)
   - All DTDOs (15 districts)
   - State Officers (3-5)
   - Admins (2-3)
4. ✅ Data migration (if any existing applications)
   - Export from old system
   - Import to new system
   - Validate data integrity
5. ✅ Go-live announcement
   - Email all stakeholders
   - Update tourism website
   - Press release (if applicable)
6. ✅ Monitoring and support
   - 24/7 monitoring first week
   - Hotline for critical issues
   - Daily check-ins with DTDOs

**Deliverables:**
- Application deployed to production
- All users created and credentials shared
- Go-live announcement sent
- Support plan active

**Success Criteria:**
- Application accessible at production URL
- Users can log in successfully
- First application submitted and processed
- No critical issues in first 48 hours

---

## 10. Success Metrics

### 10.1 Process Efficiency Metrics

| Metric | Current (Manual) | Target (Digital) | Measurement Method |
|--------|------------------|------------------|-------------------|
| **Average Processing Time** | 30-45 days | 15-20 days | Timeline data (submitted → certificate) |
| **DA Scrutiny Time** | 5-7 days | 2-3 days | Timeline (submitted → forwarded) |
| **DTDO Review Time** | 7-10 days | 2-4 days | Timeline (forwarded → inspection scheduled) |
| **Inspection Completion** | 14-21 days | 7-10 days | Timeline (scheduled → report uploaded) |
| **Certificate Issuance** | 3-5 days | 1 day (auto) | Timeline (payment → certificate) |

### 10.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Approval Rate** | 70-80% | (Approved / Submitted) × 100 |
| **First-time Submission Quality** | >60% | Applications forwarded without revert |
| **Inspection Objection Rate** | <20% | Applications with objections / Total inspections |
| **Payment Collection Rate** | >95% | Payments received / Verified applications |
| **Certificate Download Rate** | >90% | Certificates downloaded / Issued |

### 10.3 User Satisfaction Metrics

| Stakeholder | Metric | Target | Method |
|-------------|--------|--------|--------|
| **Property Owners** | Satisfaction Score | >4/5 | Post-certificate survey |
| **Dealing Assistants** | System Usability | >80% | SUS (System Usability Scale) |
| **DTDOs** | Process Improvement | >70% agree | Quarterly survey |
| **State Officers** | Data Accessibility | >85% agree | Feedback form |

### 10.4 Technical Metrics

| Metric | Target | Monitoring Tool |
|--------|--------|-----------------|
| **Page Load Time** | <3 seconds | Google Analytics |
| **API Response Time** | <500ms (95th percentile) | Application logs |
| **System Uptime** | >99.5% | Monitoring dashboard |
| **Mobile Usage** | >40% of DA actions | Analytics |
| **Document Upload Success Rate** | >98% | Upload logs |

### 10.5 Adoption Metrics

| Metric | 1 Month | 3 Months | 6 Months |
|--------|---------|----------|----------|
| **Applications Submitted** | 50+ | 200+ | 500+ |
| **Active DAs** | 15 (all districts) | 15 | 20+ (with backups) |
| **Active DTDOs** | 15 | 15 | 15 |
| **Digital Payment %** | 60% | 80% | 95% |
| **Mobile Report Uploads** | 30% | 50% | 70% |

---

## 11. Risk Assessment & Mitigation

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Payment Gateway Downtime** | Medium | High | Multiple gateway options, fallback to UPI |
| **File Upload Failures** | Medium | Medium | Retry mechanism, offline support for mobile |
| **Database Performance Issues** | Low | High | Regular optimization, indexing, monitoring |
| **Security Breach** | Low | Critical | Role-based access, encryption, regular audits |

### 11.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **User Adoption Resistance** | Medium | High | Training, support, gradual rollout |
| **Inspection Delays** | High | Medium | SLA monitoring, automated reminders, escalation |
| **Data Entry Errors** | Medium | Medium | Validation, confirmation dialogs, audit trail |
| **Role Confusion** | Low | Medium | Clear role definitions, user guides |

### 11.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Policy Changes** | Medium | High | Flexible configuration, version control |
| **Budget Constraints** | Low | Medium | Phased implementation, prioritize core features |
| **Stakeholder Misalignment** | Low | High | Regular communication, demos, feedback loops |

---

## 12. Appendices

### Appendix A: Glossary

- **ANNEXURE-I**: Official application form for homestay registration
- **ANNEXURE-II**: Required documents (revenue papers, affidavits, etc.)
- **DA**: Dealing Assistant - First-level scrutiny officer
- **DTDO**: District Tourism Development Officer - Final approval authority
- **DDO**: Drawing & Disbursing Officer - For payment routing
- **SLA**: Service Level Agreement - Time targets for each stage
- **RC**: Registration Certificate - Final certificate issued to applicant

### Appendix B: API Endpoint Summary

[Complete list of 50+ API endpoints organized by role]

### Appendix C: Database Schema Diagram

[ERD showing all tables and relationships]

### Appendix D: Screen Mockups

[Figma links or screenshots for all major interfaces]

### Appendix E: Notification Templates

[Email and SMS templates for all workflow events]

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | [Name] | _________ | _____ |
| Technical Lead | [Name] | _________ | _____ |
| DTDO Representative | [Name] | _________ | _____ |
| State Tourism Dept | [Name] | _________ | _____ |

---

**End of PRD v2.0**
