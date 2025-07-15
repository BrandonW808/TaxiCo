// src/controllers/customerController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Customer from '../models/customer';

// Get JWT secret from environment variable
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
};

// Validation rules for registration
export const validateRegistration = [
    body('name')
        .isLength({ min: 2, max: 50 })
        .trim()
        .escape()
        .withMessage('Name must be between 2 and 50 characters'),

    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email address required'),

    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

// Validation rules for login
export const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email address required'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

const register = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const { name, email, password } = req.body;

        // Check if user already exists
        const existingCustomer = await Customer.findOne({ email });
        if (existingCustomer) {
            res.status(409).json({
                error: 'Customer with this email already exists',
                code: 'USER_EXISTS'
            });
            return;
        }

        // Hash password with higher salt rounds for better security
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const customer = new Customer({
            name,
            email,
            password: hashedPassword
        });

        await customer.save();

        // Return success without sensitive data
        res.status(201).json({
            message: 'Customer created successfully',
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email
            }
        });
    } catch (error: any) {
        console.error('Registration error:', error);

        if (error.code === 11000) {
            res.status(409).json({
                error: 'Customer with this email already exists',
                code: 'USER_EXISTS'
            });
        } else {
            res.status(500).json({
                error: 'Registration failed',
                code: 'REGISTRATION_ERROR'
            });
        }
    }
};

const login = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const { email, password } = req.body;

        // Find customer and include password for comparison
        const customer = await Customer.findOne({ email }).select('+password');

        if (!customer) {
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, customer.password);

        if (!isMatch) {
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }

        // Generate JWT token with additional claims
        const tokenPayload = {
            id: customer._id,
            email: customer.email,
            role: customer.role || 'customer'
        };

        const options: SignOptions = {
            expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any,
            issuer: 'taxicom-backend',
            subject: customer._id.toString()
        };

        const token = jwt.sign(
            tokenPayload,
            getJwtSecret(),
            options
        );

        // Set secure cookie (optional, for additional security)
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                role: customer.role || 'customer'
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR'
        });
    }
};

const update = async (req: Request, res: Response): Promise<void> => {
    try {
        // The user is already authenticated by the authenticateForUpdate middleware
        const customer = req.customer;

        if (!customer) {
            res.status(404).json({
                error: 'Customer not found',
                code: 'CUSTOMER_NOT_FOUND'
            });
            return;
        }

        // Create update object with only allowed fields
        const allowedUpdates = ['name', 'email', 'password'];
        const updates: any = {};

        // Only include fields that are present in request and allowed
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        // Hash password if it's being updated
        if (updates.password) {
            const saltRounds = 12;
            updates.password = await bcrypt.hash(updates.password, saltRounds);
        }

        // Check if email is being changed and if it's already taken
        if (updates.email && updates.email !== customer.email) {
            const existingCustomer = await Customer.findOne({
                email: updates.email,
                _id: { $ne: customer._id }
            });

            if (existingCustomer) {
                res.status(409).json({
                    error: 'Email address already in use',
                    code: 'EMAIL_IN_USE'
                });
                return;
            }
        }

        // Update customer
        const updatedCustomer = await Customer.findByIdAndUpdate(
            customer._id,
            updates,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!updatedCustomer) {
            res.status(404).json({
                error: 'Customer not found',
                code: 'CUSTOMER_NOT_FOUND'
            });
            return;
        }

        res.json({
            message: 'Customer updated successfully',
            customer: updatedCustomer
        });

    } catch (error: any) {
        console.error('Update error:', error);

        if (error.code === 11000) {
            res.status(409).json({
                error: 'Email address already in use',
                code: 'EMAIL_IN_USE'
            });
        } else {
            res.status(500).json({
                error: 'Update failed',
                code: 'UPDATE_ERROR'
            });
        }
    }
};

const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const customer = req.customer;

        if (!customer) {
            res.status(404).json({
                error: 'Customer not found',
                code: 'CUSTOMER_NOT_FOUND'
            });
            return;
        }

        res.json({
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                role: customer.role || 'customer'
            }
        });

    } catch (error: any) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            code: 'PROFILE_ERROR'
        });
    }
};

const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        // Token is revoked by the logout middleware
        res.clearCookie('authToken');
        res.json({
            message: 'Logout successful'
        });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
};

export {
    register,
    login,
    update,
    getProfile,
    logout
};
