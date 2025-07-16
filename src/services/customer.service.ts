import { BaseService } from './base.service';
import { ICustomer, UpdateUserData } from '@/types';
import { AuthUtil } from '@/utils/auth';
import Customer from '@/models/customer';

export class CustomerService extends BaseService<ICustomer> {
  constructor() {
    super(Customer);
  }

  async updateProfile(id: string, updateData: UpdateUserData): Promise<ICustomer | null> {
    try {
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
        const existingCustomer = await this.findOne({
          email: updates.email,
          _id: { $ne: id }
        });

        if (existingCustomer) {
          throw new Error('Email address already in use');
        }
      }

      return await this.update(id, updates, { select: '-password' });
    } catch (error) {
      throw new Error(`Failed to update customer profile: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<ICustomer | null> {
    return await this.findOne({ email });
  }

  async findByEmailWithPassword(email: string): Promise<ICustomer | null> {
    return await this.findOne({ email }, { select: '+password' });
  }

  async getActiveCustomers(): Promise<ICustomer[]> {
    return await this.findMany({ isActive: true });
  }

  async lockCustomer(id: string): Promise<ICustomer | null> {
    return await this.update(id, { isActive: false });
  }

  async unlockCustomer(id: string): Promise<ICustomer | null> {
    return await this.update(id, { isActive: true });
  }

  async resetLoginAttempts(id: string): Promise<void> {
    try {
      await this.model.findByIdAndUpdate(id, {
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        }
      });
    } catch (error) {
      throw new Error(`Failed to reset login attempts: ${error}`);
    }
  }

  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    locked: number;
  }> {
    try {
      const [total, active, inactive] = await Promise.all([
        this.count(),
        this.count({ isActive: true }),
        this.count({ isActive: false })
      ]);

      const lockedCount = await this.model.countDocuments({
        lockUntil: { $exists: true, $gt: new Date() }
      });

      return {
        total,
        active,
        inactive,
        locked: lockedCount
      };
    } catch (error) {
      throw new Error(`Failed to get customer stats: ${error}`);
    }
  }
}
