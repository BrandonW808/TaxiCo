import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IDriver extends Document {
    name: string;
    driverNumber: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    password: string;
    tokens: Array<{
        token: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}

const driverSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    driverNumber: { 
        type: String, 
        required: true,
        unique: true 
    },
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

// Index for geospatial queries
driverSchema.index({ location: '2dsphere' });

// Middleware to hash the password before saving the driver document
driverSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare a given password with the hashed password in the database
driverSchema.methods.comparePassword = async function (password: string) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model<IDriver>('Driver', driverSchema);
