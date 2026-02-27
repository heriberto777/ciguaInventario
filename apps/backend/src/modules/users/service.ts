import { FastifyInstance } from 'fastify';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './repository';
import { CreateUserRequest, UpdateUserRequest } from './schemas';
import { AppError, ValidationError } from '../../utils/errors';

export class UsersService {
  constructor(
    private repository: UsersRepository,
    private fastify: FastifyInstance
  ) { }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.repository.createUser(companyId, {
      ...data,
      hashedPassword,
    });

    // Remove password from response
    return this.formatUserResponse(user);
  }

  // Get user with all details
  async getUser(userId: string, companyId: string) {
    const user = await this.repository.getUserById(userId, companyId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return this.formatUserResponse(user);
  }

  // List users with search and filtering
  async listUsers(
    companyId: string,
    skip: number,
    take: number,
    search?: string,
    isActive?: boolean
  ) {
    const { data, total } = await this.repository.listUsers(companyId, skip, take, search, isActive);

    return {
      data: data.map(user => this.formatUserResponse(user)),
      total
    };
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

    let hashedPassword;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const updated = await this.repository.updateUser(userId, companyId, {
      ...data,
      hashedPassword,
    });

    return this.formatUserResponse(updated);
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

  // Format response (remove sensitive data)
  private formatUserResponse(user: any) {
    const { password, ...userSafe } = user;

    // Flatten role if present (return first role's ID for simplicity in forms)
    const roleId = user.userRoles?.[0]?.roleId || user.userRoles?.[0]?.role?.id;
    const roleName = user.userRoles?.[0]?.role?.name;

    return {
      ...userSafe,
      roleId,
      roleName,
      // Simplify userRoles for the frontend
      roles: user.userRoles?.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
      })) || [],
    };
  }
}
