import mongoose, { Schema } from 'mongoose';
import { IRide } from '@/types';
import { constants } from '@/config';

const rideSchema = new Schema({
  cab: {
    type: Schema.Types.ObjectId,
    ref: 'Cab',
    required: true
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
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
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  status: {
    type: String,
    enum: Object.values(constants.RIDE_STATUS),
    default: constants.RIDE_STATUS.PENDING
  },
  requestTime: {
    type: Date,
    default: Date.now
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  fare: {
    type: Number,
    min: 0
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'digital_wallet'],
      default: 'cash'
    },
    tip: {
      type: Number,
      min: 0,
      default: 0
    },
    amountPaid: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for geospatial queries
rideSchema.index({ pickupLocation: '2dsphere' });
rideSchema.index({ dropoffLocation: '2dsphere' });

// Other indexes for better performance
rideSchema.index({ status: 1 });
rideSchema.index({ customer: 1 });
rideSchema.index({ driver: 1 });
rideSchema.index({ cab: 1 });
rideSchema.index({ requestTime: -1 });
rideSchema.index({ startTime: -1 });
rideSchema.index({ endTime: -1 });

// Compound indexes for common queries
rideSchema.index({ customer: 1, status: 1 });
rideSchema.index({ driver: 1, status: 1 });
rideSchema.index({ status: 1, requestTime: -1 });

const Ride = mongoose.model<IRide>('Ride', rideSchema);

export default Ride;
