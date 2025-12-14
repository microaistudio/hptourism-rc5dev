# HimKosh Checksum Test Data
**For NIC-HP CTP Team Verification**

---

## Test Transaction Details

**CORE String (what we calculate MD5 on):**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-TEST-004|TotalAmount=1|TenderBy=Demo Property Owner|AppRefNo=HPT1761889846394oyuD|Head1=1452-00-800-01|Amount1=1|Head2=1452-00-800-01|Amount2=0|Ddo=KNG00-532|PeriodFrom=31-10-2025|PeriodTo=31-10-2025
```

**Our MD5 Checksum (UPPERCASE):**
```
6758E982FC09ECBCFDA00A12C12845EB
```

**FULL String (what we encrypt):**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-TEST-004|TotalAmount=1|TenderBy=Demo Property Owner|AppRefNo=HPT1761889846394oyuD|Head1=1452-00-800-01|Amount1=1|Head2=1452-00-800-01|Amount2=0|Ddo=KNG00-532|PeriodFrom=31-10-2025|PeriodTo=31-10-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback|checkSum=6758E982FC09ECBCFDA00A12C12845EB
```

**Encrypted Base64:**
```
igTK5MTF37qcOAes8TNaB/WCdd2H7bZvQ7nSIIaGJvEottxF77NIHVr+IhSdQgFNiMUyrcm7t4wJ4Q9NZfCrI2GnaQbJEqlU9qD6UTHAoQs01nZcNOgfy4Wgg16f/FZZcIfHDzwluoLZzjIFjiR4zVkyaCO0AqXYioU4uxblJlQ4C/kNoDlGqC/FkiAM9DRPGE586v1kP4sqUzAAjXnnZLQVp6AjMEqaipRwWJEw+E0N/qVKE1wKGNMB4nCXDRHb9YnWPvmFkub8YyXVeA9rW8N3iHyg/lg7zzj2r+XVaXB3cVsVEG2AjNYk4ZUBlLiFMXqGUynMCP/hfkr7gavVp9lZN35uovCTX/YPRBOG5Ihrv2VrO6FNhTAU0Mi5UibOKoOi0TvOPlyK4D0x/zL7xevjMvBvg0CBNrUvRbIi2WH3YaoWEe3KRJxrpYicL9Hu75rSyusnjBZ72eo40sMMzInzI55R0wBNtxmGd1mYl+8=
```

---

## What We POST to HimKosh

**URL:** `https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx`

**Form Data:**
- `MerchantCode` = `HIMKOSH230`
- `encdata` = `[Base64 encrypted string above]`

---

## Questions for CTP Team

1. **Is our checksum calculation correct?**
   - We calculate MD5 on CORE string (stops at PeriodTo)
   - Then append Service_code, return_url, checksum
   - Then encrypt everything
   
2. **Can you decrypt our encrypted data on your side?**
   - Using echallan.key file you provided
   - Should decrypt to the FULL string above

3. **Is there any field order or format issue?**

4. **Should we include/exclude any fields?**

---

**Contact:** HP Tourism eServices Team  
**Date:** October 31, 2025
