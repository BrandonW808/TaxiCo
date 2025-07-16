import { Request, Response } from 'express';
import { ResponseUtil } from '@/utils/response';
import { PaginationQuery } from '@/types';
import { AuthUtil } from '@/utils/auth';
import Driver from '@/models/driver';

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id || req.userId;
    const updateData = req.body;

    if (!userId) {
      ResponseUtil.badRequest(res, 'User ID is required');
      return;
    }

    const updates: any = {};

    // Only include fields that are present in request and allowed
    const allowedUpdates = ['name', 'email', 'password', 'driverNumber', 'location'];
    for (const field of allowedUpdates) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    }

    // Hash password if it's being updated
    if (updates.password) {
      updates.password = await AuthUtil.hashPassword(updates.password);
    }

    // Check if email is being changed and if it's already taken
    if (updates.email) {
      const existingDriver = await Driver.findOne({
        email: updates.email,
        _id: { $ne: userId }
      });

      if (existingDriver) {
        throw new Error('Email address already in use');
      }
    }

    // Check if driver number is being changed and if it's already taken
    if (updates.driverNumber) {
      const existingDriver = await Driver.findOne({
        driverNumber: updates.driverNumber,
        _id: { $ne: userId }
      });

      if (existingDriver) {
        throw new Error('Driver number already in use');
      }
    }

    const updatedDriver = await Driver.findByIdAndUpdate(userId, updates, { select: '-password' });

    ResponseUtil.success(res, updatedDriver, 'Profile updated successfully');
  } catch (error: any) {
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

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id || req.userId;

    if (!userId) {
      ResponseUtil.badRequest(res, 'User ID is required');
      return;
    }

    const driver = await Driver.findById(userId);

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

export const getAllDrivers = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagination: PaginationQuery = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };

    const filter = req.query.active !== undefined ?
      { isActive: req.query.active === 'true' } : {};

    const result = await Driver.find(filter, pagination);

    ResponseUtil.success(res, result, 'Drivers retrieved successfully');
  } catch (error) {
    console.error('Get drivers error:', error);
    ResponseUtil.internalError(res, 'Failed to get drivers');
  }
}

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
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

    const updatedDriver = await Driver.findByIdAndUpdate(userId, location);

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

export const deleteDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedDriver = await Driver.findByIdAndDelete(id);

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