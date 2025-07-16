// src/routes/customerRoutes.ts
import express from 'express';
import { create, login } from '../controllers/driverController';

const router = express.Router();

// Public routes with rate limiting
router.post('/create', create);

router.post('/login', login);

export default router;
