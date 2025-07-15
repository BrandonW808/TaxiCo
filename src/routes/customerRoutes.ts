// src/routes/customerRoutes.ts
import express from 'express';
import { 
    register, 
    login, 
    update, 
    getProfile, 
    logout,
    validateRegistration,
    validateLogin
} from '../controllers/customerController';
import { 
    authenticateToken, 
    authenticateForUpdate,
    validateUpdateInput,
    logout as logoutMiddleware
} from '../middleware/auth';
import { 
    authRateLimit, 
    updateRateLimit,
    sanitizeInput
} from '../middleware/security';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', 
    authRateLimit,
    sanitizeInput,
    validateRegistration,
    register
);

router.post('/login', 
    authRateLimit,
    sanitizeInput,
    validateLogin,
    login
);

// Protected routes
router.get('/profile', 
    authenticateToken,
    getProfile
);

router.put('/update', 
    updateRateLimit,
    sanitizeInput,
    authenticateForUpdate,
    validateUpdateInput,
    update
);

router.post('/logout', 
    authenticateToken,
    logoutMiddleware,
    logout
);

export default router;
