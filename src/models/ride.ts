// models/driver.js
import mongoose, { Document, Schema } from 'mongoose';

// Ride Schema
const rideSchema = new mongoose.Schema({
    cab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cab'
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    pickupLocation: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    dropoffLocation: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    status: {
        type: String,
        enum: ['pending', 'requested', 'assigned', 'completed', 'cancelled'],
        default: 'pending'
    },
    requestTime: {
        type: Date,
        default: Date.now
    },

    startTime: Date,
    endTime: Date,
    fare: Number,
    payment: {
        method
            : { type: String },
        tip: { type: Number },
        amountPaid: { type: Number },
    }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema); 