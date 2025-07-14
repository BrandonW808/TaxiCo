import mongoose, { Document, Schema } from 'mongoose';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const driverSchema = new mongoose.Schema({
    name: String,
    driverNumber: String,
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        }
    },
    password: {
        type: String,
        required: true,
        select: false, // Exclude password from API responses
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, { timestamps: true });

// Middleware to hash the password before saving the driver document
driverSchema.pre('save', async function (next: () => void) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare a given password with the hashed password in the database
driverSchema.methods.comparePassword = async function (password: string) {
    console.log(`Password: ${password} this.password: ${this.password}`);
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);