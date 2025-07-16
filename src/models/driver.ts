import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { IDriver } from '@/types';
import { constants, config } from '@/config';

const driverSchema = new Schema({
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
    default: constants.ROLES.DRIVER
  },
  isActive: {
    type: Boolean,
    default: true
  },
  driverNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0]
    }
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.tokens;
      return ret;
    }
  }
});

// Index for geospatial queries
driverSchema.index({ location: '2dsphere' });

// Other indexes for better performance
driverSchema.index({ email: 1 }, { unique: true });
driverSchema.index({ driverNumber: 1 }, { unique: true });
driverSchema.index({ isActive: 1 });
driverSchema.index({ role: 1 });

// Middleware to hash the password before saving
driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, config.bcryptSaltRounds);
  next();
});

// Method to compare a given password with the hashed password
driverSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

const Driver = mongoose.model<IDriver>('Driver', driverSchema);

export default Driver;
