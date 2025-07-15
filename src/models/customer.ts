// src/models/customer.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
    _id: string;
    name: string;
    email: string;
    password: string;
}

const customerSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;