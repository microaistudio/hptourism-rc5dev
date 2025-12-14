# HimKosh Node.js Sample Project

This self‑contained sample mirrors the production adapter but strips it down to the essentials so you can plug it into another account/team quickly. Copy the files into an empty folder, run `npm install`, set up `.env`, and you can initiate and capture HimKosh callbacks in minutes.

---

## 1. Project Structure

```
himkosh-nodejs-sample/
├── package.json
├── .env.example
└── src
    ├── himkoshAdapter.js
    └── server.js
```

Create the directories above and populate each file with the contents shown in the following sections.

---

## 2. `package.json`

```json
{
  "name": "himkosh-nodejs-sample",
  "version": "0.1.0",
  "description": "Minimal Express server demonstrating HimKosh payment initiation + callback handling.",
  "type": "module",
  "scripts": {
    "dev": "node --env-file=.env src/server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "morgan": "^1.10.0",
    "nanoid": "^5.0.7"
  }
}
```

---

## 3. `.env.example`

Copy to `.env` and adjust for the new account (DeptID, DDO code, key path, etc.).

```
PORT=5000

HIMKOSH_DEPT_ID=230
HIMKOSH_MERCHANT_CODE=HIMKOSH230
HIMKOSH_SERVICE_CODE=TSM
HIMKOSH_HEAD=1452-00-800-01
HIMKOSH_HEAD2=
HIMKOSH_HEAD2_AMOUNT=0
HIMKOSH_DDO_CODE=CTO00-068

HIMKOSH_POST_URL=https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx
HIMKOSH_VERIFY_URL=https://himkosh.hp.nic.in/eChallan/webpages/AppVerification.aspx

HIMKOSH_RETURN_URL=https://<your-domain>/payments/himkosh/return
HIMKOSH_KEY_PATH=./echallan.key
# Optional: base64 encoded secrets if you prefer env vars
# HIMKOSH_ENCRYPTION_KEY_B64=
# HIMKOSH_ENCRYPTION_IV_B64=
```

Place `echallan.key` (the AES key bundle provided by Treasury) next to `.env`.

---

## 4. `src/himkoshAdapter.js`

```js
import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const parseBool = (value, fallback) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

export class HimkoshAdapter {
  constructor(config = {}) {
    this.config = {
      deptId: process.env.HIMKOSH_DEPT_ID ?? "230",
      merchantCode: process.env.HIMKOSH_MERCHANT_CODE ?? "HIMKOSH230",
      serviceCode: process.env.HIMKOSH_SERVICE_CODE ?? "TSM",
      headOfAccount: process.env.HIMKOSH_HEAD ?? "1452-00-800-01",
      head2: process.env.HIMKOSH_HEAD2 ?? "",
      head2Amount: Number(process.env.HIMKOSH_HEAD2_AMOUNT ?? 0),
      ddoCode: process.env.HIMKOSH_DDO_CODE ?? "",
      postUrl:
        process.env.HIMKOSH_POST_URL ??
        "https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx",
      verifyUrl:
        process.env.HIMKOSH_VERIFY_URL ??
        "https://himkosh.hp.nic.in/eChallan/webpages/AppVerification.aspx",
      returnUrl: process.env.HIMKOSH_RETURN_URL,
      keyPath: process.env.HIMKOSH_KEY_PATH,
      keyB64: process.env.HIMKOSH_ENCRYPTION_KEY_B64,
      ivB64: process.env.HIMKOSH_ENCRYPTION_IV_B64,
      allowFallback: parseBool(process.env.HIMKOSH_ALLOW_DEV_FALLBACK, true),
      ...config,
    };
  }

  buildPipeString({ appRefNo, deptRefNo, amount, applicantName }) {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const fmtDate = (date) =>
      `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

    const intAmount = Math.round(Number(amount || 0));
    const pieces = [
      `DeptID=${this.config.deptId}`,
      `DeptRefNo=${deptRefNo}`,
      `TotalAmount=${intAmount}`,
      `TenderBy=${applicantName}`,
      `AppRefNo=${appRefNo}`,
      `Head1=${this.config.headOfAccount}`,
      `Amount1=${intAmount}`,
      `PeriodFrom=${fmtDate(first)}`,
      `PeriodTo=${fmtDate(last)}`,
      `Service_code=${this.config.serviceCode}`,
    ];

    if (this.config.ddoCode) pieces.push(`Ddo=${this.config.ddoCode}`);
    if (this.config.returnUrl) pieces.push(`return_url=${this.config.returnUrl}`);

    if (this.config.head2 && this.config.head2Amount > 0) {
      pieces.push(`Head2=${this.config.head2}`, `Amount2=${this.config.head2Amount}`);
    }

    const pipe = pieces.join("|");
    const checksum = this.createChecksum(pipe);
    return `${pipe}|checkSum=${checksum}`;
  }

  createChecksum(pipeString) {
    return createHash("md5").update(pipeString, "utf8").digest("hex");
  }

  initiatePayment(context) {
    const pipe = this.buildPipeString(context);
    const { encdata, developerMode } = this.encrypt(pipe);
    return {
      actionUrl: this.config.postUrl,
      method: "POST",
      formFields: {
        encdata,
        merchant_code: this.config.merchantCode,
      },
      developerMode,
      pipeStringPreview: developerMode ? pipe : undefined,
    };
  }

  encrypt(pipeString) {
    const material = this.loadKeyMaterial();

    if (material) {
      const cipher = createCipheriv(material.algorithm, material.key, material.iv);
      const encrypted = Buffer.concat([
        cipher.update(pipeString, "utf8"),
        cipher.final(),
      ]);
      return { encdata: encrypted.toString("base64"), developerMode: false };
    }

    if (!this.config.allowFallback) {
      throw new Error("Treasury encryption keys are not configured");
    }

    return {
      encdata: Buffer.from(pipeString, "utf8").toString("base64"),
      developerMode: true,
    };
  }

  decode(encdata) {
    const material = this.loadKeyMaterial();
    if (!material) {
      throw new Error("Cannot decode without Treasury key/IV");
    }

    const decipher = createDecipheriv(material.algorithm, material.key, material.iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encdata, "base64")),
      decipher.final(),
    ]).toString("utf8");

    const parts = decrypted.split("|");
    const map = {};
    for (const part of parts) {
      if (!part) continue;
      const [k, ...rest] = part.split("=");
      map[k] = rest.join("=");
    }

    const providedChecksum = map.checkSum || map.checksum;
    const recomputed = providedChecksum
      ? this.createChecksum(
          parts.filter((piece) => !piece.toLowerCase().startsWith("checksum")).join("|"),
        )
      : undefined;

    return {
      raw: decrypted,
      map,
      checksumOk:
        !!providedChecksum &&
        !!recomputed &&
        providedChecksum.toLowerCase() === recomputed.toLowerCase(),
      expectedChecksum: recomputed,
    };
  }

  async verify(encdata) {
    const response = await fetch(this.config.verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        encdata,
        merchant_code: this.config.merchantCode,
      }),
    });

    const html = await response.text();
    return { status: response.status, html };
  }

  loadKeyMaterial() {
    const key =
      this.config.keyB64 && Buffer.from(this.config.keyB64, "base64").length
        ? Buffer.from(this.config.keyB64, "base64")
        : this.readKeyFromFile();
    const iv =
      this.config.ivB64 && Buffer.from(this.config.ivB64, "base64").length
        ? Buffer.from(this.config.ivB64, "base64")
        : null;

    if (!key || !iv) {
      return null;
    }

    if (![16, 24, 32].includes(key.length)) {
      throw new Error("Encryption key must be 16/24/32 bytes (AES-128/192/256)");
    }

    if (iv.length !== 16) {
      throw new Error("Encryption IV must be 16 bytes (AES block size)");
    }

    const algorithm =
      key.length === 16 ? "aes-128-cbc" : key.length === 24 ? "aes-192-cbc" : "aes-256-cbc";

    return { key, iv, algorithm };
  }

  readKeyFromFile() {
    if (!this.config.keyPath) return null;
    const absolute = resolve(process.cwd(), this.config.keyPath);
    if (!existsSync(absolute)) return null;

    const raw = readFileSync(absolute, "utf8").trim();
    const [keyLine, ivLine] = raw.split(/\r?\n/);
    const key = Buffer.from(keyLine, "base64");
    const iv = Buffer.from(ivLine, "base64");

    if (!key.length || !iv.length) {
      throw new Error("echallan.key must contain base64 key and iv on separate lines");
    }

    this.config.keyB64 = keyLine;
    this.config.ivB64 = ivLine;
    return { key, iv, algorithm: key.length === 16 ? "aes-128-cbc" : "aes-256-cbc" };
  }
}
```

---

## 5. `src/server.js`

```js
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { nanoid } from "nanoid";
import { HimkoshAdapter } from "./himkoshAdapter.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);
const himkosh = new HimkoshAdapter();
const payments = new Map(); // in-memory store for demo

app.use(express.json());
app.use(morgan("dev"));

app.post("/payments/himkosh/initiate", (req, res) => {
  const amount = Number(req.body.amount ?? 0);
  const applicantName = req.body.applicantName ?? "Demo Applicant";
  const deptRefNo = req.body.deptRefNo ?? `DEPT-${nanoid(8)}`;
  const appRefNo = req.body.appRefNo ?? `APP-${nanoid(10)}`;

  const payload = {
    appRefNo,
    deptRefNo,
    amount,
    applicantName,
  };

  const result = himkosh.initiatePayment(payload);
  payments.set(appRefNo, {
    status: "initiated",
    amount,
    applicantName,
    deptRefNo,
    action: result,
  });

  res.json({
    message: "Post the following form to Himkosh to continue.",
    ...result,
  });
});

app.post("/payments/himkosh/return", (req, res) => {
  const encdata = req.body.encdata;
  if (!encdata) {
    return res.status(400).json({ error: "encdata missing" });
  }

  try {
    const decoded = himkosh.decode(encdata);
    const appRefNo = decoded.map.AppRefNo ?? decoded.map.apprefno;
    const existing = payments.get(appRefNo);
    payments.set(appRefNo, {
      ...existing,
      status: decoded.map.Status ?? "callback-received",
      decoded,
      rawEncdata: encdata,
    });
    res.json({ ok: true, appRefNo, decoded });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to decode callback",
    });
  }
});

app.get("/payments", (_req, res) => {
  res.json(Object.fromEntries(payments));
});

app.get("/", (_req, res) => {
  res.send(
    `<h1>Himkosh sample server</h1><p>POST /payments/himkosh/initiate then redirect the merchant form to Himkosh. Configure the Himkosh return URL to POST callbacks to /payments/himkosh/return.</p>`,
  );
});

app.listen(port, () => {
  console.log(`Himkosh sample listening on http://localhost:${port}`);
});
```

---

## 6. Running the Sample

```bash
npm install
cp .env.example .env
# edit .env (Dept ID, DDO code, return URL)
node --env-file=.env src/server.js
```

Use the `/payments/himkosh/initiate` endpoint to obtain the auto-submitting form payload, and configure your Himkosh control panel to point the return URL at `/payments/himkosh/return`. The in-memory `payments` map captures callbacks so you can inspect decoded responses at `GET /payments`.

> The sample defaults to “developer mode” (base64 instead of AES) if `echallan.key` is not provided. Add the Treasury key/IV to enable production encryption.

---

With these pieces you can bootstrap another environment quickly—swap in the appropriate `.env` values, supply the official key bundle, and you’re ready to push requests to Himkosh from a clean Node.js project.
