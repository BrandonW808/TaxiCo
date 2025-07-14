import { Request, Response } from 'express';
import * as backupService from '../utils/backup';

/**
 * Creates a new backup
 * POST /api/backup
 * Body: { collections?: string[] }
 */
export const createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { collections } = req.body;
        
        const metadata = await backupService.createBackup(collections);
        
        res.status(201).json({
            success: true,
            message: `Backup ${metadata.id} created successfully`,
            backup: metadata
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create backup',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Lists all available backups
 * GET /api/backup
 */
export const listBackups = async (_req: Request, res: Response): Promise<void> => {
    try {
        const backups = await backupService.listBackups();
        
        res.json({
            success: true,
            count: backups.length,
            backups
        });
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list backups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Gets details of a specific backup
 * GET /api/backup/:id
 */
export const getBackupDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const backup = await backupService.getBackupDetails(id);
        
        if (!backup) {
            res.status(404).json({
                success: false,
                message: `Backup ${id} not found`
            });
            return;
        }
        
        res.json({
            success: true,
            backup
        });
    } catch (error) {
        console.error('Error getting backup details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get backup details',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Validates a backup
 * GET /api/backup/:id/validate
 */
export const validateBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const validation = await backupService.validateBackup(id);
        
        res.json({
            success: true,
            backupId: id,
            validation
        });
    } catch (error) {
        console.error('Error validating backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate backup',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Restores from a backup
 * POST /api/backup/:id/restore
 * Body: { collections?: string[], deleteExisting?: boolean, validateData?: boolean }
 */
export const restoreBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { collections, deleteExisting = true, validateData = true } = req.body;
        
        // Validate backup exists
        const backup = await backupService.getBackupDetails(id);
        if (!backup) {
            res.status(404).json({
                success: false,
                message: `Backup ${id} not found`
            });
            return;
        }
        
        // Perform restore
        const result = await backupService.restoreFromBackup(id, {
            collections,
            deleteExisting,
            validateData
        });
        
        res.json({
            success: result.success,
            message: result.success 
                ? `Successfully restored from backup ${id}`
                : `Failed to restore from backup ${id}`,
            results: result.results,
            restoredAt: new Date()
        });
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore backup',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Deletes a backup
 * DELETE /api/backup/:id
 * Query params: ?deleteFromGCS=true/false
 */
export const deleteBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleteFromGCS = req.query.deleteFromGCS === 'true';
        
        await backupService.deleteBackup(id, deleteFromGCS);
        
        res.json({
            success: true,
            message: `Backup ${id} deleted successfully`,
            deletedFromGCS: deleteFromGCS
        });
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete backup',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Gets backup system status and statistics
 * GET /api/backup/status
 */
export const getBackupStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
        const backups = await backupService.listBackups();
        
        // Calculate statistics
        const totalBackups = backups.length;
        const successfulBackups = backups.filter(b => b.status === 'completed').length;
        const partialBackups = backups.filter(b => b.status === 'partial').length;
        const failedBackups = backups.filter(b => b.status === 'failed').length;
        const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
        
        const latestBackup = backups[0] || null;
        
        res.json({
            success: true,
            status: {
                totalBackups,
                successfulBackups,
                partialBackups,
                failedBackups,
                totalSizeBytes: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                latestBackup: latestBackup ? {
                    id: latestBackup.id,
                    date: latestBackup.date,
                    status: latestBackup.status
                } : null,
                collections: backupService.COLLECTIONS
            }
        });
    } catch (error) {
        console.error('Error getting backup status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get backup status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Downloads a backup file
 * GET /api/backup/:id/download
 * Query params: ?collection=CollectionName (optional, downloads all if not specified)
 */
export const downloadBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { collection } = req.query;
        
        // Implementation would depend on how you want to serve files
        // This is a placeholder
        res.status(501).json({
            success: false,
            message: 'Download functionality not yet implemented'
        });
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download backup',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
