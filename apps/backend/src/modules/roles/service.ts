import { FastifyInstance } from 'fastify';
import { RolesRepository } from './repository';
import { CreateRoleRequest, UpdateRoleRequest } from './schemas';
import { AppError, ValidationError } from '../../utils/errors';

export class RolesService {
  constructor(
    private repository: RolesRepository,
    private fastify: FastifyInstance
  ) {}

  // Create role
  async createRole(companyId: string, data: CreateRoleRequest) {
    // Validate role name is unique in company
    const existingRole = await this.fastify.prisma.role.findFirst({
      where: {
        name: data.name,
        companyId,
      },
    });

    if (existingRole) {
      throw new ValidationError('Role name already exists in this company');
    }

    // Verify permissions exist
    if (data.permissionIds.length === 0) {
      throw new ValidationError('At least one permission is required');
    }

    const role = await this.repository.createRole(companyId, data);
    return this.formatRoleResponse(role);
  }

  // Get role with all details
  async getRole(roleId: string, companyId: string) {
    const role = await this.repository.getRoleById(roleId, companyId);

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    return role;
  }

  // List roles
  async listRoles(
    companyId: string,
    skip: number,
    take: number,
    search?: string,
    isActive?: boolean
  ) {
    return this.repository.listRoles(companyId, skip, take, search, isActive);
  }

  // Update role
  async updateRole(
    roleId: string,
    companyId: string,
    data: UpdateRoleRequest
  ) {
    const role = await this.repository.getRoleById(roleId, companyId);

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // If updating name, verify uniqueness
    if (data.name) {
      const existingRole = await this.fastify.prisma.role.findFirst({
        where: {
          name: data.name,
          companyId,
          NOT: {
            id: roleId,
          },
        },
      });

      if (existingRole) {
        throw new ValidationError('Role name already exists in this company');
      }
    }

    const updated = await this.repository.updateRole(roleId, companyId, data);
    return this.formatRoleResponse(updated);
  }

  // Delete role (soft delete)
  async deleteRole(roleId: string, companyId: string) {
    const role = await this.repository.getRoleById(roleId, companyId);

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Check if role has users
    const userCount = await this.repository.getRoleUserCount(roleId);
    if (userCount > 0) {
      throw new ValidationError(
        `Cannot delete role. ${userCount} user(s) still have this role`
      );
    }

    if (!role.isActive) {
      throw new ValidationError('Role is already deleted');
    }

    return this.repository.deleteRole(roleId, companyId);
  }

  // Assign permissions to role
  async assignPermissions(
    roleId: string,
    companyId: string,
    permissionIds: string[]
  ) {
    const role = await this.repository.getRoleById(roleId, companyId);

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (permissionIds.length === 0) {
      throw new ValidationError('At least one permission is required');
    }

    return this.repository.assignPermissions(roleId, companyId, permissionIds);
  }

  // Get available permissions
  async getAvailablePermissions() {
    return this.repository.getAvailablePermissions();
  }

  // Helper to format role response
  private formatRoleResponse(role: any) {
    return {
      ...role,
      permissionCount: role.permissions?.length || 0,
    };
  }
}
