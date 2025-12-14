# 2025 Homestay Rules - Fee Structure & Critical Updates

## Document Purpose
This document clarifies the **2025 Homestay Rules** fee structure and identifies gaps between the current PRD and official requirements.

---

## 1. FEE STRUCTURE (2025 Rules) - CONFIRMED

### 1.1 Registration Fees (Annual)

**IMPORTANT:** These are **FLAT FEES** - NO per-room charges, GST already included

| Category | Room Rate Threshold | MC Area | TCP/SDA/NP | Gram Panchayat |
|----------|---------------------|---------|------------|----------------|
| **Diamond** | >₹10,000/room/night | ₹18,000 | ₹12,000 | ₹10,000 |
| **Gold** | ₹3,000-₹10,000/room/night | ₹12,000 | ₹8,000 | ₹6,000 |
| **Silver** | <₹3,000/room/night | ₹8,000 | ₹5,000 | ₹3,000 |

**Key Changes from Old System:**
- ❌ **OLD:** Base fee + ₹1,000 per room + 18% GST
- ✅ **NEW:** Flat fee based on location and category only
- ✅ **GST:** Already included in the fees above

### 1.2 Certificate Validity Options

**Applicants can choose:**
- **1 year** validity (standard fees as above)
- **3 years** validity (with 10% discount if paid in lump sum)

**Example Calculation:**
- Diamond property in MC area (1 year): ₹18,000
- Diamond property in MC area (3 years lump sum): ₹18,000 × 3 × 0.90 = ₹48,600
- Saves ₹5,400 with 3-year payment

### 1.3 Discounts

1. **3-Year Lump Sum Payment:** 10% discount on total fee
2. **Female Owner:** Additional 5% discount
3. **Pangi Sub-Division (Chamba District):** 50% discount on base fee

**Discount Stacking Examples:**

**Example 1:** Female owner, Diamond, MC area, 1 year
- Base fee: ₹18,000
- Female discount: 5% = ₹900
- **Final fee: ₹17,100**

**Example 2:** Female owner, Gold, GP area, 3 years lump sum
- Base fee (3 years): ₹6,000 × 3 = ₹18,000
- 3-year discount: 10% = ₹1,800
- Subtotal: ₹16,200
- Female discount: 5% of ₹16,200 = ₹810
- **Final fee: ₹15,390**

**Example 3:** Male owner, Silver, TCP area, Pangi sub-division, 1 year
- Base fee: ₹5,000
- Pangi discount: 50% = ₹2,500
- **Final fee: ₹2,500**

### 1.4 Renewal Fees

**Rule:** Renewal fees = Same as registration fees (2025 Rules Section 7.1)

No separate renewal fee structure - same calculation as new registration.

### 1.5 GSTIN Requirements

| Category | GSTIN Required? |
|----------|----------------|
| **Diamond** | ✅ Mandatory |
| **Gold** | ✅ Mandatory |
| **Silver** | ❌ Exempt |

- GSTIN field should be **required** for Diamond & Gold
- GSTIN field should be **optional/hidden** for Silver

### 1.6 Room Capacity Limits

- **Maximum:** 6 rooms OR 12 single beds
- **Family Suites:** Allowed (4 beds each), max 3 suites
- Total bed capacity must NOT exceed 12 single beds

---

## 2. MISSING FEATURES FROM CHECKLIST

### 2.1 Amendment Fees (CRITICAL - NOT IN CURRENT PRD)

**Requirement:** Fees for room addition/deletion, name change, ownership change, etc.

**Status:** ⚠️ **MISSING FROM 2025 RULES PDF**

**Recommended Approach:**
1. Check with client for official amendment fee structure
2. Typical structure (to be confirmed):
   - Room addition/deletion: ₹X per room
   - Name change: ₹Y flat fee
   - Ownership transfer: ₹Z flat fee
3. Add to Phase 5 or later phases

**Temporary Assumption (pending clarification):**
- Amendment fees = 25% of registration fee for that category/location
- OR specific fees to be provided by client

### 2.2 Certificate Validity Selection

**Requirement:** User selects 1 year OR 3 years at application time (not 2 years as checklist mentioned - actual 2025 rules say 1 or 3)

**Current Status:** ⚠️ **NOT in application form**

**Required Changes:**
1. Add field to ANNEXURE-I form (Step 5 or 6): "Certificate Validity Period"
   - Radio buttons: 1 year / 3 years
2. Show fee impact immediately:
   - "1 year: ₹18,000"
   - "3 years (10% discount): ₹48,600 (saves ₹5,400)"
3. Store in database: `certificateValidityYears` (1 or 3)
4. Use in payment calculation
5. Display validity period on certificate

### 2.3 Category Selection by Applicant

**Requirement:** Applicant chooses Diamond/Gold/Silver (not auto-assigned)

**Current Status:** ⚠️ **Partially implemented** - category inferred from room rates

**Required Changes:**
1. Add explicit category selection dropdown in Step 3 (Room Details)
2. Show category thresholds as helper text:
   - Diamond: For rooms >₹10,000/night
   - Gold: For rooms ₹3,000-₹10,000/night  
   - Silver: For rooms <₹3,000/night
3. Validate: If declared room rate doesn't match category, show warning
4. Allow override (maybe they want higher category for prestige)

### 2.4 Sanction Order/Approved Map in MC/TCP/NP Areas

**Requirement:** Document checklist should include building approval documents for urban areas

**Current Status:** ⚠️ **NOT in ANNEXURE-II**

**Required Changes:**
1. Add to ANNEXURE-II document requirements (conditional):
   - IF location type = MC/TCP/NP (urban)
   - THEN require: "Building Sanction Order / Approved Building Plan"
2. Add validation during DA scrutiny

### 2.5 One Login = One Application Rule

**Requirement:** Individual cannot apply for multiple applications simultaneously

**Current Status:** ⚠️ **NOT enforced**

**Required Changes:**
1. Add validation: Check if user has pending/active application before allowing new submission
2. Allow new application only if:
   - Previous application is `certificate_issued`, OR
   - Previous application is `rejected`, OR  
   - Previous application is `withdrawn`
3. Show clear error: "You already have an application in progress (APP-2024-001). Please complete or withdraw it before submitting a new one."

**Exception:** Renewal applications should be allowed even if current certificate is active

### 2.6 Renewal & Amendment Workflows (MAJOR FEATURE)

**Requirement:** Support for post-certificate operations

**Application Types:**
1. **NEW** - First-time registration (current implementation ✅)
2. **RENEWAL** - Renew existing certificate before expiry
3. **AMENDMENT** - Modify existing registration:
   - Add rooms
   - Delete rooms
   - Change name of homestay
   - Transfer ownership
   - Upgrade/downgrade category

**Current Status:** ⚠️ **ONLY NEW applications supported**

**Required Implementation (Future Phase):**
1. Add `applicationType` field to applications table
2. Add `parentApplicationId` (for renewals/amendments referencing original)
3. Create renewal workflow (simplified - no inspection if recent)
4. Create amendment workflow (may require re-inspection)
5. Track certificate history and amendments

---

## 3. PRD UPDATES REQUIRED

### 3.1 Phase 5 Updates (Payment & Certificate)

**Current PRD Section 1351-1390 needs updates:**

```diff
- Display payment amount (category + location + GST)
+ Display payment amount (category + location, GST included)
+ Show validity period selection (1 year / 3 years)
+ Apply 3-year discount if selected
+ Apply female owner discount if applicable
+ Apply Pangi discount if applicable
+ Show detailed fee breakdown
```

### 3.2 Database Schema Updates

**homestay_applications table:**
```typescript
// ADD new fields:
certificateValidityYears: integer NOT NULL DEFAULT 1, // 1 or 3
selectedCategory: varchar, // 'diamond', 'gold', 'silver' - user selection
ownerGender: varchar, // 'male', 'female', 'other' - for discount
isPangiSubDivision: boolean DEFAULT false, // for 50% discount
applicationType: varchar DEFAULT 'new', // 'new', 'renewal', 'amendment'
parentApplicationId: integer, // references parent for renewals/amendments
```

### 3.3 Fee Calculation Logic

**Create new shared utility: `shared/fee-calculator.ts`**

```typescript
interface FeeCalculationInput {
  category: 'diamond' | 'gold' | 'silver';
  locationType: 'MC' | 'TCP' | 'GP';
  validityYears: 1 | 3;
  ownerGender: 'male' | 'female' | 'other';
  isPangiSubDivision: boolean;
}

interface FeeBreakdown {
  baseFee: number;
  totalBeforeDiscounts: number;
  validityDiscount: number; // 10% for 3-year
  femaleOwnerDiscount: number; // 5%
  pangiDiscount: number; // 50%
  totalDiscount: number;
  finalFee: number;
}

export function calculateHomestayFee(input: FeeCalculationInput): FeeBreakdown
```

### 3.4 Form Updates (client/src/pages/applications/new.tsx)

**Step 3 (Room Details & Category):**
- Add category selection dropdown
- Add validation helper
- Show fee preview based on category + location

**New Step 6.5 (Certificate Validity & Fee Summary):**
- Validity period selection (1 year / 3 years)
- Owner gender selection (for discount)
- Pangi sub-division checkbox (auto-fill from district/tehsil)
- Real-time fee calculator
- Fee breakdown display

---

## 4. IMPLEMENTATION PRIORITY

### Phase 5A (Immediate - Current Work)
1. ✅ Update fee calculation logic (remove per-room, remove GST addition)
2. ✅ Add certificate validity selection
3. ✅ Add owner gender field
4. ✅ Add Pangi sub-division detection
5. ✅ Implement fee calculator with discounts
6. ✅ Update payment display

### Phase 5B (High Priority - Next Week)
1. ⚠️ Add category selection to form
2. ⚠️ Add GSTIN conditional validation
3. ⚠️ Add sanction order requirement for urban areas
4. ⚠️ Enforce one-application-per-user rule

### Phase 7 (Medium Priority - Future)
1. 📋 Renewal workflow
2. 📋 Amendment workflow (room addition/deletion)
3. 📋 Ownership transfer workflow
4. 📋 Get amendment fee structure from client

---

## 5. QUESTIONS FOR CLIENT

1. **Amendment Fees:** What are the fees for:
   - Adding/deleting rooms?
   - Changing homestay name?
   - Transferring ownership?
   - Upgrading/downgrading category?

2. **Renewal Process:** 
   - Does renewal require re-inspection?
   - How early can someone renew (before expiry)?
   - Late renewal penalty?

3. **Certificate Validity:**
   - Checklist mentions "2 or 3 years" but 2025 Rules say "1 or 3 years" - which is correct?
   - Can validity be extended mid-term?

4. **GSTIN:**
   - Confirmed Silver category is exempt from GSTIN requirement?
   - How strictly should we validate GSTIN format?

5. **Multiple Applications:**
   - Can someone own multiple homestays (different properties)?
   - If yes, how to handle multiple registrations per user?

---

## 6. SUMMARY

### ✅ CONFIRMED & CLEAR:
- Flat fee structure (no per-room charges)
- GST already included
- 1-year or 3-year validity options
- 10% discount for 3-year lump sum
- 5% discount for female owners
- 50% discount for Pangi sub-division
- GSTIN mandatory for Diamond & Gold only

### ⚠️ NEEDS IMPLEMENTATION:
- Certificate validity selection in form
- Owner gender field for discounts
- Category selection by applicant
- Updated fee calculator
- Conditional GSTIN validation

### 📋 NEEDS CLARIFICATION:
- Amendment fees (not in 2025 rules)
- Renewal workflow details
- Multiple property ownership rules
- Exact validity options (1 or 3 vs 2 or 3)

---

**Document Date:** November 1, 2025  
**Based On:** Himachal Pradesh Home Stay Rules 2025 (Official Gazette)  
**Status:** Ready for implementation Phase 5A
