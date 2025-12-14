# Smart Form Auto-Fill Logic - Homestay Registration
## Data Flow & Auto-Population Strategy

This document organizes the homestay registration form fields in a **logical order** where later fields are **auto-filled or auto-suggested** based on earlier user inputs.

---

## 🎯 FORM FLOW STRATEGY

```
USER INPUT → AUTO-FILLED DATA → AUTO-CALCULATED FIELDS → VALIDATION
```

---

## 📝 STEP-BY-STEP DATA CASCADE

### **STEP 1: Property Location (LGD Address)**

#### User Provides:
1. **District** (dropdown)
2. **Tehsil** (dropdown - filtered by district)
3. **Block/Gram Panchayat** (for rural) OR **Urban Body/Ward** (for urban)

#### System Auto-Fills:
| Field | Auto-Fill Logic | Source |
|-------|----------------|--------|
| **Location Type** | `MC` / `TCP` / `GP` | If Urban Body selected → MC/TCP, If GP selected → GP |
| **Is Pangi Sub-Division** | `true` / `false` | District = "Chamba" AND Tehsil = "Pangi" → true |
| **DDO Code** | District-specific code | LGD data mapping |
| **Base Fee (preliminary)** | Depends on location type | Fee matrix (will be finalized after category selection) |

**Example Auto-Fill:**
```
User selects:
  District: Chamba
  Tehsil: Pangi
  Block: Sural
  GP: Hudan

System auto-fills:
  ✓ Location Type: GP (Gram Panchayat area)
  ✓ Is Pangi Sub-Division: true
  ✓ DDO Code: CHM001
  ✓ Eligible for 50% Pangi discount: Yes
```

---

### **STEP 2: Owner Information**

#### User Provides:
1. **Owner Name**
2. **Owner Gender** ⭐ (NEW - critical for discount)
   - Radio buttons: Male / Female / Other
3. **Mobile Number**
4. **Email**
5. **Aadhaar Number**

#### System Auto-Fills:
| Field | Auto-Fill Logic | Source |
|-------|----------------|--------|
| **Eligible for Female Discount** | `true` if gender = Female | Owner gender |
| **Discount Preview** | "You qualify for 5% female owner discount" | Owner gender |

**Note:** GSTIN field will be shown/required in next step based on category selection

---

### **STEP 3: Room Details & Rates**

#### User Provides:
1. **Number of Rooms** (input: 1-6)
2. **Room Type & Rate for Each Room:**
   - Room 1: Type (Single/Double/Suite), Rate per night
   - Room 2: Type, Rate
   - etc.

#### System Auto-Calculates:
| Field | Auto-Fill Logic | Validation |
|-------|----------------|------------|
| **Total Rooms** | Count of rooms entered | Max 6 rooms OR 12 single beds |
| **Average Room Rate** | Sum of all rates / number of rooms | Used for category suggestion |
| **Highest Room Rate** | Max(all room rates) | Primary category determinant |
| **Lowest Room Rate** | Min(all room rates) | Check consistency |

#### System Auto-Suggests:
| Field | Suggestion Logic | Display |
|-------|-----------------|---------|
| **Suggested Category** | Based on room count + rates (see table below) | "Based on your rooms, we suggest: **Gold Category**" |

**Category Suggestion Matrix:**

| Rooms | Highest Rate | Suggested Category | Validation Message |
|-------|-------------|-------------------|-------------------|
| 5-6 | >₹10,000 | **Diamond** | ✅ Qualifies for Diamond |
| 5-6 | ₹3,000-₹10,000 | **Gold** | ✅ Qualifies for Gold (or can downgrade to Silver) |
| 5-6 | <₹3,000 | **Silver** | ⚠️ Too many rooms for typical Silver, consider Gold |
| 3-4 | >₹10,000 | **Gold** | ⚠️ Room rate is Diamond-level, but need 5+ rooms for Diamond category |
| 3-4 | ₹3,000-₹10,000 | **Gold** | ✅ Perfect fit for Gold |
| 3-4 | <₹3,000 | **Silver** or **Gold** | ✅ Can choose either |
| 1-2 | >₹10,000 | **Gold** | ⚠️ High rate but limited rooms - Gold category |
| 1-2 | ₹3,000-₹10,000 | **Gold** or **Silver** | ✅ Can choose either |
| 1-2 | <₹3,000 | **Silver** | ✅ Perfect fit for Silver |

**Example Auto-Suggestion:**
```
User enters:
  Room 1: Double, ₹8,500/night
  Room 2: Double, ₹7,200/night
  Room 3: Suite, ₹9,800/night
  Total: 3 rooms

System calculates:
  ✓ Total Rooms: 3
  ✓ Average Rate: ₹8,500
  ✓ Highest Rate: ₹9,800
  
System suggests:
  💡 "Based on 3 rooms with rates ₹7,200-₹9,800, we suggest: GOLD Category"
  ℹ️ "Gold category requires 3-4 rooms with rates ₹3,000-₹10,000 per night"
  ✓ "You meet all requirements for Gold category"
```

---

### **STEP 4: Category Selection & GSTIN**

#### User Provides:
1. **Category** (Radio buttons with smart default)
   - ○ Diamond (requires 5+ rooms, >₹10k/night) - [Pre-selected if suggested]
   - ○ Gold (requires 3+ rooms, ₹3k-10k/night)
   - ○ Silver (requires 1+ rooms, <₹3k/night)

#### System Auto-Shows/Hides:
| Field | Show/Hide Logic | Validation |
|-------|----------------|------------|
| **GSTIN Field** | Show if Diamond or Gold selected, Hide if Silver | Mandatory for D&G, Optional for Silver |
| **Validation Warning** | If room count/rate doesn't match category | "⚠️ Your rooms don't meet Diamond requirements (need 5+ rooms)" |

#### System Auto-Validates:
```javascript
if (category === 'diamond') {
  if (totalRooms < 5) {
    error: "Diamond category requires minimum 5 rooms"
  }
  if (highestRate <= 10000) {
    warning: "Diamond category is for premium rooms (>₹10,000/night)"
  }
  // GSTIN is REQUIRED
  if (!gstin) {
    error: "GSTIN is mandatory for Diamond category"
  }
}

if (category === 'gold') {
  if (totalRooms < 3) {
    error: "Gold category requires minimum 3 rooms"
  }
  // GSTIN is REQUIRED
  if (!gstin) {
    error: "GSTIN is mandatory for Gold category"
  }
}

if (category === 'silver') {
  if (totalRooms < 1) {
    error: "At least 1 room is required"
  }
  // GSTIN is OPTIONAL - hide the field or make it optional
}
```

**Example Validation:**
```
User selects: Diamond category
User has: 4 rooms @ ₹12,000/night

System validation:
  ❌ "Diamond category requires minimum 5 rooms. You have 4 rooms."
  💡 "Suggestion: Choose Gold category (you qualify based on room rate)"
  
  [Button: Switch to Gold Category]
```

---

### **STEP 5: Amenities & Documents**

#### User Provides:
- Standard amenities checklist
- ANNEXURE-II documents

#### System Auto-Shows:
| Document | Show If | Logic |
|----------|---------|-------|
| **Building Sanction Order** | Location Type = MC/TCP/NP | Required for urban areas only |
| **Fire Safety NOC** | Category = Diamond | Mandatory for Diamond category |
| **Pollution Clearance** | Category = Diamond | Mandatory for Diamond category |

---

### **STEP 6: Certificate Validity & Final Fee**

#### User Provides:
1. **Certificate Validity Period** (Radio buttons)
   - ○ 1 year (standard)
   - ○ 3 years (with 10% discount)

#### System Auto-Calculates COMPLETE FEE:

**Fee Calculation Order:**

```javascript
// STEP 1: Get base fee from matrix
const baseFeeMatrix = {
  diamond: { MC: 18000, TCP: 12000, GP: 10000 },
  gold:    { MC: 12000, TCP: 8000,  GP: 6000 },
  silver:  { MC: 8000,  TCP: 5000,  GP: 3000 }
};

const baseFee = baseFeeMatrix[category][locationType];

// STEP 2: Calculate total for validity period
let totalBeforeDiscounts = baseFee * validityYears;

// STEP 3: Apply 3-year discount (if applicable)
let validityDiscount = 0;
if (validityYears === 3) {
  validityDiscount = totalBeforeDiscounts * 0.10; // 10% off
  totalBeforeDiscounts = totalBeforeDiscounts - validityDiscount;
}

// STEP 4: Apply female owner discount (if applicable)
let femaleDiscount = 0;
if (ownerGender === 'female') {
  femaleDiscount = totalBeforeDiscounts * 0.05; // 5% off
  totalBeforeDiscounts = totalBeforeDiscounts - femaleDiscount;
}

// STEP 5: Apply Pangi discount (if applicable)
let pangiDiscount = 0;
if (isPangiSubDivision) {
  pangiDiscount = totalBeforeDiscounts * 0.50; // 50% off
  totalBeforeDiscounts = totalBeforeDiscounts - pangiDiscount;
}

// FINAL FEE
const finalFee = totalBeforeDiscounts;
```

#### System Auto-Displays Fee Breakdown:

**Example 1: Female owner, Diamond, MC area, 3 years**
```
┌─────────────────────────────────────────────┐
│         FEE CALCULATION SUMMARY             │
├─────────────────────────────────────────────┤
│ Category: Diamond                           │
│ Location: Municipal Corporation Area       │
│ Validity: 3 years                          │
│                                             │
│ Base Fee (Annual):           ₹18,000       │
│ Total (3 years):             ₹54,000       │
│                                             │
│ Discounts Applied:                         │
│ ├─ 3-year lump sum (10%):   -₹5,400       │
│ └─ Female owner (5%):        -₹2,430       │
│                                             │
│ TOTAL PAYABLE:               ₹46,170       │
│                                             │
│ You save: ₹7,830 (14.5%)                   │
└─────────────────────────────────────────────┘
```

**Example 2: Male owner, Silver, Pangi GP area, 1 year**
```
┌─────────────────────────────────────────────┐
│         FEE CALCULATION SUMMARY             │
├─────────────────────────────────────────────┤
│ Category: Silver                            │
│ Location: Gram Panchayat (Pangi)          │
│ Validity: 1 year                           │
│                                             │
│ Base Fee (Annual):           ₹3,000        │
│                                             │
│ Discounts Applied:                         │
│ └─ Pangi sub-division (50%): -₹1,500       │
│                                             │
│ TOTAL PAYABLE:               ₹1,500        │
│                                             │
│ You save: ₹1,500 (50%)                     │
└─────────────────────────────────────────────┘
```

**Example 3: Female owner, Gold, TCP area, 3 years**
```
┌─────────────────────────────────────────────┐
│         FEE CALCULATION SUMMARY             │
├─────────────────────────────────────────────┤
│ Category: Gold                              │
│ Location: TCP/SDA/NP Area                  │
│ Validity: 3 years                          │
│                                             │
│ Base Fee (Annual):           ₹8,000        │
│ Total (3 years):             ₹24,000       │
│                                             │
│ Discounts Applied:                         │
│ ├─ 3-year lump sum (10%):   -₹2,400       │
│ └─ Female owner (5%):        -₹1,080       │
│                                             │
│ TOTAL PAYABLE:               ₹20,520       │
│                                             │
│ You save: ₹3,480 (14.5%)                   │
│                                             │
│ 💡 Compared to paying yearly:              │
│    3 × ₹8,000 = ₹24,000                    │
│    Your savings: ₹3,480                    │
└─────────────────────────────────────────────┘
```

---

## 🔄 COMPLETE AUTO-FILL DEPENDENCY CHAIN

```
┌──────────────────────┐
│  STEP 1: ADDRESS     │
│  (User Input)        │
└──────────┬───────────┘
           │
           ├─► Location Type (MC/TCP/GP)
           ├─► Is Pangi (true/false)
           └─► DDO Code
           
┌──────────────────────┐
│  STEP 2: OWNER INFO  │
│  (User Input)        │
└──────────┬───────────┘
           │
           └─► Female Discount Eligibility
           
┌──────────────────────┐
│  STEP 3: ROOM DATA   │
│  (User Input)        │
└──────────┬───────────┘
           │
           ├─► Total Rooms Count
           ├─► Average Room Rate
           ├─► Highest/Lowest Rate
           └─► Suggested Category
           
┌──────────────────────┐
│  STEP 4: CATEGORY    │
│  (User Selection)    │
└──────────┬───────────┘
           │
           ├─► GSTIN Required? (Yes for D&G, No for Silver)
           ├─► Min Room Validation
           └─► Rate Range Validation
           
┌──────────────────────┐
│  STEP 5: DOCUMENTS   │
│  (Conditional)       │
└──────────┬───────────┘
           │
           └─► Show/Hide based on Category + Location Type
           
┌──────────────────────┐
│  STEP 6: VALIDITY    │
│  (User Selection)    │
└──────────┬───────────┘
           │
           └─► FINAL FEE CALCULATION
               │
               ├─ Base Fee (from category + location)
               ├─ Validity Multiplier (1 or 3 years)
               ├─ 3-year Discount (10%)
               ├─ Female Discount (5%)
               └─ Pangi Discount (50%)
```

---

## 💾 DATABASE FIELDS NEEDED

Add to `homestay_applications` table:

```typescript
// Auto-filled from address
locationType: varchar, // 'MC', 'TCP', 'GP'
isPangiSubDivision: boolean,
ddoCode: varchar,

// User input for discount
ownerGender: varchar, // 'male', 'female', 'other'

// Auto-calculated from rooms
totalRooms: integer,
averageRoomRate: integer,
highestRoomRate: integer,
lowestRoomRate: integer,

// User selection with validation
selectedCategory: varchar, // 'diamond', 'gold', 'silver'
categoryValidated: boolean, // true if meets requirements

// User selection
certificateValidityYears: integer, // 1 or 3

// Auto-calculated fee breakdown
baseFee: integer,
totalBeforeDiscounts: integer,
validityDiscount: integer,
femaleOwnerDiscount: integer,
pangiDiscount: integer,
totalDiscount: integer,
finalFee: integer,

// GSTIN (conditional)
gstin: varchar, // Required for Diamond & Gold only
```

---

## 🎨 UI/UX ELEMENTS

### Real-time Feedback Components:

1. **Category Suggestion Badge**
   ```
   [Based on your 4 rooms @ ₹8,500/night]
   💡 Suggested: GOLD Category
   [Use Suggestion] [Choose Different]
   ```

2. **Validation Alerts**
   ```
   ⚠️ Diamond category requires minimum 5 rooms.
       You have 4 rooms.
   💡 Switch to Gold category? [Yes] [No]
   ```

3. **Discount Preview**
   ```
   ✨ You qualify for:
   • 10% discount (3-year payment)
   • 5% discount (female owner)
   
   Total savings: ₹3,480
   ```

4. **Live Fee Calculator**
   ```
   As user changes:
   - Validity: 1 year → 3 years
   - Category: Gold → Diamond
   - Fee updates in real-time
   ```

---

## ✅ VALIDATION RULES SUMMARY

| Field | Validation | Error Message |
|-------|-----------|---------------|
| **Diamond + Rooms** | `totalRooms >= 5` | "Diamond requires min 5 rooms" |
| **Gold + Rooms** | `totalRooms >= 3` | "Gold requires min 3 rooms" |
| **Diamond + Rate** | `highestRate > 10000` | "Diamond is for premium rooms (>₹10k/night)" |
| **Gold + Rate** | `highestRate >= 3000 && <= 10000` | "Gold is for rooms ₹3k-10k/night" |
| **Silver + Rate** | `highestRate < 3000` | "Silver is for budget rooms (<₹3k/night)" |
| **Diamond/Gold + GSTIN** | `gstin.length === 15` | "GSTIN is mandatory for this category" |
| **Silver + GSTIN** | Optional | Field hidden or optional |
| **Max Rooms** | `totalRooms <= 6` | "Maximum 6 rooms allowed" |
| **Max Beds** | `totalBeds <= 12` | "Maximum 12 single beds allowed" |

---

**Document Version:** 1.0  
**Date:** November 1, 2025  
**Purpose:** Smart form design with cascading auto-fills to reduce user effort and errors
