import express from "express";
import {
  NOTIFICATION_RULES_SETTING_KEY,
  buildNotificationResponse,
  notificationEventDefinitions,
  type NotificationEventId,
  type NotificationRuleValue,
  type NotificationSettingsValue,
} from "../../services/notifications";
import { requireRole } from "../core/middleware";
import { getSystemSettingRecord } from "../../services/systemSettings";
import { trimOptionalString } from "../helpers/format";
import { db } from "../../db";
import { systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../logger";

const log = logger.child({ module: "admin-notifications-router" });
const notificationDefinitionMap = new Map(notificationEventDefinitions.map((def) => [def.id, def]));

export function createAdminNotificationsRouter() {
  const router = express.Router();

  router.get("/notifications", requireRole("admin", "super_admin"), async (_req, res) => {
    try {
      const record = await getSystemSettingRecord(NOTIFICATION_RULES_SETTING_KEY);
      const payload = buildNotificationResponse(record);
      res.json(payload);
    } catch (error) {
      log.error("[admin] Failed to load notification rules:", error);
      res.status(500).json({ message: "Failed to load notification settings" });
    }
  });

  router.put("/notifications", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const eventsInput = Array.isArray(req.body?.events) ? req.body.events : [];
      const ruleMap = new Map<NotificationEventId, NotificationRuleValue>();
      for (const event of eventsInput) {
        if (!event?.id) continue;
        const definition = notificationDefinitionMap.get(event.id as NotificationEventId);
        if (!definition) continue;
        const smsTemplate = trimOptionalString(event.smsTemplate) ?? definition.defaultSmsTemplate;
        const emailSubject = trimOptionalString(event.emailSubject) ?? definition.defaultEmailSubject;
        const emailBody = trimOptionalString(event.emailBody) ?? definition.defaultEmailBody;
        ruleMap.set(definition.id, {
          id: definition.id,
          smsEnabled: Boolean(event.smsEnabled),
          smsTemplate,
          emailEnabled: Boolean(event.emailEnabled),
          emailSubject,
          emailBody,
        });
      }

      const nextValue: NotificationSettingsValue = {
        rules: Array.from(ruleMap.values()),
      };
      const userId = req.session.userId || null;
      const existing = await getSystemSettingRecord(NOTIFICATION_RULES_SETTING_KEY);

      if (existing) {
        await db
          .update(systemSettings)
          .set({
            settingValue: nextValue,
            updatedAt: new Date(),
            updatedBy: userId,
            description: "Workflow notification templates",
            category: "notification",
          })
          .where(eq(systemSettings.settingKey, NOTIFICATION_RULES_SETTING_KEY));
      } else {
        await db.insert(systemSettings).values({
          settingKey: NOTIFICATION_RULES_SETTING_KEY,
          settingValue: nextValue,
          description: "Workflow notification templates",
          category: "notification",
          updatedBy: userId,
        });
      }

      res.json({ success: true });
    } catch (error) {
      log.error("[admin] Failed to save notification rules:", error);
      res.status(500).json({ message: "Failed to save notification settings" });
    }
  });

  return router;
}
