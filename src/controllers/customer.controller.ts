import { Request, Response } from 'express';
import { CustomerService } from '@/services/customer.service';
import { ResponseUtil } from '@/utils/response';
import { UpdateUserData, PaginationQuery } from '@/types';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.userId;
      const updateData: UpdateUserData = req.body;

      if (!userId) {
        ResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      const updatedCustomer = await this.customerService.updateProfile(userId, updateData);

      if (!updatedCustomer) {
        ResponseUtil.notFound(res, 'Customer not found');
        return;
      }

      ResponseUtil.success(res, updatedCustomer, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.message.includes('Email address already in use')) {
        ResponseUtil.conflict(res, 'Email address already in use');
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

      const customer = await this.customerService.findById(userId);

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

  async getAllCustomers(req: Request, res: Response): Promise<void> {
    try {
      const pagination: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const filter = req.query.active !== undefined ? 
        { isActive: req.query.active === 'true' } : {};

      const result = await this.customerService.findWithPagination(filter, pagination);

      ResponseUtil.success(res, result, 'Customers retrieved successfully');
    } catch (error) {
      console.error('Get customers error:', error);
      ResponseUtil.internalError(res, 'Failed to get customers');
    }
  }

  async getActiveCustomers(req: Request, res: Response): Promise<void> {
    try {
      const customers = await this.customerService.getActiveCustomers();
      ResponseUtil.success(res, customers, 'Active customers retrieved successfully');
    } catch (error) {
      console.error('Get active customers error:', error);
      ResponseUtil.internalError(res, 'Failed to get active customers');
    }
  }

  async lockCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const customer = await this.customerService.lockCustomer(id);

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

  async unlockCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const customer = await this.customerService.unlockCustomer(id);

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

  async resetLoginAttempts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.customerService.resetLoginAttempts(id);

      ResponseUtil.success(res, null, 'Login attempts reset successfully');
    } catch (error) {
      console.error('Reset login attempts error:', error);
      ResponseUtil.internalError(res, 'Failed to reset login attempts');
    }
  }

  async getCustomerStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.customerService.getCustomerStats();
      ResponseUtil.success(res, stats, 'Customer statistics retrieved successfully');
    } catch (error) {
      console.error('Get customer stats error:', error);
      ResponseUtil.internalError(res, 'Failed to get customer statistics');
    }
  }

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deletedCustomer = await this.customerService.delete(id);

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
}
