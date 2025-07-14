import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import * as gcs from './gcs';
import { format, parse } from 'date-fns';
import path from 'path';
import 'dotenv/config';

// Define collection names that should be backed up
export const COLLECTIONS = [
    'Cab',
    'Customer',
    'Driver',
    'Ride'
];

const BACKUP_DIR = './backups';
const DATE_FORMAT = 'yyyy-MM-dd-HH-mm-ss';

// Interface for backup metadata
interface BackupMetadata {
    id: string;
    date: Date;
    collections: string[];
    size: number;
    status: 'completed' | 'partial' | 'failed';
    errors?: string[];
    source: 'local' | 'gcs' | 'both';
}

// Interface for collection backup result
interface CollectionBackupResult {
    collection: string;
    success: boolean;
    recordCount?: number;
    error?: string;
}

// Interface for restore options
interface RestoreOptions {
    collections?: string[];
    deleteExisting?: boolean;
    validateData?: boolean;
}

/**
 * Creates a backup of all or specified collections
 * @param collections Optional array of collection names to backup
 * @returns Backup metadata
 */
export const createBackup = async (collections: string[] = COLLECTIONS): Promise<BackupMetadata> => {
    const backupId = format(new Date(), DATE_FORMAT);
    const backupDirPath = path.join(BACKUP_DIR, backupId);
    const metadata: BackupMetadata = {
        id: backupId,
        date: new Date(),
        collections: [],
        size: 0,
        status: 'completed',
        errors: [],
        source: 'both'
    };

    try {
        // Create backup directory
        await fs.mkdir(backupDirPath, { recursive: true });

        // Backup each collection
        const results = await Promise.all(
            collections.map(async (collectionName): Promise<CollectionBackupResult> => {
                try {
                    const collection = mongoose.connection.collection(collectionName);
                    const data = await collection.find({}).toArray();

                    const filePath = path.join(backupDirPath, `${collectionName}.json`);
                    const jsonData = JSON.stringify(data, null, 2);

                    // Write to local file
                    await fs.writeFile(filePath, jsonData);

                    // Get file size
                    const stats = await fs.stat(filePath);
                    metadata.size += stats.size;

                    // Upload to GCS
                    const gcsDestination = `backups/${backupId}/${collectionName}.json`;
                    await gcs.uploadFileToGCS(filePath, gcsDestination);

                    metadata.collections.push(collectionName);

                    return {
                        collection: collectionName,
                        success: true,
                        recordCount: data.length
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    metadata.errors!.push(`${collectionName}: ${errorMessage}`);

                    return {
                        collection: collectionName,
                        success: false,
                        error: errorMessage
                    };
                }
            })
        );

        // Update status based on results
        const failedCount = results.filter(r => !r.success).length;
        if (failedCount === collections.length) {
            metadata.status = 'failed';
        } else if (failedCount > 0) {
            metadata.status = 'partial';
        }

        // Save metadata
        const metadataPath = path.join(backupDirPath, 'metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        // Upload metadata to GCS
        await gcs.uploadFileToGCS(metadataPath, `backups/${backupId}/metadata.json`);

        console.log(`Backup ${backupId} completed with status: ${metadata.status}`);
        results.forEach(result => {
            if (result.success) {
                console.log(`✓ ${result.collection}: ${result.recordCount} records backed up`);
            } else {
                console.log(`✗ ${result.collection}: ${result.error}`);
            }
        });

        return metadata;
    } catch (error) {
        console.error('Backup failed:', error);
        metadata.status = 'failed';
        metadata.errors!.push(error instanceof Error ? error.message : 'Unknown error');
        return metadata;
    }
};

/**
 * Restores collections from a backup
 * @param backupId The backup ID (date string)
 * @param options Restore options
 * @returns Restore results
 */
export const restoreFromBackup = async (
    backupId: string,
    options: RestoreOptions = {}
): Promise<{ success: boolean; results: CollectionBackupResult[] }> => {
    const {
        collections = COLLECTIONS,
        deleteExisting = true,
        validateData = true
    } = options;

    const backupDirPath = path.join(BACKUP_DIR, backupId);
    const results: CollectionBackupResult[] = [];

    try {
        // Check if local backup exists, if not try to download from GCS
        try {
            await fs.access(backupDirPath);
        } catch {
            console.log(`Local backup not found, downloading from GCS...`);
            await fs.mkdir(backupDirPath, { recursive: true });

            // Download metadata first
            await gcs.downloadFileFromGCS(
                `backups/${backupId}/metadata.json`,
                path.join(backupDirPath, 'metadata.json')
            );
        }

        // Restore each collection
        for (const collectionName of collections) {
            try {
                const filePath = path.join(backupDirPath, `${collectionName}.json`);

                // Check if local file exists, if not download from GCS
                try {
                    await fs.access(filePath);
                } catch {
                    console.log(`Downloading ${collectionName} from GCS...`);
                    await gcs.downloadFileFromGCS(
                        `backups/${backupId}/${collectionName}.json`,
                        filePath
                    );
                }

                // Read and parse data
                const jsonData = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(jsonData);

                if (validateData && !Array.isArray(data)) {
                    throw new Error('Invalid data format: expected array');
                }

                const collection = mongoose.connection.collection(collectionName);

                // Delete existing data if requested
                if (deleteExisting) {
                    await collection.deleteMany({});
                }

                // Insert new data
                if (data.length > 0) {
                    await collection.insertMany(data);
                }

                results.push({
                    collection: collectionName,
                    success: true,
                    recordCount: data.length
                });

                console.log(`✓ Restored ${collectionName}: ${data.length} records`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                results.push({
                    collection: collectionName,
                    success: false,
                    error: errorMessage
                });

                console.error(`✗ Failed to restore ${collectionName}: ${errorMessage}`);
            }
        }

        const success = results.every(r => r.success);
        return { success, results };
    } catch (error) {
        console.error('Restore failed:', error);
        return {
            success: false,
            results: [{
                collection: 'all',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }]
        };
    }
};

/**
 * Lists all available backups
 * @returns Array of backup metadata
 */
export const listBackups = async (): Promise<BackupMetadata[]> => {
    const backups: BackupMetadata[] = [];

    try {
        // Check local backups
        const localDirs = await fs.readdir(BACKUP_DIR);

        for (const dir of localDirs) {
            const metadataPath = path.join(BACKUP_DIR, dir, 'metadata.json');

            try {
                const metadataJson = await fs.readFile(metadataPath, 'utf8');
                const metadata = JSON.parse(metadataJson);
                metadata.source = 'local';
                backups.push(metadata);
            } catch {
                // If no metadata file, create basic metadata from directory name
                try {
                    const date = parse(dir, DATE_FORMAT, new Date());
                    if (!isNaN(date.getTime())) {
                        backups.push({
                            id: dir,
                            date,
                            collections: [],
                            size: 0,
                            status: 'completed',
                            source: 'local'
                        });
                    }
                } catch {
                    // Skip invalid directory names
                }
            }
        }
    } catch (error) {
        console.error('Error listing local backups:', error);
    }

    // TODO: Also list backups from GCS if needed

    // Sort by date (newest first)
    backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return backups;
};

/**
 * Deletes a backup
 * @param backupId The backup ID to delete
 * @param deleteFromGCS Whether to also delete from GCS
 */
export const deleteBackup = async (backupId: string, deleteFromGCS: boolean = false): Promise<void> => {
    try {
        // Delete local backup
        const backupDirPath = path.join(BACKUP_DIR, backupId);
        await fs.rm(backupDirPath, { recursive: true, force: true });
        console.log(`Deleted local backup: ${backupId}`);

        // Delete from GCS if requested
        if (deleteFromGCS) {
            // TODO: Implement GCS deletion
            console.log(`GCS deletion not yet implemented`);
        }
    } catch (error) {
        console.error(`Error deleting backup ${backupId}:`, error);
        throw error;
    }
};

/**
 * Gets details of a specific backup
 * @param backupId The backup ID
 * @returns Backup metadata or null if not found
 */
export const getBackupDetails = async (backupId: string): Promise<BackupMetadata | null> => {
    try {
        const metadataPath = path.join(BACKUP_DIR, backupId, 'metadata.json');
        const metadataJson = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(metadataJson);
    } catch {
        return null;
    }
};

/**
 * Validates backup integrity
 * @param backupId The backup ID to validate
 * @returns Validation results
 */
export const validateBackup = async (backupId: string): Promise<{
    valid: boolean;
    errors: string[];
    collections: { [key: string]: { valid: boolean; recordCount?: number; error?: string } };
}> => {
    const errors: string[] = [];
    const collections: { [key: string]: { valid: boolean; recordCount?: number; error?: string } } = {};

    try {
        const backupDirPath = path.join(BACKUP_DIR, backupId);

        // Check if backup directory exists
        try {
            await fs.access(backupDirPath);
        } catch {
            errors.push('Backup directory not found');
            return { valid: false, errors, collections };
        }

        // Check metadata
        const metadata = await getBackupDetails(backupId);
        if (!metadata) {
            errors.push('Metadata file not found');
        }

        // Validate each collection file
        for (const collectionName of COLLECTIONS) {
            try {
                const filePath = path.join(backupDirPath, `${collectionName}.json`);
                const jsonData = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(jsonData);

                if (!Array.isArray(data)) {
                    collections[collectionName] = {
                        valid: false,
                        error: 'Invalid format: not an array'
                    };
                } else {
                    collections[collectionName] = {
                        valid: true,
                        recordCount: data.length
                    };
                }
            } catch (error) {
                collections[collectionName] = {
                    valid: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }

        const allValid = Object.values(collections).every(c => c.valid) && errors.length === 0;

        return {
            valid: allValid,
            errors,
            collections
        };
    } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
        return { valid: false, errors, collections };
    }
};

// Export all functions
export default {
    createBackup,
    restoreFromBackup,
    listBackups,
    deleteBackup,
    getBackupDetails,
    validateBackup,
    COLLECTIONS,
    DATE_FORMAT
};
