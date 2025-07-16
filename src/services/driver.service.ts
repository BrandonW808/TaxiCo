import { BaseService } from './base.service';
import { IDriver, UpdateUserData } from '@/types';
import { AuthUtil } from '@/utils/auth';
import Driver from '@/models/driver';

export class DriverService extends BaseService<IDriver> {
  constructor() {
    super(Driver);
  }

  async updateProfile(id: string, updateData: UpdateUserData & { 
    driverNumber?: string; 
    location?: { type: 'Point'; coordinates: [number, number] };
  }): Promise<IDriver | null> {
    try {
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
        const existingDriver = await this.findOne({
          email: updates.email,
          _id: { $ne: id }
        });

        if (existingDriver) {
          throw new Error('Email address already in use');
        }
      }

      // Check if driver number is being changed and if it's already taken
      if (updates.driverNumber) {
        const existingDriver = await this.findOne({
          driverNumber: updates.driverNumber,
          _id: { $ne: id }
        });

        if (existingDriver) {
          throw new Error('Driver number already in use');
        }
      }

      return await this.update(id, updates, { select: '-password' });
    } catch (error) {
      throw new Error(`Failed to update driver profile: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<IDriver | null> {
    return await this.findOne({ email });
  }

  async findByEmailWithPassword(email: string): Promise<IDriver | null> {
    return await this.findOne({ email }, { select: '+password' });
  }

  async findByDriverNumber(driverNumber: string): Promise<IDriver | null> {
    return await this.findOne({ driverNumber });
  }

  async getActiveDrivers(): Promise<IDriver[]> {
    return await this.findMany({ isActive: true });
  }

  async updateLocation(id: string, location: { type: 'Point'; coordinates: [number, number] }): Promise<IDriver | null> {
    return await this.update(id, { location });
  }

  async findNearbyDrivers(
    coordinates: [number, number],
    maxDistance: number = 5000 // 5km in meters
  ): Promise<IDriver[]> {
    try {
      return await this.model.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates
            },
            $maxDistance: maxDistance
          }
        },
        isActive: true
      });
    } catch (error) {
      throw new Error(`Failed to find nearby drivers: ${error}`);
    }
  }

  async addToken(id: string, token: string): Promise<IDriver | null> {
    return await this.update(id, {
      $push: { tokens: { token } }
    });
  }

  async removeToken(id: string, token: string): Promise<IDriver | null> {
    return await this.update(id, {
      $pull: { tokens: { token } }
    });
  }

  async clearTokens(id: string): Promise<IDriver | null> {
    return await this.update(id, {
      $set: { tokens: [] }
    });
  }

  async getDriverStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    try {
      const [total, active, inactive] = await Promise.all([
        this.count(),
        this.count({ isActive: true }),
        this.count({ isActive: false })
      ]);

      return {
        total,
        active,
        inactive
      };
    } catch (error) {
      throw new Error(`Failed to get driver stats: ${error}`);
    }
  }
}
