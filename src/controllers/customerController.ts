// src/controllers/customerController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Customer from '../models/customer';

const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const customer = new Customer({ name, email, password: hashedPassword });
        await customer.save();
        res.status(201).json({ message: 'Customer created successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const customer = await Customer.findOne({ email });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        res.json({ token });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export { register, login };