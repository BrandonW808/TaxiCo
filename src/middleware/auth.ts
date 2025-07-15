// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import Customer from "../models/customer";

// Get JWT secret from environment variable with fallback
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
};

// Token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

        if (!token) {
            res.status(401).json({ 
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
            return;
        }

        // Check if token is blacklisted
        if (tokenBlacklist.has(token)) {
            res.status(401).json({ 
                error: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
            return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

        // Validate token payload
        if (!decoded.id || !decoded.iat || !decoded.exp) {
            res.status(401).json({ 
                error: 'Invalid token payload',
                code: 'INVALID_TOKEN_PAYLOAD'
            });
            return;
        }

        // Check if token is expired (additional check)
        if (decoded.exp * 1000 < Date.now()) {
            res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }

        // Find customer by decoded ID
        const customer = await Customer.findById(decoded.id)
            .select('-password')
            .lean();

        if (!customer) {
            res.status(401).json({ 
                error: 'Invalid token - user not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }

        // Attach customer info to request
        req.customer = customer;
        req.token = token;
        req.userId = decoded.id;
        req.isAdmin = decoded.role === 'admin';

        next();
    } catch (error) {
        if (error instanceof JsonWebTokenError) {
            res.status(401).json({ 
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        } else if (error instanceof TokenExpiredError) {
            res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            console.error('Authentication error:', error);
            res.status(500).json({ 
                error: 'Authentication failed',
                code: 'AUTH_ERROR'
            });
        }
    }
};

// Enhanced middleware for update operations
export const authenticateForUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First run standard authentication
    await authenticateToken(req, res, () => {
        // If authentication passed, continue with update-specific checks
        if (res.headersSent) return;

        try {
            // Check if user is trying to update their own data
            const targetUserId = req.params.id || req.body.id;
            
            if (targetUserId && targetUserId !== req.userId && !req.isAdmin) {
                res.status(403).json({ 
                    error: 'Insufficient permissions to update this resource',
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
                return;
            }

            // Additional security checks for sensitive operations
            if (req.body.password || req.body.email) {
                // Require recent authentication for sensitive updates
                const decoded = jwt.decode(req.token!) as JwtPayload;
                const tokenAge = Date.now() - (decoded.iat! * 1000);
                const maxAge = 30 * 60 * 1000; // 30 minutes

                if (tokenAge > maxAge) {
                    res.status(401).json({ 
                        error: 'Recent authentication required for sensitive updates',
                        code: 'RECENT_AUTH_REQUIRED'
                    });
                    return;
                }
            }

            next();
        } catch (error) {
            console.error('Update authentication error:', error);
            res.status(500).json({ 
                error: 'Update authentication failed',
                code: 'UPDATE_AUTH_ERROR'
            });
        }
    });
};

// Admin-only middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAdmin) {
        res.status(403).json({ 
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
        return;
    }
    next();
};

// Middleware to validate user ownership
export const validateOwnership = (req: Request, res: Response, next: NextFunction): void => {
    const resourceUserId = req.params.userId || req.body.userId;
    
    if (resourceUserId && resourceUserId !== req.userId && !req.isAdmin) {
        res.status(403).json({ 
            error: 'Access denied - you can only access your own resources',
            code: 'OWNERSHIP_VIOLATION'
        });
        return;
    }
    
    next();
};

// Validation rules for update operations
export const validateUpdateInput = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 50 })
        .trim()
        .escape()
        .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email address required'),
    
    body('password')
        .optional()
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    
    // Custom validation middleware
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
                code: 'VALIDATION_ERROR'
            });
            return;
        }
        next();
    }
];

// Token revocation function
export const revokeToken = (token: string): void => {
    tokenBlacklist.add(token);
    
    // In production, you might want to store this in Redis with TTL
    // or in a database with cleanup job
    setTimeout(() => {
        tokenBlacklist.delete(token);
    }, 24 * 60 * 60 * 1000); // Remove after 24 hours
};

// Logout middleware
export const logout = (req: Request, res: Response, next: NextFunction): void => {
    if (req.token) {
        revokeToken(req.token);
    }
    next();
};
