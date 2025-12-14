/**
 * Migration Service
 * 
 * Provides system export/import functionality for:
 * - Complete database export via pg_dump
 * - File storage archiving
 * - Single migration package creation
 * - Full system restore on fresh installations
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import archiver from "archiver";
import unzipper from "unzipper";
import crypto from "crypto";
import { config } from "@shared/config";
import { logger } from "../logger";
import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);
const migrationLog = logger.child({ module: "migration-service" });

// Migration settings key in system_settings
export const MIGRATION_SETTINGS_KEY = "migration_configuration";

// Default migrations directory
const DEFAULT_MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

// Package metadata interface
export interface MigrationMetadata {
    id: string;
    createdAt: string;
    sourceSystem: string;
    appVersion: string;
    databaseName: string;
    includesDatabase: boolean;
    includesFiles: boolean;
    filesCount: number;
    totalSizeBytes: number;
    checksums: Record<string, string>;
}

// Export package interface
export interface ExportPackage {
    id: string;
    createdAt: string;
    filePath: string;
    metadata: MigrationMetadata;
    sizeBytes: number;
    status: "pending" | "completed" | "failed";
    error?: string;
    duration?: number;
}

// Import result interface
export interface ImportResult {
    success: boolean;
    databaseRestored: boolean;
    filesRestored: boolean;
    filesCount: number;
    errors: string[];
    warnings: string[];
    duration: number;
}

/**
 * Get migrations directory path
 */
export function getMigrationsDirectory(): string {
    return DEFAULT_MIGRATIONS_DIR;
}

/**
 * Ensure migrations directory exists
 */
async function ensureMigrationsDirectory(): Promise<string> {
    const dir = getMigrationsDirectory();
    await fsPromises.mkdir(dir, { recursive: true });
    return dir;
}

/**
 * Generate migration ID based on timestamp
 */
function generateMigrationId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    return `migration_${year}${month}${day}_${hour}${minute}${second}`;
}

/**
 * Calculate SHA256 checksum of a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("data", (data) => hash.update(data));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });
}

/**
 * Export database using pg_dump
 */
async function exportDatabase(outputDir: string, migrationId: string): Promise<{
    filePath: string;
    sizeBytes: number;
}> {
    const databaseUrl = config.database.url;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL not configured");
    }

    const outputFile = path.join(outputDir, "database.sql");
    const compressedFile = `${outputFile}.gz`;

    migrationLog.info({ migrationId }, "Exporting database...");

    try {
        // Use pg_dump with gzip compression
        const command = `pg_dump "${databaseUrl}" | gzip > "${compressedFile}"`;
        await execAsync(command, { timeout: 10 * 60 * 1000 }); // 10 minute timeout

        const stats = await fsPromises.stat(compressedFile);
        migrationLog.info(
            { migrationId, file: compressedFile, sizeBytes: stats.size },
            "Database export completed"
        );

        return { filePath: compressedFile, sizeBytes: stats.size };
    } catch (error) {
        migrationLog.error({ migrationId, error }, "Database export failed");
        throw error;
    }
}

/**
 * Export file storage directory
 */
async function exportFiles(outputDir: string, migrationId: string): Promise<{
    dirPath: string;
    filesCount: number;
    sizeBytes: number;
}> {
    const sourceDir = config.objectStorage.localDirectory;

    if (!sourceDir || !fs.existsSync(sourceDir)) {
        migrationLog.warn({ sourceDir }, "File storage directory not found, skipping file export");
        return { dirPath: "", filesCount: 0, sizeBytes: 0 };
    }

    const filesOutputDir = path.join(outputDir, "files");
    await fsPromises.mkdir(filesOutputDir, { recursive: true });

    migrationLog.info({ migrationId, sourceDir }, "Copying files...");

    // Copy files recursively
    let filesCount = 0;
    let totalSize = 0;

    async function copyDir(src: string, dest: string) {
        await fsPromises.mkdir(dest, { recursive: true });
        const entries = await fsPromises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDir(srcPath, destPath);
            } else {
                await fsPromises.copyFile(srcPath, destPath);
                const stats = await fsPromises.stat(destPath);
                filesCount++;
                totalSize += stats.size;
            }
        }
    }

    await copyDir(sourceDir, filesOutputDir);

    migrationLog.info(
        { migrationId, filesCount, sizeBytes: totalSize },
        "Files export completed"
    );

    return { dirPath: filesOutputDir, filesCount, sizeBytes: totalSize };
}

/**
 * Create migration export package
 */
export async function createExportPackage(options: {
    includeDatabase?: boolean;
    includeFiles?: boolean;
} = {}): Promise<ExportPackage> {
    const { includeDatabase = true, includeFiles = true } = options;
    const startTime = Date.now();
    const migrationId = generateMigrationId();
    const migrationsDir = await ensureMigrationsDirectory();
    const workDir = path.join(migrationsDir, `${migrationId}_temp`);
    const packagePath = path.join(migrationsDir, `${migrationId}.zip`);

    migrationLog.info({ migrationId }, "Starting export package creation...");

    const exportPackage: ExportPackage = {
        id: migrationId,
        createdAt: new Date().toISOString(),
        filePath: packagePath,
        metadata: {} as MigrationMetadata,
        sizeBytes: 0,
        status: "pending",
    };

    try {
        await fsPromises.mkdir(workDir, { recursive: true });

        const checksums: Record<string, string> = {};
        let dbResult = { filePath: "", sizeBytes: 0 };
        let filesResult = { dirPath: "", filesCount: 0, sizeBytes: 0 };

        // Export database
        if (includeDatabase) {
            dbResult = await exportDatabase(workDir, migrationId);
            checksums["database.sql.gz"] = await calculateChecksum(dbResult.filePath);
        }

        // Export files
        if (includeFiles) {
            filesResult = await exportFiles(workDir, migrationId);
        }

        // Create metadata
        const metadata: MigrationMetadata = {
            id: migrationId,
            createdAt: new Date().toISOString(),
            sourceSystem: process.env.HOSTNAME || "unknown",
            appVersion: process.env.npm_package_version || "1.0.0",
            databaseName: new URL(config.database.url || "").pathname.replace("/", "") || "unknown",
            includesDatabase: includeDatabase && dbResult.sizeBytes > 0,
            includesFiles: includeFiles && filesResult.filesCount > 0,
            filesCount: filesResult.filesCount,
            totalSizeBytes: dbResult.sizeBytes + filesResult.sizeBytes,
            checksums,
        };

        // Write metadata file
        const metadataPath = path.join(workDir, "metadata.json");
        await fsPromises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        // Create ZIP package
        migrationLog.info({ migrationId }, "Creating ZIP package...");

        await new Promise<void>((resolve, reject) => {
            const output = fs.createWriteStream(packagePath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", () => resolve());
            archive.on("error", reject);

            archive.pipe(output);
            archive.directory(workDir, false);
            archive.finalize();
        });

        // Get final package size
        const packageStats = await fsPromises.stat(packagePath);
        exportPackage.sizeBytes = packageStats.size;
        exportPackage.metadata = metadata;
        exportPackage.status = "completed";
        exportPackage.duration = Date.now() - startTime;

        // Cleanup temp directory
        await fsPromises.rm(workDir, { recursive: true, force: true });

        migrationLog.info(
            { migrationId, sizeBytes: exportPackage.sizeBytes, duration: exportPackage.duration },
            "Export package created successfully"
        );

        return exportPackage;
    } catch (error) {
        exportPackage.status = "failed";
        exportPackage.error = (error as Error).message;
        exportPackage.duration = Date.now() - startTime;

        // Cleanup on error
        await fsPromises.rm(workDir, { recursive: true, force: true }).catch(() => { });
        await fsPromises.unlink(packagePath).catch(() => { });

        migrationLog.error({ migrationId, error }, "Export package creation failed");
        throw error;
    }
}

/**
 * Validate import package
 */
export async function validateImportPackage(packagePath: string): Promise<{
    valid: boolean;
    metadata: MigrationMetadata | null;
    errors: string[];
    warnings: string[];
}> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let metadata: MigrationMetadata | null = null;

    try {
        if (!fs.existsSync(packagePath)) {
            errors.push("Package file not found");
            return { valid: false, metadata: null, errors, warnings };
        }

        // Extract and read metadata
        const tempDir = path.join(getMigrationsDirectory(), `validate_${Date.now()}`);
        await fsPromises.mkdir(tempDir, { recursive: true });

        try {
            // Extract only metadata.json first
            await new Promise<void>((resolve, reject) => {
                fs.createReadStream(packagePath)
                    .pipe(unzipper.Extract({ path: tempDir }))
                    .on("close", resolve)
                    .on("error", reject);
            });

            const metadataPath = path.join(tempDir, "metadata.json");
            if (!fs.existsSync(metadataPath)) {
                errors.push("Package does not contain metadata.json");
                return { valid: false, metadata: null, errors, warnings };
            }

            const metadataContent = await fsPromises.readFile(metadataPath, "utf-8");
            metadata = JSON.parse(metadataContent);

            // Validate checksums
            if (metadata?.checksums) {
                for (const [filename, expectedChecksum] of Object.entries(metadata.checksums)) {
                    const filePath = path.join(tempDir, filename);
                    if (fs.existsSync(filePath)) {
                        const actualChecksum = await calculateChecksum(filePath);
                        if (actualChecksum !== expectedChecksum) {
                            errors.push(`Checksum mismatch for ${filename}`);
                        }
                    } else {
                        errors.push(`Missing file: ${filename}`);
                    }
                }
            }

            // Version compatibility check
            const currentVersion = process.env.npm_package_version || "1.0.0";
            if (metadata?.appVersion && metadata.appVersion !== currentVersion) {
                warnings.push(`Package version (${metadata.appVersion}) differs from current (${currentVersion})`);
            }

            return {
                valid: errors.length === 0,
                metadata,
                errors,
                warnings,
            };
        } finally {
            await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        }
    } catch (error) {
        errors.push(`Validation failed: ${(error as Error).message}`);
        return { valid: false, metadata: null, errors, warnings };
    }
}

/**
 * Import migration package
 */
export async function importMigrationPackage(packagePath: string): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
        success: false,
        databaseRestored: false,
        filesRestored: false,
        filesCount: 0,
        errors: [],
        warnings: [],
        duration: 0,
    };

    const tempDir = path.join(getMigrationsDirectory(), `import_${Date.now()}`);

    try {
        migrationLog.info({ packagePath }, "Starting import...");

        // Validate package first
        const validation = await validateImportPackage(packagePath);
        if (!validation.valid) {
            result.errors = validation.errors;
            result.warnings = validation.warnings;
            result.duration = Date.now() - startTime;
            return result;
        }

        result.warnings = validation.warnings;
        const metadata = validation.metadata!;

        // Extract package
        await fsPromises.mkdir(tempDir, { recursive: true });
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(packagePath)
                .pipe(unzipper.Extract({ path: tempDir }))
                .on("close", resolve)
                .on("error", reject);
        });

        // Restore database
        if (metadata.includesDatabase) {
            const dbFile = path.join(tempDir, "database.sql.gz");
            if (fs.existsSync(dbFile)) {
                try {
                    migrationLog.info("Restoring database...");
                    const databaseUrl = config.database.url;
                    if (!databaseUrl) {
                        throw new Error("DATABASE_URL not configured");
                    }

                    // Parse database URL to get database name
                    const dbUrl = new URL(databaseUrl);
                    const dbName = dbUrl.pathname.replace("/", "");

                    // First, disconnect all other sessions and drop all tables
                    migrationLog.info("Dropping existing tables before restore...");
                    const dropTablesCommand = `psql "${databaseUrl}" -c "
                        DO \\$\\$ DECLARE
                            r RECORD;
                        BEGIN
                            -- Drop all tables in public schema
                            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                                EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                            END LOOP;
                            -- Drop all sequences
                            FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
                                EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
                            END LOOP;
                            -- Drop all types (enums)
                            FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
                                EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
                            END LOOP;
                        END \\$\\$;"`;

                    try {
                        await execAsync(dropTablesCommand, { timeout: 5 * 60 * 1000 });
                        migrationLog.info("Existing tables dropped successfully");
                    } catch (dropError) {
                        migrationLog.warn({ error: dropError }, "Warning during table drop (may be normal for fresh DB)");
                    }

                    // Now restore the database from the dump
                    migrationLog.info("Restoring from SQL dump...");
                    const restoreCommand = `gunzip -c "${dbFile}" | psql "${databaseUrl}"`;
                    await execAsync(restoreCommand, { timeout: 30 * 60 * 1000 }); // 30 minute timeout

                    result.databaseRestored = true;
                    migrationLog.info("Database restored successfully");
                } catch (error) {
                    result.errors.push(`Database restore failed: ${(error as Error).message}`);
                    migrationLog.error({ error }, "Database restore failed");
                }
            }
        }

        // Restore files
        if (metadata.includesFiles) {
            const filesDir = path.join(tempDir, "files");
            if (fs.existsSync(filesDir)) {
                try {
                    migrationLog.info("Restoring files...");
                    const targetDir = config.objectStorage.localDirectory;
                    if (!targetDir) {
                        throw new Error("Object storage directory not configured");
                    }

                    await fsPromises.mkdir(targetDir, { recursive: true });

                    // Copy files
                    async function copyDir(src: string, dest: string): Promise<number> {
                        let count = 0;
                        await fsPromises.mkdir(dest, { recursive: true });
                        const entries = await fsPromises.readdir(src, { withFileTypes: true });

                        for (const entry of entries) {
                            const srcPath = path.join(src, entry.name);
                            const destPath = path.join(dest, entry.name);

                            if (entry.isDirectory()) {
                                count += await copyDir(srcPath, destPath);
                            } else {
                                await fsPromises.copyFile(srcPath, destPath);
                                count++;
                            }
                        }
                        return count;
                    }

                    result.filesCount = await copyDir(filesDir, targetDir);
                    result.filesRestored = true;
                    migrationLog.info({ filesCount: result.filesCount }, "Files restored successfully");
                } catch (error) {
                    result.errors.push(`Files restore failed: ${(error as Error).message}`);
                    migrationLog.error({ error }, "Files restore failed");
                }
            }
        }

        result.success = result.errors.length === 0;
        result.duration = Date.now() - startTime;

        migrationLog.info(
            { success: result.success, duration: result.duration },
            "Import completed"
        );

        return result;
    } catch (error) {
        result.errors.push(`Import failed: ${(error as Error).message}`);
        result.duration = Date.now() - startTime;
        migrationLog.error({ error }, "Import failed");
        return result;
    } finally {
        await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
}

/**
 * List available export packages
 */
export async function listExportPackages(): Promise<ExportPackage[]> {
    const migrationsDir = getMigrationsDirectory();

    if (!fs.existsSync(migrationsDir)) {
        return [];
    }

    const files = await fsPromises.readdir(migrationsDir);
    const packages: ExportPackage[] = [];

    for (const file of files) {
        if (file.endsWith(".zip") && file.startsWith("migration_")) {
            const filePath = path.join(migrationsDir, file);
            const stats = await fsPromises.stat(filePath);

            // Extract metadata from package
            try {
                const validation = await validateImportPackage(filePath);
                if (validation.metadata) {
                    packages.push({
                        id: validation.metadata.id,
                        createdAt: validation.metadata.createdAt,
                        filePath,
                        metadata: validation.metadata,
                        sizeBytes: stats.size,
                        status: "completed",
                    });
                }
            } catch {
                // Skip invalid packages
            }
        }
    }

    // Sort by creation date, newest first
    return packages.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Delete an export package
 */
export async function deleteExportPackage(packageId: string): Promise<boolean> {
    const migrationsDir = getMigrationsDirectory();
    const packagePath = path.join(migrationsDir, `${packageId}.zip`);

    if (!fs.existsSync(packagePath)) {
        return false;
    }

    await fsPromises.unlink(packagePath);
    migrationLog.info({ packageId }, "Export package deleted");
    return true;
}

/**
 * Get export package file path for download
 */
export function getExportPackagePath(packageId: string): string | null {
    const migrationsDir = getMigrationsDirectory();
    const packagePath = path.join(migrationsDir, `${packageId}.zip`);

    if (!fs.existsSync(packagePath)) {
        return null;
    }

    return packagePath;
}
