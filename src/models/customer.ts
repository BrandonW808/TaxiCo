// src/models/customer.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
    _id: string;
    name: string;
    email: string;
    password: string;
    role?: 'customer' | 'admin';
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    isActive: boolean;
    loginAttempts?: number;
    lockUntil?: Date;
}

const customerSchema = new Schema({
    name: { 
        type: String, 
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: { 
        type: String, 
        required: true,
        minlength: 8,
        select: false  // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    }
}, {
    timestamps: true, // Automatically add createdAt and updatedAt
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// Virtual for account lock status
customerSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to handle login attempts
customerSchema.pre('save', function(next) {
    if (!this.isModified('loginAttempts') && !this.isNew) return next();
    
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: {
                lockUntil: 1
            },
            $set: {
                loginAttempts: 1
            }
        }, next);
    }
    
    next();
});

// Methods
customerSchema.methods.incLoginAttempts = function() {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutes
    
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: {
                lockUntil: 1
            },
            $set: {
                loginAttempts: 1
            }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock the account if we've reached max attempts
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + lockTime
        };
    }
    
    return this.updateOne(updates);
};

customerSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockUntil: 1
        }
    });
};

// Indexes for better performance
customerSchema.index({ email: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ lockUntil: 1 }, { sparse: true });

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
