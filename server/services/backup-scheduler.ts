/**
 * Backup Scheduler Service
 * 
 * Schedules automatic backups using node-cron based on configuration.
 * Integrates with the backup service to run scheduled backups.
 */

import cron from "node-cron";
import { logger } from "../logger";
import {
    getBackupSettings,
    runFullBackup,
    type BackupSettings,
} from "./backup-service";

const schedulerLog = logger.child({ module: "backup-scheduler" });

let scheduledTask: cron.ScheduledTask | null = null;
let currentSchedule: string | null = null;

/**
 * Validate cron expression
 */
export function isValidCronExpression(expression: string): boolean {
    return cron.validate(expression);
}

/**
 * Get human-readable description of cron schedule
 */
export function describeCronSchedule(expression: string): string {
    // Common patterns with friendly descriptions
    const patterns: Record<string, string> = {
        "0 2 * * *": "Daily at 2:00 AM",
        "0 0 * * *": "Daily at midnight",
        "0 3 * * *": "Daily at 3:00 AM",
        "0 0 * * 0": "Weekly on Sunday at midnight",
        "0 0 * * 1": "Weekly on Monday at midnight",
        "0 0 1 * *": "Monthly on the 1st at midnight",
        "*/30 * * * *": "Every 30 minutes",
        "0 */6 * * *": "Every 6 hours",
        "0 */12 * * *": "Every 12 hours",
    };

    return patterns[expression] || `Custom schedule: ${expression}`;
}

/**
 * Execute a scheduled backup
 */
async function executeScheduledBackup(): Promise<void> {
    schedulerLog.info("Starting scheduled backup");

    try {
        const result = await runFullBackup();
        schedulerLog.info(
            { backupId: result.id, status: result.status, duration: result.duration },
            "Scheduled backup completed"
        );
    } catch (error) {
        schedulerLog.error({ error }, "Scheduled backup failed");
    }
}

/**
 * Start or update the backup scheduler
 */
export async function startBackupScheduler(): Promise<void> {
    const settings = await getBackupSettings();

    if (!settings.enabled) {
        schedulerLog.info("Backup scheduler is disabled");
        if (scheduledTask) {
            scheduledTask.stop();
            scheduledTask = null;
            currentSchedule = null;
        }
        return;
    }

    const schedule = settings.schedule;

    if (!isValidCronExpression(schedule)) {
        schedulerLog.error({ schedule }, "Invalid cron expression, scheduler not started");
        return;
    }

    // If schedule hasn't changed, no need to restart
    if (scheduledTask && currentSchedule === schedule) {
        schedulerLog.debug("Backup scheduler already running with same schedule");
        return;
    }

    // Stop existing task if any
    if (scheduledTask) {
        scheduledTask.stop();
        schedulerLog.info({ oldSchedule: currentSchedule }, "Stopped previous backup schedule");
    }

    // Create new scheduled task
    scheduledTask = cron.schedule(schedule, executeScheduledBackup, {
        scheduled: true,
        timezone: "Asia/Kolkata", // IST timezone for HP
    });

    currentSchedule = schedule;

    schedulerLog.info(
        { schedule, description: describeCronSchedule(schedule) },
        "Backup scheduler started"
    );
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        currentSchedule = null;
        schedulerLog.info("Backup scheduler stopped");
    }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
    running: boolean;
    schedule: string | null;
    description: string | null;
} {
    return {
        running: scheduledTask !== null,
        schedule: currentSchedule,
        description: currentSchedule ? describeCronSchedule(currentSchedule) : null,
    };
}

/**
 * Update scheduler when settings change
 */
export async function updateSchedulerFromSettings(): Promise<void> {
    await startBackupScheduler();
}

/**
 * Common cron schedule options for UI
 */
export const COMMON_SCHEDULES = [
    { value: "0 2 * * *", label: "Daily at 2:00 AM" },
    { value: "0 3 * * *", label: "Daily at 3:00 AM" },
    { value: "0 0 * * *", label: "Daily at midnight" },
    { value: "0 */12 * * *", label: "Every 12 hours" },
    { value: "0 */6 * * *", label: "Every 6 hours" },
    { value: "0 0 * * 0", label: "Weekly on Sunday" },
    { value: "0 0 * * 1", label: "Weekly on Monday" },
    { value: "0 0 1 * *", label: "Monthly on the 1st" },
];
