# PRD Annex A - Key Pain Points & Checklist
## Online Portal for Home Stay - Stakeholder Requirements

**Document Date:** October 1, 2025  
**Source:** Stakeholder feedback and requirements compilation  
**Status:** Active Requirements  

---

## Overview

This document captures key pain points, feature requests, and operational requirements identified by stakeholders (government officers, property owners, and administrators) for the HP Tourism Online Portal. These requirements supplement the official 2025 Homestay Rules and address practical usability and workflow needs.

---

## Database & Search Requirements

### 1. Advanced Filtering Capabilities
**Requirement:** Database of Home Stay should have date wise filter and year wise filter.

**Implementation Priority:** High  
**Rationale:** Officers need to track applications by submission date, approval date, and certificate expiry date for reporting and compliance monitoring.

**Suggested Features:**
- Date range picker for application submission dates
- Year-wise filter dropdown (2023, 2024, 2025...)
- Filter by certificate validity period
- Export filtered results to Excel/PDF

---

### 2. Improved Navigation UX
**Requirement:** Database of Home Stay should have the option of back button on the same page and back button should go to previous page not to home page.

**Implementation Priority:** Medium  
**Rationale:** Users lose context when clicking "back" redirects to homepage instead of previous page in workflow.

**Suggested Features:**
- Browser-native back button support
- Breadcrumb navigation showing user's path
- "Return to List" button that remembers last filter/page state
- Session state preservation for search filters

---

## Application Form Requirements

### 3. Mandatory Contact Information
**Requirement:** Every application should have the option of Contact No. & e-mail of the applicant and it should be a mandatory field.

**Implementation Priority:** High  
**Rationale:** Essential for communication during document verification, inspection scheduling, and clarification requests.

**Validation Rules:**
- Mobile number: 10-digit Indian format (starting with 6-9)
- Email: Valid email format
- Both fields MUST be mandatory
- Display contact info on DA/DTDO dashboard for quick access

---

### 4. Document Upload Format Restrictions
**Requirement:** All documents should be uploaded in picture only and the photographs in JPEG, PNG etc.

**Implementation Priority:** High  
**Rationale:** Standardize document formats for easier viewing and reduce upload of incompatible file types.

**Allowed Formats:**
- Images: JPEG, JPG, PNG
- Documents: PDF (for multi-page documents like ownership proofs)
- Maximum file size: 5MB per file
- Image resolution: Minimum 800x600 pixels for legibility

**Rejected Formats:**
- Word documents (.doc, .docx)
- Excel files (.xls, .xlsx)
- Raw image formats (.raw, .tiff)

---

## Certificate Management

### 5. Certificate Download Feature
**Requirement:** Option for downloading the certificate should be available in the user login.

**Implementation Priority:** High  
**Rationale:** Property owners need digital copies of certificates for display, bank loan applications, and compliance verification.

**Implementation:**
- "Download Certificate" button on owner dashboard
- PDF format with official HP Government seal
- Watermark with certificate number and QR code for verification
- Download log tracking (who downloaded, when)

---

### 6. Special Characters in Certificates
**Requirement:** Special Characters like bracket etc. be allowed in the register certificate.

**Implementation Priority:** Medium  
**Rationale:** Property names may include brackets, hyphens, apostrophes for branding (e.g., "Shiva's Retreat (Valley View)")

**Allowed Special Characters:**
- Brackets: ( )
- Hyphens: -
- Apostrophes: '
- Ampersands: &
- Commas: ,

**Validation:**
- Block potentially harmful characters: <, >, {, }, [, ], |, \, /
- Sanitize input to prevent SQL injection
- Limit special characters to 20% of total property name length

---

### 7. Co-Sharer NOC Upload
**Requirement:** NOC of co-sharer option be included.

**Implementation Priority:** High  
**Rationale:** As per Rule 2(h) - 2025 Rules, only land revenue record owners can register. If property has multiple co-sharers, NOC from all co-sharers is mandatory.

**Implementation:**
- Add "Co-Sharer NOC" document upload field in ANNEXURE-II documents
- Mandatory if applicant declares co-ownership
- Accept scanned affidavit or notarized NOC
- Verification during document scrutiny stage

---

### 8. Post-Approval Certificate Editing
**Requirement:** Approval authority should have the option of edit after generating final certificate (for which separate ID/CODE/PIN/OTP may be provided).

**Implementation Priority:** Medium  
**Rationale:** Typographical errors, name spelling corrections, or address updates may be needed after certificate issuance.

**Security Measures:**
- Requires State Officer or Super Admin role
- OTP sent to registered mobile before edit access
- Audit trail logging all certificate modifications
- Re-issue certificate with new version number
- Original certificate marked as "Superseded"

**Allowed Edits:**
- Property name spelling corrections
- Owner name corrections (with supporting documents)
- Address corrections (not location change - that requires re-registration)
- Contact information updates

**Not Allowed:**
- Category change (requires re-registration)
- Room count change (requires re-registration per Rule 3.3)
- Fee adjustments (requires finance approval)

---

## Fee & Transaction Management

### 9. Fees for Modification Requests
**Requirement:** Fees should be charged for applying online for any type of application whether it be for addition/deletion of rooms/ change of name of Home Stay and change of ownership etc. Except cancellation.

**Implementation Priority:** High  
**Rationale:** Processing modifications requires officer time and system resources. Fee structure ensures commitment and reduces frivolous requests.

**Fee Structure for Modifications:**

| Modification Type | Fee Amount | Rationale |
|------------------|------------|-----------|
| **Addition/Deletion of Rooms** | Same as Registration Fee | Requires re-registration per Rule 3.3 |
| **Change of Property Name** | 20% of Registration Fee | Minor administrative change |
| **Change of Ownership** | Same as Registration Fee | Requires full document verification |
| **Contact Info Update** | Free | Encourages keeping records current |
| **Voluntary Cancellation** | Free | No processing required |

**Payment Process:**
- Online payment gateway integration
- Payment receipt auto-generated
- Application processing starts only after payment confirmation

---

### 10. Comprehensive Modification Options
**Requirement:** Option for New /Renew/addition/deletion of rooms/ change of name of Home Stay and change of ownership alongwith option of fee to be paid (MC/TCP/Rural) etc.

**Implementation Priority:** High  
**Rationale:** Property owners need clear workflow for all modification scenarios with transparent fee calculation.

**Application Types:**

**A. New Registration**
- Full ANNEXURE-I form
- Fee: Based on category + location (MC/TCP/GP) + validity period (1 or 3 years)
- Discounts: Pangi (50%), 3-year (10%), Female owner (5%)

**B. Renewal**
- Simplified form (verify existing details)
- Fee: Same as original registration fee
- No discount for renewals (as per 2025 Rules)
- Renewal can be done 30 days before expiry

**C. Addition/Deletion of Rooms** (Re-registration)
- Update room configuration section
- Site inspection required to verify changes
- Fee: Same as new registration (based on updated room count and category)
- Triggers re-registration per Rule 3.3

**D. Change of Property Name**
- Affidavit explaining reason for name change
- Fee: 20% of annual registration fee
- No site inspection required
- Certificate re-issued with new name

**E. Change of Ownership (Transfer)**
- New owner's complete details
- Ownership transfer deed/sale deed
- New owner's Aadhaar, GSTIN (if applicable)
- Fee: Same as new registration
- Full document verification and site inspection

---

### 11. Category Selection by Applicant
**Requirement:** Form of Home Stay should include category to be applied by the applicant.

**Implementation Priority:** High  
**Rationale:** 2025 Rules specify three categories (Diamond/Gold/Silver). Applicants should self-select category, subject to verification by inspection officer.

**Implementation:**
- Category selection in Step 3 of application form
- Display category requirements clearly:
  - **Diamond:** 5+ rooms, Average rate >₹10,000/night, GSTIN mandatory
  - **Gold:** 1+ rooms, Average rate ₹3,000-₹10,000/night, GSTIN mandatory
  - **Silver:** 1+ rooms, Average rate <₹3,000/night, GSTIN exempt
- Real-time validation based on room count and proposed rates
- Smart category suggestion based on inputs
- Warning messages if selected category doesn't match room details

---

## Certificate Validity Options

### 12. Flexible Certificate Validity Periods
**Requirement:** Registration certificate will be issued for 2 years of 03 years. As the Government has also notified the HP Tourism development & Registration amendment Act, 2023. Option for 1 year also be available.

**Implementation Priority:** High  
**Rationale:** 2025 Rules offer 1-year or 3-year validity. Government amendment Act 2023 mentioned 2 years, but current official rules only specify 1 or 3 years.

**Clarification Needed:**
- Current 2025 Rules (June 25, 2025) specify: **1 year OR 3 years**
- Stakeholder document mentions: **2 years OR 3 years**
- Also mentions: "Option for 1 year also be available"

**Recommended Implementation:**
- Offer **1 year, 2 years, OR 3 years** validity options
- Fee calculation:
  - 1 year: Base fee × 1
  - 2 years: Base fee × 2 (no discount)
  - 3 years: Base fee × 3 - 10% discount (as per Rule 7.2)

**Note:** Requires policy clarification from HP Tourism Department on whether 2-year option is officially supported.

---

## Security & Access Control

### 13. Prevent Multiple Applications per User
**Requirement:** Login- ID - One individual should not allow to apply multiple application.

**Implementation Priority:** High  
**Rationale:** Prevent duplicate applications, fraudulent submissions, and database clutter.

**Implementation:**

**Restriction Scope:**
- One individual (identified by mobile number + Aadhaar) cannot submit multiple applications **simultaneously**
- Same person CAN submit multiple applications **sequentially** for:
  - Different properties (if they own multiple homestays)
  - Renewal of same property after current application is processed
  - Modification requests for approved properties

**Business Logic:**
```typescript
// Allow multiple applications if:
1. Previous applications are all in "approved" or "rejected" status
2. Current application is for a different property (different ownership proof)
3. Current application is a renewal/modification of approved property

// Block multiple applications if:
1. User has pending application in "submitted", "document_verification", or "site_inspection" status
2. User has draft application saved within last 30 days (encourage completing existing draft)
```

**Error Message:**
> "You already have a pending application (Application No. HS/2025/12345) currently under review. Please complete this application before starting a new one. If you need to apply for a different property, please contact support."

---

## Document Verification Requirements

### 14. Sanction Order/Approved Map Requirement
**Requirement:** Checklist of documents of home Stay should include sanction order/approved map in MC/TCP/NP etc. area.

**Implementation Priority:** High  
**Rationale:** Urban areas (MC/TCP/NP) require building plan approval from local authorities. This ensures legal construction and fire safety compliance.

**Document Requirements by Location Type:**

**Municipal Corporation (MC) / TCP / Nagar Panchayat (NP):**
- ✅ **Mandatory:** Building sanction order / Approved building plan
- ✅ **Mandatory:** Completion certificate (for new construction)
- ✅ **Mandatory:** Fire NOC (for properties with 3+ floors or 10+ rooms)

**Gram Panchayat (GP) / Rural Areas:**
- ⚪ **Optional:** Building plan (if available)
- ✅ **Mandatory:** Affidavit confirming compliance with local building bylaws

**Validation During Document Scrutiny:**
- DA checks if uploaded document matches property address
- Sanction order should be from competent authority (MC/TCP/NP building department)
- Verify sanction order date is before property construction
- Check if any deviations from approved plan
- Flag missing documents for clarification request

---

## Implementation Roadmap

### Phase 1: Critical Requirements (Week 1-2)
1. ✅ Mandatory contact info fields (mobile + email)
2. ✅ Document upload format restrictions (JPEG/PNG/PDF only)
3. ✅ Certificate download button in owner dashboard
4. ✅ Prevent duplicate applications per user
5. ✅ Category selection with validation

### Phase 2: Fee & Modification Features (Week 3-4)
6. ⚪ Fee structure for modifications (name change, ownership transfer)
7. ⚪ Property modification workflows (add/delete rooms)
8. ⚪ Re-registration trigger when room count changes
9. ⚪ 1/2/3 year validity period selection

### Phase 3: Advanced Features (Week 5-6)
10. ⚪ Date/year-wise filtering in admin dashboard
11. ⚪ Smart back button navigation with state preservation
12. ⚪ Co-sharer NOC upload field
13. ⚪ Post-approval certificate editing (with OTP security)
14. ⚪ Sanction order requirement for urban areas

### Phase 4: UX Enhancements (Week 7-8)
15. ⚪ Special characters support in property names
16. ⚪ Breadcrumb navigation
17. ⚪ Filter state preservation
18. ⚪ Download audit logging

---

## Policy Clarifications Required

The following items need official clarification from HP Tourism Department:

1. **Certificate Validity Period:**
   - Stakeholder document mentions "2 years OR 03 years"
   - 2025 Rules (June 25, 2025) specify "1 year OR 3 years"
   - Should system support 1, 2, AND 3 year options?

2. **Modification Fees:**
   - Official 2025 Rules don't specify fees for modifications
   - Suggested fee structure needs government approval
   - Should renewal fees match registration fees (as per current rules)?

3. **Post-Approval Edits:**
   - What specific edits are allowed without re-registration?
   - Who has authority to approve certificate edits?
   - Should edited certificates be re-verified by inspection officer?

4. **Multiple Properties:**
   - Can one individual register multiple homestay properties?
   - Should there be a limit on properties per owner?
   - Different fee structure for multiple properties?

---

## Compliance Mapping

| Requirement | 2025 Rules Reference | Status |
|-------------|---------------------|--------|
| Category selection | Rule 2(e) | ✅ Aligned |
| Certificate validity (1 or 3 years) | Rule 7.2 | ⚠️ Clarification needed (stakeholder wants 2-year option) |
| Re-registration for room changes | Rule 3.3 | ✅ Aligned |
| Co-sharer NOC | Rule 2(h) + ANNEXURE-I Section 8 | ✅ Aligned |
| GSTIN requirement | ANNEXURE-I Section 12 | ✅ Aligned |
| Renewal fee = Registration fee | Rule 7 | ✅ Aligned |
| Sanction order (urban areas) | ANNEXURE-II + Rule 3.1 | ✅ Aligned |

---

## Document Control

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 1, 2025 | Initial extraction from stakeholder checklist dated Oct 1, 2025 |

**References:**
- Stakeholder Key Pain Points Checklist (October 1, 2025)
- HP Homestay Rules 2025 (Gazette notification dated June 25, 2025)
- HP Tourism Development & Registration Amendment Act, 2023

**Approval Status:**
This document compiles stakeholder requirements and needs review/approval by HP Tourism Department before implementation of policy-related items (fees, validity periods, modification workflows).

---

**END OF ANNEX A - KEY PAIN POINTS & CHECKLIST**
