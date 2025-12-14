/**
 * Backup Service
 * 
 * Provides database and file backup functionality with:
 * - PostgreSQL backup via pg_dump
 * - File storage archiving
 * - Automatic cleanup of old backups
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import archiver from "archiver";
import { config } from "@shared/config";
import { logger } from "../logger";
import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);
const backupLog = logger.child({ module: "backup-service" });

// Backup settings key in system_settings
export const BACKUP_SETTINGS_KEY = "backup_configuration";

// Default backup configuration
export interface BackupSettings {
    enabled: boolean;
    schedule: string; // Cron expression
    backupDirectory: string;
    retentionDays: number;
    includeDatabase: boolean;
    includeFiles: boolean;
    lastBackupAt?: string;
    lastBackupStatus?: "success" | "failed";
    lastBackupError?: string;
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
    enabled: true,
    schedule: "0 2 * * *", // Daily at 2 AM
    backupDirectory: path.resolve(process.cwd(), "backups"),
    retentionDays: 30,
    includeDatabase: true,
    includeFiles: true,
};

// Backup metadata stored with each backup
export interface BackupMetadata {
    id: string;
    createdAt: string;
    type: "full" | "database" | "files";
    databaseFile?: string;
    filesArchive?: string;
    sizeBytes: number;
    status: "success" | "failed";
    error?: string;
    duration?: number;
}

/**
 * Get current backup settings from database
 */
export async function getBackupSettings(): Promise<BackupSettings> {
    try {
        const [record] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.settingKey, BACKUP_SETTINGS_KEY))
            .limit(1);

        if (!record || !record.settingValue) {
            return DEFAULT_BACKUP_SETTINGS;
        }

        return {
            ...DEFAULT_BACKUP_SETTINGS,
            ...(record.settingValue as Partial<BackupSettings>),
        };
    } catch (error) {
        backupLog.error("Failed to get backup settings, using defaults", error);
        return DEFAULT_BACKUP_SETTINGS;
    }
}

/**
 * Save backup settings to database
 */
export async function saveBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings> {
    const current = await getBackupSettings();
    const updated = { ...current, ...settings };

    const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, BACKUP_SETTINGS_KEY))
        .limit(1);

    if (existing) {
        await db
            .update(systemSettings)
            .set({ settingValue: updated, updatedAt: new Date() })
            .where(eq(systemSettings.settingKey, BACKUP_SETTINGS_KEY));
    } else {
        await db.insert(systemSettings).values({
            settingKey: BACKUP_SETTINGS_KEY,
            settingValue: updated,
        });
    }

    return updated;
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory(backupDir: string): Promise<void> {
    await fsPromises.mkdir(backupDir, { recursive: true });
}

/**
 * Generate backup ID based on timestamp
 */
function generateBackupId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    return `backup_${year}${month}${day}_${hour}${minute}${second}`;
}

/**
 * Backup PostgreSQL database using pg_dump
 */
export async function backupDatabase(backupDir: string, backupId: string): Promise<string> {
    const databaseUrl = config.database.url;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL not configured");
    }

    await ensureBackupDirectory(backupDir);

    const outputFile = path.join(backupDir, `${backupId}_database.sql`);
    const compressedFile = `${outputFile}.gz`;

    backupLog.info({ backupId, outputFile }, "Starting database backup");

    try {
        // Use pg_dump with gzip compression
        const command = `pg_dump "${databaseUrl}" | gzip > "${compressedFile}"`;
        await execAsync(command, { timeout: 5 * 60 * 1000 }); // 5 minute timeout

        const stats = await fsPromises.stat(compressedFile);
        backupLog.info(
            { backupId, file: compressedFile, sizeBytes: stats.size },
            "Database backup completed"
        );

        return compressedFile;
    } catch (error) {
        backupLog.error({ backupId, error }, "Database backup failed");
        throw error;
    }
}

/**
 * Backup file storage directory
 */
export async function backupFiles(backupDir: string, backupId: string): Promise<string> {
    const sourceDir = config.objectStorage.localDirectory;

    if (!sourceDir || !fs.existsSync(sourceDir)) {
        backupLog.warn({ sourceDir }, "File storage directory not found, skipping file backup");
        throw new Error("File storage directory not found");
    }

    await ensureBackupDirectory(backupDir);

    const outputFile = path.join(backupDir, `${backupId}_files.zip`);

    backupLog.info({ backupId, sourceDir, outputFile }, "Starting file backup");

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputFile);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            backupLog.info(
                { backupId, file: outputFile, sizeBytes: archive.pointer() },
                "File backup completed"
            );
            resolve(outputFile);
        });

        archive.on("error", (err) => {
            backupLog.error({ backupId, error: err }, "File backup failed");
            reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, "files");
        archive.finalize();
    });
}

/**
 * Run a full backup (database + files)
 */
export async function runFullBackup(): Promise<BackupMetadata> {
    const startTime = Date.now();
    const settings = await getBackupSettings();
    const backupId = generateBackupId();
    const backupDir = settings.backupDirectory;

    backupLog.info({ backupId, backupDir }, "Starting full backup");

    const metadata: BackupMetadata = {
        id: backupId,
        createdAt: new Date().toISOString(),
        type: "full",
        sizeBytes: 0,
        status: "success",
    };

    try {
        await ensureBackupDirectory(backupDir);

        // Backup database
        if (settings.includeDatabase) {
            try {
                metadata.databaseFile = await backupDatabase(backupDir, backupId);
                const dbStats = await fsPromises.stat(metadata.databaseFile);
                metadata.sizeBytes += dbStats.size;
            } catch (dbError) {
                backupLog.error({ backupId, error: dbError }, "Database backup failed");
                metadata.status = "failed";
                metadata.error = `Database backup failed: ${(dbError as Error).message}`;
            }
        }

        // Backup files
        if (settings.includeFiles) {
            try {
                metadata.filesArchive = await backupFiles(backupDir, backupId);
                const fileStats = await fsPromises.stat(metadata.filesArchive);
                metadata.sizeBytes += fileStats.size;
            } catch (fileError) {
                backupLog.error({ backupId, error: fileError }, "File backup failed");
                if (metadata.status !== "failed") {
                    metadata.status = "failed";
                    metadata.error = `File backup failed: ${(fileError as Error).message}`;
                } else {
                    metadata.error += `; File backup failed: ${(fileError as Error).message}`;
                }
            }
        }

        metadata.duration = Date.now() - startTime;

        // Save metadata file
        const metadataFile = path.join(backupDir, `${backupId}_metadata.json`);
        await fsPromises.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

        // Update last backup info in settings
        await saveBackupSettings({
            lastBackupAt: metadata.createdAt,
            lastBackupStatus: metadata.status,
            lastBackupError: metadata.error,
        });

        backupLog.info(
            { backupId, duration: metadata.duration, sizeBytes: metadata.sizeBytes, status: metadata.status },
            "Full backup completed"
        );

        // Cleanup old backups
        await cleanupOldBackups(backupDir, settings.retentionDays);

        return metadata;
    } catch (error) {
        metadata.status = "failed";
        metadata.error = (error as Error).message;
        metadata.duration = Date.now() - startTime;

        await saveBackupSettings({
            lastBackupAt: metadata.createdAt,
            lastBackupStatus: "failed",
            lastBackupError: metadata.error,
        });

        throw error;
    }
}

/**
 * Clean up backups older than retention days
 */
export async function cleanupOldBackups(backupDir: string, retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    try {
        const files = await fsPromises.readdir(backupDir);
        const metadataFiles = files.filter((f) => f.endsWith("_metadata.json"));

        for (const metaFile of metadataFiles) {
            try {
                const metaPath = path.join(backupDir, metaFile);
                const content = await fsPromises.readFile(metaPath, "utf-8");
                const metadata: BackupMetadata = JSON.parse(content);

                const backupDate = new Date(metadata.createdAt);
                if (backupDate < cutoffDate) {
                    // Delete associated files
                    if (metadata.databaseFile && fs.existsSync(metadata.databaseFile)) {
                        await fsPromises.unlink(metadata.databaseFile);
                    }
                    if (metadata.filesArchive && fs.existsSync(metadata.filesArchive)) {
                        await fsPromises.unlink(metadata.filesArchive);
                    }
                    await fsPromises.unlink(metaPath);
                    deletedCount++;

                    backupLog.info({ backupId: metadata.id }, "Deleted old backup");
                }
            } catch (fileError) {
                backupLog.warn({ file: metaFile, error: fileError }, "Failed to process backup file for cleanup");
            }
        }

        if (deletedCount > 0) {
            backupLog.info({ deletedCount, retentionDays }, "Cleanup completed");
        }
    } catch (error) {
        backupLog.error({ error }, "Backup cleanup failed");
    }

    return deletedCount;
}

/**
 * List available backups
 */
export async function listBackups(): Promise<BackupMetadata[]> {
    const settings = await getBackupSettings();
    const backupDir = settings.backupDirectory;

    if (!fs.existsSync(backupDir)) {
        return [];
    }

    const files = await fsPromises.readdir(backupDir);
    const metadataFiles = files.filter((f) => f.endsWith("_metadata.json"));

    const backups: BackupMetadata[] = [];

    for (const metaFile of metadataFiles) {
        try {
            const content = await fsPromises.readFile(path.join(backupDir, metaFile), "utf-8");
            backups.push(JSON.parse(content));
        } catch (error) {
            backupLog.warn({ file: metaFile }, "Failed to read backup metadata");
        }
    }

    // Sort by creation date, newest first
    return backups.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Delete a specific backup
 */
export async function deleteBackup(backupId: string): Promise<boolean> {
    const settings = await getBackupSettings();
    const backupDir = settings.backupDirectory;
    const metaPath = path.join(backupDir, `${backupId}_metadata.json`);

    if (!fs.existsSync(metaPath)) {
        return false;
    }

    try {
        const content = await fsPromises.readFile(metaPath, "utf-8");
        const metadata: BackupMetadata = JSON.parse(content);

        if (metadata.databaseFile && fs.existsSync(metadata.databaseFile)) {
            await fsPromises.unlink(metadata.databaseFile);
        }
        if (metadata.filesArchive && fs.existsSync(metadata.filesArchive)) {
            await fsPromises.unlink(metadata.filesArchive);
        }
        await fsPromises.unlink(metaPath);

        backupLog.info({ backupId }, "Backup deleted");
        return true;
    } catch (error) {
        backupLog.error({ backupId, error }, "Failed to delete backup");
        return false;
    }
}

/**
 * Get backup file path for download
 */
export async function getBackupFilePath(
    backupId: string,
    fileType: "database" | "files"
): Promise<string | null> {
    const settings = await getBackupSettings();
    const backupDir = settings.backupDirectory;
    const metaPath = path.join(backupDir, `${backupId}_metadata.json`);

    if (!fs.existsSync(metaPath)) {
        return null;
    }

    try {
        const content = await fsPromises.readFile(metaPath, "utf-8");
        const metadata: BackupMetadata = JSON.parse(content);

        const filePath = fileType === "database" ? metadata.databaseFile : metadata.filesArchive;

        if (filePath && fs.existsSync(filePath)) {
            return filePath;
        }

        return null;
    } catch (error) {
        backupLog.error({ backupId, fileType, error }, "Failed to get backup file path");
        return null;
    }
}
