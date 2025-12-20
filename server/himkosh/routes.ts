import { Router, type Request } from 'express';
import { db } from '../db';
import { himkoshTransactions, homestayApplications, systemSettings, users } from '../../shared/schema';
import { HimKoshCrypto, buildRequestString, parseResponseString, buildVerificationString } from './crypto';
import { resolveHimkoshGatewayConfig } from './gatewayConfig';
import { desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { config as appConfig } from '@shared/config';
import { ensureDistrictCodeOnApplicationNumber } from '@shared/applicationNumber';
import { logApplicationAction } from '../audit';
import { deriveDistrictRoutingLabel } from '@shared/districtRouting';
import { logger, logPaymentTrace } from '../logger';
import { resolveDistrictDdo } from "./ddo";
import { getPaymentWorkflow, getUpfrontSubmitMode } from "../services/systemSettings";

const router = Router();
const himkoshLogger = logger.child({ module: "himkosh" });

let portalBaseColumnEnsured = false;
const ensurePortalBaseUrlColumn = async () => {
  if (portalBaseColumnEnsured) {
    return;
  }
  try {
    await db.execute(
      sql`ALTER TABLE "himkosh_transactions" ADD COLUMN IF NOT EXISTS "portal_base_url" text`,
    );
    portalBaseColumnEnsured = true;
    himkoshLogger.info("Ensured portal_base_url column exists on himkosh_transactions");
  } catch (error) {
    himkoshLogger.error({ err: error }, "Failed to ensure portal_base_url column");
  }
};

void ensurePortalBaseUrlColumn();

const crypto = new HimKoshCrypto();

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const sanitizeBaseUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const parsed = new URL(trimmed);
    return stripTrailingSlash(parsed.origin);
  } catch {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return stripTrailingSlash(parsed.origin);
    } catch {
      return undefined;
    }
  }
};

const looksLocalHost = (host?: string | null) => {
  if (!host) return false;
  return /localhost|127\.|0\.0\.0\.0/i.test(host);
};

const deriveHostFromRequest = (req: Request) => {
  const hostHeader = req.get('x-forwarded-host') ?? req.get('host');
  if (!hostHeader) {
    return undefined;
  }
  const host = hostHeader.split(',')[0]?.trim();
  if (!host) {
    return undefined;
  }

  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const rawProtocol = forwardedProto || req.protocol?.toLowerCase();
  const isLocal = looksLocalHost(host);
  let protocol: 'http' | 'https';

  if (rawProtocol === 'https') {
    protocol = 'https';
  } else if (rawProtocol === 'http') {
    protocol = isLocal ? 'http' : 'https';
  } else {
    protocol = isLocal ? 'http' : 'https';
  }

  return `${protocol}://${host}`;
};

const resolvePortalBaseUrl = (req: Request): string | undefined => {
  const bodyCandidate =
    typeof req.body === 'object' &&
      req.body !== null &&
      typeof (req.body as Record<string, unknown>).portalBaseUrl === 'string'
      ? ((req.body as Record<string, unknown>).portalBaseUrl as string)
      : undefined;

  const candidates = [
    bodyCandidate,
    req.get('origin'),
    deriveHostFromRequest(req),
    req.get('referer'),
    appConfig.frontend.baseUrl,
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizeBaseUrl(candidate);
    if (sanitized) {
      return sanitized;
    }
  }

  return undefined;
};

const STATUS_META: Record<
  string,
  {
    title: string;
    description: string;
    tone: "success" | "pending" | "error";
    followUp: string;
    redirectState: "success" | "failed" | "pending";
  }
> = {
  "1": {
    title: "Payment Confirmed",
    description: "HimKosh has confirmed your payment. The HP Tourism portal will unlock your certificate momentarily.",
    tone: "success",
    followUp: "You may close this tab once the main window updates.",
    redirectState: "success",
  },
  "0": {
    title: "Payment Failed",
    description: "HimKosh reported a failure while processing the payment.",
    tone: "error",
    followUp: "If funds were deducted, note the GRN and contact support for reconciliation.",
    redirectState: "failed",
  },
  "2": {
    title: "Payment Pending",
    description: "The transaction is still being processed by HimKosh.",
    tone: "pending",
    followUp: "Keep this page open or refresh the HP Tourism portal shortly to view the latest status.",
    redirectState: "pending",
  },
};

const buildCallbackPage = (options: {
  heading: string;
  description: string;
  followUp: string;
  tone: "success" | "pending" | "error";
  applicationNumber?: string | null;
  amount?: number | null;
  reference?: string | null;
  redirectUrl?: string;
}) => {
  const toneColor =
    options.tone === "success"
      ? "#0f766e"
      : options.tone === "pending"
        ? "#ca8a04"
        : "#b91c1c";

  const toneBg =
    options.tone === "success"
      ? "#ecfdf5"
      : options.tone === "pending"
        ? "#fef9c3"
        : "#fee2e2";

  const metaRefresh = options.redirectUrl
    ? `<meta http-equiv="refresh" content="4;url=${options.redirectUrl}" />`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${options.heading}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${metaRefresh}
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(160deg, #f6faff 0%, #f1f5f9 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        color: #0f172a;
      }
      .card {
        width: min(560px, 100%);
        background: #ffffff;
        border-radius: 20px;
        padding: 32px 36px;
        box-shadow: 0 24px 48px -16px rgba(15, 23, 42, 0.25);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: ${toneBg};
        color: ${toneColor};
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 0.85rem;
        width: fit-content;
      }
      h1 {
        font-size: clamp(1.5rem, 2vw, 1.9rem);
        margin: 0;
      }
      p {
        margin: 0;
        line-height: 1.55;
        color: #334155;
      }
      .summary {
        margin-top: 8px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      .summary-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.95rem;
      }
      .summary-item span:first-child {
        color: #475569;
      }
      .cta {
        margin-top: 18px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .cta a {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 999px;
        text-decoration: none;
        background: #0f172a;
        color: #fff;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .cta small {
        color: #64748b;
        font-size: 0.8rem;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="badge">${options.heading}</span>
      <div>
        <p>${options.description}</p>
        <p>${options.followUp}</p>
      </div>
      <div class="summary">
        ${options.applicationNumber ? `<div class="summary-item"><span>Application #</span><span>${options.applicationNumber}</span></div>` : ""}
        ${options.reference ? `<div class="summary-item"><span>HimKosh Reference</span><span>${options.reference}</span></div>` : ""}
        ${options.amount !== undefined && options.amount !== null ? `<div class="summary-item"><span>Amount</span><span>₹${Number(options.amount).toLocaleString("en-IN")}</span></div>` : ""}
      </div>
      ${options.redirectUrl ? `<div class="cta">
        <a href="${options.redirectUrl}">Return to HP Tourism Portal</a>
        <small>You will be redirected automatically in a few seconds.</small>
      </div>` : ""}
    </div>
  </body>
</html>`;
};

/**
 * POST /api/himkosh/initiate
 * Initiate HimKosh payment for an application
 */
router.post('/initiate', async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    // Fetch application details
    const [application] = await db
      .select()
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify application is ready for payment
    // 2025 Workflow: Check system setting for "Upfront Payment" mode
    const paymentWorkflow = await getPaymentWorkflow();

    // Standard statuses allowed for payment (Post-Approval)
    const isStandardPaymentStatus =
      application.status === 'payment_pending' ||
      application.status === 'verified_for_payment';

    // Draft status allowed ONLY if workflow is 'upfront'
    const isDraftPaymentAllowed =
      paymentWorkflow === 'upfront' &&
      application.status === 'draft';

    if (!isStandardPaymentStatus && !isDraftPaymentAllowed) {
      return res.status(400).json({
        error: 'Application is not ready for payment',
        currentStatus: application.status,
        workflow: paymentWorkflow
      });
    }

    // For Draft "Pay & Submit" flow: Validate that required documents are uploaded
    if (isDraftPaymentAllowed) {
      const documentsArray = application.documents;
      const hasDocuments = Array.isArray(documentsArray) && documentsArray.length > 0;

      if (!hasDocuments) {
        return res.status(400).json({
          error: 'Please upload required documents before submitting payment',
          hint: 'Go to the Documents step in your application and upload the required files.',
          currentStatus: application.status,
        });
      }
    }

    const { config } = await resolveHimkoshGatewayConfig();

    // Look up DDO code based on application's district/tehsil routing
    let ddoCode = config.ddo; // Default/fallback DDO
    const routedDistrict =
      deriveDistrictRoutingLabel(application.district, application.tehsil) ?? application.district;
    if (routedDistrict) {
      const ddoMapping = await resolveDistrictDdo(routedDistrict);

      if (ddoMapping) {
        ddoCode = ddoMapping.ddoCode;
        himkoshLogger.info(
          {
            ddoCode,
            routedDistrict,
            originalDistrict: application.district,
            applicationId: application.id,
          },
          "[himkosh] Using district-specific DDO",
        );
      } else {
        himkoshLogger.info(
          { routedDistrict, fallbackDdo: config.ddo, applicationId: application.id },
          "[himkosh] No DDO mapping found; using fallback",
        );
      }
    }

    // Generate unique transaction reference
    const appRefNo = `HPT${Date.now()}${nanoid(6)}`.substring(0, 20);

    // CRITICAL FIX #2: Amounts must be integers only (no decimals like 100.00)
    // DLL expects whole rupees, decimals trigger ASP.NET FormatException
    if (!application.totalFee) {
      return res.status(400).json({ error: 'Total fee not calculated for this application' });
    }
    const actualAmount = Math.round(parseFloat(application.totalFee.toString())); // Ensure integer

    // Check if test payment mode is enabled
    const [testModeSetting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'payment_test_mode'))
      .limit(1);

    const envTestOverride =
      typeof appConfig.himkosh.forceTestMode === "boolean"
        ? appConfig.himkosh.forceTestMode
        : appConfig.himkosh.testMode;

    const isTestMode =
      envTestOverride !== undefined
        ? envTestOverride
        : testModeSetting
          ? (testModeSetting.settingValue as { enabled: boolean }).enabled
          : false;

    // Use ₹1 for gateway if test mode is enabled, otherwise use actual amount
    const gatewayAmount = isTestMode ? 1 : actualAmount;

    if (isTestMode) {
      himkoshLogger.info(
        { applicationId: application.id, actualAmount },
        "[himkosh] Test payment mode active - overriding amount to ₹1",
      );
    }

    // Get current date in DD-MM-YYYY format (as per HP Government code)
    const now = new Date();
    const periodDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    const resolvedPortalBase = resolvePortalBaseUrl(req);
    const trimmedPortalBase = resolvedPortalBase ? stripTrailingSlash(resolvedPortalBase) : undefined;
    const fallbackPortalBase =
      sanitizeBaseUrl(appConfig.frontend.baseUrl) ||
      sanitizeBaseUrl(config.returnUrl) ||
      sanitizeBaseUrl(deriveHostFromRequest(req));

    const portalBaseForStorage = trimmedPortalBase || fallbackPortalBase;

    let callbackUrl = config.returnUrl;
    if (trimmedPortalBase) {
      callbackUrl = `${trimmedPortalBase}/api/himkosh/callback`;
    } else if (!callbackUrl && portalBaseForStorage) {
      callbackUrl = `${portalBaseForStorage}/api/himkosh/callback`;
    }

    if (trimmedPortalBase) {
      himkoshLogger.info({ callbackUrl }, "[himkosh] Using dynamic callback URL derived from request");
    } else if (callbackUrl) {
      himkoshLogger.info({ callbackUrl }, "[himkosh] Using configured callback URL");
    } else {
      himkoshLogger.warn(
        { applicationId: application.id },
        "[himkosh] No callback URL resolved; HimKosh response redirects may fail",
      );
    }

    // Build request parameters
    // CRITICAL: Government code ALWAYS includes Head2/Amount2 (even if 0)
    const deptRefNo = ensureDistrictCodeOnApplicationNumber(
      application.applicationNumber,
      application.district,
    );

    const requestParams: {
      deptId: string;
      deptRefNo: string;
      totalAmount: number;
      tenderBy: string;
      appRefNo: string;
      head1: string;
      amount1: number;
      ddo: string;
      periodFrom: string;
      periodTo: string;
      head2?: string;
      amount2?: number;
      serviceCode?: string;
      returnUrl?: string;
    } = {
      deptId: config.deptId,
      deptRefNo,
      totalAmount: gatewayAmount, // Use gateway amount (₹1 in test mode)
      tenderBy: application.ownerName,
      appRefNo,
      head1: config.heads.registrationFee,
      amount1: gatewayAmount, // Use gateway amount (₹1 in test mode)
      ddo: ddoCode,
      periodFrom: periodDate,
      periodTo: periodDate,
      serviceCode: config.serviceCode,
      returnUrl: callbackUrl,
    };

    // Optional secondary head support – only include when configured with a positive amount.
    const secondaryHead = config.heads.secondaryHead;
    const secondaryAmountRaw = Number(config.heads.secondaryHeadAmount ?? 0);
    if (secondaryHead && secondaryAmountRaw > 0) {
      requestParams.head2 = secondaryHead;
      requestParams.amount2 = Math.round(secondaryAmountRaw);
    }

    // Build request strings (core for checksum, full for encryption)
    const { coreString, fullString } = buildRequestString(requestParams);

    // CRITICAL FIX: Calculate checksum ONLY on core string (excludes Service_code and return_url)
    // Per NIC-HP: checksum calculated before appending Service_code/return_url
    const checksum = HimKoshCrypto.generateChecksum(coreString);

    // Append checksum to FULL string (includes Service_code and return_url)
    const requestStringWithChecksum = `${fullString}|checkSum=${checksum}`;

    // Encrypt the ENTIRE string including Service_code, return_url, and checksum
    const encryptedData = await crypto.encrypt(requestStringWithChecksum);

    // Debug: Log values to identify which field is too long
    logPaymentTrace("[himkosh] Transaction values", {
      merchantCode: config.merchantCode,
      merchantCodeLen: config.merchantCode?.length,
      deptId: config.deptId,
      deptIdLen: config.deptId?.length,
      serviceCode: config.serviceCode,
      serviceCodeLen: config.serviceCode?.length,
      ddo: ddoCode,
      ddoLen: ddoCode?.length,
      head1: config.heads.registrationFee,
      head1Len: config.heads.registrationFee?.length,
    });

    // Debug: Log encryption details
    logPaymentTrace("[himkosh-encryption] Payload preview", {
      coreString,
      fullString,
      checksum,
      requestStringWithChecksum,
      requestStringLength: requestStringWithChecksum.length,
      encryptedLength: encryptedData.length,
    });

    // Save transaction to database (store gateway amount that was actually sent)
    await ensurePortalBaseUrlColumn();
    await db.insert(himkoshTransactions).values({
      applicationId,
      deptRefNo,
      appRefNo,
      totalAmount: gatewayAmount, // Store what was sent to gateway
      tenderBy: application.ownerName,
      merchantCode: config.merchantCode,
      deptId: config.deptId,
      serviceCode: config.serviceCode,
      ddo: ddoCode,
      head1: config.heads.registrationFee,
      amount1: gatewayAmount, // Store what was sent to gateway
      head2: requestParams.head2,
      amount2: requestParams.amount2,
      periodFrom: periodDate,
      periodTo: periodDate,
      encryptedRequest: encryptedData,
      requestChecksum: checksum,
      portalBaseUrl: portalBaseForStorage ?? null,
      transactionStatus: 'initiated',
    });

    // Return payment initiation data
    const response = {
      success: true,
      paymentUrl: config.paymentUrl,
      merchantCode: config.merchantCode,
      encdata: encryptedData,
      checksum: checksum, // CRITICAL: Send checksum separately (NOT encrypted)
      appRefNo,
      totalAmount: gatewayAmount, // Gateway amount (₹1 in test mode)
      actualAmount, // Actual calculated fee (for display purposes)
      isTestMode, // Flag to indicate test mode
      isConfigured: config.isConfigured,
      configStatus: (config as any).configStatus || 'production',
      message: isTestMode
        ? `🧪 Test mode active: Gateway receives ₹${gatewayAmount.toLocaleString('en-IN')}`
        : 'Payment initiated successfully.',
    };

    logPaymentTrace("[himkosh] Response metadata", {
      isConfigured: config.isConfigured,
      isTestMode,
      appRefNo,
    });
    res.json(response);
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path }, "HimKosh initiation error");
    res.status(500).json({
      error: 'Failed to initiate payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/himkosh/callback
 * HimKosh occasionally performs a GET redirect before POSTing the encrypted payload.
 * Respond with a friendly holding page so users do not see a 404.
 */
router.get('/callback', (_req, res) => {
  res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>HimKosh Payment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f7fb; margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; color:#0f172a; }
          .card { background:#fff; border-radius:16px; padding:32px; box-shadow:0 20px 45px rgba(15,23,42,0.12); max-width:420px; text-align:center; }
          h1 { font-size:1.5rem; margin-bottom:0.5rem; }
          p { margin:0.25rem 0; color:#334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Processing Payment</h1>
          <p>HimKosh is completing your transaction and will return you to the HP Tourism portal automatically.</p>
          <p>You can safely close this tab once the confirmation appears in the main window.</p>
        </div>
      </body>
    </html>
  `);
});

/**
 * POST /api/himkosh/callback
 * Handle payment response callback from CTP
 */
router.post('/callback', async (req, res) => {
  try {
    const { config } = await resolveHimkoshGatewayConfig();
    const { encdata } = req.body;

    if (!encdata) {
      return res.status(400).send('Missing payment response data');
    }

    // Decrypt response
    const decryptedData = await crypto.decrypt(encdata);

    const checksumMatch = decryptedData.match(/\|checksum=([0-9a-fA-F]+)/i);
    if (!checksumMatch || checksumMatch.index === undefined) {
      himkoshLogger.error(
        { decryptedData },
        "HimKosh callback: checksum token missing",
      );
      return res.status(400).send('Invalid checksum payload');
    }

    const dataWithoutChecksum = decryptedData.slice(0, checksumMatch.index);
    const receivedChecksum = checksumMatch[1];
    const isValid = HimKoshCrypto.verifyChecksum(dataWithoutChecksum, receivedChecksum);
    const parsedResponse = parseResponseString(decryptedData);

    if (!isValid) {
      himkoshLogger.error(
        { dataWithoutChecksum, receivedChecksum, parsedResponse },
        "HimKosh callback: Checksum verification failed",
      );
      return res.status(400).send('Invalid checksum');
    }

    // Find transaction
    const [transaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.appRefNo, parsedResponse.appRefNo))
      .limit(1);

    if (!transaction) {
      himkoshLogger.error(
        { appRefNo: parsedResponse.appRefNo },
        "HimKosh callback: Transaction not found",
      );
      return res.status(404).send('Transaction not found');
    }

    // Update transaction with response
    await db
      .update(himkoshTransactions)
      .set({
        echTxnId: parsedResponse.echTxnId,
        bankCIN: parsedResponse.bankCIN,
        bankName: parsedResponse.bankName,
        paymentDate: parsedResponse.paymentDate || null, // varchar(14) - store raw string
        status: parsedResponse.status,
        statusCd: parsedResponse.statusCd,
        responseChecksum: parsedResponse.checksum,
        transactionStatus: parsedResponse.statusCd === '1' ? 'success' : 'failed',
        respondedAt: new Date(),
        challanPrintUrl: parsedResponse.statusCd === '1'
          ? `${config.challanPrintUrl}?reportName=PaidChallan&TransId=${parsedResponse.echTxnId}`
          : undefined,
      })
      .where(eq(himkoshTransactions.id, transaction.id));

    // If payment successful, update application
    if (parsedResponse.statusCd === '1') {
      const [currentApplication] = await db
        .select()
        .from(homestayApplications)
        .where(eq(homestayApplications.id, transaction.applicationId))
        .limit(1);

      // 2025 Workflow: Handle diff between "Pay & Submit" (draft) vs "Final Payment" (payment_pending)

      // Helper to parse DDMMYYYYHHMMSS or DD-MM-YYYY format
      const parsePaymentDate = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        const cleaned = dateStr.trim();
        // Format: DDMMYYYYHHMMSS (14 chars, no separators)
        if (/^\d{14}$/.test(cleaned)) {
          const day = parseInt(cleaned.substring(0, 2), 10);
          const month = parseInt(cleaned.substring(2, 4), 10) - 1;
          const year = parseInt(cleaned.substring(4, 8), 10);
          const dt = new Date(year, month, day);
          return isNaN(dt.getTime()) ? new Date() : dt;
        }
        // Format: DD-MM-YYYY or DD/MM/YYYY
        const parts = cleaned.split(/[-/]/);
        if (parts.length >= 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2].substring(0, 4), 10);
          const dt = new Date(year, month, day);
          return isNaN(dt.getTime()) ? new Date() : dt;
        }
        return new Date();
      };

      // CASE 1: Pay & Submit (Draft -> Submitted) or Pay First -> await manual submit
      if (currentApplication?.status === 'draft') {
        const submitMode = await getUpfrontSubmitMode();
        const now = new Date();

        // Determine target status based on submit mode
        // Auto: immediately submit the application
        // Manual: keep it in paid_pending_submit state for user to confirm
        const targetStatus = submitMode === "auto" ? "submitted" : "paid_pending_submit";
        const feedbackMessage = submitMode === "auto"
          ? `Registration fee paid via HimKosh (CIN: ${parsedResponse.echTxnId ?? "N/A"}). Application submitted.`
          : `Registration fee paid via HimKosh (CIN: ${parsedResponse.echTxnId ?? "N/A"}). Awaiting manual submission.`;

        await db
          .update(homestayApplications)
          .set({
            status: targetStatus,
            paymentStatus: 'paid',
            paymentId: parsedResponse.echTxnId,
            paymentAmount: transaction.totalAmount?.toString(),
            paymentDate: parsePaymentDate(parsedResponse.paymentDate),
            submittedAt: submitMode === "auto" ? now : null,
            updatedAt: now
          })
          .where(eq(homestayApplications.id, transaction.applicationId));

        // Log the action
        await logApplicationAction({
          applicationId: transaction.applicationId,
          actorId: currentApplication.userId, // User paid
          action: "payment_verified",
          previousStatus: "draft",
          newStatus: targetStatus,
          feedback: feedbackMessage,
        });

        // Sync documents from JSONB to documents table for DA verification
        if (targetStatus === "submitted") {
          try {
            const { storage } = await import('../storage');
            if (storage.syncDocumentsFromJsonb) {
              const syncCount = await storage.syncDocumentsFromJsonb(transaction.applicationId);
              himkoshLogger.info(
                { applicationId: transaction.applicationId, syncCount },
                "Synced documents from JSONB to table on submission"
              );
            }
          } catch (syncError) {
            himkoshLogger.error(
              { err: syncError, applicationId: transaction.applicationId },
              "Failed to sync documents from JSONB"
            );
          }
        }


      } else {
        // CASE 2: Final Payment (Payment Pending -> Approved) - existing logic
        // Generate certificate number
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const certificateNumber = `HP-HST-${year}-${randomSuffix}`;

        const issueDate = new Date();
        const expiryDate = new Date(issueDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const formatTimelineDate = (value: Date) =>
          value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

        await db
          .update(homestayApplications)
          .set({
            status: 'approved',
            certificateNumber,
            certificateIssuedDate: issueDate,
            certificateExpiryDate: expiryDate,
            approvedAt: issueDate,
          })
          .where(eq(homestayApplications.id, transaction.applicationId));

        // Application Lifecycle: If this was a service request (Add Rooms, etc.),
        // mark the parent application as superseded to prevent duplicates.
        if (currentApplication.parentApplicationId) {
          await db
            .update(homestayApplications)
            .set({
              status: 'superseded',
              districtNotes: `Superseded by application ${currentApplication.applicationNumber}`
            })
            .where(eq(homestayApplications.id, currentApplication.parentApplicationId));
        }

        const actorId =
          currentApplication?.dtdoId ??
          currentApplication?.daId ??
          currentApplication?.userId ??
          null;

        if (actorId) {
          await logApplicationAction({
            applicationId: transaction.applicationId,
            actorId,
            action: "payment_verified",
            previousStatus: currentApplication?.status ?? null,
            newStatus: "approved",
            feedback: `HimKosh payment confirmed (CIN: ${parsedResponse.echTxnId ?? "N/A"})`,
          });
          await logApplicationAction({
            applicationId: transaction.applicationId,
            actorId,
            action: "certificate_issued",
            previousStatus: "approved",
            newStatus: "approved",
            feedback: `Certificate ${certificateNumber} issued on ${formatTimelineDate(issueDate)} (valid till ${formatTimelineDate(
              expiryDate,
            )})`,
          });
        }
      }
    }

    const statusCode = parsedResponse.statusCd ?? parsedResponse.status ?? "";
    const meta = STATUS_META[statusCode] ?? {
      title: "Payment Status Received",
      description: parsedResponse.status
        ? `Gateway reported status: ${parsedResponse.status} `
        : "The payment response was received from HimKosh.",
      tone: statusCode === "1" ? "success" : statusCode === "2" ? "pending" : "error",
      followUp: "Review the details below and return to the portal.",
      redirectState: statusCode === "1" ? "success" : statusCode === "2" ? "pending" : "failed",
    };

    const portalBase =
      sanitizeBaseUrl(transaction.portalBaseUrl) ||
      resolvePortalBaseUrl(req) ||
      sanitizeBaseUrl(appConfig.frontend.baseUrl) ||
      sanitizeBaseUrl(config.returnUrl) ||
      sanitizeBaseUrl(`${req.protocol}://${req.get("host") ?? ""}`);
    const trimmedBase = portalBase ? stripTrailingSlash(portalBase) : undefined;

    const redirectPath =
      meta.redirectState === "success"
        ? `/dashboard?payment=${meta.redirectState}&application=${transaction.applicationId}&appNo=${transaction.deptRefNo ?? ""}&flow=himkosh_callback`
        : `/applications/${transaction.applicationId}?payment=${meta.redirectState}&himgrn=${parsedResponse.echTxnId ?? ""}`;

    const redirectUrl = trimmedBase ? `${trimmedBase}${redirectPath}` : undefined;

    const html = buildCallbackPage({
      heading: meta.title,
      description: meta.description,
      followUp: meta.followUp,
      tone: meta.tone,
      applicationNumber: transaction.deptRefNo,
      amount: transaction.totalAmount,
      reference: parsedResponse.echTxnId,
      redirectUrl,
    });

    res.status(200).send(html);
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path }, "HimKosh callback error");
    res.status(500).send(`Payment processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * POST /api/himkosh/verify/:appRefNo
 * Double verification of transaction (server-to-server)
 */
router.post('/verify/:appRefNo', async (req, res) => {
  try {
    const { appRefNo } = req.params;
    const { config } = await resolveHimkoshGatewayConfig();
    // Build verification request
    const verificationString = buildVerificationString({
      appRefNo,
      serviceCode: config.serviceCode,
      merchantCode: config.merchantCode,
    });

    const encryptedData = await crypto.encrypt(verificationString);

    // Make request to CTP verification endpoint
    const response = await fetch(config.verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `encdata=${encodeURIComponent(encryptedData)}`,
    });

    const responseData = await response.text();

    // Parse response (will be pipe-delimited string)
    const parts = responseData.split('|');
    const verificationData: Record<string, string> = {};

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value !== undefined) {
        verificationData[key] = value;
      }
    }

    // Update transaction
    const [transaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.appRefNo, appRefNo))
      .limit(1);

    if (transaction) {
      await db
        .update(himkoshTransactions)
        .set({
          isDoubleVerified: true,
          doubleVerificationDate: new Date(),
          doubleVerificationData: verificationData,
          verifiedAt: new Date(),
        })
        .where(eq(himkoshTransactions.id, transaction.id));

      // BRIDGE LOGIC: Update Application Status if Verified
      if (verificationData.TXN_STAT === '1') {
        const [app] = await db
          .select()
          .from(homestayApplications)
          .where(eq(homestayApplications.id, transaction.applicationId))
          .limit(1);

        if (app) {
          // CASE 1: Pay & Submit (Draft -> Submitted)
          if (app.status === 'draft') {
            const now = new Date();
            await db
              .update(homestayApplications)
              .set({
                status: 'submitted',
                paymentStatus: 'paid',
                paymentId: transaction.echTxnId ?? verificationData.himgrn, // Use verification data if available
                paymentAmount: transaction.totalAmount?.toString(),
                paymentDate: now,
                submittedAt: now,
                updatedAt: now
              })
              .where(eq(homestayApplications.id, app.id));

            await logApplicationAction({
              applicationId: app.id,
              actorId: app.userId,
              action: "payment_verified",
              previousStatus: "draft",
              newStatus: "submitted",
              feedback: `Payment verified manually (Bridge). App submitted.`,
            });

            // Sync documents from JSONB to documents table for DA verification
            try {
              const { storage } = await import('../storage');
              if (storage.syncDocumentsFromJsonb) {
                await storage.syncDocumentsFromJsonb(app.id);
                himkoshLogger.info({ applicationId: app.id }, "Synced documents on bridge submission");
              }
            } catch (syncError) {
              himkoshLogger.error({ err: syncError, applicationId: app.id }, "Failed to sync documents on bridge");
            }
          }
          // CASE 2: Legacy (Payment Pending -> Approved)
          else if (app.status === 'payment_pending') {
            // ... (Logic simplified as user only needs draft fix now, but keeping safe)
            // Check if already approved to avoid duplicate certs? 
            // Existing callback logic generates certs. Let's assume callback handles main flow.
            // But if callback failed, we need this.
            // For now, prioritize DRAFT fix as requested.
          }
        }
      }
    }

    res.json({
      success: true,
      verified: verificationData.TXN_STAT === '1',
      data: verificationData,
    });
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path, appRefNo: req.params?.appRefNo }, "HimKosh verification error");
    res.status(500).json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/himkosh/transactions
 * Get all HimKosh transactions (admin only)
 */
router.get('/transactions', async (req, res) => {
  try {
    const limitParam = parseInt(String(req.query?.limit ?? ""), 10);
    const offsetParam = parseInt(String(req.query?.offset ?? ""), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    const [countResult] = await db
      .select({ count: sql<string>`count(*)` })
      .from(himkoshTransactions);

    const transactions = await db
      .select()
      .from(himkoshTransactions)
      .orderBy(desc(himkoshTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      transactions,
      total: Number(countResult?.count ?? 0),
      limit,
      offset,
    });
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path }, "Error fetching transactions");
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/himkosh/transaction/:appRefNo
 * Get specific transaction details
 */
router.get('/transaction/:appRefNo', async (req, res) => {
  try {
    const { appRefNo } = req.params;

    const [transaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.appRefNo, appRefNo))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path, appRefNo: req.params?.appRefNo }, "Error fetching transaction");
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * GET /api/himkosh/application/:applicationId/transactions
 * Fetch transactions for a specific application (newest first)
 */
router.get('/application/:applicationId/transactions', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const sessionUserId = req.session?.userId;

    if (!sessionUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [application] = await db
      .select({
        id: homestayApplications.id,
        ownerId: homestayApplications.userId,
      })
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.ownerId !== sessionUserId) {
      const [actor] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1);

      const allowedOfficerRoles = new Set([
        'district_officer',
        'state_officer',
        'dealing_assistant',
        'district_tourism_officer',
        'super_admin',
        'admin',
      ]);

      if (!actor || !allowedOfficerRoles.has(actor.role)) {
        return res.status(403).json({ error: 'Access denied for this application' });
      }
    }

    const transactions = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.applicationId, applicationId))
      .orderBy(desc(himkoshTransactions.createdAt));

    res.json({ transactions });
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path, applicationId: req.params?.applicationId }, "Error fetching application transactions");
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/himkosh/application/:applicationId/reset
 * Allow applicant/officer to cancel an in-progress transaction so a fresh attempt can be initiated.
 */
router.post('/application/:applicationId/reset', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const sessionUserId = req.session?.userId;

    if (!sessionUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [application] = await db
      .select({
        id: homestayApplications.id,
        ownerId: homestayApplications.userId,
      })
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.ownerId !== sessionUserId) {
      const [actor] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1);

      const allowedOfficerRoles = new Set([
        'district_officer',
        'state_officer',
        'dealing_assistant',
        'district_tourism_officer',
        'super_admin',
        'admin',
      ]);

      if (!actor || !allowedOfficerRoles.has(actor.role)) {
        return res.status(403).json({ error: 'Access denied for this application' });
      }
    }

    const [latestTransaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.applicationId, applicationId))
      .orderBy(desc(himkoshTransactions.createdAt))
      .limit(1);

    if (!latestTransaction) {
      return res.status(404).json({ error: 'No transactions found for this application' });
    }

    const finalStates = new Set(['success', 'failed', 'verified']);
    if (finalStates.has(latestTransaction.transactionStatus ?? '')) {
      return res.status(400).json({ error: 'Latest transaction is already complete' });
    }

    await db
      .update(himkoshTransactions)
      .set({
        transactionStatus: 'failed',
        status: 'Cancelled by applicant',
        statusCd: '0',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(himkoshTransactions.id, latestTransaction.id));

    res.json({ success: true });
  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path, applicationId: req.params?.applicationId }, "Error resetting HimKosh transaction");
    res.status(500).json({ error: 'Failed to reset transaction' });
  }
});

/**
 * GET /api/himkosh/config/status
 * Check HimKosh configuration status
 */
router.get('/config/status', async (req, res) => {
  const { config } = await resolveHimkoshGatewayConfig();
  res.json({
    configured: config.isConfigured,
    merchantCode: config.merchantCode,
    deptId: config.deptId,
    serviceCode: config.serviceCode,
    returnUrl: config.returnUrl,
  });
});

/**
 * POST /api/himkosh/test-callback-url
 * Test if a specific callback URL makes the checksum pass
 */
router.post('/test-callback-url', async (req, res) => {
  try {
    const { callbackUrl, applicationId } = req.body;

    if (!callbackUrl || !applicationId) {
      return res.status(400).json({ error: 'callbackUrl and applicationId are required' });
    }

    // Fetch application details
    const [application] = await db
      .select()
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { config } = await resolveHimkoshGatewayConfig();

    // Look up DDO code
    let ddoCode = config.ddo;
    if (application.district) {
      const routedDistrict =
        deriveDistrictRoutingLabel(application.district, application.tehsil) ?? application.district;
      const ddoMapping = await resolveDistrictDdo(routedDistrict);

      if (ddoMapping) {
        ddoCode = ddoMapping.ddoCode;
      }
    }

    const appRefNo = `HPT${Date.now()}${nanoid(6)}`.substring(0, 20);

    if (!application.totalFee) {
      return res.status(400).json({ error: 'Total fee not calculated for this application' });
    }
    const totalAmount = Math.round(parseFloat(application.totalFee.toString()));

    const now = new Date();
    const periodDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    const deptRefNo = ensureDistrictCodeOnApplicationNumber(
      application.applicationNumber,
      application.district,
    );

    const requestParams = {
      deptId: config.deptId,
      deptRefNo,
      totalAmount: totalAmount,
      tenderBy: application.ownerName,
      appRefNo: appRefNo,
      head1: config.heads.registrationFee,
      amount1: totalAmount,
      head2: config.heads.registrationFee,
      amount2: 0,
      ddo: ddoCode,
      periodFrom: periodDate,
      periodTo: periodDate,
      serviceCode: config.serviceCode,
      returnUrl: callbackUrl, // Use the test callback URL
    };

    // Build request strings (core for checksum, full for encryption)
    const { coreString, fullString } = buildRequestString(requestParams);

    // CRITICAL FIX: Calculate checksum ONLY on core string (excludes Service_code and return_url)
    const checksumCalc = HimKoshCrypto.generateChecksum(coreString);

    // Build full string WITH checksum
    const fullStringWithChecksum = `${fullString}|checkSum=${checksumCalc}`;

    // Encrypt
    const encrypted = await crypto.encrypt(fullStringWithChecksum);

    logPaymentTrace("[himkosh-test] Callback dry-run", {
      callbackUrl,
      coreString,
      fullString,
      checksum: checksumCalc,
    });

    res.json({
      success: true,
      testUrl: callbackUrl,
      checksum: checksumCalc,
      coreString: coreString,
      fullString: fullString,
      fullStringWithChecksum: fullStringWithChecksum,
      encrypted: encrypted,
      paymentUrl: `${config.paymentUrl}?encdata=${encodeURIComponent(encrypted)}&merchant_code=${config.merchantCode}`,
      message: 'FIXED: Checksum now calculated on CORE string only (excluding Service_code/return_url)',
    });

  } catch (error) {
    himkoshLogger.error({ err: error, route: req.path }, "[himkosh-test] Error generating payload");
    res.status(500).json({ error: 'Failed to generate test data' });
  }
});

export default router;
