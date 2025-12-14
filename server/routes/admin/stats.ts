import express from "express";
import { db } from "../../db";
import {
  homestayApplications,
  users,
  inspectionOrders,
  inspectionReports,
  payments,
  documents,
  systemSettings,
} from "@shared/schema";
import { requireRole } from "../core/middleware";
import { logger } from "../../logger";
import { eq } from "drizzle-orm";

const log = logger.child({ module: "admin-stats-router" });

export function createAdminStatsRouter() {
  const router = express.Router();

  router.get("/dashboard/stats", requireRole("super_admin"), async (_req, res) => {
    try {
      const allApplications = await db.select().from(homestayApplications);
      const statusCounts = allApplications.reduce((acc, app) => {
        const statusKey = app.status ?? "unknown";
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const allUsers = await db.select().from(users);
      const propertyOwners = allUsers.filter((u) => u.role === "property_owner").length;
      const officers = allUsers.filter((u) => ["dealing_assistant", "district_tourism_officer", "state_officer"].includes(u.role)).length;
      const admins = allUsers.filter((u) => ["admin", "super_admin"].includes(u.role)).length;

      const [allInspectionOrders, allInspectionReports] = await Promise.all([
        db.select().from(inspectionOrders),
        db.select().from(inspectionReports),
      ]);

      const allPayments = await db.select().from(payments);
      const completedPayments = allPayments.filter((p) => p.paymentStatus === "completed");
      const totalAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      res.json({
        applications: {
          total: allApplications.length,
          pending: statusCounts["submitted"] || 0,
          underReview: statusCounts["under_review"] || 0,
          approved: statusCounts["approved"] || 0,
          rejected: statusCounts["rejected"] || 0,
          draft: statusCounts["draft"] || 0,
        },
        users: {
          total: allUsers.length,
          propertyOwners,
          officers,
          admins,
        },
        inspections: {
          scheduled: allInspectionOrders.length,
          completed: allInspectionReports.length,
          pending: allInspectionOrders.length - allInspectionReports.length,
        },
        payments: {
          total: allPayments.length,
          completed: completedPayments.length,
          pending: allPayments.length - completedPayments.length,
          totalAmount,
        },
      });
    } catch (error) {
      log.error("[admin] Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  router.get("/stats", requireRole("super_admin"), async (_req, res) => {
    try {
      const [applicationsCount, usersCount, documentsCount, paymentsCount] = await Promise.all([
        db.select().from(homestayApplications).then((r) => r.length),
        db.select().from(users).then((r) => r.length),
        db.select().from(documents).then((r) => r.length),
        db.select().from(payments).then((r) => r.length),
      ]);

      const applications = await db.select().from(homestayApplications);
      const byStatus = applications.reduce((acc, app) => {
        const statusKey = app.status ?? "unknown";
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const allUsers = await db.select().from(users);
      const byRole = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const environment = process.env.NODE_ENV || "development";
      const [superConsoleSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, "admin_super_console_enabled"))
        .limit(1);

      console.log("[DEBUG] Super Console Setting:", JSON.stringify(superConsoleSetting));

      let superConsoleOverride = false;
      if (superConsoleSetting) {
        const value = superConsoleSetting.settingValue as any;
        console.log("[DEBUG] SettingValue:", JSON.stringify(value), "Type:", typeof value);
        if (typeof value === "boolean") superConsoleOverride = value;
        else if (value && typeof value === "object" && "enabled" in value) {
          superConsoleOverride = Boolean(value.enabled);
          console.log("[DEBUG] Object enabled check:", value.enabled, "=>", superConsoleOverride);
        }
        else if (typeof value === "string") superConsoleOverride = value === "true";
      }

      console.log("[DEBUG] Environment:", environment, "Override:", superConsoleOverride);
      const resetEnabled = superConsoleOverride || environment === "development" || environment === "test";
      console.log("[DEBUG] Final resetEnabled:", resetEnabled);

      res.json({
        database: { size: "N/A", tables: 10 },
        applications: { total: applicationsCount, byStatus },
        users: { total: usersCount, byRole },
        files: { total: documentsCount, totalSize: "N/A" },
        environment,
        resetEnabled,
        superConsoleOverride,
      });
    } catch (error) {
      log.error("[admin] Failed to fetch stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  return router;
}
