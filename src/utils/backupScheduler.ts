import cron, { ScheduledTask } from 'node-cron';
import * as backupService from './backup';

interface ScheduledBackupConfig {
    enabled: boolean;
    schedule: string;
    collections?: string[];
    retention: {
        days: number;
        maxBackups: number;
    };
}

class BackupScheduler {
    private task: ScheduledTask | null = null;
    private config: ScheduledBackupConfig;

    constructor(config: ScheduledBackupConfig) {
        this.config = config;
    }

    /**
     * Starts the backup scheduler
     */
    start(): void {
        if (!this.config.enabled) {
            console.log('Backup scheduler is disabled');
            return;
        }

        if (this.task) {
            console.log('Backup scheduler is already running');
            return;
        }

        // Validate cron expression
        if (!cron.validate(this.config.schedule)) {
            throw new Error(`Invalid cron expression: ${this.config.schedule}`);
        }

        this.task = cron.schedule(this.config.schedule, async () => {
            console.log(`[${new Date().toISOString()}] Running scheduled backup...`);

            try {
                const metadata = await backupService.createBackup(this.config.collections);
                console.log(`Scheduled backup completed: ${metadata.id} (${metadata.status})`);

                // Clean up old backups
                await this.cleanupOldBackups();
            } catch (error) {
                console.error('Scheduled backup failed:', error);
            }
        });

        console.log(`Backup scheduler started with schedule: ${this.config.schedule}`);
    }

    /**
     * Stops the backup scheduler
     */
    stop(): void {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('Backup scheduler stopped');
        }
    }

    /**
     * Updates the scheduler configuration
     */
    updateConfig(config: Partial<ScheduledBackupConfig>): void {
        this.config = { ...this.config, ...config };

        // Restart scheduler if it was running
        if (this.task) {
            this.stop();
            this.start();
        }
    }

    /**
     * Gets the current configuration
     */
    getConfig(): ScheduledBackupConfig {
        return { ...this.config };
    }

    /**
     * Checks if the scheduler is running
     */
    isRunning(): boolean {
        return this.task !== null;
    }

    /**
     * Cleans up old backups based on retention policy
     */
    private async cleanupOldBackups(): Promise<void> {
        try {
            const backups = await backupService.listBackups();

            // Sort by date (oldest first)
            const sortedBackups = [...backups].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Calculate cutoff date
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.days);

            // Find backups to delete
            const backupsToDelete = sortedBackups.filter(backup => {
                const backupDate = new Date(backup.date);
                return backupDate < cutoffDate;
            });

            // Also check max backups limit
            const remainingBackups = sortedBackups.filter(backup => {
                const backupDate = new Date(backup.date);
                return backupDate >= cutoffDate;
            });

            if (remainingBackups.length > this.config.retention.maxBackups) {
                const excess = remainingBackups.length - this.config.retention.maxBackups;
                backupsToDelete.push(...remainingBackups.slice(0, excess));
            }

            // Delete old backups
            for (const backup of backupsToDelete) {
                try {
                    await backupService.deleteBackup(backup.id, true);
                    console.log(`Deleted old backup: ${backup.id}`);
                } catch (error) {
                    console.error(`Failed to delete backup ${backup.id}:`, error);
                }
            }

            if (backupsToDelete.length > 0) {
                console.log(`Cleaned up ${backupsToDelete.length} old backups`);
            }
        } catch (error) {
            console.error('Error cleaning up old backups:', error);
        }
    }

    /**
     * Manually triggers a backup
     */
    async triggerBackup(): Promise<void> {
        console.log('Manually triggering backup...');
        try {
            const metadata = await backupService.createBackup(this.config.collections);
            console.log(`Manual backup completed: ${metadata.id} (${metadata.status})`);
        } catch (error) {
            console.error('Manual backup failed:', error);
            throw error;
        }
    }
}

// Create a default scheduler instance
const defaultConfig: ScheduledBackupConfig = {
    enabled: process.env.BACKUP_SCHEDULER_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Default: 2 AM daily
    collections: process.env.BACKUP_COLLECTIONS?.split(','),
    retention: {
        days: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
        maxBackups: parseInt(process.env.BACKUP_MAX_COUNT || '10')
    }
};

export const backupScheduler = new BackupScheduler(defaultConfig);

// Helper functions for common schedules
export const scheduleHelpers = {
    everyMinute: () => '* * * * *',
    everyHour: () => '0 * * * *',
    everyDay: (hour = 2, minute = 0) => `${minute} ${hour} * * *`,
    everyWeek: (dayOfWeek = 0, hour = 2, minute = 0) => `${minute} ${hour} * * ${dayOfWeek}`,
    everyMonth: (dayOfMonth = 1, hour = 2, minute = 0) => `${minute} ${hour} ${dayOfMonth} * *`,

    // Human-readable schedule descriptions
    describeSchedule: (schedule: string): string => {
        const schedules: { [key: string]: string } = {
            '* * * * *': 'Every minute',
            '0 * * * *': 'Every hour',
            '0 0 * * *': 'Every day at midnight',
            '0 2 * * *': 'Every day at 2:00 AM',
            '0 0 * * 0': 'Every Sunday at midnight',
            '0 0 1 * *': 'Every month on the 1st at midnight',
        };

        return schedules[schedule] || schedule;
    }
};

export default backupScheduler;
