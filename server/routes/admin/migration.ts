/**
 * Migration API Routes
 * 
 * Super Admin endpoints for system export/import functionality.
 */

import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import multer from "multer";
import { requireRole } from "../core/middleware";
import { db } from "../../db";
import { users } from "@shared/schema";
import { logger } from "../../logger";
import {
    createExportPackage,
    validateImportPackage,
    importMigrationPackage,
    listExportPackages,
    deleteExportPackage,
    getExportPackagePath,
    getMigrationsDirectory,
    type ExportPackage,
} from "../../services/migration-service";
import {
    DATA_CATEGORIES,
    getSchemaSummary,
    analyzePackage,
    validateSchemaCoverage,
} from "../../services/migration";

const log = logger.child({ module: "migration-router" });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const migrationsDir = getMigrationsDirectory();
        await fs.promises.mkdir(migrationsDir, { recursive: true });
        cb(null, migrationsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `import_${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
            cb(null, true);
        } else {
            cb(new Error("Only ZIP files are allowed"));
        }
    },
});

export function createMigrationRouter() {
    const router = express.Router();

    /**
     * GET /api/admin/migration/schema/summary
     * Get current database schema summary with category stats
     */
    router.get("/schema/summary", requireRole("super_admin"), async (req, res) => {
        try {
            const summary = await getSchemaSummary();
            res.json(summary);
        } catch (error) {
            log.error({ error }, "Failed to get schema summary");
            res.status(500).json({ message: "Failed to get schema summary" });
        }
    });

    /**
     * GET /api/admin/migration/categories
     * Get available data categories for granular export/import
     */
    router.get("/categories", requireRole("super_admin"), async (req, res) => {
        try {
            res.json({ categories: DATA_CATEGORIES });
        } catch (error) {
            log.error({ error }, "Failed to get categories");
            res.status(500).json({ message: "Failed to get categories" });
        }
    });

    /**
     * GET /api/admin/migration/schema/validate
     * Validate that all database tables are covered by backup categories
     * CRITICAL for ensuring complete backups
     */
    router.get("/schema/validate", requireRole("super_admin"), async (req, res) => {
        try {
            const result = await validateSchemaCoverage();
            res.json(result);
        } catch (error) {
            log.error({ error }, "Failed to validate schema coverage");
            res.status(500).json({ message: "Failed to validate schema coverage" });
        }
    });

    /**
     * POST /api/admin/migration/import/analyze
     * Analyze an import package without importing - returns recommendations
     */
    router.post(
        "/import/analyze",
        requireRole("super_admin"),
        upload.single("package"),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }

                log.info({ file: req.file.originalname }, "Analyzing import package...");

                const analysis = await analyzePackage(req.file.path);

                // Keep the file for potential import
                res.json({
                    message: "Package analyzed successfully",
                    analysis,
                    packagePath: req.file.path,
                });
            } catch (error) {
                log.error({ error }, "Package analysis failed");
                if (req.file) {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                }
                res.status(500).json({
                    message: "Analysis failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    );

    /**
     * GET /api/admin/migration/exports
     * List available export packages
     */
    router.get("/exports", requireRole("super_admin"), async (req, res) => {
        try {
            const packages = await listExportPackages();
            res.json({ packages });
        } catch (error) {
            log.error({ error }, "Failed to list export packages");
            res.status(500).json({ message: "Failed to list export packages" });
        }
    });

    /**
     * POST /api/admin/migration/export
     * Create a new export package
     */
    router.post("/export", requireRole("super_admin"), async (req, res) => {
        try {
            const { includeDatabase = true, includeFiles = true } = req.body;

            log.info({ includeDatabase, includeFiles }, "Starting export...");

            const exportPackage = await createExportPackage({
                includeDatabase,
                includeFiles,
            });

            res.json({
                message: "Export package created successfully",
                package: exportPackage,
            });
        } catch (error) {
            log.error({ error }, "Export failed");
            res.status(500).json({
                message: "Failed to create export package",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });

    /**
     * GET /api/admin/migration/export/:id/download
     * Download an export package
     */
    router.get("/export/:id/download", requireRole("super_admin"), async (req, res) => {
        try {
            const { id } = req.params;
            const packagePath = getExportPackagePath(id);

            if (!packagePath) {
                return res.status(404).json({ message: "Export package not found" });
            }

            const filename = path.basename(packagePath);
            res.download(packagePath, filename);
        } catch (error) {
            log.error({ error }, "Failed to download export package");
            res.status(500).json({ message: "Failed to download export package" });
        }
    });

    /**
     * DELETE /api/admin/migration/export/:id
     * Delete an export package
     */
    router.delete("/export/:id", requireRole("super_admin"), async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await deleteExportPackage(id);

            if (!deleted) {
                return res.status(404).json({ message: "Export package not found" });
            }

            res.json({ message: "Export package deleted" });
        } catch (error) {
            log.error({ error }, "Failed to delete export package");
            res.status(500).json({ message: "Failed to delete export package" });
        }
    });

    /**
     * POST /api/admin/migration/import/validate
     * Validate an import package without restoring
     */
    router.post(
        "/import/validate",
        requireRole("super_admin"),
        upload.single("package"),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }

                const validation = await validateImportPackage(req.file.path);

                // Clean up uploaded file after validation
                await fs.promises.unlink(req.file.path).catch(() => { });

                res.json(validation);
            } catch (error) {
                log.error({ error }, "Validation failed");
                res.status(500).json({
                    message: "Validation failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    );

    /**
     * POST /api/admin/migration/import
     * Import a migration package (requires password verification)
     */
    router.post(
        "/import",
        requireRole("super_admin"),
        upload.single("package"),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }

                const { password } = req.body;

                // Require password for destructive import operation
                if (!password || typeof password !== "string") {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                    return res.status(400).json({
                        message: "Password required for import operations",
                    });
                }

                // Verify password
                const userId = req.session.userId;
                if (!userId) {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                    return res.status(401).json({ message: "Not authenticated" });
                }

                const [currentUser] = await db
                    .select({ password: users.password })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1);

                if (!currentUser?.password) {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                    return res.status(401).json({ message: "User not found" });
                }

                const isPasswordValid = await bcrypt.compare(password, currentUser.password);
                if (!isPasswordValid) {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                    log.warn(`[migration] Invalid password attempt for import by user ${userId}`);
                    return res.status(401).json({ message: "Invalid password" });
                }

                log.info(`[migration] Password verified for import by user ${userId}`);

                // Validate package first
                const validation = await validateImportPackage(req.file.path);
                if (!validation.valid) {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                    return res.status(400).json({
                        message: "Invalid import package",
                        errors: validation.errors,
                        warnings: validation.warnings,
                    });
                }

                // Perform import
                const result = await importMigrationPackage(req.file.path);

                // Clean up uploaded file after import
                await fs.promises.unlink(req.file.path).catch(() => { });

                if (result.success) {
                    res.json({
                        message: "Import completed successfully",
                        result,
                    });
                } else {
                    res.status(500).json({
                        message: "Import completed with errors",
                        result,
                    });
                }
            } catch (error) {
                log.error({ error }, "Import failed");
                if (req.file) {
                    await fs.promises.unlink(req.file.path).catch(() => { });
                }
                res.status(500).json({
                    message: "Import failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    );

    return router;
}
