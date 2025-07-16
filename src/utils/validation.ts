import { body, ValidationChain } from 'express-validator';
import { constants } from '@/config';

export class ValidationUtil {
  static name(): ValidationChain {
    return body('name')
      .isLength({ min: 2, max: 50 })
      .trim()
      .escape()
      .withMessage('Name must be between 2 and 50 characters');
  }

  static email(): ValidationChain {
    return body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address required');
  }

  static password(): ValidationChain {
    return body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  static optionalName(): ValidationChain {
    return body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .trim()
      .escape()
      .withMessage('Name must be between 2 and 50 characters');
  }

  static optionalEmail(): ValidationChain {
    return body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address required');
  }

  static optionalPassword(): ValidationChain {
    return body('password')
      .optional()
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  static role(): ValidationChain {
    return body('role')
      .optional()
      .isIn(Object.values(constants.ROLES))
      .withMessage(`Role must be one of: ${Object.values(constants.ROLES).join(', ')}`);
  }

  static driverNumber(): ValidationChain {
    return body('driverNumber')
      .isLength({ min: 3, max: 20 })
      .trim()
      .withMessage('Driver number must be between 3 and 20 characters');
  }

  static location(): ValidationChain[] {
    return [
      body('location.coordinates')
        .isArray({ min: 2, max: 2 })
        .withMessage('Location coordinates must be an array of [longitude, latitude]'),
      body('location.coordinates.*')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Coordinates must be valid longitude and latitude values')
    ];
  }

  static coordinates(): ValidationChain[] {
    return [
      body('coordinates')
        .isArray({ min: 2, max: 2 })
        .withMessage('Coordinates must be an array of [longitude, latitude]'),
      body('coordinates.*')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Coordinates must be valid longitude and latitude values')
    ];
  }

  static rideStatus(): ValidationChain {
    return body('status')
      .optional()
      .isIn(Object.values(constants.RIDE_STATUS))
      .withMessage(`Status must be one of: ${Object.values(constants.RIDE_STATUS).join(', ')}`);
  }

  static cabStatus(): ValidationChain {
    return body('status')
      .optional()
      .isIn(Object.values(constants.CAB_STATUS))
      .withMessage(`Status must be one of: ${Object.values(constants.CAB_STATUS).join(', ')}`);
  }

  static pagination(): ValidationChain[] {
    return [
      body('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('Page must be a positive integer'),
      body('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt()
        .withMessage('Limit must be between 1 and 100'),
      body('sortBy')
        .optional()
        .isString()
        .trim()
        .withMessage('SortBy must be a string'),
      body('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('SortOrder must be "asc" or "desc"')
    ];
  }

  // Registration validation
  static registration(): ValidationChain[] {
    return [
      this.name(),
      this.email(),
      this.password()
    ];
  }

  // Login validation
  static login(): ValidationChain[] {
    return [
      this.email(),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }

  // Update validation
  static update(): ValidationChain[] {
    return [
      this.optionalName(),
      this.optionalEmail(),
      this.optionalPassword()
    ];
  }

  // Driver registration validation
  static driverRegistration(): ValidationChain[] {
    return [
      this.name(),
      this.email(),
      this.password(),
      this.driverNumber(),
      ...this.location()
    ];
  }
}
