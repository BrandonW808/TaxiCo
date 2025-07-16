import { Request } from 'express';
import { Document } from 'mongoose';
import { Role, RideStatus, CabStatus, ErrorCode } from '@/config';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      token?: string;
      userId?: string;
      isAdmin?: boolean;
    }
  }
}

// Base interfaces for all models
export interface IUser extends Document {
  lastLogin?: Date;
  _id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomer extends IUser {
  loginAttempts?: number;
  lockUntil?: Date;
  isLocked?: boolean;
}

export interface IDriver extends IUser {
  driverNumber: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  tokens: Array<{
    token: string;
  }>;
  comparePassword(password: string): Promise<boolean>;
}

export interface ICab extends Document {
  _id: string;
  name: string;
  registeredNumber: string;
  licensePlate: string;
  carModel: string;
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
    driver: string;
    departTime: Date;
    endTime: Date;
    totalDistance: number;
    totalFares: number;
  }>;
  status: CabStatus;
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

export interface IRide extends Document {
  _id: string;
  cab: string;
  driver: string;
  customer: string;
  pickupLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  dropoffLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: RideStatus;
  requestTime: Date;
  startTime?: Date;
  endTime?: Date;
  fare?: number;
  payment?: {
    method: string;
    tip?: number;
    amountPaid?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: ErrorCode;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Service layer types
export interface CreateUserData {
  driverNumber?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  }; name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
}

// Backup types
export interface BackupMetadata {
  id: string;
  date: Date;
  collections: string[];
  size: number;
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
  source: 'local' | 'gcs' | 'both';
}

export interface CollectionBackupResult {
  collection: string;
  success: boolean;
  recordCount?: number;
  error?: string;
}

export interface RestoreOptions {
  collections?: string[];
  deleteExisting?: boolean;
  validateData?: boolean;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
