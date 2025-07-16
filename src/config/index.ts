import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/taxicodev',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  
  // Security
  bcryptSaltRounds: 12,
  maxLoginAttempts: 5,
  lockTime: 30 * 60 * 1000, // 30 minutes
  
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // limit each IP to 100 requests per windowMs
  
  // Backup
  backupSchedulerEnabled: process.env.BACKUP_SCHEDULER_ENABLED === 'true',
  backupDir: './backups',
  
  // Google Cloud Storage
  gcsProjectId: process.env.GCS_PROJECT_ID,
  gcsBucketName: process.env.GCS_BUCKET_NAME,
  gcsKeyFilename: process.env.GCS_KEY_FILENAME,
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Cookie settings
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 1000 // 1 hour
  }
};

export const constants = {
  // User roles
  ROLES: {
    CUSTOMER: 'customer',
    DRIVER: 'driver',
    ADMIN: 'admin'
  } as const,
  
  // Ride statuses
  RIDE_STATUS: {
    PENDING: 'pending',
    REQUESTED: 'requested',
    ASSIGNED: 'assigned',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  } as const,
  
  // Cab statuses
  CAB_STATUS: {
    AVAILABLE: 'Available',
    ON_SERVICE: 'On Service',
    MAINTENANCE: 'Maintenance',
    BREAKDOWN: 'Breakdown',
    INACTIVE: 'Inactive'
  } as const,
  
  // Collections for backup
  COLLECTIONS: [
    'Cab',
    'Customer',
    'Driver',
    'Ride'
  ],
  
  // API Response codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    USER_EXISTS: 'USER_EXISTS',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_MISSING: 'TOKEN_MISSING',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_REVOKED: 'TOKEN_REVOKED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND'
  } as const
};

export type Role = typeof constants.ROLES[keyof typeof constants.ROLES];
export type RideStatus = typeof constants.RIDE_STATUS[keyof typeof constants.RIDE_STATUS];
export type CabStatus = typeof constants.CAB_STATUS[keyof typeof constants.CAB_STATUS];
export type ErrorCode = typeof constants.ERROR_CODES[keyof typeof constants.ERROR_CODES];
