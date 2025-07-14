#!/usr/bin/env node

import { Command } from 'commander';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import ora from 'ora';
import { formatDistance, format } from 'date-fns';
import * as backupService from './utils/backup';
import { backupScheduler, scheduleHelpers } from './utils/backupScheduler';

dotenv.config();

const program = new Command();

// Helper to format file size
const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Helper to connect to database
const connectDB = async (): Promise<void> => {
    const spinner = ora('Connecting to database...').start();
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        spinner.succeed('Connected to database');
    } catch (error) {
        spinner.fail('Failed to connect to database');
        throw error;
    }
};

// Create backup command
program
    .command('create')
    .description('Create a new backup')
    .option('-c, --collections <collections...>', 'Specific collections to backup')
    .option('-i, --interactive', 'Interactive mode to select collections')
    .action(async (options) => {
        try {
            await connectDB();

            let collections = options.collections;

            if (options.interactive) {
                const { selectedCollections } = await inquirer.prompt([
                    {
                        type: 'checkbox',
                        name: 'selectedCollections',
                        message: 'Select collections to backup:',
                        choices: backupService.COLLECTIONS,
                        default: backupService.COLLECTIONS
                    }
                ]);
                collections = selectedCollections;
            }

            const spinner = ora('Creating backup...').start();
            const metadata = await backupService.createBackup(collections);
            
            if (metadata.status === 'completed') {
                spinner.succeed(`Backup ${chalk.green(metadata.id)} created successfully`);
            } else {
                spinner.warn(`Backup ${chalk.yellow(metadata.id)} created with status: ${metadata.status}`);
            }

            console.log(`\n${chalk.bold('Backup Details:')}`);
            console.log(`ID: ${metadata.id}`);
            console.log(`Status: ${metadata.status}`);
            console.log(`Collections: ${metadata.collections.join(', ')}`);
            console.log(`Size: ${formatSize(metadata.size)}`);
            
            if (metadata.errors && metadata.errors.length > 0) {
                console.log(`\n${chalk.red('Errors:')}`);
                metadata.errors.forEach(error => console.log(`  - ${error}`));
            }

            mongoose.disconnect();
        } catch (error) {
            console.error(chalk.red('Error creating backup:'), error);
            process.exit(1);
        }
    });

// List backups command
program
    .command('list')
    .description('List all available backups')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .action(async (options) => {
        try {
            const backups = await backupService.listBackups();
            
            if (backups.length === 0) {
                console.log(chalk.yellow('No backups found'));
                return;
            }

            const table = new Table({
                head: ['ID', 'Date', 'Age', 'Status', 'Collections', 'Size'],
                style: { head: ['cyan'] }
            });

            const limit = parseInt(options.limit);
            const displayBackups = backups.slice(0, limit);

            displayBackups.forEach(backup => {
                const age = formatDistance(new Date(backup.date), new Date(), { addSuffix: true });
                const statusColor = backup.status === 'completed' ? chalk.green : 
                                   backup.status === 'partial' ? chalk.yellow : chalk.red;
                
                table.push([
                    backup.id,
                    format(new Date(backup.date), 'yyyy-MM-dd HH:mm:ss'),
                    age,
                    statusColor(backup.status),
                    backup.collections.length,
                    formatSize(backup.size)
                ]);
            });

            console.log(table.toString());
            
            if (backups.length > limit) {
                console.log(chalk.gray(`\nShowing ${limit} of ${backups.length} backups. Use --limit to see more.`));
            }
        } catch (error) {
            console.error(chalk.red('Error listing backups:'), error);
            process.exit(1);
        }
    });

// Restore backup command
program
    .command('restore <backupId>')
    .description('Restore from a backup')
    .option('-c, --collections <collections...>', 'Specific collections to restore')
    .option('-n, --no-delete', 'Do not delete existing data')
    .option('-f, --force', 'Skip confirmation')
    .action(async (backupId, options) => {
        try {
            await connectDB();

            // Validate backup exists
            const backup = await backupService.getBackupDetails(backupId);
            if (!backup) {
                console.error(chalk.red(`Backup ${backupId} not found`));
                process.exit(1);
            }

            // Show backup details
            console.log(`\n${chalk.bold('Backup to restore:')}`);
            console.log(`ID: ${backup.id}`);
            console.log(`Date: ${format(new Date(backup.date), 'yyyy-MM-dd HH:mm:ss')}`);
            console.log(`Collections: ${backup.collections.join(', ')}`);
            console.log(`Status: ${backup.status}`);

            // Confirm restoration
            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to restore from this backup?${options.delete ? ' This will delete existing data!' : ''}`,
                        default: false
                    }
                ]);

                if (!confirm) {
                    console.log(chalk.yellow('Restore cancelled'));
                    mongoose.disconnect();
                    return;
                }
            }

            const spinner = ora('Restoring backup...').start();
            const result = await backupService.restoreFromBackup(backupId, {
                collections: options.collections,
                deleteExisting: options.delete
            });

            if (result.success) {
                spinner.succeed('Restore completed successfully');
            } else {
                spinner.fail('Restore completed with errors');
            }

            // Show results
            console.log(`\n${chalk.bold('Restore Results:')}`);
            result.results.forEach(r => {
                const icon = r.success ? chalk.green('✓') : chalk.red('✗');
                const message = r.success 
                    ? `${r.recordCount} records restored`
                    : r.error;
                console.log(`${icon} ${r.collection}: ${message}`);
            });

            mongoose.disconnect();
        } catch (error) {
            console.error(chalk.red('Error restoring backup:'), error);
            process.exit(1);
        }
    });

// Validate backup command
program
    .command('validate <backupId>')
    .description('Validate backup integrity')
    .action(async (backupId) => {
        try {
            const spinner = ora('Validating backup...').start();
            const validation = await backupService.validateBackup(backupId);
            
            if (validation.valid) {
                spinner.succeed('Backup is valid');
            } else {
                spinner.fail('Backup validation failed');
            }

            if (validation.errors.length > 0) {
                console.log(`\n${chalk.red('Errors:')}`);
                validation.errors.forEach(error => console.log(`  - ${error}`));
            }

            console.log(`\n${chalk.bold('Collection Validation:')}`);
            Object.entries(validation.collections).forEach(([name, status]) => {
                const icon = status.valid ? chalk.green('✓') : chalk.red('✗');
                const message = status.valid 
                    ? `${status.recordCount} records`
                    : status.error;
                console.log(`${icon} ${name}: ${message}`);
            });
        } catch (error) {
            console.error(chalk.red('Error validating backup:'), error);
            process.exit(1);
        }
    });

// Delete backup command
program
    .command('delete <backupId>')
    .description('Delete a backup')
    .option('-g, --gcs', 'Also delete from Google Cloud Storage')
    .option('-f, --force', 'Skip confirmation')
    .action(async (backupId, options) => {
        try {
            // Confirm deletion
            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete backup ${backupId}?`,
                        default: false
                    }
                ]);

                if (!confirm) {
                    console.log(chalk.yellow('Delete cancelled'));
                    return;
                }
            }

            const spinner = ora('Deleting backup...').start();
            await backupService.deleteBackup(backupId, options.gcs);
            spinner.succeed(`Backup ${chalk.green(backupId)} deleted successfully`);
        } catch (error) {
            console.error(chalk.red('Error deleting backup:'), error);
            process.exit(1);
        }
    });

// Schedule command
program
    .command('schedule')
    .description('Manage backup scheduling')
    .option('-s, --status', 'Show scheduler status')
    .option('-e, --enable', 'Enable scheduler')
    .option('-d, --disable', 'Disable scheduler')
    .option('-c, --configure', 'Configure scheduler interactively')
    .action(async (options) => {
        try {
            if (options.status) {
                const config = backupScheduler.getConfig();
                const isRunning = backupScheduler.isRunning();
                
                console.log(`\n${chalk.bold('Scheduler Status:')}`);
                console.log(`Status: ${isRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
                console.log(`Enabled: ${config.enabled ? 'Yes' : 'No'}`);
                console.log(`Schedule: ${config.schedule} (${scheduleHelpers.describeSchedule(config.schedule)})`);
                console.log(`Collections: ${config.collections?.join(', ') || 'All'}`);
                console.log(`Retention: ${config.retention.days} days / ${config.retention.maxBackups} backups max`);
                
                return;
            }

            if (options.enable) {
                await connectDB();
                backupScheduler.updateConfig({ enabled: true });
                backupScheduler.start();
                console.log(chalk.green('Scheduler enabled'));
                mongoose.disconnect();
                return;
            }

            if (options.disable) {
                backupScheduler.stop();
                console.log(chalk.yellow('Scheduler disabled'));
                return;
            }

            if (options.configure) {
                const { schedule, retentionDays, maxBackups } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'schedule',
                        message: 'Select backup schedule:',
                        choices: [
                            { name: 'Every hour', value: scheduleHelpers.everyHour() },
                            { name: 'Every day at 2 AM', value: scheduleHelpers.everyDay(2) },
                            { name: 'Every week on Sunday at 2 AM', value: scheduleHelpers.everyWeek(0, 2) },
                            { name: 'Every month on the 1st at 2 AM', value: scheduleHelpers.everyMonth(1, 2) },
                            { name: 'Custom cron expression', value: 'custom' }
                        ]
                    },
                    {
                        type: 'input',
                        name: 'customSchedule',
                        message: 'Enter custom cron expression:',
                        when: (answers) => answers.schedule === 'custom',
                        validate: (input) => {
                            // Basic cron validation
                            const parts = input.split(' ');
                            if (parts.length !== 5) {
                                return 'Invalid cron expression. Expected format: * * * * *';
                            }
                            return true;
                        }
                    },
                    {
                        type: 'number',
                        name: 'retentionDays',
                        message: 'Retention period (days):',
                        default: 7
                    },
                    {
                        type: 'number',
                        name: 'maxBackups',
                        message: 'Maximum number of backups to keep:',
                        default: 10
                    }
                ]);

                const finalSchedule = schedule === 'custom' 
                    ? (await inquirer.prompt([{ name: 'customSchedule' }])).customSchedule
                    : schedule;

                backupScheduler.updateConfig({
                    schedule: finalSchedule,
                    retention: {
                        days: retentionDays,
                        maxBackups: maxBackups
                    }
                });

                console.log(chalk.green('Scheduler configuration updated'));
            }
        } catch (error) {
            console.error(chalk.red('Error managing scheduler:'), error);
            process.exit(1);
        }
    });

// Parse command line arguments
program
    .name('taxi-backup')
    .description('TaxiCo Backup Management CLI')
    .version('1.0.0');

program.parse();
