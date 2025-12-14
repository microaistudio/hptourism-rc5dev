# HimKosh ↔️ Node.js Integration Guide

This playbook documents the exact steps we used to stand up the HimKosh payment gateway on the HP Tourism stack (`hp-tourism` service running on Node.js + PM2). Follow it end-to-end whenever you need to provision a fresh environment, recover from a failure, or audit the setup.

---

## 1. Prerequisites

- **VM access** with sudo, Node.js 20+, npm 10+, and PM2.
- **Outbound HTTPS** (HimKosh endpoints) and inbound 80/443/5000 to support Nginx + the Node process.
- **Artifacts** placed under `CodeXInFiles/HimKoshIntegeration/`:
  - `echallan.key` (private signing key)
  - Optional references: DDO list PDF, dummy code notes, etc.
- **DNS** (for production) pointing `pay.oispl.dev` to the VM public IP.

> 💡 Verify PM2 is alive before you start: `pm2 list`

---

## 2. Configuring Secrets & Environment

1. Copy `echallan.key` to the app on the VM (same directory as `.env`):
   ```bash
   cp CodeXInFiles/HimKoshIntegeration/echallan.key echallan.key
   chmod 600 echallan.key
   ```
2. Edit `.env`:
   ```
   APP_BASE_URL=https://pay.oispl.dev
   DATABASE_URL=postgres://…

   HIMKOSH_GATEWAY_URL=https://www.himkosh.nic.in/TreasuryPortal/…
   HIMKOSH_VERIFICATION_URL=https://www.himkosh.nic.in/TreasuryPortal/…
   HIMKOSH_DEPT_CODE=…
   HIMKOSH_DDO_CODE=CTO00-068
   HIMKOSH_RETURN_URL=https://pay.oispl.dev/api/payments/himkosh/return
   HIMKOSH_KEY_PATH=./echallan.key
   ```
3. After editing, restart the service (see §6) so PM2 refreshes environment variables.

---

## 3. Database Preparation

Run these one-time Drizzle/Neon compatible scripts from the project root. They are idempotent—safe to run again:

```bash
node --import tsx scripts/himkosh-migrate.ts            # Adds HimKosh columns + indexes
node --import tsx scripts/add-missing-app-columns.ts    # Owner/operator columns + migration
node --import tsx scripts/seed-lgd-minimal.ts           # Minimal LGD hierarchy (if empty)
```

Optional helpers:

- `scripts/check-columns.ts` – sanity-checks schema state  
- `scripts/reset-payment.ts <applicationId>` – force payments out of “pending”

---

## 4. Build & Deploy Cycle

```bash
npm install                     # first time only
npm run build                   # bundles client + server
pm2 restart hp-tourism --update-env
pm2 logs hp-tourism --lines 200 # tail while testing
```

> ⚠️ Build must succeed (no ESBuild errors) before touching PM2. Watch for `Cannot access 'H' before initialization` type errors—they indicate a bad bundle.

---

## 5. Nginx & TLS (Production)

1. Confirm DNS: `getent hosts pay.oispl.dev` → VM IP.
2. Nginx server block should:
   - Listen on 80/443
   - Proxy `/` to `http://127.0.0.1:5000`
   - Expose `/var/www/pay.oispl.dev` for ACME challenges
3. Issue LetsEncrypt cert:
   ```bash
   sudo certbot --nginx \
     -d pay.oispl.dev \
     -m microaistudio@gmail.com \
     --agree-tos --redirect
   ```
4. Verify renewal timer: `systemctl status certbot.timer`

---

## 6. End-to-End Functional Test

1. Log in as a property owner (e.g., mobile `9999888877`) and start a ₹1 homestay application.
2. On step “Payment”, click **Proceed to Payment**.
3. Confirm `POST /api/payments/himkosh/initiate` returns an `appRefNo` and a base64 **encdata** payload.
4. Follow the HimKosh redirect; complete a payment via any available method (UPI/NetBanking/Card).
5. HimKosh POSTs the encrypted callback to `/api/payments/himkosh/return`; watch PM2 logs for:
   ```
   [himkosh:return] payload { encdata: '...' }
   ```
6. Backend decrypts, verifies checksum, calls the verification API, and marks payment `success` with:
   - `himgrn`, `bankCin`, `deptRefNo`
   - `rawGatewayResponse` JSON persisted
7. Refresh the application page—status should advance, diagnostics card should show gateway details.

If a transaction gets stuck:

```bash
node --import tsx scripts/reset-payment.ts <applicationId>
```

---

## 7. Troubleshooting Cheat Sheet

| Symptom | Check | Fix |
| --- | --- | --- |
| `Cannot access 'H' before initialization` in browser | Old JS bundle still cached / build failed | Re-run `npm run build`, restart PM2 |
| HimKosh shows “checksum error” | `scripts/test-himkosh.ts` and ensure `.env` points to correct key | Replace `echallan.key` / update `.env` |
| Callbacks never arrive | Nginx 404 or HTTP (not HTTPS) return URL | Confirm `HIMKOSH_RETURN_URL`, TLS cert, and open port 443 |
| Payment row stuck `pending` | No callback or verification failure | Inspect PM2 logs, then `reset-payment.ts` |
| Missing columns error | DB schema out-of-sync | Re-run `scripts/himkosh-migrate.ts` |

---

## 8. Useful Scripts & References

- `scripts/list-payments.ts` – list all payment rows with status
- `scripts/show-payment.ts <paymentId>` – dump a single payment JSON
- `scripts/reset-pending-payments.ts` – mark all lingering `pending` records as failed
- `server/payments/` – encapsulates encrypt/decrypt, checksum, verification call
- `CodeXFiles/HimKosh_Checksum_Report.md` – investigative notes on .NET vs Node hashing mismatch
- `CodeXFiles/HimKosh_Interface_NodeJs_Issue.md` – timeline + RCA

---

## 9. Maintenance Tips

- Keep PM2 & Node updated during maintenance windows.
- Monitor cert expiry (`certbot certificates`).
- Log rotation: PM2 stores logs under `~/.pm2/logs`; prune as needed.
- Schedule nightly reconciliation (optional) by calling the HimKosh verification endpoint for any `pending` rows older than X hours.
- Document every production payment test (date, amount, result) for audit trails.

---

### Summary

Once `.env` is correct, the migration scripts run, and the PM2 service is restarted, HimKosh “just works”: the adapter encrypts payloads, callbacks are decrypted server-side, verification locks in HIMGRN + CIN, and the frontend surfaces a stable flow. Use this document as the canonical checklist whenever you deploy or troubleshoot the integration.***
