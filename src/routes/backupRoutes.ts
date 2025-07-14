import { Router } from 'express';
import * as backupController from '../controllers/backupController';

const router = Router();

// Backup routes
router.post('/', backupController.createBackup);
router.get('/', backupController.listBackups);
router.get('/status', backupController.getBackupStatus);
router.get('/:id', backupController.getBackupDetails);
router.get('/:id/validate', backupController.validateBackup);
router.post('/:id/restore', backupController.restoreBackup);
router.delete('/:id', backupController.deleteBackup);
router.get('/:id/download', backupController.downloadBackup);

export default router;
