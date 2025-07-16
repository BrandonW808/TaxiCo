import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { AuthService } from '@/services/auth.service';
import { ResponseUtil } from '@/utils/response';
import { AuthUtil } from '@/utils/auth';
import { config, constants } from '@/config';
import { Role } from '@/config';

// Security middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
export const corsOptions = {
  origin: config.corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

export const corsMiddleware = cors(corsOptions);

// Rate limiting
export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any HTML tags and dangerous characters
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        value[key] = sanitizeValue(value[key]);
      }
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// Validation middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    ResponseUtil.validationError(res, errors.array());
    return;
  }
  next();
};

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtil.extractTokenFromHeader(authHeader);

    if (!token) {
      ResponseUtil.unauthorized(res, 'Access token required', constants.ERROR_CODES.TOKEN_MISSING);
      return;
    }

    const user = await AuthService.validateToken(token);
    if (!user) {
      ResponseUtil.unauthorized(res, 'Invalid or expired token', constants.ERROR_CODES.INVALID_TOKEN);
      return;
    }

    req.user = user;
    req.token = token;
    req.userId = user._id;
    req.isAdmin = user.role === constants.ROLES.ADMIN;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    ResponseUtil.unauthorized(res, 'Authentication failed', constants.ERROR_CODES.INVALID_TOKEN);
  }
};

// Role-based authorization middleware
export const requireRole = (roles: Role | Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtil.unauthorized(res, 'Authentication required');
      return;
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      ResponseUtil.forbidden(res, 'Insufficient permissions', constants.ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(constants.ROLES.ADMIN);

// Customer only middleware
export const requireCustomer = requireRole(constants.ROLES.CUSTOMER);

// Driver only middleware
export const requireDriver = requireRole(constants.ROLES.DRIVER);

// Enhanced middleware for update operations
export const authenticateForUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await authenticateToken(req, res, () => {
    if (res.headersSent) return;

    try {
      const targetUserId = req.params.id || req.body.id;

      // Check if user is trying to update their own data or is admin
      if (targetUserId && targetUserId !== req.userId && !req.isAdmin) {
        ResponseUtil.forbidden(res, 'You can only update your own data', constants.ERROR_CODES.INSUFFICIENT_PERMISSIONS);
        return;
      }

      // Require recent authentication for sensitive updates
      if (req.body.password || req.body.email) {
        const tokenAge = AuthUtil.getTokenAge(req.token!);
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (tokenAge > maxAge) {
          ResponseUtil.unauthorized(res, 'Recent authentication required for sensitive updates', constants.ERROR_CODES.TOKEN_EXPIRED);
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Update authentication error:', error);
      ResponseUtil.internalError(res, 'Update authentication failed');
    }
  });
};

// Ownership validation middleware
export const validateOwnership = (req: Request, res: Response, next: NextFunction): void => {
  const resourceUserId = req.params.userId || req.body.userId;

  if (resourceUserId && resourceUserId !== req.userId && !req.isAdmin) {
    ResponseUtil.forbidden(res, 'Access denied - you can only access your own resources', constants.ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    return;
  }

  next();
};

// Logout middleware
export const logoutMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.token) {
      await AuthService.logout(req.token);
    }
    next();
  } catch (error) {
    console.error('Logout error:', error);
    next();
  }
};

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Unhandled error:', error);

  if (res.headersSent) {
    return next(error);
  }

  ResponseUtil.internalError(res, 'Internal server error', error.message);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseUtil.notFound(res, 'Route not found');
};
