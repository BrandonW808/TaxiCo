import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateLocation,
  getAllDrivers,
  deleteDriver
} from '@/controllers/driverController';
import { ValidationUtil } from '@/utils/validation';
import {
  handleValidationErrors,
  authenticateToken,
  authenticateForUpdate,
  requireAdmin,
  requireRole
} from '@/middleware';
import { constants } from '@/config';

const router = Router();

// Profile routes
router.get('/profile',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  getProfile
);

router.get('/profile/:id',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  getProfile
);

router.put('/profile',
  authenticateForUpdate,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  updateProfile
);

router.put('/profile/:id',
  authenticateForUpdate,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  updateProfile
);

// Location routes
router.put('/location',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.coordinates(),
  handleValidationErrors,
  updateLocation
);

router.put('/location/:id',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.coordinates(),
  handleValidationErrors,
  updateLocation
);

// Admin only routes
router.get('/all',
  authenticateToken,
  requireAdmin,
  getAllDrivers
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  deleteDriver
);

export default router;
