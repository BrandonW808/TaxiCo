// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { body, param, query, ValidationChain } from 'express-validator';

// Common validation patterns
const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    objectId: /^[0-9a-fA-F]{24}$/,
    phone: /^\+?[\d\s-()]{10,}$/
};

// Customer validation rules
export const customerValidation = {
    register: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 50 })
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage('Name must contain only letters and spaces, 2-50 characters'),
        
        body('email')
            .trim()
            .isEmail()
            .normalizeEmail()
            .matches(patterns.email)
            .withMessage('Please provide a valid email address'),
        
        body('password')
            .isLength({ min: 8, max: 128 })
            .matches(patterns.password)
            .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
        
        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            })
    ],

    login: [
        body('email')
            .trim()
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],

    update: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage('Name must contain only letters and spaces, 2-50 characters'),
        
        body('email')
            .optional()
            .trim()
            .isEmail()
            .normalizeEmail()
            .matches(patterns.email)
            .withMessage('Please provide a valid email address'),
        
        body('password')
            .optional()
            .isLength({ min: 8, max: 128 })
            .matches(patterns.password)
            .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
        
        body('currentPassword')
            .if(body('password').exists())
            .notEmpty()
            .withMessage('Current password is required when updating password')
    ]
};

// Parameter validation
export const paramValidation = {
    objectId: (paramName: string) => 
        param(paramName)
            .matches(patterns.objectId)
            .withMessage(`Invalid ${paramName} format`),
    
    userId: param('userId')
        .matches(patterns.objectId)
        .withMessage('Invalid user ID format'),
    
    customerId: param('customerId')
        .matches(patterns.objectId)
        .withMessage('Invalid customer ID format')
};

// Query validation
export const queryValidation = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        
        query('sort')
            .optional()
            .isIn(['asc', 'desc', 'name', '-name', 'email', '-email', 'createdAt', '-createdAt'])
            .withMessage('Invalid sort parameter')
    ],

    search: [
        query('q')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Search query must be 2-50 characters'),
        
        query('fields')
            .optional()
            .isIn(['name', 'email', 'all'])
            .withMessage('Invalid search fields')
    ]
};

// File validation
export const fileValidation = {
    image: [
        body('file')
            .custom((value, { req }) => {
                if (!req.file) {
                    throw new Error('Image file is required');
                }
                
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    throw new Error('Only JPEG, PNG, and GIF images are allowed');
                }
                
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (req.file.size > maxSize) {
                    throw new Error('Image size must be less than 5MB');
                }
                
                return true;
            })
    ]
};

// Custom validation middleware
export const customValidators = {
    uniqueEmail: async (value: string, { req }: { req: Request }) => {
        const Customer = require('../models/customer').default;
        const existingCustomer = await Customer.findOne({ 
            email: value,
            _id: { $ne: req.customer?._id }
        });
        
        if (existingCustomer) {
            throw new Error('Email address already in use');
        }
        
        return true;
    },

    passwordStrength: (value: string) => {
        const strength = {
            length: value.length >= 8,
            uppercase: /[A-Z]/.test(value),
            lowercase: /[a-z]/.test(value),
            numbers: /\d/.test(value),
            symbols: /[@$!%*?&]/.test(value)
        };
        
        const strengthCount = Object.values(strength).filter(Boolean).length;
        
        if (strengthCount < 4) {
            throw new Error('Password is too weak');
        }
        
        return true;
    },

    noXSS: (value: string) => {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi
        ];
        
        for (const pattern of xssPatterns) {
            if (pattern.test(value)) {
                throw new Error('Input contains potentially malicious content');
            }
        }
        
        return true;
    }
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error: any) => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));
        
        res.status(400).json({
            error: 'Validation failed',
            details: errorMessages,
            code: 'VALIDATION_ERROR'
        });
        return;
    }
    
    next();
};

// Rate limiting by field
export const rateLimitByField = (field: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    
    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.body[field] || req.query[field] || req.params[field];
        
        if (!key) {
            return next();
        }
        
        const now = Date.now();
        const record = attempts.get(key);
        
        if (!record || now > record.resetTime) {
            attempts.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        if (record.count >= maxAttempts) {
            res.status(429).json({
                error: `Too many attempts for ${field}`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
            return;
        }
        
        record.count++;
        next();
    };
};

export default {
    customerValidation,
    paramValidation,
    queryValidation,
    fileValidation,
    customValidators,
    handleValidationErrors,
    rateLimitByField
};
