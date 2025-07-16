import { Router } from 'express';
import { AuthController } from '@/controllers/authController';
import { ValidationUtil } from '@/utils/validation';
import {
  handleValidationErrors,
  authenticateToken,
  logoutMiddleware
} from '@/middleware';

const router = Router();

// Registration routes
router.post('/register/customer',
  ValidationUtil.registration(),
  handleValidationErrors,
  AuthController.register
);

router.post('/register/driver',
  ValidationUtil.driverRegistration(),
  handleValidationErrors,
  AuthController.register
);

// Login route
router.post('/login',
  ValidationUtil.login(),
  handleValidationErrors,
  AuthController.login
);

// Logout route
router.post('/logout',
  authenticateToken,
  logoutMiddleware,
  AuthController.logout
);

// Profile routes
router.get('/profile',
  authenticateToken,
  AuthController.getProfile
);

// Token refresh route
router.post('/refresh',
  authenticateToken,
  AuthController.refreshToken
);

// Password change route
router.post('/change-password',
  authenticateToken,
  ValidationUtil.optionalPassword(),
  handleValidationErrors,
  AuthController.changePassword
);

export default router;
