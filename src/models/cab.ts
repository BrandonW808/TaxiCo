import mongoose, { Document, Schema } from 'mongoose';

const cabSchema = new mongoose.Schema({
    name: String,
    registeredNumber: {
        type: String,
        unique: true, // Ensure unique registration numbers for each cab
        required: true
    },
    licensePlate: {
        type: String,
        unique: true,
        required: true
    },
    model: String,
    make: String,
    year: Number,
    color: String,
    seatingCapacity: Number,
    fuelType: String, // e.g., 'Gasoline', 'Electric', 'Hybrid'
    mileage: Number,
    imageUrl: String,
    purchasedPrice: Number,
    purchasedDate: Date,
    insuranceExpiry: Date,
    maintenanceHistory: [{  // History of maintenance checks and services
        date: Date,
        details: String,
        cost: Number,
        odometer: Number,
    }],
    drivers: [{
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
        departTime: Date,
        endTime: Date,
        totalDistance: Number, // Distance traveled during the shift
        totalFares: Number, // Total fare earned during the shift
    }],
    status: { // Current status of the cab (e.g., 'Available', 'On Service', 'Maintenance', 'Breakdown')
        type: String,
        enum: ['Available', 'On Service', 'Maintenance', 'Breakdown', 'Inactive'],
        default: 'Available'
    },
    location: { // Last known location of the cab (can be updated with GPS tracking)
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            index: '2dsphere' // Create a 2dsphere index for geospatial queries
        },
        address: String,
    },
    GPSEnabled: { type: Boolean, default: true },  // Indicates if GPS tracking is enabled for the cab
    speed: Number,  // Current speed of the cab (can be updated with GPS data, used for monitoring and optimization)
    heading: Number, // Current direction of the cab (can be updated with GPS data)
    lastUpdated: { type: Date, default: Date.now }, // Timestamp of the last update
    notes: String, // Additional notes or remarks for the cab
    maintenanceReminder: Date, // Date for the next scheduled maintenance
    inspectionReminder: Date, // Date for the next scheduled inspection  
}, { timestamps: true });

module.exports = mongoose.model('Cab', cabSchema); 