import { Request, Response } from 'express';
import { ResponseUtil } from '@/utils/response';
import { PaginationQuery } from '@/types';
import Customer from '@/models/customer';
import { AuthUtil } from '@/utils/auth';

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
    const allowedUpdates = ['name', 'email', 'password'];
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
      const existingCustomer = await Customer.findOne({
        email: updates.email,
        _id: { $ne: userId }
      });

      if (existingCustomer) {
        throw new Error('Email address already in use');
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(userId, updates, { select: '-password' });

    if (!updatedCustomer) {
      ResponseUtil.notFound(res, 'Customer not found');
      return;
    }

    ResponseUtil.success(res, updatedCustomer, 'Profile updated successfully');
  } catch (error: any) {
    console.error('Update profile error:', error);
    if (error.message.includes('Email address already in use')) {
      ResponseUtil.conflict(res, 'Email address already in use');
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

    const customer = await Customer.findById(userId);

    if (!customer) {
      ResponseUtil.notFound(res, 'Customer not found');
      return;
    }

    ResponseUtil.success(res, customer, 'Customer profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    ResponseUtil.internalError(res, 'Failed to get profile');
  }
}

export const getAllCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagination: PaginationQuery = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };

    const filter = req.query.active !== undefined ?
      { isActive: req.query.active === 'true' } : {};

    const result = await Customer.find(filter, pagination);

    ResponseUtil.success(res, result, 'Customers retrieved successfully');
  } catch (error) {
    console.error('Get customers error:', error);
    ResponseUtil.internalError(res, 'Failed to get customers');
  }
}

export const getActiveCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find({ isActive: true });
    ResponseUtil.success(res, customers, 'Active customers retrieved successfully');
  } catch (error) {
    console.error('Get active customers error:', error);
    ResponseUtil.internalError(res, 'Failed to get active customers');
  }
}

export const lockCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { isActive: false });

    if (!customer) {
      ResponseUtil.notFound(res, 'Customer not found');
      return;
    }

    ResponseUtil.success(res, customer, 'Customer locked successfully');
  } catch (error) {
    console.error('Lock customer error:', error);
    ResponseUtil.internalError(res, 'Failed to lock customer');
  }
}

export const unlockCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByIdAndUpdate(id, { isActive: true });

    if (!customer) {
      ResponseUtil.notFound(res, 'Customer not found');
      return;
    }

    ResponseUtil.success(res, customer, 'Customer unlocked successfully');
  } catch (error) {
    console.error('Unlock customer error:', error);
    ResponseUtil.internalError(res, 'Failed to unlock customer');
  }
}

export const resetLoginAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await Customer.findByIdAndUpdate(id, {
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });

    ResponseUtil.success(res, null, 'Login attempts reset successfully');
  } catch (error) {
    console.error('Reset login attempts error:', error);
    ResponseUtil.internalError(res, 'Failed to reset login attempts');
  }
}

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedCustomer = await Customer.findByIdAndDelete(id);

    if (!deletedCustomer) {
      ResponseUtil.notFound(res, 'Customer not found');
      return;
    }

    ResponseUtil.success(res, null, 'Customer deleted successfully');
  } catch (error) {
    console.error('Delete customer error:', error);
    ResponseUtil.internalError(res, 'Failed to delete customer');
  }
}
