import { Request, Response } from 'express';
import Driver from '../models/driver';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

// Get JWT secret from environment variable
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
};

export const create = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = new Driver({
            name: req.body.name,
            email: req.body.email,
            driverNumber: req.body.number,
            password: req.body.password,
        });

        await driver.save();

        // Return success without sensitive data
        res.status(201).json({
            message: 'Customer created successfully',
            customer: {
                id: driver._id,
                name: driver.name,
                email: driver.email
            }
        });
    } catch (error) {
        console.error('Error creating driver:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create driver',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find customer and include password for comparison
        const driver = await Driver.findOne({ email }).select('+password');

        if (!driver) {
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, driver.password);

        if (!isMatch) {
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }

        // Generate JWT token with additional claims
        const tokenPayload = {
            id: driver._id,
            email: driver.email,
            role: 'driver'
        };


        const token = jwt.sign(
            tokenPayload,
            getJwtSecret(),
            {}
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
                id: driver._id,
                name: driver.name,
                email: driver.email,
                role: 'driver'
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