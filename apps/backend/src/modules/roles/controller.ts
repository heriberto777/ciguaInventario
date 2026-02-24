import { FastifyInstance } from 'fastify';
import { RolesRepository } from './repository';
import { RolesService } from './service';
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  ListRolesQuerySchema,
  AssignPermissionsSchema,
} from './schemas';
import { AppError, ValidationError } from '../../utils/errors';

export class RolesController {
  private repository: RolesRepository;
  private service: RolesService;

  constructor(private fastify: FastifyInstance) {
    this.repository = new RolesRepository(fastify.prisma);
    this.service = new RolesService(this.repository, fastify);
  }

  // List roles
  async listRoles(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      const query = ListRolesQuerySchema.parse(request.query);
      const result = await this.service.listRoles(
        companyId,
        query.skip,
        query.take,
        query.search,
        query.isActive
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

  // Get single role
  async getRole(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      const { id } = request.params;
      const role = await this.service.getRole(id, companyId);

      return reply.code(200).send({
        success: true,
        data: role,
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Create role
  async createRole(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      const payload = CreateRoleSchema.parse(request.body);
      const role = await this.service.createRole(companyId, payload);

      await this.fastify.auditLog(
        request.user?.id,
        companyId,
        'CREATE',
        'Role',
        role.id
      );

      return reply.code(201).send({
        success: true,
        data: role,
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Update role
  async updateRole(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      const { id } = request.params;
      const payload = UpdateRoleSchema.parse(request.body);
      const role = await this.service.updateRole(id, companyId, payload);

      await this.fastify.auditLog(
        request.user?.id,
        companyId,
        'UPDATE',
        'Role',
        role.id
      );

      return reply.code(200).send({
        success: true,
        data: role,
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Delete role
  async deleteRole(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      const { id } = request.params;
      await this.service.deleteRole(id, companyId);

      await this.fastify.auditLog(
        request.user?.id,
        companyId,
        'DELETE',
        'Role',
        id
      );

      return reply.code(200).send({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Assign permissions
  async assignPermissions(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      const { id } = request.params;
      const payload = AssignPermissionsSchema.parse(request.body);
      const role = await this.service.assignPermissions(
        id,
        companyId,
        payload.permissionIds
      );

      await this.fastify.auditLog(
        request.user?.id,
        companyId,
        'ASSIGN_PERMISSIONS',
        'Role',
        id
      );

      return reply.code(200).send({
        success: true,
        data: role,
        message: 'Permissions assigned successfully',
      });
    } catch (error: any) {
      throw error;
    }
  }

  // Get available permissions
  async getAvailablePermissions(request: any, reply: any) {
    try {
      const permissions = await this.service.getAvailablePermissions();

      return reply.code(200).send({
        success: true,
        data: permissions,
      });
    } catch (error: any) {
      throw error;
    }
  }
}
