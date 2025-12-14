# HimKosh Payment Gateway – Checksum & Deployment Key Points

This note captures the pitfalls we hit while wiring the HimKosh cyber treasury gateway into the RC3 stack (Nov 2025) and the safeguards we need in future roll-outs. Treat it as the quick reference before touching encryption, deployment, or PM2.

---

## 1. Anatomy of a Valid HimKosh Payload

HimKosh expects a pipe‑delimited string, MD5 checksum, and AES‑128‑CBC encryption that exactly mirror the NIC DLL:

| Stage | What Matters |
| --- | --- |
| Pipe string | `DeptID`, `DeptRefNo`, `TotalAmount`, `TenderBy`, `AppRefNo`, `Head1`, `Amount1`, optional `Head2/Amount2`, `Ddo`, `PeriodFrom`, `PeriodTo`, `Service_code`, `return_url` (no trailing bar). |
| Amount fields | Integers only. Always round before stringification; decimals trigger .NET parsing errors. |
| Checksum | MD5 over the **full pipe string including `Service_code` and `return_url`**. Use UTF‑8 bytes and keep the checksum lowercase hexadecimal. |
| Encryption | AES‑128, CBC, PKCS7. Key and IV are the first 16 bytes of `echallan.key` (IV = key). Encode plaintext as ASCII when encrypting/decrypting. |

Deviate from any of the above and treasury returns “checksum error”.

---

## 2. The 3 Issues That Broke Us This Week

1. **Broken checksum implementation**  
   The initial RC3 port calculated MD5 on a “core” substring (stopping before `Service_code/return_url`) and upper‑cased the hex digest. HimKosh recomputed against the full string in lowercase, so the hash never matched.

2. **Duplicate Head entries**  
   We were always appending `Head2=<same code>` with `Amount2=0`. Treasury enforces uniqueness on (`AppRefNo`, `Head`). The zero row duplicated `Head1` and triggered a SQL primary-key error on their end. Fix: only send `Head2` when the secondary head and amount are explicitly configured (>0).

3. **Stale deployment through PM2**  
   Two PM2 daemons were running: one owned by `root`, another by the application user. The root daemon kept respawning an old build without the checksum fix, so even after code changes we still saw the old bug. Kill the stray daemon before restarting and verify with `sudo pm2 env 0`.

---

## 3. Checklist Before Testing or Deploying

**Code / Payload**
- [ ] Confirm `server/himkosh/crypto.ts` generates checksum with `hash.update(pipe, 'utf8')` and `digest('hex')`.
- [ ] Ensure `buildRequestString` only adds `Head2/Amount2` when the env specifies a secondary head with a positive amount.
- [ ] Validate the request log in PM2 shows the full string (especially `Service_code=` and `return_url=`) prior to encryption.

**Configuration**
- [ ] Put production credentials into environment variables: `HIMKOSH_MERCHANT_CODE`, `HIMKOSH_DEPT_ID`, `HIMKOSH_SERVICE_CODE`, `HIMKOSH_DDO_CODE`, `HIMKOSH_HEAD`, optional `HIMKOSH_HEAD2`, `HIMKOSH_HEAD2_AMOUNT`.
- [ ] For ₹1 sandbox runs, set both `HIMKOSH_TEST_MODE=true` and `HIMKOSH_FORCE_TEST_MODE=true`. They must be present in the PM2 environment (`pm2 env <id> | grep HIMKOSH`).
- [ ] Keep `echallan.key` synced and chmod’d (600). Key mismatch produces checksum errors identical to code bugs.

**PM2 / Deployment**
- [ ] Run **one** PM2 daemon. Kill the rogue one (`sudo pm2 kill`) before restarting the official service.
- [ ] Restart with `sudo pm2 restart hptourism-rc3 --update-env` so new env vars propagate.
- [ ] Tail `/root/.pm2/logs/hptourism-rc3-out-0.log` after restart to ensure the new checksum log lines appear.

---

## 4. Troubleshooting Cheatsheet

| Symptom | Investigation | Likely Fix |
| --- | --- | --- |
| HimKosh splash shows “Checksum error” instantly | Compare our logged pipe string/checksum vs regenerated MD5 in a local script. | Missing `Service_code` in checksum, uppercase digest, or stale bundle. |
| HimKosh pop-up throws SQL PK violation on `SubscriberChallanDetail` | Check if we are posting duplicate `Head` rows (e.g., `Head1` and zero-value `Head2`). | Stop sending `Head2` unless amount > 0. |
| Portal still sends full amount during testing | Look at PM2 env; if `HIMKOSH_TEST_MODE` not set, the DB flag may be false. | Force override via PM2 config (`ecosystem.config.cjs`). |
| Changes deployed but behavior unchanged | `pm2 list` vs `sudo pm2 list` show different results. | Kill extra daemon, restart from the correct one. |

---

## 5. Future Enhancements

- Add automated unit tests for `buildRequestString` + `generateChecksum` to freeze the payload shape.
- Capture the outgoing `coreString`, `checksum`, and decrypted callback payload in structured logs for faster diffing.
- Provide a CLI script (`npm run himkosh:test-checksum`) that recomputes MD5 from logs to confirm parity with treasury.
- Once production keys are live, lock down test-mode overrides so ₹1 runs only happen in staging.

---

### TL;DR

Checksum errors were caused primarily by two factors: mismatched checksum calculations (wrong substring, wrong casing) and stale deployments from an unexpected PM2 daemon. Always validate the payload composition, bind the correct env vars, and ensure only one PM2 process is serving the app. With those controls in place, HimKosh accepts the request, callbacks decrypt correctly, and payment status updates flow through as designed. 
