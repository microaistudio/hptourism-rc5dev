# PRD v2.0 - Annex: System Maintenance & Administration
## HP Tourism Digital Ecosystem - Maintenance Operations Manual

**Document Version:** 2.0-A  
**Date:** October 31, 2025  
**Status:** Technical Reference  
**Classification:** Internal - Super Admin Only  

---

## Table of Contents

1. [Overview](#overview)
2. [Super Admin Access](#super-admin-access)
3. [System Reset Operations](#system-reset-operations)
4. [Database Maintenance](#database-maintenance)
5. [Test Data Generation](#test-data-generation)
6. [File Storage Management](#file-storage-management)
7. [Environment Configuration](#environment-configuration)
8. [Backup & Restore Procedures](#backup--restore-procedures)
9. [Emergency Procedures](#emergency-procedures)
10. [Audit & Logging](#audit--logging)
11. [Special Commands Reference](#special-commands-reference)
12. [Troubleshooting Utilities](#troubleshooting-utilities)

---

## 1. Overview

This document details all system maintenance operations, reset functions, and special administrative commands available in the HP Tourism Digital Ecosystem. These operations are **ONLY available in DEV/TEST environments** and are automatically disabled in production.

### Purpose
- Enable rapid testing cycles with clean data states
- Generate realistic test scenarios
- Troubleshoot system issues
- Maintain database health
- Manage storage resources

### Security Classification
- **Access Level:** Super Admin Only
- **Environment:** DEV/TEST ONLY
- **Audit Requirement:** All operations logged
- **Approval Required:** Not applicable (self-service for authorized super admins)

---

## 2. Super Admin Access

### 2.1 Role Definition

**Role Name:** `super_admin`  
**Database Value:** `'super_admin'`  
**Privilege Level:** Maximum (Level 10)

**Capabilities:**
- Full system access (all data, all districts)
- User management (create, modify, delete all roles)
- System configuration changes
- Database reset operations
- Test data generation
- File storage management
- Audit log access
- Environment variable management

### 2.2 Creating Super Admin Account

**Initial Setup (via CLI):**
```bash
# Run seed script with super admin flag
npm run db:seed:superadmin

# Or manually via database
psql $DATABASE_URL -c "
  INSERT INTO users (
    full_name, 
    email, 
    mobile, 
    password_hash, 
    role, 
    is_active, 
    created_at
  ) VALUES (
    'System Administrator',
    'superadmin@himachaltourism.gov.in',
    '9999999998',
    -- Password: SuperAdmin@2025 (bcrypt hashed)
    '\$2b\$10\$...',
    'super_admin',
    true,
    NOW()
  );
"
```

**Via Admin Console (by existing super_admin):**
1. Login as super_admin
2. Navigate to Admin Console → User Management
3. Click "Create Super Admin"
4. Fill form:
   - Full Name
   - Email (must be @himachaltourism.gov.in)
   - Mobile
   - Initial Password (force reset on first login)
5. Confirm with 2FA code
6. Send credentials via secure channel

### 2.3 Access Control

**Environment Check:**
```typescript
// Middleware: requireSuperAdmin
export function requireSuperAdmin(req, res, next) {
  // Check environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Maintenance operations disabled in production' 
    });
  }
  
  // Check role
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Super admin access required' 
    });
  }
  
  next();
}
```

**Route Protection:**
```typescript
// All maintenance routes protected
router.use('/api/admin/maintenance', requireSuperAdmin);
router.use('/api/admin/reset', requireSuperAdmin);
router.use('/api/admin/seed', requireSuperAdmin);
```

---

## 3. System Reset Operations

### 3.1 Full System Reset

**Command:** `POST /api/admin/reset/full`

**Description:** Deletes ALL data except super_admin accounts and system configuration.

**What Gets Deleted:**
- ✅ All homestay applications
- ✅ All application timeline entries
- ✅ All inspection orders and reports
- ✅ All objections and clarifications
- ✅ All payment records
- ✅ All uploaded files (object storage)
- ✅ All notifications
- ✅ All non-super_admin users
- ✅ All sessions

**What Gets Preserved:**
- ❌ Super admin accounts
- ❌ District configurations
- ❌ DDO codes
- ❌ System settings (fees, SLAs)

**Request Body:**
```json
{
  "confirmationText": "RESET",
  "reason": "Starting new test cycle",
  "notifyAdmins": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Full system reset completed",
  "deletedCounts": {
    "applications": 247,
    "users": 42,
    "files": 1234,
    "timeline_entries": 3891,
    "inspections": 56,
    "objections": 12
  },
  "filesDeleted": "156.8 MB",
  "timestamp": "2025-10-31T10:30:45.123Z",
  "executedBy": "superadmin@himachaltourism.gov.in"
}
```

**Safety Checks:**
1. Environment must be DEV or TEST
2. User must be super_admin
3. Confirmation text must match exactly
4. Reason must be provided (min 10 characters)
5. Double confirmation dialog in UI

**Audit Log Entry:**
```json
{
  "action": "FULL_SYSTEM_RESET",
  "executedBy": "user_id_123",
  "executedByEmail": "superadmin@himachaltourism.gov.in",
  "environment": "development",
  "reason": "Starting new test cycle",
  "deletedCounts": { /* ... */ },
  "timestamp": "2025-10-31T10:30:45.123Z",
  "ipAddress": "192.168.1.100"
}
```

---

### 3.2 Selective Reset Operations

#### 3.2.1 Clear Applications Only

**Command:** `POST /api/admin/reset/applications`

**What Gets Deleted:**
- All homestay applications
- All associated timeline entries
- All inspection orders/reports
- All objections related to applications
- All payment records
- All application documents (files)

**What Gets Preserved:**
- Users (all roles)
- System configuration
- Notifications (non-application related)

**Request Body:**
```json
{
  "confirmationText": "DELETE_APPLICATIONS",
  "filters": {
    "status": ["draft", "submitted"],  // Optional: only specific statuses
    "district": "Shimla",               // Optional: specific district
    "createdAfter": "2025-10-01",      // Optional: date filter
    "createdBefore": "2025-10-31"      // Optional: date filter
  }
}
```

**Use Cases:**
- Clean up draft applications from testing
- Remove applications from specific test scenario
- Reset specific district data

---

#### 3.2.2 Clear Users (Non-Admin)

**Command:** `POST /api/admin/reset/users`

**What Gets Deleted:**
- Property owners
- Dealing assistants
- District tourism officers
- State officers
- Regular admins

**What Gets Preserved:**
- Super admin accounts
- System configuration

**Request Body:**
```json
{
  "confirmationText": "DELETE_USERS",
  "excludeRoles": ["super_admin"],  // Always preserved
  "filters": {
    "role": "property_owner",        // Optional: specific role
    "district": "Kullu",             // Optional: specific district
    "isActive": false                // Optional: only inactive users
  }
}
```

**Warning:** Deleting users with active applications may cause data integrity issues. System will:
1. Check for active applications
2. Warn if users have applications
3. Offer to cascade delete or cancel operation

---

#### 3.2.3 Clear Files Only

**Command:** `POST /api/admin/reset/files`

**What Gets Deleted:**
- All uploaded documents (from object storage)
- Application photos
- Inspection reports (PDFs)
- Certificates

**What Gets Preserved:**
- File metadata in database (marked as deleted)
- Application data
- User data

**Request Body:**
```json
{
  "confirmationText": "DELETE_FILES",
  "filters": {
    "documentType": "property_photo",  // Optional: specific type
    "uploadedBefore": "2025-10-01",    // Optional: old files
    "orphaned": true                    // Optional: files with no DB reference
  }
}
```

**Storage Cleanup:**
```json
{
  "deletedFiles": 1234,
  "freedSpace": "156.8 MB",
  "orphanedFiles": 23,
  "failedDeletions": 0
}
```

---

#### 3.2.4 Clear Timeline/Audit Logs

**Command:** `POST /api/admin/reset/timeline`

**What Gets Deleted:**
- All application timeline entries
- Audit trail records (non-critical)

**What Gets Preserved:**
- Critical audit logs (user creation, role changes, system resets)
- Application data
- User data

**Request Body:**
```json
{
  "confirmationText": "DELETE_TIMELINE",
  "preserveCritical": true,  // Keep critical audit entries
  "olderThan": "30 days"     // Optional: only old entries
}
```

**Use Case:** Clean up verbose timeline data while preserving application states

---

#### 3.2.5 Clear Inspections

**Command:** `POST /api/admin/reset/inspections`

**What Gets Deleted:**
- All inspection orders
- All inspection reports
- Inspection-related files

**What Gets Preserved:**
- Applications (status may be reset to appropriate pre-inspection state)

**Request Body:**
```json
{
  "confirmationText": "DELETE_INSPECTIONS",
  "resetApplicationStatus": true,  // Reset apps to "dtdo_review"
  "filters": {
    "district": "Kangra",
    "status": "completed"
  }
}
```

---

#### 3.2.6 Clear Objections

**Command:** `POST /api/admin/reset/objections`

**What Gets Deleted:**
- All objection records
- Applicant responses to objections

**What Gets Preserved:**
- Applications
- Timeline entries (marked as historical)

**Request Body:**
```json
{
  "confirmationText": "DELETE_OBJECTIONS",
  "filters": {
    "resolutionStatus": "resolved",  // Optional: only resolved
    "olderThan": "60 days"
  }
}
```

---

#### 3.2.7 Clear Payments

**Command:** `POST /api/admin/reset/payments`

**What Gets Deleted:**
- All payment records
- Payment transaction logs

**What Gets Preserved:**
- Applications (status reset to "verified_for_payment")

**Request Body:**
```json
{
  "confirmationText": "DELETE_PAYMENTS",
  "resetApplicationStatus": true,
  "filters": {
    "paymentGateway": "test_gateway",
    "status": "completed"
  }
}
```

---

### 3.3 Reset Confirmation Flow

**UI Workflow:**

```
Step 1: Select Reset Type
┌─────────────────────────────────────┐
│ Choose reset operation:             │
│ ○ Full System Reset                 │
│ ○ Applications Only                 │
│ ○ Users Only                        │
│ ○ Files Only                        │
│ ○ Timeline/Logs                     │
│                                     │
│ [Next]                              │
└─────────────────────────────────────┘

Step 2: Preview Impact
┌─────────────────────────────────────┐
│ ⚠️ This will delete:                │
│                                     │
│ • 247 applications                  │
│ • 1,234 files (156 MB)             │
│ • 3,891 timeline entries           │
│ • 56 inspections                   │
│                                     │
│ This will preserve:                 │
│ • 3 super admin accounts           │
│ • System configuration              │
│                                     │
│ [Back]  [Continue]                 │
└─────────────────────────────────────┘

Step 3: Confirmation
┌─────────────────────────────────────┐
│ Type "RESET" to confirm:            │
│ ┌─────────────────────────────────┐ │
│ │ [text input]                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Reason for reset (required):        │
│ ┌─────────────────────────────────┐ │
│ │ Starting new test cycle         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [⚠️ EXECUTE RESET]       │
└─────────────────────────────────────┘

Step 4: Execution
┌─────────────────────────────────────┐
│ ⏳ Executing reset...               │
│                                     │
│ ✓ Deleting applications... (247)   │
│ ⏳ Deleting files... (45%)          │
│ ⏳ Deleting timeline...             │
│                                     │
│ [Progress bar: ━━━━━━░░░░ 65%]     │
└─────────────────────────────────────┘

Step 5: Completion
┌─────────────────────────────────────┐
│ ✅ Reset completed successfully!    │
│                                     │
│ Summary:                            │
│ • Deleted 247 applications          │
│ • Freed 156.8 MB storage           │
│ • Removed 3,891 timeline entries   │
│ • Execution time: 12.3 seconds     │
│                                     │
│ Audit log ID: RST-20251031-001     │
│                                     │
│ [Done]  [View Audit Log]           │
└─────────────────────────────────────┘
```

---

## 4. Database Maintenance

### 4.1 Database Statistics

**Command:** `GET /api/admin/db/stats`

**Response:**
```json
{
  "database": {
    "name": "hp_tourism_dev",
    "size": "24.5 MB",
    "tables": 15,
    "connections": {
      "active": 5,
      "idle": 10,
      "max": 20
    }
  },
  "tables": [
    {
      "name": "homestay_applications",
      "rowCount": 247,
      "size": "12.3 MB",
      "indexes": 8,
      "lastVacuum": "2025-10-30T10:00:00Z"
    },
    {
      "name": "users",
      "rowCount": 45,
      "size": "0.8 MB",
      "indexes": 4,
      "lastVacuum": "2025-10-30T10:00:00Z"
    }
    // ... more tables
  ],
  "slowQueries": [
    {
      "query": "SELECT * FROM applications WHERE...",
      "avgDuration": "1250ms",
      "calls": 234
    }
  ]
}
```

---

### 4.2 Vacuum & Optimize

**Command:** `POST /api/admin/db/vacuum`

**Purpose:** Reclaim storage and update statistics after large deletions

**Request Body:**
```json
{
  "tables": ["homestay_applications", "application_timeline"],  // Optional: specific tables
  "full": false,       // VACUUM FULL (slower, locks table)
  "analyze": true      // Update query planner statistics
}
```

**Operations:**
- `VACUUM` - Reclaim space from deleted rows
- `ANALYZE` - Update table statistics for query optimizer
- `REINDEX` - Rebuild indexes for better performance

**Response:**
```json
{
  "success": true,
  "tablesVacuumed": 15,
  "spaceReclaimed": "45.2 MB",
  "duration": "23.4 seconds",
  "indexesRebuilt": 32
}
```

---

### 4.3 Query Performance Analysis

**Command:** `GET /api/admin/db/slow-queries`

**Returns:** Slowest queries in last 24 hours

```json
{
  "slowQueries": [
    {
      "query": "SELECT a.*, u.full_name FROM homestay_applications a JOIN users u...",
      "calls": 1234,
      "totalTime": "45.6s",
      "avgTime": "37ms",
      "maxTime": "1250ms",
      "suggestion": "Add index on applications(current_owner_user_id)"
    }
  ]
}
```

---

### 4.4 Orphaned Data Cleanup

**Command:** `POST /api/admin/db/cleanup-orphans`

**Finds and removes:**
- Applications with deleted owners
- Files without application references
- Timeline entries for deleted applications
- Inspections for non-existent applications

**Request Body:**
```json
{
  "dryRun": true,  // Preview only, don't delete
  "autoFix": false // Automatically clean up orphans
}
```

**Response (Dry Run):**
```json
{
  "orphansFound": {
    "applications": 5,
    "files": 23,
    "timelineEntries": 12,
    "inspections": 3
  },
  "estimatedSpaceToFree": "12.4 MB",
  "recommendations": [
    "5 applications have deleted owners - consider reassigning or deleting",
    "23 files have no database reference - safe to delete"
  ]
}
```

---

## 5. Test Data Generation

### 5.1 Generate Sample Applications

**Command:** `POST /api/admin/seed/applications`

**Request Body:**
```json
{
  "count": 50,
  "distribution": {
    "draft": 10,
    "submitted": 15,
    "under_scrutiny": 10,
    "forwarded_to_dtdo": 5,
    "inspection_scheduled": 5,
    "verified_for_payment": 3,
    "certificate_issued": 2
  },
  "districts": ["Shimla", "Kullu", "Kangra"],  // Distribute across these
  "categories": {
    "diamond": 10,
    "gold": 20,
    "silver": 20
  },
  "withDocuments": true,     // Generate sample PDFs/images
  "withTimeline": true,      // Create realistic timeline
  "realisticDates": true     // Spread over last 30 days
}
```

**Generated Data Includes:**
- Property details (realistic Indian property names)
- Owner information (auto-generated users)
- Room configurations
- Uploaded documents (sample PDFs/images from templates)
- Timeline entries showing progression
- DA/DTDO remarks (templated)

**Response:**
```json
{
  "success": true,
  "applicationsCreated": 50,
  "usersCreated": 50,
  "filesGenerated": 300,
  "timelineEntriesCreated": 145,
  "breakdown": {
    "draft": 10,
    "submitted": 15,
    "under_scrutiny": 10,
    // ...
  },
  "executionTime": "45.2s"
}
```

---

### 5.2 Generate Test Users

**Command:** `POST /api/admin/seed/users`

**Request Body:**
```json
{
  "roles": {
    "property_owner": 20,
    "dealing_assistant": 15,  // 1 per district
    "district_tourism_officer": 15,  // 1 per district
    "state_officer": 3,
    "admin": 2
  },
  "districtsForOfficers": "all",  // or specific array
  "passwordFormat": "role123",     // All users get same password for testing
  "sendCredentials": false         // Don't send emails in test
}
```

**Generated Users:**
```json
{
  "usersCreated": 55,
  "credentials": [
    {
      "role": "dealing_assistant",
      "mobile": "9876543210",
      "password": "da123",
      "district": "Shimla",
      "email": "da_shimla@test.com"
    },
    // ... more users
  ],
  "note": "All users can login with generated credentials"
}
```

---

### 5.3 Load Predefined Scenarios

**Command:** `POST /api/admin/seed/scenario`

**Available Scenarios:**

#### Scenario 1: "Pending DA Review"
```json
{
  "scenarioName": "pending_da_review",
  "description": "10 applications submitted, waiting for DA scrutiny"
}
```
**Creates:**
- 10 property owners
- 10 applications (all in "submitted" status)
- Distributed across 3 districts
- All with complete documents
- Timeline showing submission

---

#### Scenario 2: "Inspection Backlog"
```json
{
  "scenarioName": "inspection_backlog",
  "description": "15 inspections scheduled but not completed"
}
```
**Creates:**
- 15 applications in "inspection_scheduled" status
- Inspection orders (some overdue)
- Assigned to different DAs
- Timeline showing approval and scheduling

---

#### Scenario 3: "Payment Pending"
```json
{
  "scenarioName": "payment_pending",
  "description": "8 applications verified, awaiting payment"
}
```
**Creates:**
- 8 applications in "verified_for_payment" status
- Complete inspection reports
- DTDO approval remarks
- Payment calculation details

---

#### Scenario 4: "Objections Raised"
```json
{
  "scenarioName": "objections_raised",
  "description": "5 applications with objections from DTDO"
}
```
**Creates:**
- 5 applications in "objection_raised" status
- Objection records with specific issues
- Inspection reports showing non-compliance
- Timeline showing entire journey

---

#### Scenario 5: "Complete Workflow"
```json
{
  "scenarioName": "complete_workflow",
  "description": "20 applications in various stages simulating real workflow"
}
```
**Creates:**
- 3 drafts
- 5 submitted
- 4 under scrutiny
- 3 inspection scheduled
- 2 inspection completed
- 2 verified for payment
- 1 certificate issued

---

### 5.4 Custom Data Templates

**Command:** `POST /api/admin/seed/custom`

**Request Body:**
```json
{
  "template": {
    "propertyName": "Mountain View Homestay {index}",
    "category": "gold",
    "district": "Manali",
    "status": "forwarded_to_dtdo",
    "ownerPrefix": "Test Owner"
  },
  "count": 10,
  "variations": {
    "category": ["diamond", "gold", "silver"],  // Cycle through
    "randomizeDistrict": true
  }
}
```

---

## 6. File Storage Management

### 6.1 Storage Overview

**Command:** `GET /api/admin/storage/stats`

**Response:**
```json
{
  "totalFiles": 1234,
  "totalSize": "156.8 MB",
  "breakdown": {
    "property_photo": {
      "count": 456,
      "size": "89.3 MB"
    },
    "revenue_papers": {
      "count": 234,
      "size": "34.2 MB"
    },
    "inspection_report": {
      "count": 123,
      "size": "23.1 MB"
    },
    "certificate": {
      "count": 45,
      "size": "5.6 MB"
    }
    // ... other types
  },
  "storageLimit": "10 GB",
  "percentUsed": 1.5
}
```

---

### 6.2 Cleanup Orphaned Files

**Command:** `POST /api/admin/storage/cleanup-orphans`

**Finds files in object storage with no database reference**

**Request Body:**
```json
{
  "dryRun": true,
  "olderThan": "30 days"  // Only clean old orphans
}
```

**Response:**
```json
{
  "orphanedFiles": 23,
  "totalSize": "12.4 MB",
  "files": [
    {
      "fileName": "abc123-property-photo.jpg",
      "uploadedAt": "2025-09-15",
      "size": "2.3 MB",
      "reason": "No matching document record"
    }
  ],
  "action": "Preview only (dry run)"
}
```

---

### 6.3 Compress Old Files

**Command:** `POST /api/admin/storage/compress`

**Compress PDFs and images older than specified date**

**Request Body:**
```json
{
  "olderThan": "90 days",
  "fileTypes": ["pdf", "jpg", "png"],
  "compressionLevel": "medium"  // low, medium, high
}
```

**Response:**
```json
{
  "filesCompressed": 234,
  "originalSize": "145.6 MB",
  "compressedSize": "78.3 MB",
  "savedSpace": "67.3 MB",
  "compressionRatio": "46%"
}
```

---

### 6.4 Bulk Download

**Command:** `POST /api/admin/storage/bulk-download`

**Create ZIP archive of files matching criteria**

**Request Body:**
```json
{
  "filters": {
    "documentType": "inspection_report",
    "uploadedAfter": "2025-10-01",
    "district": "Shimla"
  },
  "includeMetadata": true  // Include CSV with file details
}
```

**Response:**
```json
{
  "downloadUrl": "https://storage.../exports/inspection-reports-20251031.zip",
  "fileCount": 45,
  "zipSize": "23.4 MB",
  "expiresAt": "2025-11-01T10:00:00Z"
}
```

---

## 7. Environment Configuration

### 7.1 Environment Variables

**Critical Variables:**

```bash
# Environment Mode
NODE_ENV=development              # development | test | production

# System Reset Control
ENABLE_SYSTEM_RESET=true          # true | false (MUST be false in production)
ENABLE_TEST_DATA_GENERATION=true  # true | false

# Super Admin Settings
SUPER_ADMIN_EMAIL=superadmin@himachaltourism.gov.in
SUPER_ADMIN_DEFAULT_PASSWORD=SuperAdmin@2025  # Change on first login

# Database
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=30000

# Object Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
MAX_FILE_SIZE=10485760            # 10 MB in bytes
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png

# Security
SESSION_SECRET=...
BCRYPT_ROUNDS=10
JWT_SECRET=...

# Notifications
SMTP_HOST=smtp.nic.in
SMTP_PORT=587
NOTIFICATION_FROM_EMAIL=noreply@himachaltourism.gov.in

# Logging
LOG_LEVEL=debug                   # debug | info | warn | error
LOG_TRACE_PAYMENTS=false          # Emit full payment trace logs only when needed
LOG_FILE_ENABLED=true             # Mirror logs to disk for PMU handover
LOG_FILE_PATH=/var/log/hptourism/app.log
LOG_FILE_MAX_SIZE_MB=20           # Rotate every 20 MB
LOG_FILE_ROTATE_INTERVAL=1d       # Rotate daily (supports 1h / 12h etc.)
LOG_FILE_MAX_FILES=14             # Keep 14 compressed archives
AUDIT_LOG_RETENTION_DAYS=365
```

---

### 7.2 Production Safety Checks

**Automated Checks on Startup:**

```typescript
// server/startup-checks.ts

export function validateEnvironment() {
  const checks = [];
  
  // 1. Production environment must disable reset
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ENABLE_SYSTEM_RESET === 'true') {
      checks.push({
        status: 'CRITICAL',
        message: 'ENABLE_SYSTEM_RESET must be false in production'
      });
    }
    
    if (process.env.ENABLE_TEST_DATA_GENERATION === 'true') {
      checks.push({
        status: 'CRITICAL',
        message: 'ENABLE_TEST_DATA_GENERATION must be false in production'
      });
    }
  }
  
  // 2. Super admin email must be valid government domain
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail?.endsWith('@himachaltourism.gov.in')) {
    checks.push({
      status: 'WARNING',
      message: 'Super admin email should use @himachaltourism.gov.in domain'
    });
  }
  
  // 3. Database connection
  if (!process.env.DATABASE_URL) {
    checks.push({
      status: 'CRITICAL',
      message: 'DATABASE_URL not configured'
    });
  }
  
  // 4. Session secret strength
  if (process.env.SESSION_SECRET?.length < 32) {
    checks.push({
      status: 'CRITICAL',
      message: 'SESSION_SECRET must be at least 32 characters'
    });
  }
  
  return checks;
}

// Run on startup
const checks = validateEnvironment();
const critical = checks.filter(c => c.status === 'CRITICAL');

if (critical.length > 0) {
  console.error('❌ Critical environment issues found:');
  critical.forEach(c => console.error(`  - ${c.message}`));
  process.exit(1);
}
```

---

### 7.3 Environment-Specific Features

**DEV/TEST Features (Enabled):**
- ✅ Full system reset
- ✅ Test data generation
- ✅ Database direct access
- ✅ Debug logging
- ✅ Hot reload
- ✅ Mock payment gateways
- ✅ Email logging (no actual send)

**PRODUCTION Features (Disabled):**
- ❌ System reset (blocked)
- ❌ Test data generation (blocked)
- ❌ Direct DB access via UI (blocked)
- ✅ Audit logging (enabled, enhanced)
- ❌ Hot reload (disabled)
- ✅ Real payment gateways (enabled)
- ✅ Email sending (enabled)

---

## 8. Backup & Restore Procedures

### 8.1 Manual Backup

**Command:** `POST /api/admin/backup/create`

**Request Body:**
```json
{
  "backupName": "pre-testing-backup-20251031",
  "includeFiles": true,    // Include object storage files
  "compress": true
}
```

**Process:**
1. Create database dump (pg_dump)
2. Create object storage snapshot
3. Bundle configuration files
4. Compress into single archive
5. Store in backup location

**Response:**
```json
{
  "backupId": "BKP-20251031-001",
  "backupName": "pre-testing-backup-20251031",
  "size": "234.5 MB",
  "location": "gs://backups/pre-testing-backup-20251031.tar.gz",
  "created": "2025-10-31T10:30:00Z",
  "includes": {
    "database": true,
    "files": true,
    "config": true
  }
}
```

---

### 8.2 Restore from Backup

**Command:** `POST /api/admin/backup/restore`

**Request Body:**
```json
{
  "backupId": "BKP-20251031-001",
  "confirmationText": "RESTORE",
  "restoreOptions": {
    "database": true,
    "files": true,
    "overwriteExisting": true
  }
}
```

**Safety Checks:**
1. Create automatic backup before restore
2. Require confirmation text
3. Validate backup integrity
4. Preview what will change
5. Log restore operation

**Response:**
```json
{
  "success": true,
  "restoredFrom": "BKP-20251031-001",
  "preRestoreBackup": "BKP-20251031-002",  // Automatic safety backup
  "databaseRestored": true,
  "filesRestored": 1234,
  "duration": "125.4 seconds"
}
```

---

### 8.3 Automated Backups

**Configuration:**
```bash
# Environment variable
ENABLE_AUTO_BACKUP=true
AUTO_BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
AUTO_BACKUP_RETENTION_DAYS=30
AUTO_BACKUP_LOCATION=gs://hp-tourism-backups/
```

**Backup Strategy:**
- **Daily:** Full backup at 2 AM
- **Retention:** Keep 30 days
- **Rotation:** Delete backups older than 30 days
- **Verification:** Weekly integrity checks

---

### 8.4 Point-in-Time Recovery

**For critical situations:**

```bash
# Restore database to specific timestamp
POST /api/admin/backup/point-in-time-restore
{
  "targetTimestamp": "2025-10-31T09:45:00Z",
  "confirmationText": "RESTORE_PITR"
}
```

**Requirements:**
- Continuous archival of transaction logs (WAL)
- Only available if configured in database
- May require database admin assistance

---

## 9. Emergency Procedures

### 9.1 Emergency System Shutdown

**Command:** `POST /api/admin/emergency/shutdown`

**Use Case:** Critical security breach, data corruption detected

**Request Body:**
```json
{
  "reason": "Security breach detected - unauthorized access attempt",
  "shutdownMode": "graceful",  // graceful | immediate
  "notifyUsers": true,
  "displayMessage": "System under maintenance. Will be back shortly."
}
```

**Actions:**
1. Stop accepting new requests
2. Complete in-flight requests (graceful mode)
3. Close database connections
4. Display maintenance page
5. Send notifications to admins
6. Log shutdown event

---

### 9.2 Emergency User Lockout

**Command:** `POST /api/admin/emergency/lockout-user`

**Use Case:** Compromised account, suspicious activity

**Request Body:**
```json
{
  "userId": 123,
  "reason": "Multiple failed login attempts from suspicious IP",
  "duration": "24 hours",  // or "permanent"
  "revokeAllSessions": true,
  "notifyUser": true,
  "notifyAdmins": true
}
```

**Actions:**
1. Immediately revoke all active sessions
2. Block login attempts
3. Flag account for review
4. Log security event
5. Send notifications

---

### 9.3 Emergency Database Rollback

**Command:** `POST /api/admin/emergency/rollback`

**Use Case:** Bad data migration, corruption detected

**Request Body:**
```json
{
  "rollbackToBackup": "BKP-20251031-001",
  "confirmationText": "EMERGENCY_ROLLBACK",
  "reason": "Data corruption detected in applications table"
}
```

**Safety:**
- Requires super_admin
- Creates safety backup first
- Confirmation required
- All sessions terminated
- System placed in maintenance mode during rollback

---

### 9.4 Emergency Contact Protocol

**If system issues cannot be resolved:**

1. **Technical Lead:** +91-XXXXX-XXXXX
2. **Database Admin:** +91-XXXXX-XXXXX
3. **Infrastructure Team:** +91-XXXXX-XXXXX
4. **HP NIC Team:** support@nic.in

**Escalation Path:**
- **Level 1:** Super Admin attempts resolution (0-30 mins)
- **Level 2:** Technical Lead contacted (30-60 mins)
- **Level 3:** HP NIC Team escalation (60+ mins)

---

## 10. Audit & Logging

### 10.1 Audit Log Structure

**All maintenance operations logged:**

```json
{
  "id": "AUDIT-20251031-12345",
  "timestamp": "2025-10-31T10:30:45.123Z",
  "action": "FULL_SYSTEM_RESET",
  "category": "MAINTENANCE",
  "severity": "CRITICAL",
  "
executor": {
    "userId": 1,
    "email": "superadmin@himachaltourism.gov.in",
    "role": "super_admin",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "details": {
    "confirmationText": "RESET",
    "reason": "Starting new test cycle",
    "deletedCounts": {
      "applications": 247,
      "users": 42,
      "files": 1234
    }
  },
  "result": {
    "status": "SUCCESS",
    "duration": "12.3s",
    "errors": []
  },
  "environment": "development"
}
```

---

### 10.2 View Audit Logs

**Command:** `GET /api/admin/audit/logs`

**Query Parameters:**
```
?action=FULL_SYSTEM_RESET
&category=MAINTENANCE
&severity=CRITICAL
&from=2025-10-01
&to=2025-10-31
&executorEmail=superadmin@himachaltourism.gov.in
&limit=100
&offset=0
```

**Response:**
```json
{
  "logs": [ /* array of audit entries */ ],
  "total": 234,
  "page": 1,
  "pageSize": 100
}
```

---

### 10.3 Export Audit Logs

**Command:** `POST /api/admin/audit/export`

**Request Body:**
```json
{
  "filters": {
    "from": "2025-10-01",
    "to": "2025-10-31",
    "category": "MAINTENANCE"
  },
  "format": "csv"  // csv | json | pdf
}
```

**Response:**
```json
{
  "exportUrl": "https://storage.../exports/audit-logs-20251031.csv",
  "recordCount": 234,
  "expiresAt": "2025-11-01T10:00:00Z"
}
```

---

### 10.4 Audit Alerts

**Configure alerts for critical actions:**

```json
{
  "alertRules": [
    {
      "action": "FULL_SYSTEM_RESET",
      "notifyEmails": ["admin@himachaltourism.gov.in"],
      "notifySMS": ["+91-XXXXX-XXXXX"],
      "severity": "CRITICAL"
    },
    {
      "action": "USER_ROLE_CHANGE",
      "condition": "toRole == 'super_admin'",
      "notifyEmails": ["security@himachaltourism.gov.in"]
    }
  ]
}
```

---

## 11. Special Commands Reference

### 11.1 Quick Reference Table

| Command | Endpoint | Confirmation Required | Audit Logged |
|---------|----------|----------------------|--------------|
| Full System Reset | `POST /api/admin/reset/full` | Yes ("RESET") | Yes |
| Clear Applications | `POST /api/admin/reset/applications` | Yes | Yes |
| Clear Users | `POST /api/admin/reset/users` | Yes | Yes |
| Clear Files | `POST /api/admin/reset/files` | Yes | Yes |
| Clear Timeline | `POST /api/admin/reset/timeline` | Yes | Yes |
| Database Stats | `GET /api/admin/db/stats` | No | No |
| Vacuum Database | `POST /api/admin/db/vacuum` | No | Yes |
| Cleanup Orphans | `POST /api/admin/db/cleanup-orphans` | No (if dryRun) | Yes |
| Generate Applications | `POST /api/admin/seed/applications` | No | Yes |
| Generate Users | `POST /api/admin/seed/users` | No | Yes |
| Load Scenario | `POST /api/admin/seed/scenario` | No | Yes |
| Storage Stats | `GET /api/admin/storage/stats` | No | No |
| Cleanup Orphaned Files | `POST /api/admin/storage/cleanup-orphans` | No (if dryRun) | Yes |
| Create Backup | `POST /api/admin/backup/create` | No | Yes |
| Restore Backup | `POST /api/admin/backup/restore` | Yes ("RESTORE") | Yes |
| Emergency Shutdown | `POST /api/admin/emergency/shutdown` | Yes | Yes |

---

### 11.2 cURL Examples

**Full System Reset:**
```bash
curl -X POST https://dev.hptourism.gov.in/api/admin/reset/full \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmationText": "RESET",
    "reason": "Starting new test cycle",
    "notifyAdmins": true
  }'
```

**Generate Test Data:**
```bash
curl -X POST https://dev.hptourism.gov.in/api/admin/seed/applications \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 50,
    "distribution": {
      "submitted": 20,
      "under_scrutiny": 15,
      "certificate_issued": 5
    }
  }'
```

**Database Stats:**
```bash
curl -X GET https://dev.hptourism.gov.in/api/admin/db/stats \
  -H "Authorization: Bearer <super_admin_token>"
```

---

## 12. Troubleshooting Utilities

### 12.1 Health Check

**Command:** `GET /api/admin/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T10:30:00Z",
  "uptime": "72h 34m 12s",
  "checks": {
    "database": {
      "status": "connected",
      "responseTime": "23ms",
      "activeConnections": 5
    },
    "objectStorage": {
      "status": "connected",
      "responseTime": "145ms"
    },
    "redis": {
      "status": "connected",
      "responseTime": "5ms"
    }
  },
  "resources": {
    "memory": {
      "used": "245 MB",
      "total": "512 MB",
      "percent": 47.8
    },
    "cpu": {
      "percent": 12.3
    }
  }
}
```

---

### 12.2 Validate Data Integrity

**Command:** `POST /api/admin/validate/integrity`

**Checks:**
- Applications without owners
- Files without applications
- Timeline entries for deleted applications
- Orphaned inspection records
- Invalid status transitions
- Broken foreign key references

**Response:**
```json
{
  "status": "issues_found",
  "totalIssues": 23,
  "issues": [
    {
      "type": "orphaned_file",
      "severity": "medium",
      "count": 15,
      "description": "15 files have no application reference",
      "action": "Run cleanup-orphans"
    },
    {
      "type": "invalid_status",
      "severity": "high",
      "count": 3,
      "description": "3 applications have invalid status values",
      "affectedIds": [123, 456, 789]
    }
  ]
}
```

---

### 12.3 Fix Common Issues

**Command:** `POST /api/admin/fix/auto`

**Automatically fixes:**
- Orphaned files
- Broken references
- Invalid status values
- Missing timeline entries

**Request Body:**
```json
{
  "dryRun": true,
  "fixes": ["orphaned_files", "broken_references", "invalid_status"]
}
```

**Response:**
```json
{
  "dryRun": true,
  "fixesApplied": 0,
  "fixesProposed": {
    "orphaned_files": {
      "count": 15,
      "action": "Delete files from storage"
    },
    "invalid_status": {
      "count": 3,
      "action": "Reset to last valid status"
    }
  }
}
```

---

### 12.4 Performance Diagnostics

**Command:** `GET /api/admin/diagnostics/performance`

**Returns:**
- Slow API endpoints (95th percentile > 1s)
- Database slow queries
- High memory usage processes
- File upload/download bottlenecks

**Response:**
```json
{
  "slowEndpoints": [
    {
      "endpoint": "GET /api/applications",
      "avgResponseTime": "1250ms",
      "p95ResponseTime": "2340ms",
      "requestsLast24h": 1234,
      "suggestion": "Add caching or optimize query"
    }
  ],
  "slowQueries": [ /* ... */ ],
  "recommendations": [
    "Add index on applications(district, status)",
    "Enable query result caching for dashboard stats",
    "Compress large PDF files in object storage"
  ]
}
```

---

## 13. Security Considerations

### 13.1 Access Control Matrix

| Operation | Super Admin | Admin | State Officer | DTDO | DA | Property Owner |
|-----------|-------------|-------|---------------|------|-----|----------------|
| View Audit Logs | ✅ All | ✅ Limited | ❌ | ❌ | ❌ | ❌ |
| System Reset | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Generate Test Data | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Database Maintenance | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Backup/Restore | ✅ | ⚠️ View Only | ❌ | ❌ | ❌ | ❌ |
| Emergency Shutdown | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅ Limited | ❌ | ❌ | ❌ | ❌ |

---

### 13.2 Two-Factor Authentication

**For sensitive operations:**

```typescript
// Before executing reset/emergency operations
async function requireTwoFactorConfirmation(userId: number) {
  // 1. Generate OTP
  const otp = generateOTP();
  
  // 2. Send to super admin mobile
  await sendSMS(user.mobile, `Your OTP for system reset: ${otp}`);
  
  // 3. Wait for confirmation (5 minutes timeout)
  const userOtp = await promptForOTP();
  
  // 4. Validate
  if (userOtp !== otp) {
    throw new Error('Invalid OTP');
  }
}
```

---

### 13.3 IP Whitelisting

**Restrict admin console access:**

```bash
# Environment variable
ADMIN_CONSOLE_ALLOWED_IPS=192.168.1.100,10.0.0.0/24,HP_OFFICE_NETWORK
```

**Middleware:**
```typescript
function requireWhitelistedIP(req, res, next) {
  const clientIP = req.ip;
  const allowedIPs = process.env.ADMIN_CONSOLE_ALLOWED_IPS.split(',');
  
  if (!isIPAllowed(clientIP, allowedIPs)) {
    return res.status(403).json({ 
      error: 'Access denied from this IP address' 
    });
  }
  
  next();
}
```

---

## 14. Appendix

### A. Maintenance Schedule Recommendations

**Daily:**
- View system health
- Check SLA breaches
- Monitor storage usage

**Weekly:**
- Review audit logs
- Check for orphaned data
- Vacuum database

**Monthly:**
- Generate performance report
- Review and cleanup old backups
- Update system configuration as needed

**Quarterly:**
- Full system integrity check
- Security audit
- Update documentation

---

### B. Common Error Codes

| Code | Message | Resolution |
|------|---------|------------|
| ADMIN-001 | Super admin access required | Login with super_admin account |
| ADMIN-002 | Operation disabled in production | Change environment to DEV/TEST |
| ADMIN-003 | Confirmation text mismatch | Type exact confirmation text |
| ADMIN-004 | Database connection failed | Check DATABASE_URL |
| ADMIN-005 | Backup not found | Verify backup ID |
| ADMIN-006 | Insufficient storage space | Free up storage or increase limit |

---

### C. Changelog

**v2.0-A (2025-10-31):**
- Initial version
- All reset operations documented
- Test data generation procedures
- Emergency procedures defined

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Super Admin | [Name] | _________ | _____ |
| Technical Lead | [Name] | _________ | _____ |
| Security Officer | [Name] | _________ | _____ |

---

**END OF MAINTENANCE ANNEX**

**⚠️ REMINDER: All operations in this document are ONLY for DEV/TEST environments. Production access is strictly prohibited and blocked by system safeguards.**
