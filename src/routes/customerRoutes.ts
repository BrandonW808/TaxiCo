import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getAllCustomers,
  getActiveCustomers,
  lockCustomer,
  unlockCustomer,
  resetLoginAttempts,
  deleteCustomer
} from '@/controllers/customerController';
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
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  getProfile
);

router.get('/profile/:id',
  authenticateToken,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  getProfile
);

router.put('/profile',
  authenticateForUpdate,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  updateProfile
);

router.put('/profile/:id',
  authenticateForUpdate,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  updateProfile
);

// Admin only routes
router.get('/all',
  authenticateToken,
  requireAdmin,
  getAllCustomers
);

router.get('/active',
  authenticateToken,
  requireAdmin,
  getActiveCustomers
);

router.post('/lock/:id',
  authenticateToken,
  requireAdmin,
  lockCustomer
);

router.post('/unlock/:id',
  authenticateToken,
  requireAdmin,
  unlockCustomer
);

router.post('/reset-login-attempts/:id',
  authenticateToken,
  requireAdmin,
  resetLoginAttempts
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  deleteCustomer
);

export default router;
