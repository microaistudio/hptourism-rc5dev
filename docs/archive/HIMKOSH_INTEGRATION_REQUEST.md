# HimKosh Integration - Technical Support Request

**To:** dto-cyt-hp@nic.in  
**Subject:** Encryption Format Clarification Needed  
**Merchant Code:** HIMKOSH230 | **Department:** CTO00-068 | **Project:** HP Tourism Digital Ecosystem

---

## Issue
HimKosh portal shows "CHECK SUM MISMATCH" with empty fields. Node.js encrypted data cannot be decrypted by your .NET backend.

## Our Implementation
- **Encryption:** AES-128-CBC, PKCS7 padding, ASCII encoding, Base64 output (URL-encoded)
- **Checksum:** MD5 uppercase hex on plain string
- **POST fields:** `merchant_code`, `encdata`, `checksumhash`

## Sample Test Data
**Plain string:**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-2025-000025|TotalAmount=4200|TenderBy=Test Owner|AppRefNo=HPT1761821156043bLrQ|Head1=1452-00-800-01|Amount1=4200|Ddo=SML00-532|PeriodFrom=10-30-2025|PeriodTo=10-30-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback
```

**Encrypted (Base64):**
```
igTK5MTF37qcOAes8TNaB/WCdd2H7bZvQ7nSIIaGJvEhcBTrLTlayze30vVQ05tj6Jamu2kAMu6sbXb3+phFk5e9lamxgcw0sZ/lPu5eSAdgWT6UePGupiOlrvZ3aBd2H7BzWz1dKKqQmL3F6lqivIWVPBEXfR8Hwgxe/++7yCRZU4HJ7wqDujI9AC6IBjpi3nNUVMFOTvhyNkhpOo+b1G0t4MLjMLIJNDbaWBYRFV2SGwrYqA8Pvy5uCr7eBYohpnq2evYX1B9epeYZPeL6+b8ZgiYNFlzELynA+yg8xohxv109qFTIjkyVXHIU69tl2zpMSBdLxGFtjdj2zEEHBLz6700d9YNdUZtSIfgddgc=
```

**Checksum:** `F5E50E9ECA3ABE655BCAF9A37FB292E2`

---

## What We Need

1. **Sample working encrypted payload** from your side using MERCHANT_CODE: HIMKOSH230
2. **Exact .NET encryption specs**: RijndaelManaged config, encoding, padding mode
3. **Server-side logs** showing what you receive and where decryption fails
4. **Test environment** if available

---

## Contact
**Project:** HP Tourism Digital Ecosystem  
**Environment:** Node.js (not .NET)  
**Deployment:** On-premises HP Govt data center

Can provide complete code and logs if needed.
