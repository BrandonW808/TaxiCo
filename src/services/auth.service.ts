import { AuthUtil, TokenBlacklist } from '@/utils/auth';
import { constants } from '@/config';
import { CreateUserData, LoginData, AuthResponse, IUser } from '@/types';
import Customer from '@/models/customer';
import Driver from '@/models/driver';

export class AuthService {
  static async register(userData: CreateUserData, userType: 'customer' | 'driver' = 'customer'): Promise<AuthResponse> {
    try {
      const { name, email, password, role = userType } = userData;

      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await AuthUtil.hashPassword(password);

      // Create user based on type
      let user: IUser;
      if (userType === 'driver') {
        user = new Driver({
          name,
          email,
          password: hashedPassword,
          role: constants.ROLES.DRIVER,
          driverNumber: userData.driverNumber || this.generateDriverNumber(),
          location: userData.location || { type: 'Point', coordinates: [0, 0] }
        });
      } else {
        user = new Customer({
          name,
          email,
          password: hashedPassword,
          role: role || constants.ROLES.CUSTOMER
        });
      }

      await user.save();

      // Generate token
      const token = AuthUtil.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error}`);
    }
  }

  static async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      const { email, password } = loginData;

      // Find user by email
      const user = await this.findUserByEmail(email, true);
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check if account is locked (for customers)
      if (user.$model.name === 'Customer' && (user as any).isLocked) {
        return {
          success: false,
          message: 'Account is locked due to too many failed login attempts'
        };
      }

      // Compare password
      const isMatch = await AuthUtil.comparePassword(password, user.password);
      if (!isMatch) {
        // Increment login attempts for customers
        if (user.$model.name === 'Customer') {
          await (user as any).incLoginAttempts();
        }
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Reset login attempts for customers
      if (user.$model.name === 'Customer') {
        await (user as any).resetLoginAttempts();
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = AuthUtil.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error(`Login failed: ${error}`);
    }
  }

  static async logout(token: string): Promise<void> {
    try {
      TokenBlacklist.add(token);
    } catch (error) {
      throw new Error(`Logout failed: ${error}`);
    }
  }

  static async validateToken(token: string): Promise<IUser | null> {
    try {
      // Check if token is blacklisted
      if (TokenBlacklist.has(token)) {
        return null;
      }

      // Verify token
      const decoded = AuthUtil.verifyToken(token);
      if (!decoded.id) {
        return null;
      }

      // Find user
      const user = await this.findUserById(decoded.id);
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  static async refreshToken(token: string): Promise<AuthResponse> {
    try {
      const user = await this.validateToken(token);
      if (!user) {
        return {
          success: false,
          message: 'Invalid token'
        };
      }

      // Generate new token
      const newToken = AuthUtil.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      // Blacklist old token
      TokenBlacklist.add(token);

      return {
        success: true,
        message: 'Token refreshed successfully',
        token: newToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error}`);
    }
  }

  private static async findUserByEmail(email: string, includePassword: boolean = false): Promise<IUser | null> {
    // Try to find in customers first
    let user = await Customer.findOne({ email })
      .select(includePassword ? '+password' : '')
      .lean();

    if (!user) {
      // Try to find in drivers
      user = await Driver.findOne({ email })
        .select(includePassword ? '+password' : '')
        .lean();
    }

    return user;
  }

  private static async findUserById(id: string): Promise<IUser | null> {
    // Try to find in customers first
    let user = await Customer.findById(id).lean();

    if (!user) {
      // Try to find in drivers
      user = await Driver.findById(id).lean();
    }

    return user;
  }

  private static generateDriverNumber(): string {
    return 'DRV' + Date.now().toString().slice(-8);
  }
}
