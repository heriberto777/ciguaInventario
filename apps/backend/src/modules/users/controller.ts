import { FastifyInstance } from 'fastify';
import { UsersRepository } from './repository';
import { UsersService } from './service';
import { CreateUserSchema, UpdateUserSchema, ListUsersQuerySchema } from './schemas';
import { AppError, ValidationError } from '../../utils/errors';

export class UsersController {
  private repository: UsersRepository;
  private service: UsersService;

  constructor(private fastify: FastifyInstance) {
    this.repository = new UsersRepository(fastify.prisma);
    this.service = new UsersService(this.repository, fastify);
  }

  // List users in company
  async listUsers(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError(401, 'Company context required');
      }

      const query = ListUsersQuerySchema.parse(request.query);
      const isActiveFilter = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;
      const result = await this.service.listUsers(
        companyId,
        query.skip,
        query.take,
        query.search,
        isActiveFilter
      );

      return reply.code(200).send({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          skip: query.skip,
          take: query.take,
        },
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Get single user
  async getUser(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError(401, 'Company context required');
      }

      const { id } = request.params;
      const user = await this.service.getUser(id, companyId);

      return reply.code(200).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Create user
  async createUser(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError(401, 'Company context required');
      }

      const payload = CreateUserSchema.parse(request.body);
      const user = await this.service.createUser(companyId, payload);

      // Log audit event
      const { auditLogger } = await import('../../utils/audit-logger');
      await auditLogger.log({
        userId: request.user?.id,
        companyId,
        action: 'CREATE',
        resource: 'User',
        resourceId: user.id,
      });

      return reply.code(201).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw error;
    }
  }

  // Update user
  async updateUser(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError(401, 'Company context required');
      }

      const { id } = request.params;
      const payload = UpdateUserSchema.parse(request.body);
      const user = await this.service.updateUser(id, companyId, payload);

      // Log audit event
      const { auditLogger } = await import('../../utils/audit-logger');
      await auditLogger.log({
        userId: request.user?.id,
        companyId,
        action: 'UPDATE',
        resource: 'User',
        resourceId: user.id,
      });

      return reply.code(200).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Delete user (soft delete)
  async deleteUser(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError(401, 'Company context required');
      }

      const { id } = request.params;
      await this.service.deleteUser(id, companyId);

      // Log audit event
      const { auditLogger } = await import('../../utils/audit-logger');
      await auditLogger.log({
        userId: request.user?.id,
        companyId,
        action: 'DELETE',
        resource: 'User',
        resourceId: id,
      });

      return reply.code(200).send({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Assign role to user
  async assignRole(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError(401, 'Company context required');
      }

      const { id } = request.params;
      const { roleId } = request.body;

      if (!roleId) {
        throw new ValidationError('roleId is required');
      }

      await this.service.assignRole(id, companyId, roleId);

      // Log audit event
      const { auditLogger } = await import('../../utils/audit-logger');
      await auditLogger.log({
        userId: request.user?.id,
        companyId,
        action: 'ASSIGN_ROLE',
        resource: 'User',
        resourceId: id,
      });

      return reply.code(200).send({
        success: true,
        message: 'Role assigned successfully',
      });
    } catch (error: any) {
      throw error;
    }
  }
}
