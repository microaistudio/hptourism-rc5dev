# HimKosh Payment Integration - Detailed Encryption Breakdown

---

## BEFORE ENCRYPTION

### Step 1: Individual Fields (What We Have)

```
DeptID       = CTO00-068
DeptRefNo    = HP-HS-TEST-004
TotalAmount  = 1
TenderBy     = Demo Property Owner
AppRefNo     = HPT1761889846394oyuD
Head1        = 1452-00-800-01
Amount1      = 1
Head2        = 1452-00-800-01
Amount2      = 0
Ddo          = KNG00-532
PeriodFrom   = 31-10-2025
PeriodTo     = 31-10-2025
Service_code = TSM
return_url   = https://osipl.dev/api/himkosh/callback
```

---

### Step 2: Build CORE String (Pipe-Delimited, for Checksum)

**Fields Included in Checksum Calculation:**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-TEST-004|TotalAmount=1|TenderBy=Demo Property Owner|AppRefNo=HPT1761889846394oyuD|Head1=1452-00-800-01|Amount1=1|Head2=1452-00-800-01|Amount2=0|Ddo=KNG00-532|PeriodFrom=31-10-2025|PeriodTo=31-10-2025
```

**Breakdown:**
- Total length: 235 characters
- Number of fields: 12
- Delimiter: Pipe (|)
- **STOPS at PeriodTo** (does NOT include Service_code or return_url)

---

### Step 3: Calculate MD5 Checksum

**Input for MD5:** CORE String (above)

**Algorithm:**
1. Take CORE string (235 chars)
2. Encode as ASCII (NOT UTF-8)
3. Calculate MD5 hash
4. Convert to hexadecimal
5. Convert to UPPERCASE

**Output Checksum:**
```
6758E982FC09ECBCFDA00A12C12845EB
```

---

### Step 4: Build FULL String (for Encryption)

**Append to CORE string:**
1. Service_code field
2. return_url field  
3. checkSum field

**FULL String:**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-TEST-004|TotalAmount=1|TenderBy=Demo Property Owner|AppRefNo=HPT1761889846394oyuD|Head1=1452-00-800-01|Amount1=1|Head2=1452-00-800-01|Amount2=0|Ddo=KNG00-532|PeriodFrom=31-10-2025|PeriodTo=31-10-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback|checkSum=6758E982FC09ECBCFDA00A12C12845EB
```

**Breakdown:**
- Total length: 364 characters
- Number of fields: 15 (12 core + Service_code + return_url + checkSum)
- Delimiter: Pipe (|)

---

### Step 5: Encrypt FULL String

**Encryption Algorithm:**
- **Cipher:** AES-128-CBC (RijndaelManaged)
- **Key:** 16 bytes (from echallan.key file, bytes 0-15)
- **IV:** 16 bytes (from echallan.key file, bytes 16-31)
- **Padding:** PKCS7
- **Input Encoding:** ASCII
- **Output Encoding:** Base64

**Input (Plain Text):**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-TEST-004|TotalAmount=1|TenderBy=Demo Property Owner|AppRefNo=HPT1761889846394oyuD|Head1=1452-00-800-01|Amount1=1|Head2=1452-00-800-01|Amount2=0|Ddo=KNG00-532|PeriodFrom=31-10-2025|PeriodTo=31-10-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback|checkSum=6758E982FC09ECBCFDA00A12C12845EB
```

---

## AFTER ENCRYPTION

**Encrypted Output (Base64):**
```
igTK5MTF37qcOAes8TNaB/WCdd2H7bZvQ7nSIIaGJvEottxF77NIHVr+IhSdQgFNiMUyrcm7t4wJ4Q9NZfCrI2GnaQbJEqlU9qD6UTHAoQs01nZcNOgfy4Wgg16f/FZZcIfHDzwluoLZzjIFjiR4zVkyaCO0AqXYioU4uxblJlQ4C/kNoDlGqC/FkiAM9DRPGE586v1kP4sqUzAAjXnnZLQVp6AjMEqaipRwWJEw+E0N/qVKE1wKGNMB4nCXDRHb9YnWPvmFkub8YyXVeA9rW8N3iHyg/lg7zzj2r+XVaXB3cVsVEG2AjNYk4ZUBlLiFMXqGUynMCP/hfkr7gavVp9lZN35uovCTX/YPRBOG5Ihrv2VrO6FNhTAU0Mi5UibOKoOi0TvOPlyK4D0x/zL7xevjMvBvg0CBNrUvRbIi2WH3YaoWEe3KRJxrpYicL9Hu75rSyusnjBZ72eo40sMMzInzI55R0wBNtxmGd1mYl+8=
```

**Length:** 492 characters

---

## WHAT WE POST TO HIMKOSH

**URL:**
```
https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx
```

**HTTP Method:** POST

**Form Data:**
```
MerchantCode = HIMKOSH230
encdata = igTK5MTF37qcOAes8TNaB/WCdd2H7bZvQ7nSIIaGJvEottxF77NIHVr+IhSdQgFNiMUyrcm7t4wJ4Q9NZfCrI2GnaQbJEqlU9qD6UTHAoQs01nZcNOgfy4Wgg16f/FZZcIfHDzwluoLZzjIFjiR4zVkyaCO0AqXYioU4uxblJlQ4C/kNoDlGqC/FkiAM9DRPGE586v1kP4sqUzAAjXnnZLQVp6AjMEqaipRwWJEw+E0N/qVKE1wKGNMB4nCXDRHb9YnWPvmFkub8YyXVeA9rW8N3iHyg/lg7zzj2r+XVaXB3cVsVEG2AjNYk4ZUBlLiFMXqGUynMCP/hfkr7gavVp9lZN35uovCTX/YPRBOG5Ihrv2VrO6FNhTAU0Mi5UibOKoOi0TvOPlyK4D0x/zL7xevjMvBvg0CBNrUvRbIi2WH3YaoWEe3KRJxrpYicL9Hu75rSyusnjBZ72eo40sMMzInzI55R0wBNtxmGd1mYl+8=
```

---

## FIELD ORDER SUMMARY

### In Checksum (12 fields):
1. DeptID
2. DeptRefNo
3. TotalAmount
4. TenderBy
5. AppRefNo
6. Head1
7. Amount1
8. Head2
9. Amount2
10. Ddo
11. PeriodFrom
12. PeriodTo

### In Encrypted String (15 fields):
1-12. (Same as above)
13. Service_code
14. return_url
15. checkSum

---

## KEY NOTES

1. **Checksum calculated BEFORE** adding Service_code/return_url
2. **All field names** are case-sensitive (DeptID, not deptid)
3. **Date format:** DD-MM-YYYY (not YYYY-MM-DD)
4. **Encoding:** ASCII throughout (not UTF-8)
5. **MD5 output:** UPPERCASE hex
6. **Head2/Amount2:** Always included (even if Amount2=0)
