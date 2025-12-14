/**
 * Admin Backup Routes
 * 
 * API endpoints for backup management (Super Admin only)
 */

import express from "express";
import path from "path";
import { z } from "zod";
import { requireRole } from "../core/middleware";
import { logger } from "../../logger";
import {
    getBackupSettings,
    saveBackupSettings,
    runFullBackup,
    listBackups,
    deleteBackup,
    getBackupFilePath,
    DEFAULT_BACKUP_SETTINGS,
    type BackupSettings,
} from "../../services/backup-service";
import {
    startBackupScheduler,
    stopBackupScheduler,
    getSchedulerStatus,
    isValidCronExpression,
    COMMON_SCHEDULES,
} from "../../services/backup-scheduler";

const backupLog = logger.child({ module: "backup-routes" });

const backupSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    schedule: z.string().optional(),
    backupDirectory: z.string().optional(),
    retentionDays: z.number().int().min(1).max(365).optional(),
    includeDatabase: z.boolean().optional(),
    includeFiles: z.boolean().optional(),
});

export function createBackupRouter() {
    const router = express.Router();

    // All routes require super_admin role
    router.use(requireRole("super_admin"));

    /**
     * GET /settings - Get current backup configuration
     */
    router.get("/settings", async (_req, res) => {
        try {
            const settings = await getBackupSettings();
            const schedulerStatus = getSchedulerStatus();

            res.json({
                settings,
                scheduler: schedulerStatus,
                scheduleOptions: COMMON_SCHEDULES,
                defaults: DEFAULT_BACKUP_SETTINGS,
            });
        } catch (error) {
            backupLog.error({ error }, "Failed to get backup settings");
            res.status(500).json({ message: "Failed to get backup settings" });
        }
    });

    /**
     * POST /settings - Update backup configuration
     */
    router.post("/settings", async (req, res) => {
        try {
            const updates = backupSettingsSchema.parse(req.body);

            // Validate cron expression if provided
            if (updates.schedule && !isValidCronExpression(updates.schedule)) {
                return res.status(400).json({ message: "Invalid schedule format" });
            }

            const settings = await saveBackupSettings(updates);

            // Restart scheduler with new settings
            if (settings.enabled) {
                await startBackupScheduler();
            } else {
                stopBackupScheduler();
            }

            const schedulerStatus = getSchedulerStatus();

            res.json({
                settings,
                scheduler: schedulerStatus,
                message: "Backup settings updated successfully",
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    message: error.errors[0]?.message || "Invalid settings",
                    errors: error.errors,
                });
            }
            backupLog.error({ error }, "Failed to update backup settings");
            res.status(500).json({ message: "Failed to update backup settings" });
        }
    });

    /**
     * POST /run - Trigger manual backup
     */
    router.post("/run", async (req, res) => {
        try {
            backupLog.info({ userId: req.session.userId }, "Manual backup triggered");

            const result = await runFullBackup();

            res.json({
                backup: result,
                message:
                    result.status === "success"
                        ? "Backup completed successfully"
                        : "Backup completed with errors",
            });
        } catch (error) {
            backupLog.error({ error }, "Manual backup failed");
            res.status(500).json({ message: "Backup failed" });
        }
    });

    /**
     * GET /list - List available backups
     */
    router.get("/list", async (_req, res) => {
        try {
            const backups = await listBackups();
            res.json({ backups });
        } catch (error) {
            backupLog.error({ error }, "Failed to list backups");
            res.status(500).json({ message: "Failed to list backups" });
        }
    });

    /**
     * GET /:id/download/:type - Download backup file
     */
    router.get("/:id/download/:type", async (req, res) => {
        try {
            const { id, type } = req.params;

            if (type !== "database" && type !== "files") {
                return res.status(400).json({ message: "Invalid download type" });
            }

            const filePath = await getBackupFilePath(id, type);

            if (!filePath) {
                return res.status(404).json({ message: "Backup file not found" });
            }

            const filename = path.basename(filePath);
            res.download(filePath, filename);
        } catch (error) {
            backupLog.error({ error }, "Failed to download backup");
            res.status(500).json({ message: "Failed to download backup" });
        }
    });

    /**
     * DELETE /:id - Delete a backup
     */
    router.delete("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await deleteBackup(id);

            if (!deleted) {
                return res.status(404).json({ message: "Backup not found" });
            }

            res.json({ message: "Backup deleted successfully" });
        } catch (error) {
            backupLog.error({ error }, "Failed to delete backup");
            res.status(500).json({ message: "Failed to delete backup" });
        }
    });

    /**
     * GET /scheduler/status - Get scheduler status
     */
    router.get("/scheduler/status", (_req, res) => {
        const status = getSchedulerStatus();
        res.json(status);
    });

    /**
     * POST /scheduler/start - Start scheduler
     */
    router.post("/scheduler/start", async (_req, res) => {
        try {
            await startBackupScheduler();
            res.json({
                status: getSchedulerStatus(),
                message: "Backup scheduler started",
            });
        } catch (error) {
            backupLog.error({ error }, "Failed to start scheduler");
            res.status(500).json({ message: "Failed to start scheduler" });
        }
    });

    /**
     * POST /scheduler/stop - Stop scheduler
     */
    router.post("/scheduler/stop", (_req, res) => {
        stopBackupScheduler();
        res.json({
            status: getSchedulerStatus(),
            message: "Backup scheduler stopped",
        });
    });

    return router;
}
