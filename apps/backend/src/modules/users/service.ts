import { FastifyInstance } from 'fastify';
import { UsersRepository } from './repository';
import { CreateUserRequest, UpdateUserRequest } from './schemas';
import { AppError, ValidationError } from '../../utils/errors';

export class UsersService {
  constructor(
    private repository: UsersRepository,
    private fastify: FastifyInstance
  ) {}

  // Create user with validation
  async createUser(companyId: string, data: CreateUserRequest) {
    // Validate email is unique in company
    const existingUser = await this.repository.getUserByEmail(
      data.email,
      companyId
    );

    if (existingUser) {
      throw new ValidationError('Email already exists in this company');
    }

    // TODO: Hash password before saving
    // const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.repository.createUser(companyId, data);

    // Remove password from response
    const { ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user with all details
  async getUser(userId: string, companyId: string) {
    const user = await this.repository.getUserById(userId, companyId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Remove sensitive data
    const { ...userSafe } = user;
    return userSafe;
  }

  // List users with search and filtering
  async listUsers(
    companyId: string,
    skip: number,
    take: number,
    search?: string,
    isActive?: boolean
  ) {
    return this.repository.listUsers(companyId, skip, take, search, isActive);
  }

  // Update user
  async updateUser(
    userId: string,
    companyId: string,
    data: UpdateUserRequest
  ) {
    const user = await this.repository.getUserById(userId, companyId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // If updating email, verify uniqueness
    if (data.email && data.email !== user.email) {
      const existingUser = await this.repository.getUserByEmail(
        data.email,
        companyId
      );
      if (existingUser) {
        throw new ValidationError('Email already exists in this company');
      }
    }

    const updated = await this.repository.updateUser(userId, companyId, data);

    // Remove sensitive data
    const { password, ...userSafe } = updated;
    return userSafe;
  }

  // Delete user (soft delete)
  async deleteUser(userId: string, companyId: string) {
    const user = await this.repository.getUserById(userId, companyId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // User already deleted check (can be added if needed)
    // if (!user.isActive) {
    //   throw new ValidationError('User is already deleted');
    // }

    return this.repository.deleteUser(userId, companyId);
  }

  // Assign role to user
  async assignRole(userId: string, companyId: string, roleId: string) {
    const user = await this.repository.getUserById(userId, companyId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return this.repository.assignRole(userId, companyId, roleId);
  }
}
