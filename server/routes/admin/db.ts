import express from "express";
import { Pool as PgPool } from "pg";
import bcrypt from "bcrypt";
import { eq, notInArray, sql } from "drizzle-orm";
import type { DbConnectionRecord } from "@shared/dbConfig";
import { db } from "../../db";
import { updateDbEnvFiles } from "../../dbConfigManager";
import { requireRole } from "../core/middleware";
import {
  auditLogs,
  clarifications,
  certificates,
  ddoCodes,
  documents,
  homestayApplications,
  himkoshTransactions,
  inspectionOrders,
  inspectionReports,
  lgdBlocks,
  lgdDistricts,
  lgdGramPanchayats,
  lgdTehsils,
  lgdUrbanBodies,
  notifications,
  payments,
  productionStats,
  storageObjects,
  systemSettings,
  userProfiles,
  users,
} from "@shared/schema";
import { config as appConfig } from "@shared/config";
import { logger } from "../../logger";

const log = logger.child({ module: "admin-db" });
const DB_CONNECTION_SETTING_KEY = "db_connection_settings";
type DbConnectionSettingValue = DbConnectionRecord;

const parseDatabaseUrlFromEnv = (): DbConnectionSettingValue | null => {
  try {
    const urlString = appConfig.database.url;
    if (!urlString) return null;
    const parsed = new URL(urlString);
    const database = parsed.pathname.replace(/^\//, "");
    if (!parsed.hostname || !database || !parsed.username) return null;
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      database,
      user: decodeURIComponent(parsed.username),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      lastAppliedAt: null,
      lastVerifiedAt: null,
      lastVerificationResult: null,
      lastVerificationMessage: null,
    };
  } catch (error) {
    log.warn("[db-config] Failed to parse DATABASE_URL", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const getDbConnectionSettings = async (): Promise<DbConnectionSettingValue | null> => {
  const [record] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, DB_CONNECTION_SETTING_KEY))
    .limit(1);
  return record?.settingValue ? (record.settingValue as DbConnectionSettingValue) : null;
};

const saveDbConnectionSettings = async (value: DbConnectionSettingValue, userId: string | null) => {
  const [existing] = await db
    .select({ key: systemSettings.settingKey })
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, DB_CONNECTION_SETTING_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(systemSettings)
      .set({
        settingValue: value,
        updatedAt: new Date(),
        updatedBy: userId,
        description: "External database connection",
        category: "infrastructure",
      })
      .where(eq(systemSettings.settingKey, DB_CONNECTION_SETTING_KEY));
  } else {
    await db.insert(systemSettings).values({
      settingKey: DB_CONNECTION_SETTING_KEY,
      settingValue: value,
      updatedBy: userId,
      description: "External database connection",
      category: "infrastructure",
    });
  }
};

export function createAdminDbRouter() {
  const router = express.Router();

  router.post("/reset-db", requireRole("super_admin"), async (req, res) => {
    try {
      const {
        password,
        preserveDdoCodes = false,
        preservePropertyOwners = false,
        preserveDistrictOfficers = false,
        preserveStateOfficers = false,
        preserveLgdData = false,
      } = req.body;

      // Require password for destructive operations
      if (!password || typeof password !== "string") {
        return res.status(400).json({
          message: "Password required for destructive operations"
        });
      }

      // Verify password against current user
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const [currentUser] = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser?.password) {
        return res.status(401).json({ message: "User not found" });
      }

      const isPasswordValid = await bcrypt.compare(password, currentUser.password);
      if (!isPasswordValid) {
        log.warn(`[admin] Invalid password attempt for reset-db by user ${userId}`);
        return res.status(401).json({ message: "Invalid password" });
      }

      log.info(`[admin] 🔐 Password verified for reset-db by user ${userId}`);

      const safeDelete = async (table: any, tableName: string) => {
        try {
          await db.delete(table);
          log.info(`[admin] ✓ Deleted all ${tableName}`);
        } catch (error: any) {
          if (error.code === "42P01") {
            log.info(`[admin] ⊙ Skipped ${tableName} (table doesn't exist yet)`);
          } else {
            throw error;
          }
        }
      };

      await safeDelete(inspectionReports, "inspection reports");
      await safeDelete(inspectionOrders, "inspection orders");
      await safeDelete(certificates, "certificates");
      await safeDelete(clarifications, "clarifications");

      await safeDelete(himkoshTransactions, "HimKosh transactions");
      await safeDelete(payments, "payments");
      await safeDelete(documents, "documents");
      await safeDelete(storageObjects, "storage objects");
      await safeDelete(homestayApplications, "homestay applications");
      await safeDelete(notifications, "notifications");
      await safeDelete(auditLogs, "audit logs");
      await safeDelete(productionStats, "production stats");

      let ddoCodesStatus = "preserved (configuration data)";
      if (!preserveDdoCodes) {
        await db.delete(ddoCodes);
        ddoCodesStatus = "deleted";
        log.info("[admin] ✓ Deleted all DDO codes");
      } else {
        log.info("[admin] ⊙ Preserved DDO codes (configuration data)");
      }

      log.info("[admin] ⊙ Preserved system settings (configuration data)");

      let lgdDataStatus = "preserved (configuration data)";
      if (!preserveLgdData) {
        await db.delete(lgdUrbanBodies);
        await db.delete(lgdGramPanchayats);
        await db.delete(lgdBlocks);
        await db.delete(lgdTehsils);
        await db.delete(lgdDistricts);
        lgdDataStatus = "deleted";
        log.info("[admin] ✓ Deleted all LGD master data");
      } else {
        log.info("[admin] ⊙ Preserved LGD master data (configuration data)");
      }

      const rolesToPreserve: string[] = ["admin", "super_admin", "admin_rc"];
      if (preservePropertyOwners) rolesToPreserve.push("property_owner");
      if (preserveDistrictOfficers) rolesToPreserve.push("dealing_assistant", "district_tourism_officer", "district_officer");
      if (preserveStateOfficers) rolesToPreserve.push("state_officer");

      const deletedProfiles = await db
        .delete(userProfiles)
        .where(sql`${userProfiles.userId} IN (SELECT id FROM ${users} WHERE ${notInArray(users.role, rolesToPreserve)})`)
        .returning();
      const deletedUsers = await db.delete(users).where(notInArray(users.role, rolesToPreserve)).returning();
      const preservedUsers = await db.select().from(users);
      const preservedCounts = preservedUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        message: "Database reset successful",
        deleted: {
          inspectionReports: "all",
          inspectionOrders: "all",
          certificates: "all",
          clarifications: "all",
          objections: "all",
          applicationActions: "all",
          reviews: "all",
          himkoshTransactions: "all",
          payments: "all",
          documents: "all",
          applications: "all",
          notifications: "all",
          auditLogs: "all",
          productionStats: "all",
          ddoCodes: ddoCodesStatus,
          userProfiles: `${deletedProfiles.length} deleted, ${preservedUsers.length} preserved`,
          users: `${deletedUsers.length} deleted`,
        },
        preserved: {
          totalUsers: preservedUsers.length,
          byRole: preservedCounts,
          ddoCodes: preserveDdoCodes,
          propertyOwners: preservePropertyOwners,
          districtOfficers: preserveDistrictOfficers,
          stateOfficers: preserveStateOfficers,
          lgdData: preserveLgdData,
          systemSettings: "always preserved",
        },
      });
    } catch (error) {
      log.error("[admin] ❌ Database reset failed:", error);
      res.status(500).json({
        message: "Failed to reset database",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get("/db/config", requireRole("super_admin"), async (_req, res) => {
    try {
      const stored = await getDbConnectionSettings();
      const fallback = stored ?? parseDatabaseUrlFromEnv();
      if (!fallback) {
        return res.json({ settings: null, hasPassword: false, metadata: {}, source: "none" });
      }
      const { password, ...settings } = fallback;
      res.json({
        settings,
        hasPassword: Boolean(stored?.password ?? password),
        metadata: {
          lastAppliedAt: stored?.lastAppliedAt ?? null,
          lastVerifiedAt: stored?.lastVerifiedAt ?? null,
          lastVerificationResult: stored?.lastVerificationResult ?? null,
          lastVerificationMessage: stored?.lastVerificationMessage ?? null,
        },
        source: stored ? "stored" : "env",
      });
    } catch (error) {
      log.error("[admin] Failed to fetch DB config:", error);
      res.status(500).json({ message: "Failed to fetch database configuration" });
    }
  });

  router.post("/db/config/test", requireRole("super_admin"), async (req, res) => {
    let tempPool: PgPool | null = null;
    try {
      const stored = await getDbConnectionSettings();
      const fallback = stored ?? parseDatabaseUrlFromEnv();
      const input = req.body?.settings ?? {};
      const host = typeof input.host === "string" && input.host.trim() ? input.host.trim() : fallback?.host;
      const database = typeof input.database === "string" && input.database.trim() ? input.database.trim() : fallback?.database;
      const user = typeof input.user === "string" && input.user.trim() ? input.user.trim() : fallback?.user;
      const passwordInput = typeof input.password === "string" ? input.password.trim() : undefined;
      const password = passwordInput || fallback?.password;
      const portValue = input.port ?? fallback?.port ?? 5432;
      const port = Number(portValue);

      if (!host || !database || !user || !password || Number.isNaN(port) || port <= 0) {
        return res.status(400).json({ message: "Host, port, database, user, and password are required" });
      }

      tempPool = new PgPool({
        host,
        port,
        database,
        user,
        password,
        max: 1,
        connectionTimeoutMillis: 5000,
      });
      const startedAt = Date.now();
      const result = await tempPool.query("SELECT version() AS version, NOW() AS server_time");
      await tempPool.end();
      tempPool = null;

      if (stored) {
        await saveDbConnectionSettings(
          { ...stored, lastVerifiedAt: new Date().toISOString(), lastVerificationResult: "success", lastVerificationMessage: null },
          req.session.userId ?? null,
        );
      }

      const row = result.rows[0] ?? {};
      res.json({
        success: true,
        version: row.version ?? "",
        serverTime: row.server_time ?? null,
        latencyMs: Date.now() - startedAt,
      });
    } catch (error) {
      if (tempPool) await tempPool.end();
      const message = error instanceof Error ? error.message : String(error);
      const stored = await getDbConnectionSettings();
      if (stored) {
        await saveDbConnectionSettings(
          { ...stored, lastVerifiedAt: new Date().toISOString(), lastVerificationResult: "failure", lastVerificationMessage: message },
          req.session.userId ?? null,
        );
      }
      res.status(400).json({ message });
    }
  });

  router.put("/db/config", requireRole("super_admin"), async (req, res) => {
    try {
      const existing = await getDbConnectionSettings();
      const host = typeof req.body?.host === "string" ? req.body.host.trim() : "";
      const database = typeof req.body?.database === "string" ? req.body.database.trim() : "";
      const user = typeof req.body?.user === "string" ? req.body.user.trim() : "";
      const portInput = req.body?.port ?? existing?.port ?? 5432;
      const port = Number(portInput);
      const passwordInput = typeof req.body?.password === "string" ? req.body.password.trim() : "";
      const password = passwordInput || existing?.password;
      const applyEnv = Boolean(req.body?.applyEnv);

      if (!host || !database || !user || !password || Number.isNaN(port) || port <= 0) {
        return res.status(400).json({ message: "Host, port, database, user, and password are required" });
      }

      const nextValue: DbConnectionSettingValue = {
        host,
        port,
        database,
        user,
        password,
        lastAppliedAt: applyEnv ? new Date().toISOString() : existing?.lastAppliedAt ?? null,
        lastVerifiedAt: existing?.lastVerifiedAt ?? null,
        lastVerificationResult: existing?.lastVerificationResult ?? null,
        lastVerificationMessage: existing?.lastVerificationMessage ?? null,
      };

      await saveDbConnectionSettings(nextValue, req.session.userId ?? null);
      if (applyEnv) updateDbEnvFiles(nextValue);

      res.json({
        success: true,
        applied: applyEnv,
        message: applyEnv
          ? "Configuration saved and environment files updated. Restart the service to apply changes."
          : "Configuration saved.",
      });
    } catch (error) {
      log.error("[admin] Failed to update DB config:", error);
      res.status(500).json({ message: "Failed to update database configuration" });
    }
  });

  router.get("/db-console/tables", requireRole("admin", "super_admin"), async (_req, res) => {
    try {
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({ message: "Database console is disabled in production" });
      }

      const result = await db.execute(sql`
        SELECT table_name, 
               pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      res.json({ tables: result });
    } catch (error) {
      log.error("[db-console] Failed to fetch tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  router.get("/db-console/table/:tableName/schema", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({ message: "Database console is disabled in production" });
      }

      const result = await db.execute(sql.raw(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `));

      res.json({ schema: result });
    } catch (error) {
      log.error("[db-console] Failed to fetch table schema:", error);
      res.status(500).json({ message: "Failed to fetch table schema" });
    }
  });

  router.post("/db-console/execute", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const { query: sqlQuery } = req.body;
      if (!sqlQuery || typeof sqlQuery !== "string") {
        return res.status(400).json({ message: "SQL query is required" });
      }
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({ message: "Database console is disabled in production for security" });
      }
      const trimmedQuery = sqlQuery.trim().toLowerCase();
      const isSelect = trimmedQuery.startsWith("select");
      const isShow = trimmedQuery.startsWith("show");
      const isDescribe = trimmedQuery.startsWith("describe") || trimmedQuery.startsWith("\\d");
      const isExplain = trimmedQuery.startsWith("explain");
      const isReadOnly = isSelect || isShow || isDescribe || isExplain;

      log.info(`[db-console] Executing ${isReadOnly ? "READ" : "WRITE"} query:`, sqlQuery.substring(0, 100));
      const result = await db.execute(sql.raw(sqlQuery));
      let rows: any[] = [];
      if (Array.isArray(result)) rows = result;
      else if (result && (result as any).rows) rows = (result as any).rows;
      else if (result) rows = [result];

      res.json({ success: true, type: isReadOnly ? "read" : "write", rowCount: rows.length, data: rows, query: sqlQuery });
    } catch (error) {
      log.error("[db-console] Failed to execute query:", error);
      res.status(500).json({ message: "Failed to execute query" });
    }
  });

  return router;
}
