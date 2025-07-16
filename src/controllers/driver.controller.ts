import { Request, Response } from 'express';
import { DriverService } from '@/services/driver.service';
import { ResponseUtil } from '@/utils/response';
import { UpdateUserData, PaginationQuery } from '@/types';

export class DriverController {
  private driverService: DriverService;

  constructor() {
    this.driverService = new DriverService();
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.userId;
      const updateData = req.body;

      if (!userId) {
        ResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      const updatedDriver = await this.driverService.updateProfile(userId, updateData);

      if (!updatedDriver) {
        ResponseUtil.notFound(res, 'Driver not found');
        return;
      }

      ResponseUtil.success(res, updatedDriver, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.message.includes('Email address already in use')) {
        ResponseUtil.conflict(res, 'Email address already in use');
      } else if (error.message.includes('Driver number already in use')) {
        ResponseUtil.conflict(res, 'Driver number already in use');
      } else {
        ResponseUtil.internalError(res, 'Failed to update profile');
      }
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.userId;

      if (!userId) {
        ResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      const driver = await this.driverService.findById(userId);

      if (!driver) {
        ResponseUtil.notFound(res, 'Driver not found');
        return;
      }

      ResponseUtil.success(res, driver, 'Driver profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      ResponseUtil.internalError(res, 'Failed to get profile');
    }
  }

  async getAllDrivers(req: Request, res: Response): Promise<void> {
    try {
      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const filter = req.query.active !== undefined ? 
        { isActive: req.query.active === 'true' } : {};

      const result = await this.driverService.findWithPagination(filter, pagination);

      ResponseUtil.success(res, result, 'Drivers retrieved successfully');
    } catch (error) {
      console.error('Get drivers error:', error);
      ResponseUtil.internalError(res, 'Failed to get drivers');
    }
  }

  async getActiveDrivers(req: Request, res: Response): Promise<void> {
    try {
      const drivers = await this.driverService.getActiveDrivers();
      ResponseUtil.success(res, drivers, 'Active drivers retrieved successfully');
    } catch (error) {
      console.error('Get active drivers error:', error);
      ResponseUtil.internalError(res, 'Failed to get active drivers');
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.userId;
      const { coordinates } = req.body;

      if (!userId) {
        ResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        ResponseUtil.badRequest(res, 'Valid coordinates [longitude, latitude] are required');
        return;
      }

      const location = {
        type: 'Point' as const,
        coordinates: coordinates as [number, number]
      };

      const updatedDriver = await this.driverService.updateLocation(userId, location);

      if (!updatedDriver) {
        ResponseUtil.notFound(res, 'Driver not found');
        return;
      }

      ResponseUtil.success(res, updatedDriver, 'Location updated successfully');
    } catch (error) {
      console.error('Update location error:', error);
      ResponseUtil.internalError(res, 'Failed to update location');
    }
  }

  async findNearbyDrivers(req: Request, res: Response): Promise<void> {
    try {
      const { coordinates, maxDistance } = req.body;

      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        ResponseUtil.badRequest(res, 'Valid coordinates [longitude, latitude] are required');
        return;
      }

      const distance = maxDistance ? parseInt(maxDistance) : 5000;
      const drivers = await this.driverService.findNearbyDrivers(coordinates, distance);

      ResponseUtil.success(res, drivers, 'Nearby drivers retrieved successfully');
    } catch (error) {
      console.error('Find nearby drivers error:', error);
      ResponseUtil.internalError(res, 'Failed to find nearby drivers');
    }
  }

  async getDriverStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.driverService.getDriverStats();
      ResponseUtil.success(res, stats, 'Driver statistics retrieved successfully');
    } catch (error) {
      console.error('Get driver stats error:', error);
      ResponseUtil.internalError(res, 'Failed to get driver statistics');
    }
  }

  async deleteDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deletedDriver = await this.driverService.delete(id);

      if (!deletedDriver) {
        ResponseUtil.notFound(res, 'Driver not found');
        return;
      }

      ResponseUtil.success(res, null, 'Driver deleted successfully');
    } catch (error) {
      console.error('Delete driver error:', error);
      ResponseUtil.internalError(res, 'Failed to delete driver');
    }
  }
}
