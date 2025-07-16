import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { ResponseUtil } from '@/utils/response';
import { CreateUserData, LoginData } from '@/types';
import { config } from '@/config';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserData = req.body;
      const userType = req.body.userType || 'customer';
      
      const result = await AuthService.register(userData, userType);
      
      if (!result.success) {
        ResponseUtil.conflict(res, result.message);
        return;
      }

      // Set secure cookie
      if (result.token) {
        res.cookie('authToken', result.token, config.cookieOptions);
      }

      ResponseUtil.created(res, result.user, result.message);
    } catch (error) {
      console.error('Registration error:', error);
      ResponseUtil.internalError(res, 'Registration failed');
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginData = req.body;
      
      const result = await AuthService.login(loginData);
      
      if (!result.success) {
        ResponseUtil.unauthorized(res, result.message);
        return;
      }

      // Set secure cookie
      if (result.token) {
        res.cookie('authToken', result.token, config.cookieOptions);
      }

      ResponseUtil.success(res, {
        token: result.token,
        user: result.user
      }, result.message);
    } catch (error) {
      console.error('Login error:', error);
      ResponseUtil.internalError(res, 'Login failed');
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Token is revoked by the logout middleware
      res.clearCookie('authToken');
      ResponseUtil.success(res, null, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      ResponseUtil.internalError(res, 'Logout failed');
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      ResponseUtil.success(res, {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      }, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      ResponseUtil.internalError(res, 'Failed to get profile');
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.token;
      
      if (!token) {
        ResponseUtil.unauthorized(res, 'No token provided');
        return;
      }

      const result = await AuthService.refreshToken(token);
      
      if (!result.success) {
        ResponseUtil.unauthorized(res, result.message);
        return;
      }

      // Set secure cookie with new token
      if (result.token) {
        res.cookie('authToken', result.token, config.cookieOptions);
      }

      ResponseUtil.success(res, {
        token: result.token,
        user: result.user
      }, result.message);
    } catch (error) {
      console.error('Token refresh error:', error);
      ResponseUtil.internalError(res, 'Token refresh failed');
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!req.user) {
        ResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      // TODO: Implement password change logic
      // This would require finding the user with password, comparing current password,
      // and updating with new password

      ResponseUtil.success(res, null, 'Password changed successfully');
    } catch (error) {
      console.error('Change password error:', error);
      ResponseUtil.internalError(res, 'Failed to change password');
    }
  }
}
