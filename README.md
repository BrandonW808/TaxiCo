# TaxiCo Backend - Enhanced Security Implementation

## Overview

This is the enhanced version of the TaxiCo backend application with comprehensive security improvements, particularly focused on middleware security and custom Request property handling.

## 🔒 Security Enhancements

### 1. Authentication & Authorization
- **JWT Token Management**: Environment-based secrets with token blacklisting
- **Role-based Access Control**: Admin/customer role separation
- **Account Locking**: Automatic account lockout after failed attempts
- **Update Protection**: Enhanced security for sensitive operations
- **Ownership Validation**: Users can only access their own resources

### 2. Input Validation & Sanitization
- **Comprehensive Validation**: Using express-validator for all inputs
- **XSS Protection**: Input sanitization middleware
- **SQL Injection Prevention**: Mongoose ODM with validation
- **Password Security**: Strong password requirements and hashing

### 3. Rate Limiting
- **General API Rate Limiting**: 100 requests per 15 minutes
- **Authentication Rate Limiting**: 5 attempts per 15 minutes
- **Update Rate Limiting**: 10 requests per 5 minutes
- **Email-based Rate Limiting**: Prevent brute force attacks

### 4. Security Headers & CORS
- **Helmet.js Integration**: Security headers (CSP, HSTS, etc.)
- **CORS Configuration**: Environment-based origin control
- **Cookie Security**: Secure cookie configuration

### 5. TypeScript Type Safety
- **Custom Request Properties**: Proper type definitions for `req.customer`, `req.token`, etc.
- **Type Safety**: Full TypeScript support with intellisense
- **Interface Definitions**: Comprehensive type definitions

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
# Make sure to set a secure JWT_SECRET (at least 32 characters)
```

### Environment Variables

```bash
# Required Security Variables
JWT_SECRET=your-super-secret-jwt-key-here-should-be-at-least-32-characters-long
JWT_EXPIRES_IN=1h
NODE_ENV=production
ALLOWED_ORIGINS=https://yourapp.com,https://admin.yourapp.com

# Database
MONGO_URI=mongodb://localhost:27017/taxico

# Rate Limiting (optional - defaults provided)
GENERAL_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
UPDATE_RATE_LIMIT_MAX=10
```

### Running the Application

```bash
# Development
npm run dev

# Production
npm run build
npm start

# With backup scheduler
BACKUP_SCHEDULER_ENABLED=true npm run dev
```

## 📚 API Documentation

### Authentication Routes

#### Register
```bash
POST /api/customers/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

#### Login
```bash
POST /api/customers/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Get Profile
```bash
GET /api/customers/profile
Authorization: Bearer <token>
```

#### Update Profile
```bash
PUT /api/customers/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

#### Logout
```bash
POST /api/customers/logout
Authorization: Bearer <token>
```

### Security Features in Action

#### Rate Limiting
```bash
# After 5 failed login attempts
HTTP 429 Too Many Requests
{
  "error": "Too many authentication attempts from this IP, please try again later."
}
```

#### Input Validation
```bash
# Invalid input
HTTP 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email address required",
      "value": "invalid-email"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

#### Authentication Errors
```bash
# Invalid token
HTTP 401 Unauthorized
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

## 🔧 Middleware Usage

### Basic Authentication
```typescript
import { authenticateToken } from '../middleware/auth';

router.get('/protected', authenticateToken, (req, res) => {
  const customer = req.customer;  // Type: ICustomer | undefined
  const userId = req.userId;      // Type: string | undefined
  // ...
});
```

### Protected Updates
```typescript
import { authenticateForUpdate, validateUpdateInput } from '../middleware/auth';
import { updateRateLimit } from '../middleware/security';

router.put('/update', 
  updateRateLimit,
  authenticateForUpdate,
  validateUpdateInput,
  updateController
);
```

### Admin-only Routes
```typescript
import { authenticateToken, requireAdmin } from '../middleware/auth';

router.get('/admin/users', 
  authenticateToken,
  requireAdmin,
  getUsersController
);
```

### Custom Validation
```typescript
import { customerValidation, handleValidationErrors } from '../middleware/validation';

router.post('/register',
  customerValidation.register,
  handleValidationErrors,
  registerController
);
```

## 🏗️ Project Structure

```
src/
├── controllers/
│   ├── customerController.ts    # Enhanced with validation
│   └── backupController.ts      # Backup management
├── middleware/
│   ├── auth.ts                  # Authentication & authorization
│   ├── security.ts              # Rate limiting & security headers
│   └── validation.ts            # Input validation rules
├── models/
│   ├── customer.ts              # Enhanced with security fields
│   ├── driver.ts                # Driver model
│   ├── cab.ts                   # Cab model
│   └── ride.ts                  # Ride model
├── routes/
│   ├── customerRoutes.ts        # Protected customer routes
│   └── backupRoutes.ts          # Backup routes
├── types/
│   └── express.d.ts             # Custom Request properties
└── utils/
    ├── backup.ts                # Backup utilities
    ├── backupScheduler.ts       # Scheduled backups
    └── gcs.ts                   # Google Cloud Storage
```

## 🛡️ Security Best Practices

### 1. Environment Configuration
- Never commit `.env` files
- Use strong JWT secrets (32+ characters)
- Set appropriate CORS origins
- Configure secure cookies in production

### 2. Authentication
- Implement account lockout policies
- Use strong password requirements
- Regularly rotate JWT secrets
- Implement token refresh mechanisms

### 3. Input Validation
- Validate all user inputs
- Sanitize data before processing
- Use parameterized queries
- Implement proper error handling

### 4. Rate Limiting
- Monitor rate limit hits
- Implement progressive delays
- Use distributed rate limiting in production
- Consider IP whitelisting for admin routes

### 5. Monitoring & Logging
- Log authentication attempts
- Monitor failed validations
- Track rate limit violations
- Implement security alerts

## 🧪 Testing Security

### Authentication Tests
```bash
# Test rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/customers/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Test token validation
curl -X GET http://localhost:3000/api/customers/profile \
  -H "Authorization: Bearer invalid-token"
```

### Update Protection Tests
```bash
# Test update without authentication
curl -X PUT http://localhost:3000/api/customers/update \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker"}'

# Test ownership validation
curl -X PUT http://localhost:3000/api/customers/update \
  -H "Authorization: Bearer valid-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"other-user-id","name":"Hack"}'
```

## 📋 Development Notes

### Custom Request Properties
The application properly extends Express Request interface:

```typescript
// Automatic type inference
app.get('/profile', authenticateToken, (req, res) => {
  const customer = req.customer;  // Type: ICustomer | undefined
  const token = req.token;        // Type: string | undefined
  const userId = req.userId;      // Type: string | undefined
  const isAdmin = req.isAdmin;    // Type: boolean | undefined
});
```

### Error Handling
Standardized error responses with codes:

```typescript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [...] // When applicable
}
```

## 🔄 Migration from Original

1. **Install New Dependencies**:
   ```bash
   npm install express-rate-limit express-validator helmet bcrypt jsonwebtoken cors cookie-parser
   ```

2. **Update Environment Variables**:
   - Set `JWT_SECRET` to a secure value
   - Configure `ALLOWED_ORIGINS`
   - Set rate limiting options

3. **Update Imports**:
   - Replace old middleware imports
   - Update route definitions

4. **Database Migration**:
   - New customer model fields have default values
   - Existing data remains compatible

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Add proper type definitions
3. Include security tests
4. Update documentation
5. Follow existing code patterns

## 📄 License

MIT License - See LICENSE file for details.
