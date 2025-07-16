import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import driverRoutes from './driver.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', driverRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
