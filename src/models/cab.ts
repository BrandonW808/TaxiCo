import mongoose, { Schema } from 'mongoose';
import { ICab } from '@/types';
import { constants } from '@/config';

const cabSchema = new Schema<ICab>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  registeredNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  carModel: {
    type: String,
    required: true,
    trim: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1950,
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  seatingCapacity: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'cng', 'lpg']
  },
  mileage: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    trim: true
  },
  purchasedPrice: {
    type: Number,
    min: 0
  },
  purchasedDate: {
    type: Date
  },
  insuranceExpiry: {
    type: Date
  },
  maintenanceHistory: [{
    date: {
      type: Date,
      required: true
    },
    details: {
      type: String,
      required: true,
      trim: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    odometer: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  drivers: [{
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true
    },
    departTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    totalDistance: {
      type: Number,
      min: 0,
      default: 0
    },
    totalFares: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: Object.values(constants.CAB_STATUS),
    default: constants.CAB_STATUS.AVAILABLE
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
    },
    address: {
      type: String,
      trim: true
    }
  },
  GPSEnabled: {
    type: Boolean,
    default: true
  },
  speed: {
    type: Number,
    min: 0,
    max: 200
  },
  heading: {
    type: Number,
    min: 0,
    max: 360
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  maintenanceReminder: {
    type: Date
  },
  inspectionReminder: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for geospatial queries
cabSchema.index({ location: '2dsphere' });

// Other indexes for better performance
cabSchema.index({ registeredNumber: 1 }, { unique: true });
cabSchema.index({ licensePlate: 1 }, { unique: true });
cabSchema.index({ status: 1 });
cabSchema.index({ make: 1 });
cabSchema.index({ year: 1 });
cabSchema.index({ fuelType: 1 });
cabSchema.index({ seatingCapacity: 1 });
cabSchema.index({ GPSEnabled: 1 });

// Compound indexes for common queries
cabSchema.index({ status: 1, location: '2dsphere' });
cabSchema.index({ make: 1, year: 1 });
cabSchema.index({ fuelType: 1, seatingCapacity: 1 });

const Cab = mongoose.model<ICab>('Cab', cabSchema);

export default Cab;
