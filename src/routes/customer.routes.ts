import { Router } from 'express';
import { CustomerController } from '@/controllers/customer.controller';
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
const customerController = new CustomerController();

// Profile routes
router.get('/profile',
  authenticateToken,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  customerController.getProfile.bind(customerController)
);

router.get('/profile/:id',
  authenticateToken,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  customerController.getProfile.bind(customerController)
);

router.put('/profile',
  authenticateForUpdate,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  customerController.updateProfile.bind(customerController)
);

router.put('/profile/:id',
  authenticateForUpdate,
  requireRole([constants.ROLES.CUSTOMER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  customerController.updateProfile.bind(customerController)
);

// Admin only routes
router.get('/all',
  authenticateToken,
  requireAdmin,
  customerController.getAllCustomers.bind(customerController)
);

router.get('/active',
  authenticateToken,
  requireAdmin,
  customerController.getActiveCustomers.bind(customerController)
);

router.post('/lock/:id',
  authenticateToken,
  requireAdmin,
  customerController.lockCustomer.bind(customerController)
);

router.post('/unlock/:id',
  authenticateToken,
  requireAdmin,
  customerController.unlockCustomer.bind(customerController)
);

router.post('/reset-login-attempts/:id',
  authenticateToken,
  requireAdmin,
  customerController.resetLoginAttempts.bind(customerController)
);

router.get('/stats',
  authenticateToken,
  requireAdmin,
  customerController.getCustomerStats.bind(customerController)
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  customerController.deleteCustomer.bind(customerController)
);

export default router;
