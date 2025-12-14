import express from "express";
import { eq } from "drizzle-orm";
import {
  DEFAULT_EMAIL_BODY,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_SMS_BODY,
  sendNicV2Sms,
  sendTestEmail,
  sendTestSms,
  sendTwilioSms,
} from "../../services/communications";
import {
  EMAIL_GATEWAY_SETTING_KEY,
  SMS_GATEWAY_SETTING_KEY,
  emailProviders,
  extractLegacyEmailProfile,
  formatGatewaySetting,
  getEmailProfileFromValue,
  sanitizeEmailGateway,
  sanitizeSmsGateway,
  type EmailGatewayProvider,
  type EmailGatewaySecretSettings,
  type EmailGatewaySettingValue,
  type NicSmsGatewaySettings,
  type SmsGatewayProvider,
  type SmsGatewaySettingValue,
  type SmsGatewayV2Settings,
  type TwilioSmsGatewaySecretSettings,
} from "../../services/notifications";
import { getSystemSettingRecord } from "../../services/systemSettings";
import { trimOptionalString } from "../helpers/format";
import { requireRole } from "../core/middleware";
import { systemSettings } from "@shared/schema";
import { db } from "../../db";
import { logger } from "../../logger";

const log = logger.child({ module: "admin-comm-router" });

export function createAdminCommunicationsRouter() {
  const router = express.Router();

  router.get("/communications", requireRole("admin", "super_admin"), async (_req, res) => {
    try {
      const emailRecord = await getSystemSettingRecord(EMAIL_GATEWAY_SETTING_KEY);
      const smsRecord = await getSystemSettingRecord(SMS_GATEWAY_SETTING_KEY);
      const emailSettings = formatGatewaySetting(emailRecord, sanitizeEmailGateway);
      const smsSettings = formatGatewaySetting(smsRecord, sanitizeSmsGateway);
      log.info("[comm-settings] sms provider:", smsSettings?.provider, {
        nic: smsSettings?.nic ? { passwordSet: smsSettings.nic.passwordSet } : null,
        twilio: smsSettings?.twilio ? { authTokenSet: smsSettings.twilio.authTokenSet } : null,
      });
      res.json({
        email: emailSettings,
        sms: smsSettings,
      });
    } catch (error) {
      log.error("[admin] Failed to fetch communications settings:", error);
      res.status(500).json({ message: "Failed to fetch communications settings" });
    }
  });

  router.put("/communications/email", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const providerInput: EmailGatewayProvider = emailProviders.includes(req.body?.provider)
        ? req.body.provider
        : "custom";
      const userId = req.session.userId || null;
      const existing = await getSystemSettingRecord(EMAIL_GATEWAY_SETTING_KEY);
      const existingValue: EmailGatewaySettingValue =
        (existing?.settingValue as EmailGatewaySettingValue) ?? {};
      const legacyProfile = extractLegacyEmailProfile(existingValue);

      const buildProfile = (
        payload: any,
        fallback?: EmailGatewaySecretSettings,
      ): EmailGatewaySecretSettings | undefined => {
        if (!payload) {
          return fallback;
        }
        const host = trimOptionalString(payload.host) ?? fallback?.host ?? undefined;
        const fromEmail = trimOptionalString(payload.fromEmail) ?? fallback?.fromEmail ?? undefined;
        const username = trimOptionalString(payload.username) ?? fallback?.username ?? undefined;
        const passwordInput = trimOptionalString(payload.password);
        const port =
          payload.port !== undefined && payload.port !== null
            ? Number(payload.port) || 25
            : fallback?.port ?? 25;

        const next: EmailGatewaySecretSettings = {
          host,
          port,
          username,
          fromEmail,
          password: passwordInput ? passwordInput : fallback?.password,
        };

        if (!next.host && !next.fromEmail && !next.username && !next.password) {
          return undefined;
        }
        return next;
      };

      const nextValue: EmailGatewaySettingValue = {
        provider: providerInput,
        custom: buildProfile(req.body?.custom ?? req.body, existingValue.custom ?? legacyProfile),
        nic: buildProfile(req.body?.nic, existingValue.nic),
        sendgrid: buildProfile(req.body?.sendgrid, existingValue.sendgrid),
      };

      const activeProfile = getEmailProfileFromValue(
        { ...existingValue, ...nextValue },
        providerInput,
      );

      if (!activeProfile?.host || !activeProfile?.fromEmail) {
        return res.status(400).json({ message: "SMTP host and from email are required" });
      }

      if (!activeProfile.password) {
        return res.status(400).json({ message: "SMTP password is required" });
      }

      if (existing) {
        await db
          .update(systemSettings)
          .set({
            settingValue: nextValue,
            updatedAt: new Date(),
            updatedBy: userId,
            description: "Email gateway configuration",
            category: "communications",
          })
          .where(eq(systemSettings.settingKey, EMAIL_GATEWAY_SETTING_KEY));
      } else {
        await db.insert(systemSettings).values({
          settingKey: EMAIL_GATEWAY_SETTING_KEY,
          settingValue: nextValue,
          description: "Email gateway configuration",
          category: "communications",
          updatedBy: userId,
        });
      }

      log.info("[admin] Updated email gateway settings");
      res.json({ success: true });
    } catch (error) {
      log.error("[admin] Failed to update email config:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  router.put("/communications/sms", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const providerInput =
        req.body?.provider === "twilio"
          ? "twilio"
          : req.body?.provider === "nic_v2"
            ? "nic_v2"
            : "nic";
      const userId = req.session.userId || null;
      const existing = await getSystemSettingRecord(SMS_GATEWAY_SETTING_KEY);
      const existingValue: SmsGatewaySettingValue = (existing?.settingValue as SmsGatewaySettingValue) ?? {};

      const nicPayload = req.body?.nic ?? req.body;
      const nicV2Payload = req.body?.nicV2 ?? req.body;
      const twilioPayload = req.body?.twilio ?? req.body;

      const nextValue: SmsGatewaySettingValue = {
        provider: providerInput,
        nic: existingValue.nic,
        nicV2: existingValue.nicV2,
        twilio: existingValue.twilio,
      };

      if (providerInput === "nic") {
        const username = trimOptionalString(nicPayload?.username) ?? undefined;
        const senderId = trimOptionalString(nicPayload?.senderId) ?? undefined;
        const departmentKey = trimOptionalString(nicPayload?.departmentKey) ?? undefined;
        const templateId = trimOptionalString(nicPayload?.templateId) ?? undefined;
        const postUrl = trimOptionalString(nicPayload?.postUrl) ?? undefined;
        const passwordInput = trimOptionalString(nicPayload?.password) ?? undefined;

        if (!username || !senderId || !departmentKey || !templateId || !postUrl) {
          return res.status(400).json({ message: "All NIC SMS fields are required" });
        }

        const resolvedNicPassword = passwordInput || existingValue.nic?.password;

        if (!resolvedNicPassword) {
          return res.status(400).json({ message: "SMS password is required" });
        }

        const nicConfig: NicSmsGatewaySettings = {
          username: username!,
          senderId: senderId!,
          departmentKey: departmentKey!,
          templateId: templateId!,
          postUrl: postUrl!,
          password: resolvedNicPassword,
        };

        nextValue.nic = nicConfig;
      } else if (providerInput === "nic_v2") {
        const username = trimOptionalString(nicV2Payload?.username) ?? undefined;
        const senderId = trimOptionalString(nicV2Payload?.senderId) ?? undefined;
        const templateId = trimOptionalString(nicV2Payload?.templateId) ?? undefined;
        const key = trimOptionalString(nicV2Payload?.key) ?? undefined;
        const postUrl = trimOptionalString(nicV2Payload?.postUrl) ?? undefined;
        const passwordInput = trimOptionalString(nicV2Payload?.password) ?? undefined;

        if (!username || !senderId || !templateId || !key) {
          return res.status(400).json({ message: "All NIC V2 fields are required" });
        }

        const resolvedPassword = passwordInput || existingValue.nicV2?.password;
        if (!resolvedPassword) {
          return res.status(400).json({ message: "NIC V2 password is required" });
        }

        const nicV2Config: SmsGatewayV2Settings = {
          username,
          senderId,
          templateId,
          key,
          postUrl: postUrl || existingValue.nicV2?.postUrl || "https://msdgweb.mgov.gov.in/esms/sendsmsrequestDLT",
          password: resolvedPassword,
        };
        nextValue.nicV2 = nicV2Config;
      } else {
        const accountSid = trimOptionalString(twilioPayload?.accountSid) ?? undefined;
        const fromNumber = trimOptionalString(twilioPayload?.fromNumber) ?? undefined;
        const messagingServiceSid = trimOptionalString(twilioPayload?.messagingServiceSid) ?? undefined;
        const authTokenInput = trimOptionalString(twilioPayload?.authToken) ?? undefined;

        if (!accountSid) {
          return res.status(400).json({ message: "Twilio Account SID is required" });
        }
        if (!fromNumber && !messagingServiceSid) {
          return res.status(400).json({ message: "Provide a From Number or Messaging Service SID" });
        }

        const resolvedAuthToken = authTokenInput || existingValue.twilio?.authToken;
        if (!resolvedAuthToken) {
          return res.status(400).json({ message: "Twilio auth token is required" });
        }

        const twilioConfig: TwilioSmsGatewaySecretSettings = {
          accountSid: accountSid!,
          fromNumber: fromNumber || undefined,
          messagingServiceSid: messagingServiceSid || undefined,
          authToken: resolvedAuthToken,
        };

        nextValue.twilio = twilioConfig;
      }

      if (existing) {
        await db
          .update(systemSettings)
          .set({
            settingValue: nextValue,
            updatedAt: new Date(),
            updatedBy: userId,
            description: "SMS gateway configuration",
            category: "communications",
          })
          .where(eq(systemSettings.settingKey, SMS_GATEWAY_SETTING_KEY));
      } else {
        await db.insert(systemSettings).values({
          settingKey: SMS_GATEWAY_SETTING_KEY,
          settingValue: nextValue,
          description: "SMS gateway configuration",
          category: "communications",
          updatedBy: userId,
        });
      }

      log.info("[admin] Updated SMS gateway settings");
      res.json({ success: true });
    } catch (error) {
      log.error("[admin] Failed to update SMS config:", error);
      res.status(500).json({ message: "Failed to update SMS settings" });
    }
  });

  router.post("/communications/email/test", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const record = await getSystemSettingRecord(EMAIL_GATEWAY_SETTING_KEY);
      if (!record) {
        return res.status(400).json({ message: "SMTP settings not configured" });
      }

      const config = (record.settingValue as EmailGatewaySettingValue) ?? {};
      const provider: EmailGatewayProvider = config.provider ?? "custom";
      const profile = getEmailProfileFromValue(config, provider) ?? extractLegacyEmailProfile(config);
      if (!profile?.host || !profile?.fromEmail || !profile?.password) {
        return res.status(400).json({ message: "SMTP settings incomplete" });
      }

      const to = trimOptionalString(req.body?.to) ?? profile.fromEmail;
      const subject = trimOptionalString(req.body?.subject) ?? DEFAULT_EMAIL_SUBJECT;
      const body = trimOptionalString(req.body?.body) ?? DEFAULT_EMAIL_BODY;

      const result = await sendTestEmail(
        {
          host: profile.host,
          port: Number(profile.port) || 25,
          username: profile.username,
          password: profile.password,
          fromEmail: profile.fromEmail,
        },
        {
          to,
          subject,
          body,
        },
      );

      res.json({ success: true, log: result.log });
    } catch (error: any) {
      log.error("[admin] SMTP test failed:", error);
      res.status(500).json({ message: error?.message || "Failed to send test email" });
    }
  });

  router.post("/communications/sms/test", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const record = await getSystemSettingRecord(SMS_GATEWAY_SETTING_KEY);
      if (!record) {
        return res.status(400).json({ message: "SMS settings not configured" });
      }

      const config = record.settingValue as SmsGatewaySettingValue;
      const provider: SmsGatewayProvider = config.provider ?? "nic";
      log.info("[sms-test] provider:", provider);

      const mobile = trimOptionalString(req.body?.mobile);
      const message =
        trimOptionalString(req.body?.message) ?? DEFAULT_SMS_BODY.replace("{{OTP}}", "123456");
      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      if (provider === "twilio") {
        const twilioConfig =
          config.twilio ??
          ({
            accountSid: (config as any).accountSid,
            authToken: (config as any).authToken,
            fromNumber: (config as any).fromNumber,
            messagingServiceSid: (config as any).messagingServiceSid,
          } as TwilioSmsGatewaySecretSettings);

        if (
          !twilioConfig ||
          !twilioConfig.accountSid ||
          !twilioConfig.authToken ||
          (!twilioConfig.fromNumber && !twilioConfig.messagingServiceSid)
        ) {
          return res.status(400).json({ message: "Twilio settings incomplete" });
        }

        const result = await sendTwilioSms(
          {
            accountSid: twilioConfig.accountSid,
            authToken: twilioConfig.authToken,
            fromNumber: twilioConfig.fromNumber,
            messagingServiceSid: twilioConfig.messagingServiceSid,
          },
          { mobile, message },
        );

        return res.json({ success: result.ok, response: result.body, status: result.status });
      }

      if (provider === "nic_v2") {
        const nicV2Config =
          config.nicV2 ??
          ({
            username: (config as any).username,
            password: (config as any).password,
            senderId: (config as any).senderId,
            templateId: (config as any).templateId,
            key: (config as any).key,
            postUrl: (config as any).postUrl,
          } as SmsGatewayV2Settings);

        if (!nicV2Config || !nicV2Config.password) {
          return res.status(400).json({ message: "NIC V2 password missing in settings" });
        }
        const result = await sendNicV2Sms(
          {
            username: nicV2Config.username,
            password: nicV2Config.password,
            senderId: nicV2Config.senderId,
            templateId: nicV2Config.templateId,
            key: nicV2Config.key,
            postUrl: nicV2Config.postUrl,
          },
          { mobile, message },
        );

        return res.json({ success: result.ok, response: result.body, status: result.status });
      }

      const nicConfig =
        config.nic ??
        ({
          username: (config as any).username,
          password: (config as any).password,
          senderId: (config as any).senderId,
          departmentKey: (config as any).departmentKey,
          templateId: (config as any).templateId,
          postUrl: (config as any).postUrl,
        } as NicSmsGatewaySettings);

      if (!nicConfig || !nicConfig.password) {
        return res.status(400).json({ message: "SMS password missing in settings" });
      }

      const result = await sendTestSms(
        {
          username: nicConfig.username,
          password: nicConfig.password,
          senderId: nicConfig.senderId,
          departmentKey: nicConfig.departmentKey,
          templateId: nicConfig.templateId,
          postUrl: nicConfig.postUrl,
        },
        { mobile, message },
      );

      res.json({ success: result.ok, response: result.body, status: result.status });
    } catch (error: any) {
      log.error("[admin] SMS test failed:", error);
      res.status(500).json({ message: error?.message || "Failed to send test SMS" });
    }
  });

  return router;
}
