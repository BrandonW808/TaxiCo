import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationQuery, PaginatedResponse } from '@/types';

export abstract class BaseService<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw new Error(`Failed to create ${this.model.modelName}: ${error}`);
    }
  }

  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    try {
      return await this.model.findById(id, null, options);
    } catch (error) {
      throw new Error(`Failed to find ${this.model.modelName} by ID: ${error}`);
    }
  }

  async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
    try {
      return await this.model.findOne(filter, null, options);
    } catch (error) {
      throw new Error(`Failed to find ${this.model.modelName}: ${error}`);
    }
  }

  async findMany(
    filter: FilterQuery<T> = {},
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      return await this.model.find(filter, null, options);
    } catch (error) {
      throw new Error(`Failed to find ${this.model.modelName}s: ${error}`);
    }
  }

  async findWithPagination(
    filter: FilterQuery<T> = {},
    pagination: PaginationQuery = {},
    options?: QueryOptions
  ): Promise<PaginatedResponse<T>> {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [data, total] = await Promise.all([
        this.model.find(filter, null, { ...options, skip, limit, sort }),
        this.model.countDocuments(filter)
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to paginate ${this.model.modelName}s: ${error}`);
    }
  }

  async update(
    id: string,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
        ...options
      });
    } catch (error) {
      throw new Error(`Failed to update ${this.model.modelName}: ${error}`);
    }
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<any> {
    try {
      return await this.model.updateMany(filter, update, options);
    } catch (error) {
      throw new Error(`Failed to update ${this.model.modelName}s: ${error}`);
    }
  }

  async delete(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Failed to delete ${this.model.modelName}: ${error}`);
    }
  }

  async deleteMany(filter: FilterQuery<T>): Promise<any> {
    try {
      return await this.model.deleteMany(filter);
    } catch (error) {
      throw new Error(`Failed to delete ${this.model.modelName}s: ${error}`);
    }
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.findOne(filter, { _id: 1 });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to check ${this.model.modelName} existence: ${error}`);
    }
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw new Error(`Failed to count ${this.model.modelName}s: ${error}`);
    }
  }
}
