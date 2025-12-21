# HP Tourism Unified Services Portal
## Roadmap: Release 0.6.X → Release 1.X.X

**Document Version:** 1.0  
**Last Updated:** December 21, 2025  
**Author:** Development Team

---

## Executive Summary

The HP Tourism eServices Portal is evolving from a **Homestay-focused application** (R 0.6.X) into a **Unified Tourism Services Platform** (R 1.X.X) capable of handling 8+ tourism-related services under one roof.

This document outlines:
- What we currently have
- The agreed architecture
- The implementation roadmap

---

## Table of Contents

1. [Current State (R 0.6.X)](#current-state-r-06x)
2. [Target State (R 1.X.X)](#target-state-r-1xx)
3. [Architecture](#architecture)
4. [Roadmap & Phases](#roadmap--phases)
5. [Technical Specifications](#technical-specifications)

---

## Current State (R 0.6.X)

### What's Working ✅

#### Homestay Services (8 Application Types)
| Service | Status | Notes |
|---------|--------|-------|
| New Registration | ✅ Complete | Full workflow: Owner → DA → DTDO → Inspection → Payment → Approved |
| Existing RC Onboarding | ✅ Complete | Legacy RC migration with optional inspection, no payment |
| Add Rooms | ✅ Complete | Amendment to existing certificate |
| Delete Rooms | ✅ Complete | Optional inspection, no payment |
| Category Upgrade | ✅ Complete | Silver → Gold → Diamond |
| Cancel Certificate | ✅ Complete | RC revocation workflow |
| Renewal | ⚪ Foundation | Future: annual renewal |
| Modifications | ⚪ Foundation | Future: property changes |

#### User Roles
| Role | Capabilities |
|------|--------------|
| Property Owner | Submit applications, track status, make corrections, download RC |
| Dealing Assistant (DA) | Scrutiny, forward to DTDO, schedule inspections, submit reports |
| District Tourism Officer (DTDO) | Review, approve/reject, issue certificates |
| Super Admin | Manage settings, view analytics |

#### Key Features
- Complete application lifecycle management
- Multi-step application form with validation
- Document upload and verification
- Site inspection workflow
- HimKosh payment integration
- RC Certificate generation (PDF)
- Status notifications (SMS/future)
- Analytics dashboard
- Workflow monitoring dashboard

#### Known Issues (Being Addressed)
- Status complexity (30+ statuses → should consolidate)
- Role boundary confusion in some workflows
- Dashboard navigation can be simplified

---

## Target State (R 1.X.X)

### Vision: Unified Tourism Services Platform

```
┌─────────────────────────────────────────────────────────────────┐
│                    HP TOURISM SERVICES PORTAL                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │Homestay │ │Adventure│ │ Rafting │ │ Camping │ │  More   │  │
│   │  B&B    │ │ Sports  │ │         │ │         │ │Services │  │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│        │           │           │           │           │        │
│        └───────────┴───────────┴───────────┴───────────┘        │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  UNIFIED PIPELINE  │                        │
│                    │  (Same DA/DTDO)    │                        │
│                    └───────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Services to Support (8 Total)

| # | Service | Priority | Notes |
|---|---------|----------|-------|
| 1 | **Homestay/B&B** | 🟢 Now | Foundation - 90% complete |
| 2 | **Adventure Sports** | 🟡 This Week | Partial foundation exists |
| 3 | Rafting | ⚪ Future | |
| 4 | Camping | ⚪ Future | |
| 5 | Paragliding | ⚪ Future | |
| 6 | Trekking/Mountaineering | ⚪ Future | |
| 7 | Hotel/Resort | ⚪ Future | |
| 8 | Tour Operator | ⚪ Future | |

### New Capabilities

| Feature | Description |
|---------|-------------|
| **Service Picker** | Owners select which services their business offers |
| **Unified Dashboard** | Officers see all services with filter tabs |
| **Grievance Management** | Ticket system for complaints and support |
| **Multi-Service Support** | One owner can offer multiple services |
| **Configurable Workflows** | Each service has customizable DA/Inspection/Payment requirements |

---

## Architecture

### Unified Pipeline Model

All services follow the same base pipeline with **configurable steps**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED SERVICE PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [OWNER] ──▶ [DA] ──▶ [DTDO] ──▶ [INSPECTION] ──▶ [PAYMENT]    │
│   Submits    (opt)    (always)     (optional)      (optional)   │
│                                                                  │
│                           │                                      │
│                           ▼                                      │
│                      [APPROVED]                                  │
│                                                                  │
│   ◄─────────── [CORRECTIONS LOOP] ──────────────────────────►   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Service Configuration Matrix

| Service | Type | DA Required | Inspection | Payment |
|---------|------|-------------|------------|---------|
| Homestay | new_registration | ✅ Yes | ✅ Required | ✅ Required |
| Homestay | existing_rc_onboarding | ⚙️ Configurable | ⚪ Optional | ❌ Skip |
| Homestay | add_rooms | ✅ Yes | ✅ Required | ✅ Required |
| Homestay | delete_rooms | ✅ Yes | ⚪ Optional | ❌ Skip |
| Homestay | change_category | ✅ Yes | ✅ Required | ✅ Required |
| Homestay | cancel_certificate | ✅ Yes | ❌ Skip | ❌ Skip |
| Adventure Sports | new_registration | ⚙️ TBD | ⚙️ TBD | ⚙️ TBD |
| Adventure Sports | renewal | ⚙️ TBD | ⚙️ TBD | ⚙️ TBD |

---

### User Interface: Sidebar Design

#### Owner/Service Provider View

```
┌─────────────────────────────┐
│ 🏠 HOME                     │
│    └─ Dashboard             │
├─────────────────────────────┤
│ 📋 APPLICATIONS             │
│    ├─ Homestay              │
│    ├─ Adventure Sports      │
│    └─ [Add more services]   │
├─────────────────────────────┤
│ 🎫 SUPPORT                  │
│    ├─ Raise Grievance       │
│    └─ My Tickets            │
├─────────────────────────────┤
│ ⚙️ ACCOUNT                  │
│    ├─ My Profile            │
│    └─ Download RC           │
└─────────────────────────────┘
```

**First Login Experience:**  
New users see a service selection screen to personalize their sidebar.

---

#### Officer View (DA/DTDO)

```
┌─────────────────────────────┐
│ 🏠 HOME                     │
│    └─ Dashboard             │
├─────────────────────────────┤
│ 📋 WORK QUEUES              │
│    ├─ Homestay        (5)   │  ← Badge shows pending
│    ├─ Adventure Sports(2)   │
│    └─ [Other services...]   │
├─────────────────────────────┤
│ 🎫 GRIEVANCES               │
│    ├─ Open Tickets    (3)   │
│    ├─ In Progress     (1)   │
│    └─ Resolved              │
├─────────────────────────────┤
│ 📊 INSIGHTS                 │
│    ├─ Analytics             │  ← Existing page (keep)
│    ├─ Workflow Monitor      │  ← Existing page (keep)
│    └─ Reports               │
├─────────────────────────────┤
│ ⚙️ TOOLS                    │
│    ├─ Search                │
│    └─ My Profile            │
└─────────────────────────────┘
```

---

#### Officer Dashboard with Service Tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE: [Homestay ▼]  [Adventure Sports]  [Rafting]  [+More]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │   NEW (5)      │  │  IN PROCESS    │  │   COMPLETED    │     │
│  │                │  │     (3)        │  │     (12)       │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Application List (filtered by selected service + stage)   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Grievance Management System

**Owner submits ticket → DA reviews/resolves → DTDO escalation if needed → Closed**

| Status | Description |
|--------|-------------|
| Open | New ticket submitted |
| In Progress | Officer is working on it |
| Escalated | Moved to DTDO for resolution |
| Resolved | Issue fixed, awaiting owner confirmation |
| Closed | Owner confirmed resolution |

---

## Roadmap & Phases

### Phase 1: Stabilize Homestay (Current)
**Timeline:** Now  
**Goal:** Complete testing and fix any remaining issues

| Task | Status |
|------|--------|
| New Registration workflow | ✅ Complete |
| Add/Delete Rooms | ✅ Complete |
| Category Upgrade | ✅ Complete |
| Cancel Certificate | ✅ Complete |
| Existing RC Onboarding | ✅ Complete |
| DA bypass config for Existing RC | 🔄 Next |
| End-to-end testing | 🔄 In Progress |

**Deliverable:** Test script created (`Manual_Test_Script_R1.0.csv`)

---

### Phase 2: Sidebar & UX Restructure
**Timeline:** After Phase 1  
**Goal:** Implement new sidebar architecture

| Task | Description |
|------|-------------|
| Owner sidebar grouping | 4 sections: Home, Applications, Support, Account |
| Officer sidebar grouping | 5 sections: Home, Work Queues, Grievances, Insights, Tools |
| Service picker (owner first login) | Let owners choose their services |
| Dashboard service tabs | Officers can switch between services |
| Keep Analytics & Workflow Monitor | Preserve existing pages for enhancement |

---

### Phase 3: Adventure Sports
**Timeline:** This week (after Phase 1 & 2)  
**Goal:** Add second service using the unified architecture

| Task | Description |
|------|-------------|
| Review existing foundation | Partial implementation exists |
| Configure service pipeline | Set DA/Inspection/Payment requirements |
| Add to officer dashboards | New tab in Work Queues |
| Add to owner sidebar | New option in Applications section |
| Test end-to-end | Verify workflow completion |

---

### Phase 4: Grievance System
**Timeline:** After Phase 3  
**Goal:** Implement ticket-based support

| Task | Description |
|------|-------------|
| Owner ticket submission form | Category, description, attachments |
| Officer ticket queue | View, assign, respond |
| Escalation workflow | DA → DTDO |
| Resolution tracking | Status updates, closure |

---

### Phase 5: Remaining Services (Future)
**Timeline:** As needed  
**Goal:** Add services 3-8

Each new service follows the same pattern:
1. Configure pipeline in database
2. Add forms specific to the service
3. Add to sidebar and dashboards
4. Test and deploy

---

## Technical Specifications

### Database Changes Needed

```sql
-- User service preferences
ALTER TABLE users ADD COLUMN enabled_services TEXT[] DEFAULT NULL;

-- Service pipeline configuration
CREATE TABLE service_pipeline_config (
  id UUID PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL,  -- 'homestay', 'adventure_sports'
  application_kind VARCHAR(50) NOT NULL,  -- 'new_registration', 'add_rooms'
  da_required BOOLEAN DEFAULT TRUE,
  inspection_required VARCHAR(20) DEFAULT 'required',  -- 'required', 'optional', 'skip'
  payment_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Grievance tickets
CREATE TABLE grievance_tickets (
  id UUID PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE,
  user_id UUID REFERENCES users(id),
  application_id UUID REFERENCES homestay_applications(id),
  category VARCHAR(50),
  subject VARCHAR(200),
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/config/navigation.ts` | New sidebar structure |
| `client/src/pages/da/dashboard.tsx` | Service tabs |
| `client/src/pages/dtdo/dashboard.tsx` | Service tabs |
| `client/src/components/app-sidebar.tsx` | Grouped sections |
| `server/routes/applications/index.ts` | Service filtering |
| `shared/schema.ts` | New tables |

---

## Success Criteria

### R 1.0.0 Release Requirements

- [ ] All Homestay workflows tested and stable
- [ ] New sidebar architecture implemented
- [ ] Adventure Sports service added
- [ ] Service selector for owners
- [ ] Officer dashboards with service tabs
- [ ] Grievance system foundation

### Key Metrics

| Metric | Target |
|--------|--------|
| Average processing time | < 15 days |
| Application bottlenecks | < 5% stuck > 7 days |
| User satisfaction | No critical UX complaints |

---

## Conclusion

The HP Tourism Unified Services Portal (R 1.X.X) represents a significant evolution from a single-service application to a multi-service platform. By implementing a unified pipeline model and clean UI architecture, we enable:

1. **Scalability** - Easy addition of new tourism services
2. **Consistency** - Same workflow patterns across all services
3. **Efficiency** - Officers handle multiple services from one interface
4. **Clarity** - Clear separation of roles and responsibilities

**Next immediate action:** Complete Homestay testing, then implement sidebar restructure.

---

*Document maintained by: Development Team*  
*For questions, contact the project lead.*
