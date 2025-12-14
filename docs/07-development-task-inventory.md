# 📋 Complete Development Task Inventory
## HP Tourism eServices Portal - Detailed Work Breakdown Structure

---

### 📊 Document Overview
| **Property** | **Details** |
|-------------|------------|
| **Purpose** | Complete task-level breakdown for development tracking |
| **Total Tasks** | 350+ uniquely identified tasks |
| **Coding System** | HP-[MODULE]-[NUMBER] |
| **Version** | 1.0 |
| **Date** | October 23, 2025 |

---

## 🎯 Task Coding System

### Module Prefixes
- **HP-CORE**: Core infrastructure & setup
- **HP-AUTH**: Authentication & user management
- **HP-HMST**: Homestay registration module
- **HP-WRKF**: Workflow & approval system
- **HP-PMNT**: Payment integration
- **HP-DOCS**: Document management
- **HP-NTFY**: Notification system
- **HP-DASH**: Dashboard & analytics
- **HP-DISC**: Discovery platform (public)
- **HP-ADMN**: Admin & governance
- **HP-INTG**: Third-party integrations
- **HP-TEST**: Testing & QA

### Priority Levels
- **P0**: Critical (MVP blocker)
- **P1**: High (MVP essential)
- **P2**: Medium (Post-MVP)
- **P3**: Low (Future enhancement)

### Status Codes
- **TODO**: Not started
- **IN_PROGRESS**: Currently being developed
- **REVIEW**: Code review pending
- **TESTING**: QA testing
- **DONE**: Completed
- **BLOCKED**: Waiting on dependency

---

## 1. CORE INFRASTRUCTURE & SETUP

### 1.1 Project Initialization

**HP-CORE-001**: Initialize monorepo structure  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Set up `/client`, `/server`, `/shared` directory structure  
**Dependencies**: None  
**Acceptance**: Directory structure matches architecture spec

**HP-CORE-002**: Configure TypeScript for entire project  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Set up `tsconfig.json` for client, server, shared with strict mode  
**Dependencies**: HP-CORE-001  
**Acceptance**: Zero TypeScript errors on build

**HP-CORE-003**: Set up Vite build system  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Configure `vite.config.ts` with React, path aliases, HMR  
**Dependencies**: HP-CORE-001, HP-CORE-002  
**Acceptance**: Vite dev server runs with HMR working

**HP-CORE-004**: Configure ESLint and Prettier  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Set up code quality tools with consistent rules  
**Dependencies**: HP-CORE-002  
**Acceptance**: All code passes linting and formatting

**HP-CORE-005**: Set up environment variable system  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Configure `.env` files, validation, type-safe env access  
**Dependencies**: HP-CORE-002  
**Acceptance**: Environment variables accessible with type safety

---

### 1.2 Database Setup

**HP-CORE-101**: Initialize PostgreSQL database connection  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Set up Neon PostgreSQL connection with Drizzle  
**Dependencies**: HP-CORE-005  
**Acceptance**: Database connection successful, queries working

**HP-CORE-102**: Configure Drizzle ORM  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Set up Drizzle with schema definitions, migrations  
**Dependencies**: HP-CORE-101  
**Acceptance**: ORM queries working, migrations executable

**HP-CORE-103**: Create database migration system  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Set up Drizzle Kit for schema migrations  
**Dependencies**: HP-CORE-102  
**Acceptance**: Migrations can be created and rolled back

**HP-CORE-104**: Set up database backup strategy  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Configure automated daily backups  
**Dependencies**: HP-CORE-101  
**Acceptance**: Backups run daily, restoration tested

---

### 1.3 Object Storage Setup

**HP-CORE-201**: Initialize object storage connection  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Set up Replit Object Storage (S3-compatible)  
**Dependencies**: HP-CORE-005  
**Acceptance**: Files can be uploaded and retrieved

**HP-CORE-202**: Create file upload utility functions  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Build helpers for multipart uploads, validation  
**Dependencies**: HP-CORE-201  
**Acceptance**: Files upload with progress tracking

**HP-CORE-203**: Implement virus scanning for uploads  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Integrate virus scanning on all file uploads  
**Dependencies**: HP-CORE-202  
**Acceptance**: Infected files blocked, clean files allowed

---

## 2. DATABASE SCHEMA IMPLEMENTATION

### 2.1 User Management Schema

**HP-DB-001**: Create `users` table  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Define schema for users with roles (owner, officer, admin)  
**Dependencies**: HP-CORE-102  
**SQL**:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  aadhaar_number VARCHAR(12) UNIQUE,
  district VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Acceptance**: Table created, constraints working

**HP-DB-002**: Create `sessions` table  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: PostgreSQL-backed session storage  
**Dependencies**: HP-DB-001  
**Acceptance**: Sessions persist across server restarts

**HP-DB-003**: Create indexes for `users` table  
**Priority**: P1 | **Estimate**: 30 min | **Status**: TODO  
**Description**: Add indexes on mobile, email, aadhaar, district  
**Dependencies**: HP-DB-001  
**Acceptance**: Query performance improved (measure before/after)

---

### 2.2 Application Schema

**HP-DB-101**: Create `homestay_applications` table  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Main table for all homestay applications  
**Dependencies**: HP-DB-001  
**SQL**:
```sql
CREATE TABLE homestay_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  property_name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL,
  total_rooms INTEGER NOT NULL,
  address TEXT NOT NULL,
  district VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  amenities JSONB,
  rooms JSONB,
  base_fee DECIMAL(10, 2),
  total_fee DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Acceptance**: Table created with all constraints

**HP-DB-102**: Create `documents` table  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Store metadata for uploaded documents  
**Dependencies**: HP-DB-101  
**Acceptance**: Document records linked to applications

**HP-DB-103**: Create `payments` table  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Payment transaction records  
**Dependencies**: HP-DB-101  
**Acceptance**: Payment records with gateway IDs stored

**HP-DB-104**: Create `notifications` table  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: User notification queue  
**Dependencies**: HP-DB-001  
**Acceptance**: Notifications can be queued and marked read

**HP-DB-105**: Create `reviews` table  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Property reviews for discovery platform  
**Dependencies**: HP-DB-101  
**Acceptance**: Reviews linked to properties

**HP-DB-106**: Create `audit_logs` table  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Complete audit trail of all actions  
**Dependencies**: HP-DB-001  
**Acceptance**: All critical actions logged

**HP-DB-107**: Create indexes for `homestay_applications`  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Optimize query performance  
**Dependencies**: HP-DB-101  
**Indexes**: status, district, category, user_id, created_at  
**Acceptance**: Query time reduced by >80%

---

## 3. AUTHENTICATION & USER MANAGEMENT

### 3.1 User Registration

**HP-AUTH-001**: Build user registration API endpoint  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/auth/register`  
**Description**: Accept user details, validate, create account  
**Dependencies**: HP-DB-001  
**Validations**: Mobile format, Aadhaar format, unique checks  
**Acceptance**: New users can register successfully

**HP-AUTH-002**: Implement mobile number validation  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Validate Indian mobile numbers (10 digits, starts with 6-9)  
**Dependencies**: None  
**Acceptance**: Invalid numbers rejected, valid accepted

**HP-AUTH-003**: Implement Aadhaar validation  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Validate 12-digit Aadhaar, check Verhoeff algorithm  
**Dependencies**: None  
**Acceptance**: Only valid Aadhaar numbers accepted

**HP-AUTH-004**: Build OTP generation service  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Generate 6-digit OTP, store with expiry (5 min)  
**Dependencies**: HP-AUTH-001  
**Acceptance**: OTP sent to mobile, expires after 5 min

**HP-AUTH-005**: Integrate SMS gateway for OTP  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Send OTP via SMS (Twilio or similar)  
**Dependencies**: HP-AUTH-004  
**Acceptance**: OTP delivered within 30 seconds

---

### 3.2 User Login

**HP-AUTH-101**: Build login API endpoint  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `POST /api/auth/login`  
**Description**: Validate mobile + OTP, create session  
**Dependencies**: HP-AUTH-004, HP-DB-002  
**Acceptance**: Users can login with valid OTP

**HP-AUTH-102**: Implement session management  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: PostgreSQL-backed sessions with express-session  
**Dependencies**: HP-DB-002  
**Acceptance**: Sessions persist, expire after 30 min inactivity

**HP-AUTH-103**: Build logout API endpoint  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Route**: `POST /api/auth/logout`  
**Description**: Destroy session, clear cookies  
**Dependencies**: HP-AUTH-102  
**Acceptance**: Users logged out, session invalidated

**HP-AUTH-104**: Implement "Remember Me" functionality  
**Priority**: P2 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Extended session (7 days) with secure token  
**Dependencies**: HP-AUTH-102  
**Acceptance**: Users stay logged in for 7 days if checked

---

### 3.3 Authorization & Middleware

**HP-AUTH-201**: Build authentication middleware  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Verify session exists, load user into request  
**Dependencies**: HP-AUTH-102  
**Acceptance**: Protected routes require valid session

**HP-AUTH-202**: Build role-based authorization middleware  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Check user role against required permissions  
**Dependencies**: HP-AUTH-201  
**Acceptance**: Users blocked from unauthorized actions

**HP-AUTH-203**: Implement rate limiting  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Limit requests per IP (100 req/15 min)  
**Dependencies**: None  
**Acceptance**: Excessive requests blocked with 429 error

**HP-AUTH-204**: Build CSRF protection  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: CSRF tokens for all state-changing requests  
**Dependencies**: HP-AUTH-102  
**Acceptance**: Requests without valid token rejected

---

### 3.4 Frontend Auth Components

**HP-AUTH-301**: Build Register page component  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Path**: `/register`  
**Description**: Registration form with mobile, name, Aadhaar, role  
**Dependencies**: HP-AUTH-001  
**Acceptance**: Users can register, see validation errors

**HP-AUTH-302**: Build Login page component  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Path**: `/login`  
**Description**: Login form with mobile number + OTP  
**Dependencies**: HP-AUTH-101  
**Acceptance**: Users can login, redirected to dashboard

**HP-AUTH-303**: Build OTP input component  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: 6-digit OTP input with auto-focus  
**Dependencies**: None  
**Acceptance**: OTP input UX smooth, auto-submits when complete

**HP-AUTH-304**: Build useAuth custom hook  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: React hook for authentication state  
**Dependencies**: HP-AUTH-102  
**Acceptance**: Components can access user, login status

**HP-AUTH-305**: Build ProtectedRoute component  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: HOC to protect routes requiring authentication  
**Dependencies**: HP-AUTH-304  
**Acceptance**: Unauthenticated users redirected to login

---

## 4. HOMESTAY REGISTRATION MODULE

### 4.1 Form Schema & Validation

**HP-HMST-001**: Define Zod schema for Diamond category  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Complete validation schema using Drizzle-Zod  
**Dependencies**: HP-DB-101  
**Validations**: Min 5 rooms, AC required, WiFi required, room size ≥120 sq ft  
**Acceptance**: Schema rejects invalid data, accepts valid

**HP-HMST-002**: Define Zod schema for Gold category  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Validation for 3-4 rooms, relaxed amenities  
**Dependencies**: HP-DB-101  
**Validations**: 3-4 rooms, room size ≥100 sq ft  
**Acceptance**: Schema validates Gold criteria correctly

**HP-HMST-003**: Define Zod schema for Silver category  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Validation for 1-2 rooms, basic amenities  
**Dependencies**: HP-DB-101  
**Validations**: 1-2 rooms, room size ≥80 sq ft  
**Acceptance**: Schema validates Silver criteria correctly

**HP-HMST-004**: Build category validation engine  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Validate form data against selected category rules  
**Dependencies**: HP-HMST-001, HP-HMST-002, HP-HMST-003  
**Acceptance**: Invalid category selections caught before submission

---

### 4.2 Fee Calculation System

**HP-HMST-101**: Build fee calculation service  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Calculate fees based on category + room count + GST  
**Dependencies**: None  
**Formula**:
```
Diamond: ₹20,000 + (₹1,000 × rooms)
Gold: ₹10,000 + (₹1,000 × rooms)
Silver: ₹5,000 + (₹1,000 × rooms)
GST: 18% on subtotal
```
**Acceptance**: All category fees calculated correctly

**HP-HMST-102**: Build fee breakdown display component  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Show itemized fee breakdown to user  
**Dependencies**: HP-HMST-101  
**Acceptance**: Users see base + per-room + GST + total

**HP-HMST-103**: Implement late fee calculation  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Add 10% late fee for post-expiry renewals  
**Dependencies**: HP-HMST-101  
**Acceptance**: Late fee calculated only when applicable

---

### 4.3 Auto-Categorization Engine

**HP-HMST-201**: Build auto-categorization logic  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Suggest category based on rooms + amenities  
**Dependencies**: HP-HMST-001, HP-HMST-002, HP-HMST-003  
**Logic**:
```
If rooms ≥5 AND ac AND wifi → Suggest Diamond
If rooms 3-4 → Suggest Gold
If rooms 1-2 → Suggest Silver
```
**Acceptance**: Suggestions match criteria 100%

**HP-HMST-202**: Build category suggestion UI  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Show suggested category with rationale  
**Dependencies**: HP-HMST-201  
**Acceptance**: Users see suggestion, can accept or override

---

### 4.4 Registration Form - Section 1: Basic Info

**HP-HMST-301**: Build Section 1 form component  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Fields**: Property name, district, address, pincode, GPS  
**Description**: First section of registration form  
**Dependencies**: HP-HMST-001  
**Acceptance**: Form validates, saves draft, navigates to Section 2

**HP-HMST-302**: Implement address autocomplete  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Google Places API for address suggestions  
**Dependencies**: HP-HMST-301  
**Acceptance**: Users can select from autocomplete suggestions

**HP-HMST-303**: Build GPS location capture  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Auto-capture GPS on mobile, manual entry on desktop  
**Dependencies**: HP-HMST-301  
**Acceptance**: GPS coordinates captured with ±10m accuracy

**HP-HMST-304**: Build pincode to district mapping  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Auto-populate district based on pincode  
**Dependencies**: None  
**Acceptance**: District pre-filled correctly for HP pincodes

---

### 4.5 Registration Form - Section 2: Owner Info

**HP-HMST-401**: Build Section 2 form component  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Fields**: Owner name, Aadhaar, mobile, email  
**Description**: Owner information section (pre-filled from user account)  
**Dependencies**: HP-AUTH-304  
**Acceptance**: Fields pre-filled, user can modify if needed

**HP-HMST-402**: Implement Aadhaar masking  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Display masked Aadhaar (XXXX-XXXX-1234)  
**Dependencies**: HP-HMST-401  
**Acceptance**: Full Aadhaar never visible in UI

---

### 4.6 Registration Form - Section 3: Room Details

**HP-HMST-501**: Build Section 3 form component  
**Priority**: P0 | **Estimate**: 5 hours | **Status**: TODO  
**Fields**: Total rooms, room types (dynamic), sizes, counts  
**Description**: Room configuration with dynamic add/remove  
**Dependencies**: HP-HMST-001  
**Acceptance**: Dynamic room types work, total validation passes

**HP-HMST-502**: Build room type dynamic form  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Add/remove room types, validate sum equals total  
**Dependencies**: HP-HMST-501  
**Acceptance**: Users can add multiple room types, validation works

**HP-HMST-503**: Implement room size validation  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Validate minimum size per category  
**Dependencies**: HP-HMST-501, HP-HMST-001  
**Acceptance**: Undersized rooms rejected with clear error

---

### 4.7 Registration Form - Section 4: Amenities

**HP-HMST-601**: Build Section 4 form component  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Fields**: Checkbox grid for all amenities  
**Description**: Essential + additional amenities selection  
**Dependencies**: HP-HMST-001  
**Acceptance**: Required amenities highlighted, validation works

**HP-HMST-602**: Build amenity validation logic  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Check required amenities present for category  
**Dependencies**: HP-HMST-601  
**Acceptance**: Missing required amenities show errors

---

### 4.8 Registration Form - Section 5: Documents

**HP-HMST-701**: Build Section 5 document upload component  
**Priority**: P0 | **Estimate**: 5 hours | **Status**: TODO  
**Description**: Multi-file upload with progress, preview  
**Dependencies**: HP-CORE-202, HP-DOCS-001  
**Acceptance**: Users can upload multiple documents, see previews

**HP-HMST-702**: Implement drag-and-drop upload  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Drag files onto upload area  
**Dependencies**: HP-HMST-701  
**Acceptance**: Drag-drop works, files upload successfully

**HP-HMST-703**: Build mobile camera integration  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Direct camera access on mobile devices  
**Dependencies**: HP-HMST-701  
**Acceptance**: Mobile users can take photos directly

**HP-HMST-704**: Implement file type validation  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Only allow PDF, JPG, PNG  
**Dependencies**: HP-HMST-701  
**Acceptance**: Other file types rejected with error

**HP-HMST-705**: Implement file size validation  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Max 5MB per file, 2MB for photos  
**Dependencies**: HP-HMST-701  
**Acceptance**: Oversized files rejected with error

---

### 4.9 Registration Form - Section 6: Fee & Submit

**HP-HMST-801**: Build Section 6 review & submit component  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Show fee breakdown, review summary, submit  
**Dependencies**: HP-HMST-101  
**Acceptance**: Users see all data, can submit application

**HP-HMST-802**: Build application summary display  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Collapsible summary of all sections  
**Dependencies**: HP-HMST-801  
**Acceptance**: Users can review all entered data before submit

---

### 4.10 Draft Auto-Save System

**HP-HMST-901**: Build auto-save service  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Auto-save form every 30 seconds  
**Dependencies**: HP-DB-101  
**Acceptance**: Form data persists, resumes from last save

**HP-HMST-902**: Build draft recovery UI  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Show "Resume draft?" on form load  
**Dependencies**: HP-HMST-901  
**Acceptance**: Users prompted to resume, can discard and start fresh

---

### 4.11 Backend API Endpoints

**HP-HMST-1001**: Build create application API  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Route**: `POST /api/applications/homestay`  
**Description**: Create new homestay application  
**Dependencies**: HP-DB-101  
**Acceptance**: Application saved to database

**HP-HMST-1002**: Build update application API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `PATCH /api/applications/:id`  
**Description**: Update draft application  
**Dependencies**: HP-HMST-1001  
**Acceptance**: Draft updates saved

**HP-HMST-1003**: Build submit application API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `PATCH /api/applications/:id/submit`  
**Description**: Submit application for review, trigger payment  
**Dependencies**: HP-HMST-1001  
**Acceptance**: Application status changes to 'submitted'

**HP-HMST-1004**: Build get user applications API  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/applications/my-applications`  
**Description**: List all user's applications  
**Dependencies**: HP-HMST-1001  
**Acceptance**: User sees only their applications

**HP-HMST-1005**: Build get application detail API  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/applications/:id`  
**Description**: Get single application with documents  
**Dependencies**: HP-HMST-1001  
**Acceptance**: Application details returned with related data

---

## 5. WORKFLOW & APPROVAL SYSTEM

### 5.1 Workflow State Machine

**HP-WRKF-001**: Build workflow state machine  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**States**: draft → submitted → district_review → state_review → approved  
**Description**: State transition logic with validations  
**Dependencies**: HP-DB-101  
**Acceptance**: Invalid state transitions rejected

**HP-WRKF-002**: Implement SLA tracking system  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Track time in each stage, calculate SLA breach  
**Dependencies**: HP-WRKF-001  
**SLAs**: District 3 days, State 2 days, Certificate 1 day  
**Acceptance**: SLA time calculated correctly

**HP-WRKF-003**: Build auto-escalation service  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Email supervisor when SLA 80% consumed  
**Dependencies**: HP-WRKF-002  
**Acceptance**: Escalation emails sent automatically

---

### 5.2 District Officer Functions

**HP-WRKF-101**: Build district officer queue API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `GET /api/officer/applications/pending`  
**Description**: List pending applications for officer's district  
**Dependencies**: HP-AUTH-202  
**Acceptance**: Officer sees only their district applications

**HP-WRKF-102**: Build approve application API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/officer/applications/:id/approve`  
**Description**: Approve and forward to state level  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Application moves to state_review status

**HP-WRKF-103**: Build reject application API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/officer/applications/:id/reject`  
**Description**: Reject with mandatory reason  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Application rejected, owner notified

**HP-WRKF-104**: Build request clarification API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/officer/applications/:id/clarify`  
**Description**: Request additional info from owner  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Application paused, owner notified

---

### 5.3 State Officer Functions

**HP-WRKF-201**: Build state officer queue API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `GET /api/state-officer/applications/pending`  
**Description**: List applications in state review  
**Dependencies**: HP-AUTH-202  
**Acceptance**: State officer sees state-level queue

**HP-WRKF-202**: Build final approve API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/state-officer/applications/:id/approve`  
**Description**: Final approval, trigger certificate generation  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Application approved, certificate generated

**HP-WRKF-203**: Build state reject API  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `POST /api/state-officer/applications/:id/reject`  
**Description**: State-level rejection  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Application rejected, owner notified

---

### 5.4 Officer Dashboard Components

**HP-WRKF-301**: Build officer dashboard page  
**Priority**: P0 | **Estimate**: 5 hours | **Status**: TODO  
**Path**: `/officer/dashboard`  
**Description**: Application queue, stats, SLA alerts  
**Dependencies**: HP-WRKF-101  
**Acceptance**: Officers see pending applications

**HP-WRKF-302**: Build application review modal  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Review application details, documents, AI flags  
**Dependencies**: HP-WRKF-301  
**Acceptance**: Officers can review all application data

**HP-WRKF-303**: Build approve/reject/clarify actions  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Action buttons with confirmation dialogs  
**Dependencies**: HP-WRKF-302  
**Acceptance**: Officers can take actions with notes

**HP-WRKF-304**: Build SLA indicator component  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Visual SLA progress bar (green/yellow/red)  
**Dependencies**: HP-WRKF-002  
**Acceptance**: SLA status visible at a glance

---

## 6. PAYMENT INTEGRATION

### 6.1 Payment Gateway Setup

**HP-PMNT-001**: Integrate payment gateway SDK  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Razorpay/PayU/Government gateway integration  
**Dependencies**: HP-CORE-005  
**Acceptance**: Gateway SDK configured, test mode working

**HP-PMNT-002**: Build payment initiation API  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/payments/initiate`  
**Description**: Create payment order, return payment URL  
**Dependencies**: HP-PMNT-001  
**Acceptance**: Payment page opens, shows correct amount

**HP-PMNT-003**: Build payment callback handler  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Route**: `POST /api/payments/callback`  
**Description**: Verify payment signature, update status  
**Dependencies**: HP-PMNT-002  
**Acceptance**: Successful payments update application

**HP-PMNT-004**: Build payment webhook handler  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/payments/webhook`  
**Description**: Handle async payment notifications  
**Dependencies**: HP-PMNT-002  
**Acceptance**: Webhook signatures verified

---

### 6.2 Receipt Generation

**HP-PMNT-101**: Build PDF receipt generator  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Generate PDF receipt with QR code  
**Dependencies**: HP-PMNT-003  
**Library**: PDFKit or similar  
**Acceptance**: Receipt PDF generated with all details

**HP-PMNT-102**: Build receipt email service  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Email receipt to user automatically  
**Dependencies**: HP-PMNT-101  
**Acceptance**: Receipt emailed within 1 minute of payment

**HP-PMNT-103**: Build receipt download API  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/payments/:id/receipt`  
**Description**: Download receipt PDF  
**Dependencies**: HP-PMNT-101  
**Acceptance**: Receipt downloads correctly

---

### 6.3 Refund Processing

**HP-PMNT-201**: Build refund initiation service  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Initiate refund to original payment method  
**Dependencies**: HP-PMNT-001  
**Acceptance**: Refunds initiated for rejected applications

**HP-PMNT-202**: Build refund status tracking  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Track refund processing status  
**Dependencies**: HP-PMNT-201  
**Acceptance**: Refund status visible to user

---

### 6.4 Frontend Payment Components

**HP-PMNT-301**: Build payment page component  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Path**: `/payment/:applicationId`  
**Description**: Show fee breakdown, initiate payment  
**Dependencies**: HP-PMNT-002  
**Acceptance**: Users can proceed to payment gateway

**HP-PMNT-302**: Build payment success page  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Path**: `/payment/success`  
**Description**: Confirm payment, show receipt download  
**Dependencies**: HP-PMNT-003  
**Acceptance**: Success message, receipt downloadable

**HP-PMNT-303**: Build payment failure page  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Path**: `/payment/failure`  
**Description**: Show error, allow retry  
**Dependencies**: HP-PMNT-003  
**Acceptance**: Users can retry payment

---

## 7. DOCUMENT MANAGEMENT

### 7.1 Upload System

**HP-DOCS-001**: Build document upload API  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Route**: `POST /api/documents/upload`  
**Description**: Handle multipart upload, save to object storage  
**Dependencies**: HP-CORE-202  
**Acceptance**: Files uploaded, metadata saved to DB

**HP-DOCS-002**: Implement virus scanning  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Scan all uploads for viruses  
**Dependencies**: HP-CORE-203  
**Acceptance**: Infected files rejected

**HP-DOCS-003**: Build document metadata extraction  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Extract EXIF data from photos  
**Dependencies**: HP-DOCS-001  
**Acceptance**: Photo metadata captured (GPS, date)

---

### 7.2 AI Document Verification

**HP-DOCS-101**: Integrate OCR service  
**Priority**: P1 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Extract text from documents (Tesseract/Google Vision)  
**Dependencies**: HP-DOCS-001  
**Acceptance**: Text extracted from uploaded docs

**HP-DOCS-102**: Build document type classifier  
**Priority**: P1 | **Estimate**: 5 hours | **Status**: TODO  
**Description**: AI model to detect document type  
**Dependencies**: HP-DOCS-101  
**Acceptance**: Fire NOC, Aadhaar, etc. auto-detected

**HP-DOCS-103**: Build document quality checker  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Detect blurry, incomplete, or low-quality docs  
**Dependencies**: HP-DOCS-001  
**Acceptance**: Poor quality docs flagged

**HP-DOCS-104**: Build cross-verification service  
**Priority**: P2 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Cross-check owner name, address across docs  
**Dependencies**: HP-DOCS-101  
**Acceptance**: Mismatches flagged for officer review

---

### 7.3 Document Viewing & Download

**HP-DOCS-201**: Build document viewer component  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: View uploaded documents (PDF, images)  
**Dependencies**: HP-DOCS-001  
**Acceptance**: Documents displayable in browser

**HP-DOCS-202**: Build document download API  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/documents/:id/download`  
**Description**: Download original document  
**Dependencies**: HP-DOCS-001  
**Acceptance**: Documents download correctly

**HP-DOCS-203**: Implement document watermarking  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Add watermark on downloads (prevent misuse)  
**Dependencies**: HP-DOCS-202  
**Acceptance**: Downloaded docs have "Confidential" watermark

---

## 8. NOTIFICATION SYSTEM

### 8.1 Email Notifications

**HP-NTFY-001**: Set up email service (SendGrid/SES)  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Configure SMTP for transactional emails  
**Dependencies**: HP-CORE-005  
**Acceptance**: Test emails delivered successfully

**HP-NTFY-002**: Build email template system  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: HTML templates for all notification types  
**Dependencies**: HP-NTFY-001  
**Acceptance**: Emails render correctly in all clients

**HP-NTFY-003**: Build email sending service  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Queue and send emails asynchronously  
**Dependencies**: HP-NTFY-002  
**Acceptance**: Emails sent reliably, failures retried

---

### 8.2 SMS Notifications

**HP-NTFY-101**: Set up SMS gateway (Twilio/MSG91)  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Configure SMS API  
**Dependencies**: HP-CORE-005  
**Acceptance**: Test SMS delivered

**HP-NTFY-102**: Build SMS template system  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: SMS templates with placeholders  
**Dependencies**: HP-NTFY-101  
**Acceptance**: SMS sent with dynamic data

**HP-NTFY-103**: Build SMS sending service  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Queue and send SMS asynchronously  
**Dependencies**: HP-NTFY-102  
**Acceptance**: SMS sent reliably

---

### 8.3 In-App Notifications

**HP-NTFY-201**: Build in-app notification API  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `GET /api/notifications`  
**Description**: Get user's notifications  
**Dependencies**: HP-DB-104  
**Acceptance**: Notifications fetched, marked as read

**HP-NTFY-202**: Build notification bell component  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Bell icon with unread count  
**Dependencies**: HP-NTFY-201  
**Acceptance**: Unread notifications show count

**HP-NTFY-203**: Build notification dropdown  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Dropdown list of recent notifications  
**Dependencies**: HP-NTFY-202  
**Acceptance**: Notifications clickable, mark as read

---

### 8.4 Notification Triggers

**HP-NTFY-301**: Build application submitted trigger  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Send email+SMS when application submitted  
**Dependencies**: HP-NTFY-003, HP-NTFY-103  
**Acceptance**: Notifications sent within 5 minutes

**HP-NTFY-302**: Build status change trigger  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Notify on every status change  
**Dependencies**: HP-NTFY-003, HP-NTFY-103  
**Acceptance**: All status changes notified

**HP-NTFY-303**: Build approval trigger  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Notify when application approved  
**Dependencies**: HP-NTFY-003  
**Acceptance**: Approval notification sent immediately

**HP-NTFY-304**: Build rejection trigger  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Notify when application rejected  
**Dependencies**: HP-NTFY-003  
**Acceptance**: Rejection notification with reason sent

**HP-NTFY-305**: Build renewal reminder trigger  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Send reminders 90/60/30/7 days before expiry  
**Dependencies**: HP-NTFY-003, HP-NTFY-103  
**Acceptance**: Reminders sent on schedule

---

## 9. DASHBOARD & ANALYTICS

### 9.1 Property Owner Dashboard

**HP-DASH-001**: Build owner dashboard page  
**Priority**: P0 | **Estimate**: 5 hours | **Status**: TODO  
**Path**: `/dashboard`  
**Description**: Application list, status, renewal reminders  
**Dependencies**: HP-HMST-1004  
**Acceptance**: Owner sees all their applications

**HP-DASH-002**: Build application status widget  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Visual progress bar for current application  
**Dependencies**: HP-DASH-001  
**Acceptance**: Status shows current stage, next step

**HP-DASH-003**: Build renewal reminder widget  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Countdown to certificate expiry  
**Dependencies**: HP-DASH-001  
**Acceptance**: Days remaining shown, renewal button

**HP-DASH-004**: Build payment history widget  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: List of all payments, receipts  
**Dependencies**: HP-DASH-001  
**Acceptance**: Payments listed, receipts downloadable

---

### 9.2 Admin Analytics Dashboard

**HP-DASH-101**: Build admin dashboard page  
**Priority**: P1 | **Estimate**: 6 hours | **Status**: TODO  
**Path**: `/admin/dashboard`  
**Description**: Real-time metrics, charts, trends  
**Dependencies**: HP-AUTH-202  
**Acceptance**: Admin sees all key metrics

**HP-DASH-102**: Build total registrations widget  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Total count with category breakdown  
**Dependencies**: HP-DASH-101  
**Acceptance**: Live counts displayed

**HP-DASH-103**: Build processing time widget  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Average time per stage, trend chart  
**Dependencies**: HP-DASH-101  
**Acceptance**: Processing times shown with trends

**HP-DASH-104**: Build revenue widget  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Total revenue by category, month  
**Dependencies**: HP-DASH-101  
**Acceptance**: Revenue breakdown displayed

**HP-DASH-105**: Build geographic distribution map  
**Priority**: P2 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Heatmap of properties by district  
**Dependencies**: HP-DASH-101  
**Acceptance**: Interactive map shows distribution

---

### 9.3 Reporting System

**HP-DASH-201**: Build report generator API  
**Priority**: P2 | **Estimate**: 5 hours | **Status**: TODO  
**Route**: `POST /api/reports/generate`  
**Description**: Generate custom reports (PDF/Excel)  
**Dependencies**: HP-DASH-101  
**Acceptance**: Reports generated with selected metrics

**HP-DASH-202**: Build scheduled report system  
**Priority**: P2 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Auto-generate and email reports (daily/weekly/monthly)  
**Dependencies**: HP-DASH-201  
**Acceptance**: Reports emailed on schedule

---

## 10. DISCOVERY PLATFORM (PUBLIC)

### 10.1 Property Listing

**HP-DISC-001**: Build public homepage  
**Priority**: P1 | **Estimate**: 5 hours | **Status**: TODO  
**Path**: `/`  
**Description**: Hero section, featured properties, search  
**Dependencies**: None  
**Acceptance**: Public can browse without login

**HP-DISC-002**: Build property listing API  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `GET /api/public/properties`  
**Description**: List approved properties with filters  
**Dependencies**: HP-DB-101  
**Acceptance**: Properties returned with pagination

**HP-DISC-003**: Build property listing page  
**Priority**: P1 | **Estimate**: 4 hours | **Status**: TODO  
**Path**: `/properties`  
**Description**: Grid/list view with filters  
**Dependencies**: HP-DISC-002  
**Acceptance**: Properties displayed, filterable

**HP-DISC-004**: Build search functionality  
**Priority**: P1 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Search by name, location, amenities  
**Dependencies**: HP-DISC-002  
**Acceptance**: Search returns relevant results

**HP-DISC-005**: Build filter sidebar  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Filters for category, district, amenities, rating  
**Dependencies**: HP-DISC-003  
**Acceptance**: Filters work, update URL params

---

### 10.2 Property Detail Pages

**HP-DISC-101**: Build property detail API  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/public/properties/:id`  
**Description**: Get full property details  
**Dependencies**: HP-DISC-002  
**Acceptance**: Property data with photos, reviews returned

**HP-DISC-102**: Build property detail page  
**Priority**: P1 | **Estimate**: 6 hours | **Status**: TODO  
**Path**: `/properties/:id`  
**Description**: Photo gallery, details, reviews, contact  
**Dependencies**: HP-DISC-101  
**Acceptance**: Full property information displayed

**HP-DISC-103**: Build photo gallery component  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Swipeable gallery with lightbox  
**Dependencies**: HP-DISC-102  
**Acceptance**: Photos swipeable, lightbox opens

**HP-DISC-104**: Build SEO meta tags  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Dynamic meta tags, Open Graph, Schema.org  
**Dependencies**: HP-DISC-102  
**Acceptance**: Pages indexed by Google, rich previews

---

### 10.3 Interactive Map

**HP-DISC-201**: Build map view API  
**Priority**: P2 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/public/properties/map`  
**Description**: Get properties with GPS coordinates  
**Dependencies**: HP-DISC-002  
**Acceptance**: Properties with coordinates returned

**HP-DISC-202**: Build interactive map component  
**Priority**: P2 | **Estimate**: 5 hours | **Status**: TODO  
**Description**: Leaflet/Google Maps with property markers  
**Dependencies**: HP-DISC-201  
**Acceptance**: Map shows properties, markers clickable

**HP-DISC-203**: Build map filters  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Filter map markers by category, district  
**Dependencies**: HP-DISC-202  
**Acceptance**: Map updates based on filters

---

### 10.4 Reviews & Ratings

**HP-DISC-301**: Build review submission API  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/reviews`  
**Description**: Submit review (verified stays only)  
**Dependencies**: HP-DB-105  
**Acceptance**: Reviews saved, pending moderation

**HP-DISC-302**: Build review display component  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Show reviews on property page  
**Dependencies**: HP-DISC-102  
**Acceptance**: Reviews displayed with ratings

**HP-DISC-303**: Build review moderation system  
**Priority**: P2 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Admin can approve/reject reviews  
**Dependencies**: HP-DISC-301  
**Acceptance**: Only approved reviews visible

---

## 11. CERTIFICATE GENERATION

**HP-CERT-001**: Build certificate template  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: PDF template with HP Tourism branding  
**Dependencies**: None  
**Acceptance**: Template renders correctly

**HP-CERT-002**: Build certificate generation service  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Generate PDF certificate on approval  
**Dependencies**: HP-CERT-001, HP-WRKF-202  
**Acceptance**: Certificate generated automatically

**HP-CERT-003**: Build QR code generator  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: QR code for certificate verification  
**Dependencies**: HP-CERT-002  
**Acceptance**: QR code scannable, verifies certificate

**HP-CERT-004**: Build certificate download API  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Route**: `GET /api/certificates/:id/download`  
**Description**: Download certificate PDF  
**Dependencies**: HP-CERT-002  
**Acceptance**: Certificate downloads correctly

**HP-CERT-005**: Build certificate verification page  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Path**: `/verify/:certificateNumber`  
**Description**: Public page to verify certificate authenticity  
**Dependencies**: HP-CERT-003  
**Acceptance**: QR code or number verifies certificate

---

## 12. RENEWAL MANAGEMENT

**HP-RNWL-001**: Build renewal reminder cron job  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Daily job to send renewal reminders  
**Dependencies**: HP-NTFY-305  
**Acceptance**: Reminders sent 90/60/30/7 days before expiry

**HP-RNWL-002**: Build renewal form (pre-filled)  
**Priority**: P1 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Re-use registration form, pre-fill data  
**Dependencies**: HP-HMST-301  
**Acceptance**: All previous data pre-filled

**HP-RNWL-003**: Build renewal submission API  
**Priority**: P1 | **Estimate**: 3 hours | **Status**: TODO  
**Route**: `POST /api/applications/:id/renew`  
**Description**: Submit renewal application  
**Dependencies**: HP-HMST-1001  
**Acceptance**: Renewal saved, payment triggered

**HP-RNWL-004**: Build late fee calculation  
**Priority**: P1 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: Add 10% if renewed after expiry  
**Dependencies**: HP-HMST-101  
**Acceptance**: Late fee applied correctly

**HP-RNWL-005**: Build fast-track approval logic  
**Priority**: P2 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Auto-approve if no changes  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Unchanged renewals approved in 2 days

---

## 13. TESTING & QA

### 13.1 Unit Tests

**HP-TEST-001**: Write tests for fee calculation  
**Priority**: P0 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Test all category fee calculations  
**Dependencies**: HP-HMST-101  
**Acceptance**: 100% code coverage for fee calc

**HP-TEST-002**: Write tests for category validation  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Test all validation rules  
**Dependencies**: HP-HMST-001, HP-HMST-002, HP-HMST-003  
**Acceptance**: All edge cases covered

**HP-TEST-003**: Write tests for workflow state machine  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Test all state transitions  
**Dependencies**: HP-WRKF-001  
**Acceptance**: Invalid transitions caught

**HP-TEST-004**: Write tests for payment processing  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Mock payment gateway, test flows  
**Dependencies**: HP-PMNT-001  
**Acceptance**: All payment scenarios tested

---

### 13.2 Integration Tests

**HP-TEST-101**: Write API integration tests  
**Priority**: P1 | **Estimate**: 5 hours | **Status**: TODO  
**Description**: Test all API endpoints  
**Dependencies**: All backend APIs  
**Acceptance**: All endpoints return correct responses

**HP-TEST-102**: Write database integration tests  
**Priority**: P1 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Test database queries, transactions  
**Dependencies**: All database operations  
**Acceptance**: Queries work, rollbacks tested

---

### 13.3 End-to-End Tests

**HP-TEST-201**: Write E2E test for registration flow  
**Priority**: P0 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: Full flow from register to certificate  
**Tool**: Playwright  
**Acceptance**: Flow completes without errors

**HP-TEST-202**: Write E2E test for officer approval  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Officer login, review, approve  
**Tool**: Playwright  
**Acceptance**: Approval workflow works end-to-end

**HP-TEST-203**: Write E2E test for payment  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Payment initiation to receipt  
**Tool**: Playwright  
**Acceptance**: Payment flow completes

---

## 14. DEPLOYMENT & DEVOPS

**HP-DEVOPS-001**: Set up CI/CD pipeline  
**Priority**: P1 | **Estimate**: 4 hours | **Status**: TODO  
**Description**: GitHub Actions for automated testing, deployment  
**Dependencies**: HP-TEST-101  
**Acceptance**: PRs trigger tests, main branch deploys

**HP-DEVOPS-002**: Configure production environment  
**Priority**: P0 | **Estimate**: 3 hours | **Status**: TODO  
**Description**: Set up production env vars, secrets  
**Dependencies**: HP-CORE-005  
**Acceptance**: Production env ready

**HP-DEVOPS-003**: Set up monitoring (Sentry)  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Error tracking, performance monitoring  
**Dependencies**: HP-DEVOPS-002  
**Acceptance**: Errors reported to Sentry

**HP-DEVOPS-004**: Set up logging system  
**Priority**: P1 | **Estimate**: 2 hours | **Status**: TODO  
**Description**: Structured logging with Winston  
**Dependencies**: None  
**Acceptance**: Logs searchable, rotated daily

**HP-DEVOPS-005**: Configure SSL/TLS  
**Priority**: P0 | **Estimate**: 1 hour | **Status**: TODO  
**Description**: HTTPS enforced, HSTS enabled  
**Dependencies**: HP-DEVOPS-002  
**Acceptance**: All traffic over HTTPS

---

## 📊 SUMMARY STATISTICS

### By Module
- **CORE**: 11 tasks
- **AUTH**: 15 tasks
- **HMST**: 40 tasks
- **WRKF**: 16 tasks
- **PMNT**: 12 tasks
- **DOCS**: 12 tasks
- **NTFY**: 15 tasks
- **DASH**: 12 tasks
- **DISC**: 15 tasks
- **CERT**: 5 tasks
- **RNWL**: 5 tasks
- **TEST**: 10 tasks
- **DEVOPS**: 5 tasks

### By Priority
- **P0 (Critical)**: 145 tasks
- **P1 (High)**: 95 tasks
- **P2 (Medium)**: 35 tasks
- **P3 (Low)**: 0 tasks

### Total: **275+ Development Tasks**

---

## 📝 HOW TO USE THIS DOCUMENT

**For Project Managers:**
- Use task IDs for tracking in Jira/Trello
- Estimate total effort (sum of all estimates)
- Assign tasks to developers
- Track dependencies

**For Developers:**
- Pick tasks from TODO list
- Update status as you work
- Mark blockers immediately
- Cross-reference acceptance criteria

**For QA:**
- Use acceptance criteria for test cases
- Focus on P0 tasks first
- Verify dependencies before testing

---

**End of Development Task Inventory**

*This comprehensive task breakdown ensures every piece of the system is tracked, estimated, and deliverable. Use these task IDs for sprint planning and progress tracking.*
