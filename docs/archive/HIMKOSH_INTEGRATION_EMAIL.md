# Email Template for CTP Team

Send this email to request HimKosh integration credentials:

---

**To:**  
- vijay.gupta@nic.in (Technical Director, NIC-HP)
- mukesh.dhiman@nic.in (System Analyst, NIC-HP)

**CC:** tal-hp@nic.in

**Subject:** HimKosh Payment Gateway Integration Request - HP Tourism Portal

---

Dear Sir,

I am writing to request integration credentials for the HimKosh (Cyber Treasury Portal) payment gateway for the **HP Tourism Portal** project.

**Project Overview:**
We are developing a digital platform for tourism services in Himachal Pradesh, specifically for homestay registration and compliance management under the "Himachal Pradesh Homestay Rules 2025". The portal will enable property owners to register their homestays and make online payments for registration fees.

**Integration Requirements:**

We have reviewed the CTP Technical Integration Document and require the following credentials to complete the integration:

### 1. **Merchant Configuration**
- **Merchant Code** (e.g., HIMKOSH228)
- **Department ID** (3-digit code as per HP Budget)
- **Service Code** (3-character code for Tourism services, e.g., 'TRM')
- **DDO Code** (Format: 5-digit Treasury Code - 3-digit DDO, e.g., SML10-001)

### 2. **Head of Account Codes**
Please provide the budget head codes for:
- Homestay Registration Fee
- Homestay Renewal Fee
- Any other applicable Tourism-related fees

### 3. **Encryption Key**
- **echallan.key** file (for AES-128 encryption/decryption)
- DLL files if required

### 4. **Return URL Registration**
Please whitelist our payment callback URL:
- **Production URL:** `https://osipl.dev/api/himkosh/callback`
- **Domain:** `https://osipl.dev`

### 5. **Test Environment** (if available)
- Sandbox/test environment credentials
- Test merchant code
- Test encryption key

**Technical Details:**
- **Platform:** Node.js/TypeScript backend, React frontend
- **Integration Method:** POST to `https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx`
- **Encryption:** AES-128-CBC with MD5 checksum validation
- **Double Verification:** Server-to-server via AppVerification.aspx

**Technical Contact:**
- **Name:** [Your Name]
- **Designation:** [Your Designation]
- **Email:** [Your Email]
- **Mobile:** [Your Mobile]

**Timeline:**
We aim to complete the integration and start testing within 7 days of receiving the credentials.

We appreciate your assistance with this important digital transformation initiative for HP Tourism.

Thank you for your time and support.

Best regards,  
[Your Name]  
[Your Designation]  
[Organization Name]  
[Contact Details]

---

## After Receiving Credentials

Once you receive the credentials from CTP team, configure them in Replit Secrets:

1. Go to Replit → Tools → Secrets
2. Add the following environment variables:

```
HIMKOSH_MERCHANT_CODE=HIMKOSH228
HIMKOSH_DEPT_ID=228
HIMKOSH_SERVICE_CODE=TRM
HIMKOSH_DDO_CODE=SML10-001
HIMKOSH_HEAD_REGISTRATION=0230-00-104-01
HIMKOSH_RETURN_URL=https://osipl.dev/api/himkosh/callback
```

3. Upload the `echallan.key` file to `server/himkosh/echallan.key`

4. Restart the application

5. Test the integration!
