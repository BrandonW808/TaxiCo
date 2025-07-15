import mongoose, { Document, Schema } from 'mongoose';

export interface ICab extends Document {
    name: string;
    registeredNumber: string;
    licensePlate: string;
    model: string;
    make: string;
    year: number;
    color: string;
    seatingCapacity: number;
    fuelType: string;
    mileage: number;
    imageUrl?: string;
    purchasedPrice?: number;
    purchasedDate?: Date;
    insuranceExpiry?: Date;
    maintenanceHistory: Array<{
        date: Date;
        details: string;
        cost: number;
        odometer: number;
    }>;
    drivers: Array<{
        driver: mongoose.Types.ObjectId;
        departTime: Date;
        endTime: Date;
        totalDistance: number;
        totalFares: number;
    }>;
    status: 'Available' | 'On Service' | 'Maintenance' | 'Breakdown' | 'Inactive';
    location: {
        type: 'Point';
        coordinates: [number, number];
        address?: string;
    };
    GPSEnabled: boolean;
    speed?: number;
    heading?: number;
    lastUpdated: Date;
    notes?: string;
    maintenanceReminder?: Date;
    inspectionReminder?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const cabSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
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
    model: { 
        type: String, 
        required: true 
    },
    make: { 
        type: String, 
        required: true 
    },
    year: { 
        type: Number, 
        required: true 
    },
    color: { 
        type: String, 
        required: true 
    },
    seatingCapacity: { 
        type: Number, 
        required: true 
    },
    fuelType: { 
        type: String, 
        required: true 
    }, // e.g., 'Gasoline', 'Electric', 'Hybrid'
    mileage: { 
        type: Number, 
        required: true 
    },
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

export default mongoose.model<ICab>('Cab', cabSchema);
