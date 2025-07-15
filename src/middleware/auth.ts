import { Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from "jsonwebtoken";
import Customer from "../models/customer";

const secret = 'my-secret'

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, secret) as JwtPayload;

        // Find customer by decoded ID
        const customer = await Customer.findById(decoded.id).select('-password');

        if (!customer) {
            res.status(401).json({ error: 'Invalid token - user not found' });
            return;
        }

        // Attach customer and token to request
        req.customer = customer;
        req.token = token;

        next();
    } catch (error) {
        if (error instanceof JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
        } else if (error instanceof TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
        } else {
            console.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
};