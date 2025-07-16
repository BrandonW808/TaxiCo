import { Router } from 'express';
import { DriverController } from '@/controllers/driver.controller';
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
const driverController = new DriverController();

// Profile routes
router.get('/profile',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  driverController.getProfile.bind(driverController)
);

router.get('/profile/:id',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  driverController.getProfile.bind(driverController)
);

router.put('/profile',
  authenticateForUpdate,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  driverController.updateProfile.bind(driverController)
);

router.put('/profile/:id',
  authenticateForUpdate,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.update(),
  handleValidationErrors,
  driverController.updateProfile.bind(driverController)
);

// Location routes
router.put('/location',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.coordinates(),
  handleValidationErrors,
  driverController.updateLocation.bind(driverController)
);

router.put('/location/:id',
  authenticateToken,
  requireRole([constants.ROLES.DRIVER, constants.ROLES.ADMIN]),
  ValidationUtil.coordinates(),
  handleValidationErrors,
  driverController.updateLocation.bind(driverController)
);

// Search routes
router.post('/nearby',
  authenticateToken,
  ValidationUtil.coordinates(),
  handleValidationErrors,
  driverController.findNearbyDrivers.bind(driverController)
);

// Admin only routes
router.get('/all',
  authenticateToken,
  requireAdmin,
  driverController.getAllDrivers.bind(driverController)
);

router.get('/active',
  authenticateToken,
  requireAdmin,
  driverController.getActiveDrivers.bind(driverController)
);

router.get('/stats',
  authenticateToken,
  requireAdmin,
  driverController.getDriverStats.bind(driverController)
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  driverController.deleteDriver.bind(driverController)
);

export default router;
