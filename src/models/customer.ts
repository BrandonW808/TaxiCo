import mongoose, { Schema } from 'mongoose';
import { ICustomer } from '../types';
import { constants, config } from '@/config';

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
    select: false
  },
  role: {
    type: String,
    enum: Object.values(constants.ROLES),
    default: constants.ROLES.CUSTOMER
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
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Virtual for account lock status
customerSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && new Date(this.lockUntil).getTime() > Date.now());
});

// Pre-save middleware to handle login attempts
customerSchema.pre('save', function (next) {
  if (!this.isModified('loginAttempts') && !this.isNew) return next();

  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && new Date(this.lockUntil).getTime() < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    }, next);
  }

  next();
});

// Instance methods
customerSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  // Lock the account if we've reached max attempts
  if (this.loginAttempts + 1 >= config.maxLoginAttempts && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + config.lockTime
    };
  }

  return this.updateOne(updates);
};

customerSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Indexes for better performance
customerSchema.index({ email: 1 }, { unique: true });
customerSchema.index({ isActive: 1 });
customerSchema.index({ lockUntil: 1 }, { sparse: true });
customerSchema.index({ role: 1 });

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
