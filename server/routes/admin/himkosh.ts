import express from "express";
import { eq } from "drizzle-orm";
import { requireRole } from "../core/middleware";
import { resolveHimkoshGatewayConfig, sanitizeHimkoshGatewaySetting, HIMKOSH_GATEWAY_SETTING_KEY, type HimkoshGatewaySettingValue, trimMaybe as trimHimkoshString, parseOptionalNumber as parseOptionalHimkoshNumber } from "../../himkosh/gatewayConfig";
import { fetchAllDdoCodes } from "../../himkosh/ddo";
import { deriveDistrictRoutingLabel } from "@shared/districtRouting";
import { himkoshTransactions, systemSettings } from "@shared/schema";
import { db } from "../../db";
import { logger } from "../../logger";
import { getSystemSettingRecord } from "../../services/systemSettings";
import { buildRequestString, HimKoshCrypto } from "../../himkosh/crypto";
import { resolveDistrictDdo } from "../../himkosh/ddo";

const log = logger.child({ module: "admin-himkosh-router" });
const adminHimkoshCrypto = new HimKoshCrypto();

export function createAdminHimkoshRouter() {
  const router = express.Router();

  router.get("/payments/himkosh", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const { config: effectiveConfig, overrides, record } = await resolveHimkoshGatewayConfig();
      res.json({
        effective: effectiveConfig,
        overrides: sanitizeHimkoshGatewaySetting(overrides),
        source: record ? "database" : "env",
        updatedAt: record?.updatedAt,
        updatedBy: record?.updatedBy,
      });
    } catch (error) {
      log.error({ err: error, route: req.path }, "[admin] Failed to fetch HimKosh config");
      res.status(500).json({ message: "Failed to fetch HimKosh config" });
    }
  });

  router.put("/payments/himkosh", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const userId = req.session?.userId ?? null;
      const payload: HimkoshGatewaySettingValue = {
        merchantCode: trimHimkoshString(req.body?.merchantCode),
        deptId: trimHimkoshString(req.body?.deptId),
        serviceCode: trimHimkoshString(req.body?.serviceCode),
        ddo: trimHimkoshString(req.body?.ddo),
        head1: trimHimkoshString(req.body?.head1),
        head2: trimHimkoshString(req.body?.head2),
        head2Amount: parseOptionalHimkoshNumber(req.body?.head2Amount),
        returnUrl: trimHimkoshString(req.body?.returnUrl),
        allowFallback: req.body?.allowFallback !== false,
      };

      if (!payload.merchantCode || !payload.deptId || !payload.serviceCode || !payload.ddo || !payload.head1) {
        return res.status(400).json({
          message: "Merchant code, Dept ID, Service code, DDO, and Head of Account are required",
        });
      }

      const existing = await getSystemSettingRecord(HIMKOSH_GATEWAY_SETTING_KEY);
      if (existing) {
        await db
          .update(systemSettings)
          .set({
            settingValue: payload,
            updatedBy: userId,
            updatedAt: new Date(),
            description: "HimKosh gateway configuration",
            category: "payment",
          })
          .where(eq(systemSettings.settingKey, HIMKOSH_GATEWAY_SETTING_KEY));
      } else {
        await db.insert(systemSettings).values({
          settingKey: HIMKOSH_GATEWAY_SETTING_KEY,
          settingValue: payload,
          description: "HimKosh gateway configuration",
          category: "payment",
          updatedBy: userId,
        });
      }

      log.info({ userId }, "[admin] Updated HimKosh gateway config");
      res.json({ success: true });
    } catch (error) {
      log.error({ err: error, route: req.path }, "[admin] Failed to update HimKosh config");
      res.status(500).json({ message: "Failed to update HimKosh config" });
    }
  });

  router.delete("/payments/himkosh", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const existing = await getSystemSettingRecord(HIMKOSH_GATEWAY_SETTING_KEY);
      if (!existing) {
        return res.status(404).json({ message: "No HimKosh override found" });
      }
      await db.delete(systemSettings).where(eq(systemSettings.settingKey, HIMKOSH_GATEWAY_SETTING_KEY));
      log.info({ settingKey: HIMKOSH_GATEWAY_SETTING_KEY, userId: req.session?.userId ?? null }, "[admin] Cleared HimKosh gateway config override");
      res.json({ success: true });
    } catch (error) {
      log.error({ err: error, route: req.path }, "[admin] Failed to clear HimKosh config");
      res.status(500).json({ message: "Failed to clear HimKosh config" });
    }
  });

  router.get("/payments/himkosh/ddo-codes", requireRole("admin", "super_admin"), async (_req, res) => {
    try {
      const codes = await fetchAllDdoCodes();
      res.json({ codes });
    } catch (error) {
      log.error({ err: error }, "[admin] Failed to load DDO codes");
      res.status(500).json({ message: "Failed to load DDO codes" });
    }
  });

  router.post("/payments/himkosh/transactions/clear", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const rawConfirm = typeof req.body?.confirmationText === "string" ? req.body.confirmationText : "";
      const normalized = rawConfirm.trim().toUpperCase();
      if (normalized !== "CLEAR HIMKOSH LOG") {
        return res.status(400).json({ message: "Type CLEAR HIMKOSH LOG to confirm" });
      }

      const deleted = await db.delete(himkoshTransactions).returning({ id: himkoshTransactions.id });
      log.warn(
        { userId: req.session?.userId ?? null, deleted: deleted.length },
        "[admin] Cleared HimKosh transaction log",
      );

      res.json({ success: true, deleted: deleted.length });
    } catch (error) {
      log.error({ err: error }, "[admin] Failed to clear HimKosh transactions");
      res.status(500).json({ message: "Failed to clear HimKosh transactions" });
    }
  });

  router.post("/payments/himkosh/ddo-test", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const rawDistrict = typeof req.body?.district === "string" ? req.body.district.trim() : "";
      const rawTehsil = typeof req.body?.tehsil === "string" ? req.body.tehsil.trim() : "";
      const manualDdo = trimHimkoshString(req.body?.manualDdo);
      const tenderBy =
        typeof req.body?.tenderBy === "string" && req.body.tenderBy.trim().length
          ? req.body.tenderBy.trim()
          : "Test Applicant";
      const requestedAmount = Number(req.body?.amount ?? 1);
      const totalAmount = Number.isFinite(requestedAmount) && requestedAmount > 0 ? Math.round(requestedAmount) : 1;

      const { config } = await resolveHimkoshGatewayConfig();
      const head1 = config.heads?.registrationFee;
      if (!config.merchantCode || !config.deptId || !config.serviceCode || !head1) {
        return res.status(400).json({ message: "HimKosh gateway is not fully configured" });
      }

      const routedDistrict =
        deriveDistrictRoutingLabel(rawDistrict || undefined, rawTehsil || undefined) ?? (rawDistrict || null);
      const mapped = routedDistrict ? await resolveDistrictDdo(routedDistrict) : undefined;
      const fallbackDdo = config.ddo;

      const ddoToUse = manualDdo || mapped?.ddoCode || fallbackDdo;
      if (!ddoToUse) {
        return res.status(400).json({ message: "No DDO code available. Provide a manual override to test." });
      }

      const now = new Date();
      const periodDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
      const deptRefNo = `TEST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
        now.getDate(),
      ).padStart(2, "0")}-${now.getTime().toString().slice(-4)}`;
      const appRefNo = `HPT${now.getTime()}`.slice(0, 20);

      const payloadParams = {
        deptId: config.deptId,
        deptRefNo,
        totalAmount,
        tenderBy,
        appRefNo,
        head1,
        amount1: totalAmount,
        head2: config.heads?.secondaryHead || undefined,
        amount2: config.heads?.secondaryHeadAmount ?? undefined,
        ddo: ddoToUse,
        periodFrom: periodDate,
        periodTo: periodDate,
        serviceCode: config.serviceCode,
        returnUrl: config.returnUrl,
      };

      const { coreString, fullString } = buildRequestString(payloadParams);
      const checksum = HimKoshCrypto.generateChecksum(coreString);
      const payloadWithChecksum = `${fullString}|checkSum=${checksum}`;
      const encrypted = await adminHimkoshCrypto.encrypt(payloadWithChecksum);

      res.json({
        success: true,
        requestedDistrict: rawDistrict || null,
        requestedTehsil: rawTehsil || null,
        routedDistrict,
        mapping: mapped
          ? {
              district: mapped.district,
              ddoCode: mapped.ddoCode,
              treasuryCode: mapped.treasuryCode,
            }
          : null,
        ddoUsed: ddoToUse,
        ddoSource: manualDdo ? "manual_override" : mapped ? "district_mapping" : "default_config",
        payload: {
          params: payloadParams,
          coreString,
          fullString,
          checksum,
          encrypted,
          paymentUrl: `${config.paymentUrl}?encdata=${encodeURIComponent(encrypted)}&merchant_code=${config.merchantCode}`,
        },
      });
    } catch (error) {
      log.error({ err: error }, "[admin] Failed to run HimKosh DDO test");
      res.status(500).json({ message: "Failed to run HimKosh DDO test" });
    }
  });

  return router;
}
