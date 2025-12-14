# Product Requirements Document (PRD) - 2025 Policy Update
## HP Tourism Digital Ecosystem - Official Homestay Rules 2025 Compliance

**Document Version:** 3.0 (2025 Official Rules Compliance)  
**Date:** November 1, 2025  
**Status:** Active - Based on Official Gazette Notification TSM-F(10)-10/2003-VI dated June 25, 2025  
**Authority:** HP Tourism & Civil Aviation Department  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Official 2025 Policy Changes](#official-2025-policy-changes)
3. [Room Specification Requirements](#room-specification-requirements)
4. [Fee Structure & Discounts](#fee-structure--discounts)
5. [Category Classification Rules](#category-classification-rules)
6. [Registration Process Requirements](#registration-process-requirements)
7. [Application Form Requirements (ANNEXURE-I)](#application-form-requirements-annexure-i)
8. [Required Documents (ANNEXURE-II)](#required-documents-annexure-ii)
9. [Inspection Checklist (ANNEXURE-III)](#inspection-checklist-annexure-iii)
10. [Technical Implementation Changes](#technical-implementation-changes)
11. [Backward Compatibility](#backward-compatibility)

---

## 1. Executive Summary

The **Himachal Pradesh Home Stay Rules, 2025** came into force on **June 25, 2025**, repealing the HP Homestay Scheme 2008. This PRD defines the updated scope for the HP Tourism Digital Ecosystem to ensure 100% compliance with the official government notification.

### Key Policy Changes from 2008 to 2025

| Aspect | 2008 Rules | 2025 Rules (NEW) |
|--------|-----------|------------------|
| **Room Types** | Not specified | **MUST specify:** Single bed, Double bed, Family suites |
| **Max Rooms** | Not clearly defined | **6 rooms OR 12 single beds** (strict limit) |
| **Family Suites** | Not allowed | **Allowed:** Max 3 suites (4 beds each) |
| **Fee Structure** | Separate registration + GST | **All-inclusive fees** (GST included) |
| **Validity Options** | 1 year only | **1 year OR 3 years** (user choice) |
| **Female Discount** | Not mentioned | **5% discount** for female owners |
| **3-Year Discount** | Not mentioned | **10% discount** for 3-year lump sum |
| **Pangi Discount** | Not mentioned | **50% discount** for Pangi sub-division |
| **GSTIN** | Required for all | **Diamond & Gold:** Mandatory, **Silver:** Exempt |
| **Processing Time** | Not specified | **60 days** (auto-approval if delayed) |
| **Re-registration** | Not specified | **Required** if changing room count |

---

## 2. Official 2025 Policy Changes

### 2.1 Legal Authority

**Official Notification:** TSM-F(10)-10/2003-VI, dated June 25, 2025  
**Published:** Rajpatra (e-Gazette), Himachal Pradesh  
**Effective Date:** June 25, 2025  
**Authority:** Governor of Himachal Pradesh under Section 64 of HP Tourism Development and Registration Act, 2002

### 2.2 Repealed Schemes

The following are **REPEALED** as of June 25, 2025:
- Himachal Pradesh Home Stay Scheme, 2008
- All existing registrations must migrate to 2025 Rules within 30 days
- Grace period of 90 days to fulfill new requirements

### 2.3 Definition Updates

#### "Owner" (Rule 2h)
> "A person who is recorded as owner in the record of rights of concerned estate (estate as defined under section 4(5) of the HP Land Revenue Act, 1954)"

**Critical:** Registration ONLY for land revenue record owners

#### "Bonafide Himachali" (Rule 2d)
- Person with permanent home in HP, OR
- Residing in HP for at least 20 years, OR
- Permanent HP home but living outside due to occupation

**Policy:** Preference given to Bonafide Himachalis

#### "Categories of Home Stays" (Rule 2e)
- **Diamond:** Room rates >₹10,000/night per room
- **Gold:** Room rates ₹3,000 - ₹10,000/night per room
- **Silver:** Room rates <₹3,000/night per room

---

## 3. Room Specification Requirements

### 3.1 MANDATORY Room Type Breakdown

**As per ANNEXURE-I, Section 6(c):**

> "Number of rooms and area for each type of room in sq. ft. **(single/double/suites)**"

**Application Form MUST Collect:**

| Room Type | Count | Room Size (sq ft) | Washroom Size (sq ft) |
|-----------|-------|-------------------|----------------------|
| **Single Bed Rooms** | 0-6 | Min: 100 (new) / 80 (existing) | Min: 30 (new) / 25 (existing) |
| **Double Bed Rooms** | 0-6 | Min: 120 (new) / 100 (existing) | Min: 30 (new) / 25 (existing) |
| **Family Suites** | 0-3 | Min: 120 (new) / 100 (existing) | Min: 30 (new) / 25 (existing) |

### 3.2 Capacity Limits (Rule 3.1v)

**STRICT LIMITS:**

```
Maximum Rooms: 6 rooms total
OR
Maximum Beds: 12 single beds equivalent

Bed Calculation:
- Single bed room = 1 bed
- Double bed room = 2 beds
- Family suite = 4 beds

Example Valid Configurations:
✓ 6 single bed rooms = 6 beds (VALID)
✓ 3 double bed rooms = 6 beds (VALID)
✓ 2 single + 2 double + 1 suite = 2 + 4 + 4 = 10 beds (VALID)
✓ 3 family suites = 12 beds (VALID - at max limit)
✗ 4 family suites = 16 beds (INVALID - exceeds 12 bed limit)
✗ 7 single bed rooms = 7 rooms (INVALID - exceeds 6 room limit)
```

**Certificate Format (Form-A):**

The official registration certificate REQUIRES these exact fields:

| Sl. No. | Details of accommodation | No. of rooms | Proposed room rent per night |
|---------|-------------------------|--------------|------------------------------|
| 1. | Single bed rooms | _____ | ₹_____ |
| 2. | Double bed rooms | _____ | ₹_____ |
| 3. | Family suite | _____ | ₹_____ |

**Note:** Total number of beds shall not exceed 12.

### 3.3 Washroom Requirements

**Rule 3.1v - Attached Toilets:**
> "Each with attached toilet facility, which shall be made available to the tourists"

**Proviso for Rural Areas:**
> "Separate toilet facility for each room may be allowed in the rural areas for registration of Home Stay unit, in case where attached toilet facility is not available"

**Implementation:**
- **Urban areas (MC/TCP/NP):** Attached toilets MANDATORY
- **Rural areas (GP):** Separate toilets allowed (one per room)

---

## 4. Fee Structure & Discounts

### 4.1 Base Fee Structure (Rule 7.1)

**All fees include GST** (no separate GST calculation needed)

| Category | MC Limit (per year) | TCP/SADA/NP/Nagar Panchayat (per year) | Gram Panchayat (per year) | Renewal Fee |
|----------|---------------------|----------------------------------------|---------------------------|-------------|
| **Diamond** (>₹10k/night) | ₹18,000 | ₹12,000 | ₹10,000 | Same as registration |
| **Gold** (₹3k-₹10k/night) | ₹12,000 | ₹8,000 | ₹6,000 | Same as registration |
| **Silver** (<₹3k/night) | ₹8,000 | ₹5,000 | ₹3,000 | Same as registration |

**Key Policy Change:** Renewal fees = Registration fees (not discounted)

### 4.2 Discount Structure

#### 4.2.1 Three-Year Discount (Rule 7.2)

> "If registration fee is paid for three years in one go, then a discount of 10% on the applicable fee will be given."

**Calculation:**
```
Base Fee (1 year): ₹X
3-Year Fee (before discount): ₹X × 3 = ₹3X
3-Year Discount: 10% of ₹3X = ₹0.3X
Final 3-Year Fee: ₹3X - ₹0.3X = ₹2.7X
```

**Example:**
- Diamond, MC, 1 year: ₹18,000
- Diamond, MC, 3 years: ₹18,000 × 3 = ₹54,000
- 10% discount: ₹5,400
- **Final fee: ₹48,600** (saves ₹5,400)

#### 4.2.2 Female Owner Discount (Rule 7.3)

> "A woman owner shall be provided 5% discount **in addition** to that applicable as per rule 7(2)"

**IMPORTANT:** Female discount applies to the fee AFTER 3-year discount

**Calculation Order:**
```
Step 1: Calculate base fee (1 year or 3 year)
Step 2: Apply 3-year discount if applicable (10%)
Step 3: Apply female owner discount (5%) on result from Step 2
```

**Example - Female owner, Diamond, MC, 3 years:**
```
Base fee (1 year): ₹18,000
3-year fee: ₹18,000 × 3 = ₹54,000
After 3-year discount (10%): ₹54,000 - ₹5,400 = ₹48,600
After female discount (5%): ₹48,600 - ₹2,430 = ₹46,170
Total savings: ₹7,830 (14.5%)
```

#### 4.2.3 Pangi Sub-Division Discount (Rule 7.4)

> "Fee for the registration of Home Stays in Pangi Sub-Division of District Chamba is to be fixed at **50% of the registration fee** fixed for entire Himachal."

**Calculation:**
```
Pangi Fee = Base Fee × 0.5
```

**Stacking Rules:**
- Pangi discount (50%) applies FIRST to base fee
- Then 3-year discount (10%) applies to Pangi-reduced fee
- Then female discount (5%) applies

**Example - Female owner, Diamond, MC, 3 years, Pangi:**
```
Base fee: ₹18,000
Pangi discount (50%): ₹18,000 × 0.5 = ₹9,000/year
3-year fee: ₹9,000 × 3 = ₹27,000
3-year discount (10%): ₹27,000 - ₹2,700 = ₹24,300
Female discount (5%): ₹24,300 - ₹1,215 = ₹23,085
Total savings: ₹30,915 (57.3%)
```

### 4.3 Location Type Mapping (CRITICAL)

**Rule 2m - "Urban areas":**
- Municipal Corporation (MC)
- Municipal Council (TCP)
- Nagar Parishad/Nagar Panchayat (NP)
- Areas within 50m of National Highways/Four Lane Highways

**Rule 2k - "Rural areas":**
- Gram Panchayat (GP)
- All areas not classified as urban

**Fee Determination Logic:**
```typescript
if (locationType === "mc") {
  baseFee = FEE_STRUCTURE[category].mc;
} else if (locationType === "tcp" || locationType === "np") {
  baseFee = FEE_STRUCTURE[category].tcp; // TCP/SADA/NP same fee
} else if (locationType === "gp") {
  baseFee = FEE_STRUCTURE[category].gp;
}
```

---

## 5. Category Classification Rules

### 5.1 Official Category Definitions (Rule 2e)

| Category | Average Room Rate (per room per night) | GSTIN Required? |
|----------|----------------------------------------|-----------------|
| **Diamond** | **Higher than** ₹10,000 | ✅ Mandatory (ANNEXURE-I, Section 12) |
| **Gold** | ₹3,000 to ₹10,000 (inclusive) | ✅ Mandatory (ANNEXURE-I, Section 12) |
| **Silver** | **Less than** ₹3,000 | ❌ Exempt (ANNEXURE-I, Section 12) |

### 5.2 Category Determination Logic

**CRITICAL CLARIFICATION:** Categories are based on **AVERAGE room rate** calculated from total revenue across all rooms, not individual room rates.

**Average Rate Formula:**
```
Average Rate = Total Revenue per Night / Total Number of Rooms
```

**Diamond Category Qualification:**
- **Minimum 5 rooms** (Rule 2e specifies "Diamond" category requires substantial capacity)
- **Average rate >₹10,000/night** per room
- **Total revenue >₹50,000/night** (5 rooms × ₹10,000)

**Example Calculations:**

**Example 1: Diamond Category (VALID)**
```
Property has:
- 3 single bed rooms @ ₹8,000/night = ₹24,000
- 2 double bed rooms @ ₹15,000/night = ₹30,000

Total: 5 rooms, ₹54,000/night total revenue
Average: ₹54,000 ÷ 5 = ₹10,800/room
Category: DIAMOND ✓ (5+ rooms AND average >₹10,000)
```

**Example 2: Gold Category**
```
Property has:
- 2 single bed rooms @ ₹5,000/night = ₹10,000
- 2 double bed rooms @ ₹7,000/night = ₹14,000

Total: 4 rooms, ₹24,000/night total revenue
Average: ₹24,000 ÷ 4 = ₹6,000/room
Category: GOLD ✓ (average between ₹3,000-₹10,000)
```

**Example 3: Diamond Category (INVALID - Insufficient Rooms)**
```
Property has:
- 2 double bed rooms @ ₹12,000/night = ₹24,000

Total: 2 rooms, ₹24,000/night total revenue
Average: ₹24,000 ÷ 2 = ₹12,000/room
Category: GOLD (Not Diamond - less than 5 rooms)
Note: Even though average rate >₹10,000, Diamond requires minimum 5 rooms
```

**Example 4: Silver Category**
```
Property has:
- 3 single bed rooms @ ₹2,500/night = ₹7,500

Total: 3 rooms, ₹7,500/night total revenue
Average: ₹7,500 ÷ 3 = ₹2,500/room
Category: SILVER ✓ (average <₹3,000)
```

### 5.3 Room Rate Collection

**Per Room Type Rates (Required for Certificate Form-A):**

The application MUST collect proposed room rent for each room type:
- **Single bed room rate** (per night)
- **Double bed room rate** (per night)
- **Family suite rate** (per night)

These individual rates appear on the official registration certificate (Form-A).

**Total Revenue Calculation:**
```typescript
const totalRevenue = 
  (singleBedRooms × singleBedRoomRate) +
  (doubleBedRooms × doubleBedRoomRate) +
  (familySuites × familySuiteRate);

const totalRooms = singleBedRooms + doubleBedRooms + familySuites;
const averageRate = totalRevenue / totalRooms;
```

### 5.4 Category Selection & Validation Process

**User-Selected Category:**
- Applicant chooses Diamond/Gold/Silver during application
- System validates based on average rate and room count
- Government verifies during inspection

**Validation Rules:**
```typescript
// Category thresholds
const THRESHOLDS = {
  diamond: { 
    minRooms: 5, 
    minAverageRate: 10000 
  },
  gold: { 
    minRooms: 1, 
    minAverageRate: 3000, 
    maxAverageRate: 10000 
  },
  silver: { 
    minRooms: 1, 
    maxAverageRate: 3000 
  }
};

// Validation logic
function validateCategory(category, totalRooms, averageRate) {
  if (category === "diamond") {
    if (totalRooms < 5) {
      return {
        valid: false,
        message: "Diamond category requires minimum 5 rooms"
      };
    }
    if (averageRate <= 10000) {
      return {
        valid: false,
        message: "Diamond category requires average rate >₹10,000/night per room"
      };
    }
  }
  
  if (category === "gold") {
    if (averageRate < 3000 || averageRate > 10000) {
      return {
        valid: false,
        message: "Gold category requires average rate ₹3,000-₹10,000/night per room"
      };
    }
  }
  
  if (category === "silver") {
    if (averageRate >= 3000) {
      return {
        valid: false,
        message: "Silver category requires average rate <₹3,000/night per room"
      };
    }
  }
  
  return { valid: true };
}

// Smart category suggestion
function suggestCategory(totalRooms, averageRate) {
  if (totalRooms >= 5 && averageRate > 10000) {
    return "diamond";
  } else if (averageRate >= 3000 && averageRate <= 10000) {
    return "gold";
  } else if (averageRate < 3000) {
    return "silver";
  }
  return "silver"; // Default
}
```

### 5.4 Category-Based Benefits

**Rule 10 - Incentives/Exemptions:**

| Benefit | Diamond | Gold | Silver |
|---------|---------|------|--------|
| **Electricity rates** | Commercial | Commercial | **Domestic** |
| **Water supply rates** | Commercial | Commercial | **Domestic** |
| **GSTIN requirement** | Mandatory | Mandatory | Exempt |

---

## 6. Registration Process Requirements

### 6.1 Processing Timeline (Rule 3.4)

**60-Day Auto-Approval Rule:**

> "Every application made under sub-rule (1) shall be disposed off within a period of **sixty days** from the date of receipt of application, **failing which the application shall be deemed to have been accepted for registration**"

**Exclusions from 60 days:**
- Time for observations by prescribed authority
- Time for applicant to make corrections
- Unavoidable circumstances

**Implementation:**
- Track application submission date
- Show countdown timer (60 days remaining)
- Auto-approve if not processed within 60 days
- Notify applicant of automatic approval

### 6.2 Validity Period Options (Rule 5.1, Rule 7.2)

**User Choice:**
- **1 year** validity
- **3 years** validity

**Payment:**
- 1 year: Pay annual fee
- 3 years: Pay 3× annual fee, get 10% discount

**Certificate Expiry:**
- Display validity end date on certificate
- Send renewal reminders 30 days before expiry
- Renewal uses same fee structure as registration

### 6.3 Re-Registration Requirement (Rule 3.3)

> "Any person operating a Home Stay, if intends to make any changes in **the number of rooms** to be offered as Home Stay, shall intimate the prescribed authority before doing so and such a unit shall be required to be **registered afresh** under rule 5 of these rules."

**Triggers for Re-Registration:**
- Adding rooms
- Removing rooms
- Converting room types (e.g., single to double)

**Process:**
- Notify prescribed authority
- Submit new application
- Pay new registration fee
- Receive new certificate

---

## 7. Application Form Requirements (ANNEXURE-I)

### 7.1 Complete Field List

As per official ANNEXURE-I (Rule 3.1), the application form MUST collect:

#### **Section 1: Basic Information**
1. Name of the proposed Unit
2. Name and address of the Owner(s)/Promoter(s)
3. Complete postal address:
   - Telephone number
   - Fax
   - Email
   - Mobile number

#### **Section 2: Distance from Key Locations (in km)**
4. Distance from nearest:
   - Airport
   - Railway Station
   - City Centre
   - Main shopping centre
   - Bus stand/scheduled city bus stop

#### **Section 3: Project Type**
5. Whether adding new rooms (with attached toilets) to existing house OR totally a new project

#### **Section 4: Property Details**
6. Details of Home Stay Unit:
   - **a. Area (in sq. meters) with title – owned/leased**
     - (copies of sale/lease deed to be enclosed)
   - **b. Revenue papers regarding ownership**
     - Affidavit in case of co-sharers of House-Land
   - **c. Number of rooms and area for each type of room in sq. ft. (single/double/suites)**
   - **d. Number of attached wash rooms**
   - **e. Details of public areas in sq. ft.:**
     - (i) Lobby/lounge
     - (ii) Dining space
     - (iii) Parking facilities
   - **f. Additional facilities available, if any (not mandatory):**
     - (i) Eco-friendly facilities
     - (ii) Facilities for differently abled persons
   - **g. Details of Fire Fighting equipment/hydrants etc., if any**

#### **Section 5: Photographs**
7. Photographs of the building, including interiors (at least two photographs from outside, rooms, lounge, interiors etc.)
   - **Note:** Uploaded on official web-portal

#### **Section 6: Ownership Documents**
8. Either one of the following:
   - Affidavit from co-sharer(s), if applicable, in case of co-sharers
   - OR
   - Patwari report if house/land is on joint holding

#### **Section 7: Medical Facilities**
9. Details of the nearest Hospital/Dispensary (Allopathic as well as Ayurvedic)

#### **Section 8: Checklist Confirmation**
10. Whether all documents as per check list have been attached/uploaded (Yes/No)

#### **Section 9: Undertaking**
11. Consent of acceptance of regulatory conditions (Form-C undertaking)

#### **Section 10: GSTIN**
12. Goods and Services Tax Identification Number (GSTIN):
    - **Mandatory** for Diamond and Gold category
    - **Exempted** for Silver category

---

## 8. Required Documents (ANNEXURE-II)

As per Rule 4 and ANNEXURE-II, the following documents MUST be submitted:

| Sl. No. | Document | Remarks |
|---------|----------|---------|
| 1 | Application for registration (ANNEXURE-I) | |
| 2 | Inspection report by Prescribed Officer | System generated after site inspection |
| 3 | Revenue papers (Jamabandi and Tatima) | Land ownership proof |
| 4 | Affidavit under Section 29 of HP Tourism Development & Registration Act, 2002 | |
| 5 | Undertaking from owner on Stamp Paper (Form-C) | As per ANNEXURE |
| 6 | Register for verification/signature (Rule 8.5) | Guest register format |
| 7 | Bill Book/Home Stay pad for verification/signature (Rule 8.6) | Billing format |

---

## 9. Inspection Checklist (ANNEXURE-III)

### 9.1 Mandatory Requirements

| No. | Requirement | Compliance Level |
|-----|-------------|------------------|
| 1 | Application Form (ANNEXURE-I) | ✅ Mandatory |
| 2 | Documents list (ANNEXURE-II) | ✅ Mandatory |
| 3 | Online payment facility (UPI, Net, Debit/Credit Card) + cash option in low-connectivity areas | ✅ Mandatory |
| 4 | Well maintained and well equipped house and guest rooms with quality carpets/rugs/tiles/marble flooring, furniture, fittings | ✅ Mandatory |
| 5 | All rooms clean, airy, pest free, without dampness, with outside window/ventilation | ✅ Mandatory |
| 6 | Comfortable bed with good quality linen & bedding | ✅ Mandatory |
| 7 | Adherence to minimum room and bathroom size in sq. ft. | ✅ Mandatory |
| 8 | Well maintained smoke free, clean, hygienic, odour free, pest free kitchen | ✅ Mandatory |
| 9 | Good quality cutlery and crockery | ✅ Mandatory |
| 10 | RO/Aqua Guard water facility | ✅ Mandatory |
| 11 | Garbage disposal as per Municipal/applicable laws | ✅ Mandatory |
| 12 | Energy Saving Lighting (CFL/LED) in guest rooms and public areas | ✅ Mandatory |
| 13 | Visitor book and feedback facilities | ✅ Mandatory |
| 14 | Name, address and telephone number of doctors | ✅ Mandatory |
| 15 | Facilities for assisting tourists with forgotten/left back luggage | ✅ Mandatory |
| 16 | Basic fire equipments | ✅ Mandatory |
| 17 | Register (physical or electronic) for guest check-in/out with passport details for foreign tourists | ✅ Mandatory |
| 18 | CCTVs in common areas | ✅ Mandatory |

### 9.2 Desirable Requirements (Not Mandatory)

| No. | Requirement | Compliance Level |
|-----|-------------|------------------|
| 1 | Sufficient parking with adequate road width | ⚪ Desirable |
| 2 | Attached private bathroom with toiletries | ⚪ Desirable |
| 3 | WC toilet with seat, lid, toilet paper | ⚪ Desirable |
| 4 | Running hot & cold water with proper sewerage | ⚪ Desirable |
| 5 | Water saving taps/shower | ⚪ Desirable |
| 6 | Dining area serving fresh and hygienic food | ⚪ Desirable |
| 7 | Wardrobe with at least 4 clothes hangers | ⚪ Desirable |
| 8 | Shelves or drawer space | ⚪ Desirable |
| 9 | Good quality chairs, working table, furniture | ⚪ Desirable |
| 10 | Washing Machines/dryers or laundry/dry cleaning arrangements | ⚪ Desirable |
| 11 | Refrigerator | ⚪ Desirable |
| 12 | Lounge or seating in lobby | ⚪ Desirable |
| 13 | Heating and cooling in enclosed public rooms | ⚪ Desirable |
| 14 | Luggage assistance on request | ⚪ Desirable |
| 15 | Safekeeping facilities in room | ⚪ Desirable |
| 16 | Security guard | ⚪ Desirable |
| 17 | Himachali Handicrafts and Architecture promotion | ⚪ Desirable |
| 18 | Rainwater harvesting system | ⚪ Desirable |

---

## 10. Technical Implementation Changes

### 10.1 Database Schema Updates

**New/Modified Fields Required:**

```typescript
// Room type breakdown (MANDATORY)
singleBedRooms: integer("single_bed_rooms").notNull().default(0),
singleBedRoomSize: decimal("single_bed_room_size", { precision: 10, scale: 2 }),
doubleBedRooms: integer("double_bed_rooms").notNull().default(0),
doubleBedRoomSize: decimal("double_bed_room_size", { precision: 10, scale: 2 }),
familySuites: integer("family_suites").notNull().default(0).max(3), // Max 3 suites
familySuiteSize: decimal("family_suite_size", { precision: 10, scale: 2 }),

// Attached washrooms count
attachedWashrooms: integer("attached_washrooms").notNull(),

// Total rooms (calculated: single + double + suites, max 6)
totalRooms: integer("total_rooms").notNull().max(6),

// Total beds (calculated: single + 2×double + 4×suites, max 12)
totalBeds: integer("total_beds").notNull().max(12),

// Category selection
category: varchar("category", { length: 20 }).notNull(), // 'diamond', 'gold', 'silver'

// Proposed room rate per night (determines category)
proposedRoomRate: decimal("proposed_room_rate", { precision: 10, scale: 2 }).notNull(),

// Certificate validity
certificateValidityYears: integer("certificate_validity_years").notNull(), // 1 or 3

// Fee calculation fields
locationType: varchar("location_type", { length: 10 }).notNull(), // 'mc', 'tcp', 'gp'
isPangiSubDivision: boolean("is_pangi_sub_division").default(false),
ownerGender: varchar("owner_gender", { length: 10 }).notNull(), // 'male', 'female', 'other'

// GSTIN (mandatory for Diamond/Gold)
gstin: varchar("gstin", { length: 15 }), // Required if category is diamond or gold
```

### 10.2 Validation Rules

**Client-Side & Server-Side Validations:**

```typescript
// Room capacity validations
const totalRooms = singleBedRooms + doubleBedRooms + familySuites;
const totalBeds = singleBedRooms + (doubleBedRooms * 2) + (familySuites * 4);

if (totalRooms > 6) {
  throw new Error("Maximum 6 rooms allowed");
}

if (totalBeds > 12) {
  throw new Error("Maximum 12 single beds equivalent allowed");
}

if (familySuites > 3) {
  throw new Error("Maximum 3 family suites allowed");
}

// Category-rate alignment
if (category === "diamond" && proposedRoomRate <= 10000) {
  throw new Error("Diamond category requires room rate >₹10,000/night");
}

if (category === "gold" && (proposedRoomRate < 3000 || proposedRoomRate > 10000)) {
  throw new Error("Gold category requires room rate ₹3,000-₹10,000/night");
}

if (category === "silver" && proposedRoomRate >= 3000) {
  throw new Error("Silver category requires room rate <₹3,000/night");
}

// GSTIN validation
if ((category === "diamond" || category === "gold") && !gstin) {
  throw new Error("GSTIN is mandatory for Diamond and Gold categories");
}

// Room size validation
if (projectType === "new_project") {
  if (singleBedRoomSize && singleBedRoomSize < 100) {
    throw new Error("Single bed room minimum size: 100 sq ft for new construction");
  }
  if (doubleBedRoomSize && doubleBedRoomSize < 120) {
    throw new Error("Double bed room minimum size: 120 sq ft for new construction");
  }
} else {
  if (singleBedRoomSize && singleBedRoomSize < 80) {
    throw new Error("Single bed room minimum size: 80 sq ft for existing construction");
  }
  if (doubleBedRoomSize && doubleBedRoomSize < 100) {
    throw new Error("Double bed room minimum size: 100 sq ft for existing construction");
  }
}
```

### 10.3 Fee Calculation Logic

```typescript
function calculateRegistrationFee({
  category,
  locationType,
  certificateValidityYears,
  ownerGender,
  district,
  tehsil,
}: FeeParams): FeeBreakdown {
  
  // Base fee structure (GST included)
  const FEE_STRUCTURE = {
    diamond: { mc: 18000, tcp: 12000, gp: 10000 },
    gold: { mc: 12000, tcp: 8000, gp: 6000 },
    silver: { mc: 8000, tcp: 5000, gp: 3000 },
  };

  // Step 1: Get base annual fee
  let baseFee = FEE_STRUCTURE[category][locationType];

  // Step 2: Apply Pangi discount (50%) FIRST
  const isPangi = district === "Chamba" && tehsil === "Pangi";
  if (isPangi) {
    baseFee = baseFee * 0.5;
  }

  // Step 3: Calculate multi-year fee
  let totalFee = baseFee * certificateValidityYears;

  // Step 4: Apply 3-year discount (10%)
  let threeYearDiscount = 0;
  if (certificateValidityYears === 3) {
    threeYearDiscount = totalFee * 0.10;
    totalFee -= threeYearDiscount;
  }

  // Step 5: Apply female owner discount (5%)
  let femaleDiscount = 0;
  if (ownerGender === "female") {
    femaleDiscount = totalFee * 0.05;
    totalFee -= femaleDiscount;
  }

  return {
    baseFee,
    certificateValidityYears,
    subtotal: baseFee * certificateValidityYears,
    pangiDiscount: isPangi ? baseFee : 0,
    threeYearDiscount,
    femaleDiscount,
    totalFee,
    breakdown: {
      isPangiApplicable: isPangi,
      isThreeYearApplicable: certificateValidityYears === 3,
      isFemaleApplicable: ownerGender === "female",
    }
  };
}
```

### 10.4 Certificate Generation

**Form-A Template (Official Format):**

```
GOVERNMENT OF HIMACHAL PRADESH
DEPARTMENT OF TOURISM & CIVIL AVIATION
CERTIFICATE OF REGISTRATION OF A HOME STAY UNIT
Form-A
[See rule- 5 (1)]

Valid till: [EXPIRY_DATE]
No: [CERTIFICATE_NUMBER]
Dated: [ISSUE_DATE]

This is to certify that the Home Stay unit known as [PROPERTY_NAME]
located in the tourist area [LOCATION] to be operated/being operated
by Shri/Smt. [OWNER_NAME] s/o or d/o or w/o of Shri [FATHER_NAME]
Proprietor/Owner(s)/Promoter(s) of the said Home Stay unit has been
registered under category [DIAMOND/GOLD/SILVER] under the Himachal
Pradesh Tourism Development and Registration Act, 2002 and the rules
made thereunder:

┌────────┬──────────────────────────┬─────────────┬────────────────────────────┐
│ Sl.No. │ Details of accommodation │ No. of rooms│ Proposed room rent per night│
├────────┼──────────────────────────┼─────────────┼────────────────────────────┤
│   1.   │ Single bed rooms         │ [COUNT]     │ ₹[RATE]                    │
│   2.   │ Double bed rooms         │ [COUNT]     │ ₹[RATE]                    │
│   3.   │ Family suite             │ [COUNT]     │ ₹[RATE]                    │
└────────┴──────────────────────────┴─────────────┴────────────────────────────┘

Note: Total number of beds shall not exceed 12.

Place: [PLACE]
Date: [DATE]
                                                      (Prescribed Authority)
                                                      [DTDO/ATDO NAME]
                                                      [DISTRICT]
```

---

## 11. Backward Compatibility

### 11.1 Migration for Existing Units

**Rule 3.6i - Incredible India & HP 2008 Scheme Units:**

> "Tourism units already registered under Incredible India B&B/Homestay or HP Homestay Scheme 2008 shall apply within **30 days** from June 25, 2025"

**Grace Period:**
- 30 days to apply for re-registration
- 90 days to fulfill new requirements
- No registration fee until existing registration expires

**Migration Process:**
1. Existing units submit ANNEXURE-I application
2. System pre-fills data from old registration
3. Owner updates missing fields (room type breakdown, GSTIN if applicable)
4. Submit for inspection
5. Receive Form-A1 certificate (valid until old expiry date)
6. Renewal under new rules at expiry

### 11.2 Database Migration Script

```typescript
// Migrate existing applications to 2025 schema
async function migrate2025Schema() {
  const existingApps = await db.select().from(homestayApplications);

  for (const app of existingApps) {
    // If totalRooms exists but room breakdown doesn't
    if (app.totalRooms && !app.singleBedRooms) {
      // Estimate room breakdown (conservative approach)
      // Assume all double bed rooms unless specified
      await db.update(homestayApplications)
        .set({
          doubleBedRooms: app.totalRooms,
          singleBedRooms: 0,
          familySuites: 0,
          totalBeds: app.totalRooms * 2, // Double bed = 2 beds
          // Flag for manual review
          requiresManualReview: true,
          migrationNote: "Auto-migrated from pre-2025 data - please verify room types"
        })
        .where(eq(homestayApplications.id, app.id));
    }
  }
}
```

---

## 12. Implementation Roadmap

### Phase 1: Critical Compliance Updates (Week 1-2)

- [ ] Update database schema with room type breakdown fields
- [ ] Implement room capacity validations (6 rooms / 12 beds)
- [ ] Update fee calculation to match 2025 structure
- [ ] Implement discount stacking (Pangi → 3-year → Female)
- [ ] Add certificate validity selection (1 year / 3 years)
- [ ] Update GSTIN requirement logic (mandatory for Diamond/Gold only)

### Phase 2: Form & Validation Updates (Week 3-4)

- [ ] Add room type input fields (Single/Double/Suite)
- [ ] Add room size validations (new vs existing construction)
- [ ] Implement real-time bed capacity calculator
- [ ] Add category-rate alignment warnings
- [ ] Update ANNEXURE-I form to match official format
- [ ] Implement 60-day auto-approval timer

### Phase 3: Document & Inspection (Week 5-6)

- [ ] Update document upload checklist (ANNEXURE-II)
- [ ] Implement inspection checklist (ANNEXURE-III)
- [ ] Add mandatory vs desirable requirement indicators
- [ ] Generate inspection reports
- [ ] Implement CCTV requirement for common areas

### Phase 4: Certificate & Migration (Week 7-8)

- [ ] Update certificate template to Form-A format
- [ ] Add room type breakdown to certificate
- [ ] Implement Form-A1 for migrating units
- [ ] Create migration workflow for 2008 scheme units
- [ ] Add 30-day/90-day grace period tracking

---

## 13. Critical Policy Differences - Summary

| Aspect | Old Understanding | **2025 Official Rules** |
|--------|-------------------|------------------------|
| Room types | Any rooms | **MUST specify:** Single bed, Double bed, Family suites |
| Max capacity | Vague | **Explicit:** 6 rooms OR 12 beds |
| Family suites | Not mentioned | **Allowed:** Max 3 suites (4 beds each) |
| Fee structure | Separate GST | **All-inclusive** (GST included) |
| Renewal fee | Unclear | **Same as registration fee** |
| Female discount | Not in old docs | **5% official discount** (Rule 7.3) |
| 3-year discount | Not in old docs | **10% official discount** (Rule 7.2) |
| Pangi discount | Not in old docs | **50% official discount** (Rule 7.4) |
| GSTIN | Required for all | **Diamond/Gold:** Required, **Silver:** Exempt |
| Room sizes | Not specified | **New:** 120/100 sq ft, **Existing:** 100/80 sq ft |
| Processing time | Undefined | **60 days** with auto-approval (Rule 3.4) |
| Re-registration | Not specified | **Required** when changing room count (Rule 3.3) |
| Owner definition | Anyone | **Only land revenue record owners** (Rule 2h) |

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0 | Nov 1, 2025 | HP Tourism Team | Complete rewrite based on official June 25, 2025 gazette notification |

**References:**
- Official Notification: TSM-F(10)-10/2003-VI, dated June 25, 2025
- HP Tourism Development and Registration Act, 2002 (Act No. 15 of 2002)
- HP Land Revenue Act, 1954
- Rajpatra (e-Gazette), Himachal Pradesh, June 25, 2025

**Approval:**
This PRD is based on officially published government notification and requires no internal approval. All provisions are legally binding as per state law.

---

**END OF PRD 2025 POLICY UPDATE**
