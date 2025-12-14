# 📋 Master Product Requirements Document
## HP Tourism eServices Portal - 2025 Digital Transformation

---

### 📊 Document Control
| **Property** | **Details** |
|-------------|------------|
| **Project Name** | HP Tourism eServices Portal 2025 |
| **Version** | 1.0 |
| **Date** | October 23, 2025 |
| **Status** | Planning Phase |
| **Owner** | Himachal Pradesh Tourism Department |
| **Stakeholders** | Property Owners, Tourism Officers, Public Users, Government Officials |

---

## 🎯 Executive Summary

### Vision Statement
Transform Himachal Pradesh's tourism registration system from a bureaucratic compliance portal into India's most advanced digital tourism ecosystem - reducing processing time from **105 days to 7-15 days**, improving user experience by **10x**, and positioning HP as the nation's digital tourism leader.

### Current State Analysis
**Existing System (Netgen 2019):**
- 📊 **Scale:** 16,973 applications, 24,437 users, 22,192 transactions
- ⏱️ **Processing Time:** 105 days average
- 🎨 **User Experience:** Outdated UI, complex workflows, poor mobile support
- 🏛️ **Technology:** Legacy PHP system, limited automation
- ⚠️ **Pain Points:** Manual document verification, redundant data entry, no public discovery

**2025 Mandatory Upgrades:**
- ✅ New Homestay Rules 2025 (Diamond/Gold/Silver categories)
- ✅ Automated fee calculation system
- ✅ Digital compliance verification
- ✅ Enhanced reporting and analytics

### Transformation Goals
| **Metric** | **Current** | **Target** | **Improvement** |
|-----------|------------|-----------|-----------------|
| Processing Time | 105 days | 7-15 days | **85% reduction** |
| User Satisfaction | 3.2/5 | 4.5/5 | **40% increase** |
| Mobile Traffic | 15% | 60% | **4x growth** |
| Automation Rate | 20% | 80% | **4x improvement** |
| Public Discovery | 0% | 100% | **New capability** |

---

## 🎨 Product Pillars

### Pillar 1️⃣: Smart Compliance Hub
**Purpose:** Streamline registration and renewal for all tourism properties

**Features:**
- 🏠 Multi-type registration (Homestays, Hotels, Guest Houses, Travel Agencies, Adventure Operators)
- 🤖 Automated form validation and fee calculation
- 📄 Smart document upload with AI verification
- ⚡ Real-time application status tracking
- 💳 Integrated payment gateway
- 📱 Mobile-first responsive design
- 🔔 Smart notifications (SMS, Email, WhatsApp)

### Pillar 2️⃣: Tourism Discovery Platform
**Purpose:** Public-facing showcase for registered properties

**Features:**
- 🗺️ Interactive property map with filters
- 🔍 Advanced search (location, category, amenities, price)
- 📸 Rich media galleries
- ⭐ Reviews and ratings system
- 📅 Real-time availability calendar
- 🎫 Direct booking integration
- 🌐 Multilingual support (Hindi, English, Punjabi)

### Pillar 3️⃣: Analytics & Governance Dashboard
**Purpose:** Data-driven insights for tourism department

**Features:**
- 📊 Real-time analytics and reporting
- 📈 Tourism trends visualization
- 🎯 Performance metrics tracking
- 🗂️ Compliance monitoring
- 💰 Revenue analytics
- 🔍 Fraud detection alerts
- 📑 Custom report generation

---

## 👥 User Personas & Journeys

### Persona 1: Property Owner (Rajesh - Homestay in Manali)
**Profile:**
- Age: 45, owns 4-room homestay
- Tech-savvy: Medium
- Pain Points: Complex forms, long approval times, unclear requirements

**User Journey:**
1. 📝 Register account with Aadhaar verification
2. 🏠 Select "Homestay" registration type
3. ✍️ Fill guided form (auto-save, smart validation)
4. 📄 Upload documents (drag-drop, mobile camera)
5. 💳 Pay fees (auto-calculated based on category)
6. 📊 Track application status in real-time
7. 🎉 Receive digital certificate
8. 🔄 Set reminders for annual renewal

### Persona 2: Tourism Officer (Priya - District Officer, Shimla)
**Profile:**
- Age: 35, handles 200+ applications/month
- Tech-savvy: High
- Pain Points: Manual verification, paper shuffling, reporting overhead

**User Journey:**
1. 📥 View pending applications dashboard
2. 🔍 Review application with smart checklist
3. ✅ Verify documents (AI-assisted flagging)
4. 💬 Request clarifications (in-app messaging)
5. ✔️ Approve/reject with notes
6. 📤 Auto-forward to state level
7. 📊 Generate compliance reports

### Persona 3: Tourist (Sarah - Planning Himachal Trip)
**Profile:**
- Age: 28, first-time visitor to Himachal
- Tech-savvy: High
- Pain Points: Finding verified properties, authenticity concerns

**User Journey:**
1. 🌐 Visit public discovery portal
2. 🗺️ Browse map view of homestays in Manali
3. 🔍 Filter by "Diamond" category + WiFi + Mountain View
4. 📸 View property photos and reviews
5. ✅ Verify government certification
6. 📅 Check availability calendar
7. 📞 Contact owner directly or book online

---

## 🛠️ Functional Requirements

### FR-001: User Management & Authentication

#### FR-001.1: Multi-Role Authentication System
**Priority:** P0 (Critical)

**Requirements:**
- ✅ Role-based access control (Property Owner, District Officer, State Officer, Admin, Public User)
- ✅ Secure authentication with session management
- ✅ Aadhaar integration for property owners
- ✅ Password recovery with OTP verification
- ✅ Two-factor authentication for officers
- ✅ Session timeout after 30 minutes of inactivity

**User Stories:**
```
US-001.1: As a property owner, I want to register using my mobile number 
          so that I can start my application quickly
          
US-001.2: As a district officer, I want secure login with 2FA 
          so that sensitive data remains protected
          
US-001.3: As a public user, I want to browse properties without login 
          so that I can explore options easily
```

**Acceptance Criteria:**
- [ ] Users can register with mobile number + OTP
- [ ] Officers must complete 2FA setup
- [ ] Password must meet complexity requirements (8+ chars, uppercase, number, special)
- [ ] Account lockout after 5 failed attempts
- [ ] Session tokens expire after 30 minutes

---

### FR-002: Homestay Registration (2025 Rules Compliance)

#### FR-002.1: Diamond Category Registration
**Priority:** P0 (Critical)

**Requirements:**
- ✅ Registration form with 40+ fields (property details, owner info, amenities, rooms)
- ✅ Auto-categorization based on criteria (5+ rooms, A/C, WiFi, etc.)
- ✅ Fee calculation: ₹20,000 + ₹1,000/room
- ✅ Document upload (property photos, ownership proof, fire safety, pollution clearance)
- ✅ GPS location capture for property mapping
- ✅ Draft save functionality (auto-save every 30 seconds)

**2025 Rules Validation:**
| **Criteria** | **Validation** | **Error Message** |
|-------------|----------------|-------------------|
| Minimum 5 rooms | Count rooms >= 5 | "Diamond category requires minimum 5 rooms" |
| Air conditioning | Check amenity checkbox | "A/C in all rooms required for Diamond" |
| WiFi required | Check amenity checkbox | "Free WiFi required for Diamond category" |
| Fire safety NOC | Document upload required | "Fire safety certificate is mandatory" |
| Min room size 120 sq ft | Number input validation | "Each room must be at least 120 sq ft" |

**User Stories:**
```
US-002.1: As a homestay owner with 6 rooms, I want the system to auto-suggest 
          Diamond category so that I don't select wrong category
          
US-002.2: As a homestay owner, I want to save my partially filled form 
          so that I can complete it later
          
US-002.3: As a homestay owner, I want to see fee breakdown 
          so that I understand what I'm paying for
```

**Acceptance Criteria:**
- [ ] Form validates all mandatory fields before submission
- [ ] Category auto-suggestion based on entered data
- [ ] Fee calculation displays: Base fee + Per-room fee + GST
- [ ] All uploaded documents are virus-scanned
- [ ] GPS coordinates are captured with ±10m accuracy
- [ ] Draft saves every 30 seconds automatically

---

#### FR-002.2: Gold Category Registration
**Priority:** P0 (Critical)

**Requirements:**
- ✅ Registration form (3-4 rooms configuration)
- ✅ Fee calculation: ₹10,000 + ₹1,000/room
- ✅ Relaxed amenity requirements vs Diamond
- ✅ Same document upload system
- ✅ Option to upgrade to Diamond category

**2025 Rules Validation:**
| **Criteria** | **Validation** |
|-------------|----------------|
| 3-4 rooms | Count validation |
| Basic amenities | Minimum checklist |
| Fire safety NOC | Document required |
| Min room size 100 sq ft | Number validation |

---

#### FR-002.3: Silver Category Registration
**Priority:** P0 (Critical)

**Requirements:**
- ✅ Registration form (1-2 rooms configuration)
- ✅ Fee calculation: ₹5,000 + ₹1,000/room
- ✅ Basic amenity requirements
- ✅ Simplified document checklist
- ✅ Option to upgrade to Gold/Diamond

**2025 Rules Validation:**
| **Criteria** | **Validation** |
|-------------|----------------|
| 1-2 rooms | Count validation |
| Basic safety standards | Minimum checklist |
| Fire safety NOC | Document required |
| Min room size 80 sq ft | Number validation |

---

### FR-003: Multi-Level Approval Workflow

#### FR-003.1: Three-Tier Approval System
**Priority:** P0 (Critical)

**Requirements:**
- ✅ **Level 1:** District Tourism Officer review (SLA: 3 days)
- ✅ **Level 2:** State Tourism Officer review (SLA: 2 days)
- ✅ **Level 3:** Final certification generation (SLA: 1 day)
- ✅ Auto-escalation if SLA breached
- ✅ Parallel processing for non-dependent checks
- ✅ In-app messaging between owner and officers

**Workflow States:**
```
DRAFT → SUBMITTED → DISTRICT_REVIEW → STATE_REVIEW → APPROVED → CERTIFICATE_ISSUED
                   ↓                ↓              ↓
              CLARIFICATION_    REJECTED      REJECTED
               REQUESTED
```

**User Stories:**
```
US-003.1: As a district officer, I want to see only applications 
          assigned to my district so that I can focus on my work
          
US-003.2: As a property owner, I want to receive notifications 
          when my application moves to next stage
          
US-003.3: As a state officer, I want to see flagged applications 
          (AI-detected issues) at the top of my queue
```

**Acceptance Criteria:**
- [ ] Officers see applications sorted by submission date (oldest first)
- [ ] Auto-escalation email sent if SLA breached
- [ ] Property owner receives notification within 5 minutes of status change
- [ ] Rejection must include mandatory reason (min 50 characters)
- [ ] Officers can request clarification (suspends SLA clock)

---

### FR-004: Payment Integration

#### FR-004.1: Multi-Gateway Payment System
**Priority:** P0 (Critical)

**Requirements:**
- ✅ Integration with government payment gateway
- ✅ Support for UPI, Net Banking, Cards, Wallets
- ✅ Auto-calculation based on category + rooms
- ✅ Payment receipt generation (PDF)
- ✅ Refund processing for rejected applications
- ✅ Payment reminder notifications

**Fee Structure (2025):**
| **Category** | **Base Fee** | **Per Room** | **GST** | **Example (5 rooms)** |
|-------------|-------------|-------------|---------|----------------------|
| Diamond | ₹20,000 | ₹1,000 | 18% | ₹29,500 |
| Gold | ₹10,000 | ₹1,000 | 18% | ₹16,520 (4 rooms) |
| Silver | ₹5,000 | ₹1,000 | 18% | ₹8,260 (2 rooms) |

**User Stories:**
```
US-004.1: As a property owner, I want to see exact fee breakdown 
          before making payment
          
US-004.2: As a property owner, I want to receive digital receipt 
          immediately after payment
          
US-004.3: As an admin, I want to track failed payments 
          so that I can assist users
```

**Acceptance Criteria:**
- [ ] Payment page shows itemized breakdown
- [ ] Receipt generated within 30 seconds of successful payment
- [ ] Failed payment triggers automatic retry prompt
- [ ] Refunds processed within 7 working days
- [ ] Payment gateway timeout after 15 minutes

---

### FR-005: Document Management

#### FR-005.1: Smart Document Upload System
**Priority:** P0 (Critical)

**Requirements:**
- ✅ Drag-and-drop file upload
- ✅ Mobile camera integration
- ✅ AI-powered document verification
- ✅ Virus scanning (all uploads)
- ✅ File size limits (5MB per file)
- ✅ Supported formats: PDF, JPG, PNG
- ✅ Document versioning (track replacements)

**Required Documents by Category:**
| **Document Type** | **Diamond** | **Gold** | **Silver** | **Max Size** |
|------------------|------------|---------|----------|-------------|
| Property Photos | 10+ | 5+ | 3+ | 2MB each |
| Ownership Proof | ✅ | ✅ | ✅ | 5MB |
| Fire Safety NOC | ✅ | ✅ | ✅ | 5MB |
| Pollution Clearance | ✅ | ✅ | ❌ | 5MB |
| Building Plan | ✅ | ✅ | ❌ | 5MB |
| Aadhaar Card | ✅ | ✅ | ✅ | 2MB |

**AI Verification Features:**
- 🤖 Auto-detect document type
- 🤖 Extract text from images (OCR)
- 🤖 Flag blurry or unreadable documents
- 🤖 Cross-verify owner name across documents

**User Stories:**
```
US-005.1: As a property owner, I want to upload photos directly 
          from my phone camera
          
US-005.2: As a district officer, I want AI to flag suspicious documents 
          so that I can focus on manual verification
          
US-005.3: As a property owner, I want to replace a document 
          if officer requests a clearer version
```

**Acceptance Criteria:**
- [ ] Upload supports drag-drop and click-to-browse
- [ ] Mobile devices can use camera directly
- [ ] Virus scan completes within 10 seconds
- [ ] AI flags are visible to officers with confidence score
- [ ] Document replacement maintains audit trail

---

### FR-006: Dashboard & Analytics

#### FR-006.1: Property Owner Dashboard
**Priority:** P1 (High)

**Features:**
- 📊 Application status tracker (visual progress bar)
- 📅 Renewal reminder countdown
- 💳 Payment history
- 📄 Download certificates
- 📈 Property views (if on discovery platform)
- 💬 Messages from officers

**Widgets:**
```
┌─────────────────────────────────────┐
│ 🏠 Application Status               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ District Review (Step 2 of 3)       │
│ Estimated completion: 5 days        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📅 Renewal Due: 45 days             │
│ [Renew Now]                         │
└─────────────────────────────────────┘
```

---

#### FR-006.2: Officer Dashboard
**Priority:** P1 (High)

**Features:**
- 📥 Pending applications queue
- ⏰ SLA breach alerts
- 📊 Performance metrics (avg processing time)
- 🔍 Advanced search and filters
- 📑 Bulk approval tools
- 📈 District-wise statistics

**Filters:**
- Category (Diamond/Gold/Silver)
- Status (Pending/Clarification/Reviewed)
- Date range
- SLA status (Within/Breached)
- Priority (AI-flagged, escalated)

---

#### FR-006.3: Admin Analytics Dashboard
**Priority:** P1 (High)

**Features:**
- 📊 Real-time metrics (applications, approvals, revenue)
- 📈 Trend charts (daily/weekly/monthly)
- 🗺️ Geographic heatmap
- 💰 Revenue tracking
- ⚠️ Fraud detection alerts
- 📑 Custom report builder

**Key Metrics:**
- Total applications (today/week/month/year)
- Average processing time
- Approval rate by category
- Revenue by category
- Top performing districts
- Bottleneck identification

---

### FR-007: Tourism Discovery Platform (Public)

#### FR-007.1: Interactive Property Map
**Priority:** P1 (High)

**Features:**
- 🗺️ Map view with property markers
- 📍 GPS-based property locations
- 🔍 Search by location, name, or category
- 🏆 Filter by category (Diamond/Gold/Silver)
- ⭐ Sort by ratings
- 📱 Mobile-optimized map controls

**Map Interactions:**
```
┌─────────────────────────────────────┐
│   🔍 Search: Manali                 │
│   🏆 Filter: [Diamond] [Gold]       │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│         🗺️ MAP VIEW                 │
│                                     │
│   📍 Manali Heights (Diamond)       │
│   📍 Cozy Cottage (Gold)            │
│   📍 Snow View (Silver)             │
│                                     │
│   [Click marker for details]        │
└─────────────────────────────────────┘
```

---

#### FR-007.2: Property Detail Pages
**Priority:** P1 (High)

**Features:**
- 📸 Photo gallery (swipeable on mobile)
- ⭐ Rating and reviews
- ✅ Verification badge (govt certified)
- 📋 Amenities checklist
- 💰 Price range indicator
- 📞 Contact information
- 🌐 Multilingual support
- 📅 Availability calendar (if integrated)

**SEO Optimization:**
- Unique meta descriptions
- Open Graph tags
- Schema.org markup
- Mobile-friendly design

---

### FR-008: Renewal Management

#### FR-008.1: Annual Renewal System
**Priority:** P1 (High)

**Features:**
- 🔔 Automatic renewal reminders (90/60/30/7 days before expiry)
- 📝 Pre-filled renewal forms (carry forward previous data)
- 💳 Quick payment (saved payment methods)
- 📄 Document re-upload (only if expired)
- 🎫 Late fee calculation (after expiry)
- ⚡ Fast-track approval (if no changes)

**Renewal Fee Structure:**
```
Same as initial registration:
Diamond: ₹20,000 + ₹1,000/room
Gold: ₹10,000 + ₹1,000/room
Silver: ₹5,000 + ₹1,000/room

Late fee: +10% if renewed after expiry
```

---

### FR-009: Notifications & Communication

#### FR-009.1: Multi-Channel Notification System
**Priority:** P1 (High)

**Channels:**
- 📧 Email
- 📱 SMS
- 💬 WhatsApp (optional)
- 🔔 In-app notifications
- 📊 Dashboard alerts

**Notification Triggers:**
| **Event** | **Recipient** | **Channels** | **Timing** |
|----------|--------------|-------------|-----------|
| Application submitted | Owner | Email + SMS | Immediate |
| Status change | Owner | Email + SMS + In-app | Within 5 min |
| Clarification requested | Owner | Email + SMS + WhatsApp | Immediate |
| Approval granted | Owner | Email + SMS | Immediate |
| Certificate issued | Owner | Email + In-app | Immediate |
| Renewal due | Owner | Email + SMS | 90/60/30/7 days before |
| SLA breach | Officer | Email + In-app | Immediate |
| New application assigned | Officer | Email + In-app | Within 15 min |

---

### FR-010: Reporting & Compliance

#### FR-010.1: Report Generation System
**Priority:** P2 (Medium)

**Standard Reports:**
- 📊 Monthly application summary
- 💰 Revenue report (by category, district, period)
- 📈 Trend analysis (year-over-year comparison)
- ⏱️ Processing time report
- 🎯 Officer performance report
- 🗺️ Geographic distribution report
- ⚠️ Compliance violations report

**Custom Report Builder:**
- Select metrics
- Choose dimensions (time, location, category)
- Set filters
- Schedule automated delivery
- Export formats: PDF, Excel, CSV

---

## 🎨 UI/UX Requirements

### UX-001: Design System

**Color Palette:**
```
Primary (Forest Green):   #1E5631 - Trust, nature, HP tourism
Secondary (Sky Blue):     #3B82F6 - Technology, clarity
Accent (Sunrise Orange):  #F97316 - CTAs, important actions
Success:                  #10B981 - Approvals, positive states
Warning:                  #F59E0B - Pending actions, alerts
Error:                    #EF4444 - Rejections, errors
Neutral:                  #64748B - Text, backgrounds
```

**Typography:**
```
Headings: Inter (Bold, 600-700 weight)
Body: Inter (Regular, 400 weight)
Monospace: Fira Code (for codes, IDs)
```

**Spacing System:**
```
Small: 8px (form fields, buttons)
Medium: 16px (cards, sections)
Large: 32px (page sections)
```

---

### UX-002: Responsive Design

**Breakpoints:**
```
Mobile:  < 640px  (Single column, stacked forms)
Tablet:  640-1024px  (Two columns, optimized navigation)
Desktop: > 1024px  (Full dashboard, multi-column)
```

**Mobile-First Features:**
- 📱 Touch-optimized buttons (min 44x44px)
- 📸 Camera integration for document upload
- 🎯 Simplified navigation (bottom nav bar)
- ⚡ Progressive loading (mobile data optimization)
- 💾 Offline draft save

---

### UX-003: Accessibility (WCAG 2.1 Level AA)

**Requirements:**
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Color contrast ratio 4.5:1 minimum
- ✅ Focus indicators on all interactive elements
- ✅ Alt text for all images
- ✅ Form labels and error messages
- ✅ Skip to main content link
- ✅ Consistent navigation structure

---

## 🔧 Technical Requirements

### TECH-001: Technology Stack

**Frontend:**
```
Framework: React 18+ with TypeScript
Routing: Wouter
State Management: TanStack Query (React Query)
Forms: React Hook Form + Zod validation
UI Components: Radix UI + shadcn/ui
Styling: Tailwind CSS
Icons: Lucide React
Charts: Recharts
```

**Backend:**
```
Runtime: Node.js 20+
Framework: Express.js
Database: PostgreSQL 15+
ORM: Drizzle ORM
Session: express-session + connect-pg-simple
Validation: Zod
File Upload: Multipart forms
```

**Infrastructure:**
```
Hosting: Replit (development) → Cloud deployment (production)
Database: Neon PostgreSQL (serverless)
Object Storage: Replit Object Storage → S3-compatible (production)
CDN: Cloudflare (for static assets)
SSL/TLS: Automatic (Replit/Cloud provider)
```

---

### TECH-002: Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'owner', 'district_officer', 'state_officer', 'admin', 'public'
  aadhaar_number VARCHAR(12) UNIQUE, -- For property owners
  district VARCHAR(100), -- For officers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Homestay Applications Table
```sql
CREATE TABLE homestay_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Property Details
  property_name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL, -- 'diamond', 'gold', 'silver'
  total_rooms INTEGER NOT NULL,
  address TEXT NOT NULL,
  district VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Owner Details
  owner_name VARCHAR(255) NOT NULL,
  owner_mobile VARCHAR(15) NOT NULL,
  owner_email VARCHAR(255),
  owner_aadhaar VARCHAR(12) NOT NULL,
  
  -- Amenities (JSON)
  amenities JSONB, -- {ac: true, wifi: true, parking: true, ...}
  
  -- Room Details (JSON)
  rooms JSONB, -- [{roomType: 'deluxe', size: 150, count: 3}, ...]
  
  -- Fee Calculation
  base_fee DECIMAL(10, 2) NOT NULL,
  per_room_fee DECIMAL(10, 2) NOT NULL,
  gst_amount DECIMAL(10, 2) NOT NULL,
  total_fee DECIMAL(10, 2) NOT NULL,
  
  -- Workflow
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, district_review, state_review, approved, rejected, clarification_requested
  current_stage VARCHAR(50), -- district, state, final
  
  -- Approval Details
  district_officer_id INTEGER REFERENCES users(id),
  district_review_date TIMESTAMP,
  district_notes TEXT,
  
  state_officer_id INTEGER REFERENCES users(id),
  state_review_date TIMESTAMP,
  state_notes TEXT,
  
  rejection_reason TEXT,
  clarification_requested TEXT,
  
  -- Certificate
  certificate_number VARCHAR(50) UNIQUE,
  certificate_issued_date TIMESTAMP,
  certificate_expiry_date TIMESTAMP,
  
  -- Timestamps
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Documents Table
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES homestay_applications(id),
  document_type VARCHAR(100) NOT NULL, -- 'property_photo', 'ownership_proof', 'fire_safety', etc.
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- AI Verification
  ai_verification_status VARCHAR(50), -- 'pending', 'verified', 'flagged'
  ai_confidence_score DECIMAL(5, 2),
  ai_notes TEXT,
  
  -- Officer Verification
  is_verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verification_date TIMESTAMP,
  verification_notes TEXT
);
```

#### Payments Table
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES homestay_applications(id),
  payment_type VARCHAR(50) NOT NULL, -- 'registration', 'renewal', 'late_fee'
  amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment Gateway
  gateway_transaction_id VARCHAR(255) UNIQUE,
  payment_method VARCHAR(50), -- 'upi', 'netbanking', 'card', 'wallet'
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed, refunded
  
  -- Timestamps
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Receipt
  receipt_number VARCHAR(100) UNIQUE,
  receipt_url TEXT
);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  application_id INTEGER REFERENCES homestay_applications(id),
  
  type VARCHAR(100) NOT NULL, -- 'status_change', 'sla_breach', 'renewal_reminder', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Delivery Channels
  channels JSONB, -- {email: true, sms: true, whatsapp: false, inapp: true}
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Reviews Table (For Discovery Platform)
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES homestay_applications(id),
  user_id INTEGER REFERENCES users(id),
  
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  
  -- Verification
  is_verified_stay BOOLEAN DEFAULT false, -- Only verified guests can review
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### TECH-003: API Specifications

#### Authentication APIs

**POST /api/auth/register**
```json
Request:
{
  "mobile": "9876543210",
  "email": "rajesh@example.com",
  "full_name": "Rajesh Kumar",
  "role": "owner",
  "aadhaar_number": "123456789012"
}

Response (201):
{
  "success": true,
  "user": {
    "id": 1,
    "mobile": "9876543210",
    "full_name": "Rajesh Kumar",
    "role": "owner"
  },
  "message": "OTP sent to mobile number"
}
```

**POST /api/auth/login**
```json
Request:
{
  "mobile": "9876543210",
  "otp": "123456"
}

Response (200):
{
  "success": true,
  "user": {
    "id": 1,
    "mobile": "9876543210",
    "full_name": "Rajesh Kumar",
    "role": "owner"
  },
  "token": "session_token_here"
}
```

---

#### Homestay Application APIs

**POST /api/applications/homestay**
```json
Request:
{
  "property_name": "Manali Heights Homestay",
  "category": "diamond",
  "total_rooms": 6,
  "address": "Old Manali Road, Manali",
  "district": "Kullu",
  "pincode": "175131",
  "latitude": 32.2396,
  "longitude": 77.1887,
  "owner_name": "Rajesh Kumar",
  "owner_mobile": "9876543210",
  "owner_email": "rajesh@example.com",
  "owner_aadhaar": "123456789012",
  "amenities": {
    "ac": true,
    "wifi": true,
    "parking": true,
    "restaurant": false
  },
  "rooms": [
    {
      "roomType": "deluxe",
      "size": 150,
      "count": 4
    },
    {
      "roomType": "suite",
      "size": 200,
      "count": 2
    }
  ]
}

Response (201):
{
  "success": true,
  "application": {
    "id": 1,
    "application_number": "HP-HS-2025-000001",
    "status": "draft",
    "total_fee": 29500,
    "fee_breakdown": {
      "base_fee": 20000,
      "per_room_fee": 6000,
      "subtotal": 26000,
      "gst": 3500,
      "total": 29500
    }
  }
}
```

**GET /api/applications/my-applications**
```json
Response (200):
{
  "success": true,
  "applications": [
    {
      "id": 1,
      "application_number": "HP-HS-2025-000001",
      "property_name": "Manali Heights Homestay",
      "category": "diamond",
      "status": "district_review",
      "submitted_at": "2025-10-20T10:30:00Z",
      "current_stage": "district"
    }
  ],
  "total": 1
}
```

**PATCH /api/applications/:id/submit**
```json
Response (200):
{
  "success": true,
  "application": {
    "id": 1,
    "status": "submitted",
    "submitted_at": "2025-10-23T14:30:00Z",
    "message": "Application submitted successfully. Payment required to proceed."
  }
}
```

---

#### Officer Review APIs

**GET /api/officer/applications/pending**
```json
Response (200):
{
  "success": true,
  "applications": [
    {
      "id": 1,
      "application_number": "HP-HS-2025-000001",
      "property_name": "Manali Heights Homestay",
      "owner_name": "Rajesh Kumar",
      "category": "diamond",
      "submitted_at": "2025-10-20T10:30:00Z",
      "sla_days_remaining": 2,
      "ai_flags": ["document_clarity_low"]
    }
  ],
  "total": 15
}
```

**POST /api/officer/applications/:id/approve**
```json
Request:
{
  "notes": "All documents verified. Property meets Diamond category standards."
}

Response (200):
{
  "success": true,
  "application": {
    "id": 1,
    "status": "state_review",
    "current_stage": "state",
    "message": "Application forwarded to State Officer"
  }
}
```

**POST /api/officer/applications/:id/reject**
```json
Request:
{
  "reason": "Fire safety NOC is expired. Please upload a valid certificate."
}

Response (200):
{
  "success": true,
  "application": {
    "id": 1,
    "status": "rejected",
    "rejection_reason": "Fire safety NOC is expired. Please upload a valid certificate."
  }
}
```

---

#### Payment APIs

**POST /api/payments/initiate**
```json
Request:
{
  "application_id": 1,
  "payment_type": "registration",
  "amount": 29500
}

Response (200):
{
  "success": true,
  "payment": {
    "id": 1,
    "payment_url": "https://gateway.example.com/pay/abc123",
    "transaction_id": "TXN_2025_001"
  }
}
```

**POST /api/payments/callback** (Webhook from payment gateway)
```json
Request:
{
  "transaction_id": "TXN_2025_001",
  "status": "success",
  "amount": 29500,
  "payment_method": "upi"
}

Response (200):
{
  "success": true,
  "receipt_number": "REC-2025-000001",
  "receipt_url": "/receipts/REC-2025-000001.pdf"
}
```

---

#### Public Discovery APIs

**GET /api/public/properties**
```json
Query Params:
?district=Kullu&category=diamond&amenities=wifi,parking&limit=20&offset=0

Response (200):
{
  "success": true,
  "properties": [
    {
      "id": 1,
      "property_name": "Manali Heights Homestay",
      "category": "diamond",
      "district": "Kullu",
      "rating": 4.8,
      "total_reviews": 24,
      "amenities": ["wifi", "parking", "ac"],
      "latitude": 32.2396,
      "longitude": 77.1887,
      "is_verified": true,
      "certificate_number": "HP-HS-2025-000001"
    }
  ],
  "total": 45
}
```

**GET /api/public/properties/:id**
```json
Response (200):
{
  "success": true,
  "property": {
    "id": 1,
    "property_name": "Manali Heights Homestay",
    "category": "diamond",
    "total_rooms": 6,
    "address": "Old Manali Road, Manali",
    "district": "Kullu",
    "rating": 4.8,
    "total_reviews": 24,
    "amenities": {
      "ac": true,
      "wifi": true,
      "parking": true
    },
    "photos": [
      "/uploads/property-1-photo-1.jpg",
      "/uploads/property-1-photo-2.jpg"
    ],
    "owner_contact": {
      "name": "Rajesh Kumar",
      "mobile": "9876543210"
    },
    "certificate": {
      "number": "HP-HS-2025-000001",
      "issued_date": "2025-10-25",
      "expiry_date": "2026-10-25"
    },
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "text": "Excellent hospitality and beautiful views!",
        "user_name": "Sarah",
        "created_at": "2025-10-15"
      }
    ]
  }
}
```

---

## 📊 Success Metrics & KPIs

### User Adoption
- **Target:** 80% of existing users migrate to new system within 3 months
- **Measurement:** Active user count, application submissions

### Processing Efficiency
- **Target:** Average processing time reduced from 105 days to 7-15 days
- **Measurement:** Time from submission to certificate issuance

### User Satisfaction
- **Target:** 4.5/5 star rating on user surveys
- **Measurement:** Post-application feedback forms

### Mobile Adoption
- **Target:** 60% of traffic from mobile devices
- **Measurement:** Google Analytics mobile vs desktop

### Automation Rate
- **Target:** 80% of verifications automated
- **Measurement:** Manual interventions / total applications

### Discovery Platform
- **Target:** 10,000 monthly visitors within 6 months
- **Measurement:** Public portal analytics

### Revenue Transparency
- **Target:** 100% payment tracking and reconciliation
- **Measurement:** Payment gateway reports

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic infrastructure and core registration flow

**Deliverables:**
- ✅ User authentication (mobile OTP)
- ✅ Database schema implementation
- ✅ Basic UI framework
- ✅ Homestay registration form (all 3 categories)
- ✅ Draft save functionality
- ✅ Fee calculation engine

**Success Criteria:**
- Users can register and login
- Property owners can create homestay applications
- Fee calculation works correctly for all categories

---

### Phase 2: Workflows & Payments (Weeks 3-4)
**Goal:** Complete application lifecycle

**Deliverables:**
- ✅ Document upload system
- ✅ Multi-level approval workflow
- ✅ Payment gateway integration
- ✅ Officer dashboards
- ✅ Email/SMS notifications
- ✅ Application status tracking

**Success Criteria:**
- Applications move through full workflow
- Payments processed successfully
- Officers can review and approve applications
- Users receive timely notifications

---

### Phase 3: Discovery Platform (Weeks 5-6)
**Goal:** Public-facing property showcase

**Deliverables:**
- ✅ Public property listing
- ✅ Interactive map view
- ✅ Search and filters
- ✅ Property detail pages
- ✅ Reviews and ratings
- ✅ SEO optimization

**Success Criteria:**
- Public can discover properties
- Map shows accurate locations
- Search returns relevant results
- Pages are SEO-friendly

---

### Phase 4: Analytics & Admin (Weeks 7-8)
**Goal:** Data insights and governance

**Deliverables:**
- ✅ Admin analytics dashboard
- ✅ Report generation system
- ✅ Performance metrics
- ✅ Compliance monitoring
- ✅ Fraud detection alerts
- ✅ Custom report builder

**Success Criteria:**
- Real-time metrics visible
- Reports generate correctly
- Admins can track all KPIs
- Alerts trigger appropriately

---

### Phase 5: Polish & Launch (Weeks 9-12)
**Goal:** Production-ready system

**Deliverables:**
- ✅ Mobile optimization
- ✅ Accessibility compliance
- ✅ Performance optimization
- ✅ Security audit
- ✅ User training materials
- ✅ Migration from old system
- ✅ Go-live support

**Success Criteria:**
- Passes security audit
- Meets WCAG 2.1 AA standards
- Page load < 3 seconds
- Zero critical bugs
- Users successfully migrated

---

## ⚠️ Risks & Mitigation

### Risk 1: User Adoption Resistance
**Impact:** High | **Probability:** Medium

**Mitigation:**
- Comprehensive user training program
- Gradual migration (run both systems in parallel for 1 month)
- Dedicated support helpline
- Video tutorials and guides

---

### Risk 2: Payment Gateway Integration Issues
**Impact:** High | **Probability:** Low

**Mitigation:**
- Early integration testing
- Fallback to manual payment tracking
- Multiple gateway support
- Thorough error handling

---

### Risk 3: Data Migration Challenges
**Impact:** Medium | **Probability:** Medium

**Mitigation:**
- Automated migration scripts with validation
- Backup old system before migration
- Phased migration (district by district)
- Manual verification of critical records

---

### Risk 4: Performance Under Load
**Impact:** Medium | **Probability:** Low

**Mitigation:**
- Load testing before launch
- Database indexing optimization
- CDN for static assets
- Horizontal scaling capability

---

### Risk 5: Security Vulnerabilities
**Impact:** High | **Probability:** Low

**Mitigation:**
- Regular security audits
- Penetration testing
- OWASP compliance
- Bug bounty program

---

## 📚 Appendices

### Appendix A: 2025 Homestay Rules Summary
See attached PDF: `Presentation-on-changes-regarding-Home-Stay-Rules-2025.pdf`

**Key Changes:**
- Introduction of Diamond/Gold/Silver categories
- Updated fee structure
- Enhanced amenity requirements
- Stricter safety compliance
- Annual renewal mandatory

---

### Appendix B: Glossary

| **Term** | **Definition** |
|---------|---------------|
| SLA | Service Level Agreement - Maximum time allowed for each approval stage |
| OTP | One-Time Password - SMS-based authentication |
| NOC | No Objection Certificate - Required compliance document |
| KPI | Key Performance Indicator - Measurable success metric |
| WCAG | Web Content Accessibility Guidelines - Accessibility standards |
| SEO | Search Engine Optimization - Improving search visibility |

---

### Appendix C: Contact & Stakeholders

| **Role** | **Name** | **Responsibility** |
|---------|---------|-------------------|
| Product Owner | [TBD] | Overall vision and requirements |
| Tech Lead | [TBD] | Technical architecture and development |
| UX Designer | [TBD] | User experience and design |
| Project Manager | [TBD] | Timeline and delivery |
| QA Lead | [TBD] | Testing and quality assurance |

---

## 📝 Document Version History

| **Version** | **Date** | **Author** | **Changes** |
|------------|---------|-----------|------------|
| 1.0 | Oct 23, 2025 | Replit Agent | Initial comprehensive PRD |

---

**End of Master PRD**

*This document serves as the single source of truth for the HP Tourism eServices Portal 2025 project. All development, design, and implementation decisions should align with the requirements specified herein.*
