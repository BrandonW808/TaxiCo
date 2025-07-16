# TaxiCo Backend

A clean, modern, and scalable backend for a taxi booking application built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- **Clean Architecture**: Organized with proper separation of concerns
- **TypeScript**: Full type safety throughout the application
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Unified Services**: Consistent service layer pattern
- **Validation**: Comprehensive input validation using express-validator
- **Error Handling**: Centralized error handling with consistent API responses
- **Security**: Helmet, CORS, rate limiting, and input sanitization
- **Database**: MongoDB with Mongoose ODM
- **Geospatial**: Location-based queries for drivers and rides
- **Backup System**: Automated backup functionality (from original code)

## 🏗️ Project Structure

```
src/
├── config/           # Configuration and constants
├── controllers/      # Route handlers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic layer
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

## 🔧 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```
   PORT=3000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/taxicodev
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=1h
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Other Commands
```bash
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm test             # Run tests
npm run backup       # Create backup
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register/customer` - Register a new customer
- `POST /api/auth/register/driver` - Register a new driver
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Customers
- `GET /api/customers/profile` - Get customer profile
- `PUT /api/customers/profile` - Update customer profile
- `GET /api/customers/all` - Get all customers (Admin only)
- `GET /api/customers/active` - Get active customers (Admin only)
- `POST /api/customers/lock/:id` - Lock customer account (Admin only)
- `POST /api/customers/unlock/:id` - Unlock customer account (Admin only)
- `GET /api/customers/stats` - Get customer statistics (Admin only)

### Drivers
- `GET /api/drivers/profile` - Get driver profile
- `PUT /api/drivers/profile` - Update driver profile
- `PUT /api/drivers/location` - Update driver location
- `POST /api/drivers/nearby` - Find nearby drivers
- `GET /api/drivers/all` - Get all drivers (Admin only)
- `GET /api/drivers/active` - Get active drivers (Admin only)
- `GET /api/drivers/stats` - Get driver statistics (Admin only)

### Health Check
- `GET /api/health` - Health check endpoint

## 🏛️ Architecture Improvements

### What Was Cleaned Up

1. **Unified Configuration**: All configuration moved to `src/config/index.ts`
2. **Service Layer**: Business logic extracted to service classes
3. **Consistent Error Handling**: Unified error responses using `ResponseUtil`
4. **Validation Utilities**: Reusable validation chains
5. **Auth Utilities**: Centralized authentication logic
6. **Type Safety**: Comprehensive TypeScript interfaces
7. **Clean Models**: Improved model definitions with proper indexing
8. **Middleware Organization**: All middleware in one place
9. **Route Organization**: Clean, RESTful route structure
10. **Response Standardization**: Consistent API response format

### Key Changes Made

- **Removed Code Duplication**: Common patterns extracted to utilities
- **Improved Type Safety**: Better TypeScript interfaces and types
- **Enhanced Security**: Better token management and validation
- **Cleaner Structure**: Organized into logical modules
- **Error Handling**: Consistent error responses across all endpoints
- **Validation**: Centralized validation rules
- **Service Layer**: Business logic separated from controllers

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for customers, drivers, and admins
- **Account Locking**: Automatic account locking after failed login attempts
- **Input Sanitization**: XSS protection and input cleaning
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers

## 📊 Models

### Customer
- Personal information (name, email)
- Authentication (password, login attempts, account locking)
- Role-based permissions

### Driver
- Personal information (name, email, driver number)
- Location tracking (GeoJSON Point)
- Authentication tokens
- Active status

### Ride
- Trip details (pickup, dropoff locations)
- Status tracking (pending, assigned, completed, etc.)
- Payment information
- Customer and driver references

### Cab
- Vehicle information (make, model, year, etc.)
- Location tracking
- Maintenance history
- Driver assignments
- Status management

## 🔄 Migration from Original Code

The original code has been significantly refactored to:
- Remove duplicate code patterns
- Improve consistency across the codebase
- Add proper error handling
- Enhance type safety
- Organize code into logical modules
- Add comprehensive validation
- Improve security practices

The functionality remains the same while providing a much cleaner and more maintainable codebase.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.
