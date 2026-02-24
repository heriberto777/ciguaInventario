import { PrismaClient } from '@prisma/client';
import { CreateRoleRequest, UpdateRoleRequest } from './schemas';

export class RolesRepository {
  constructor(private prisma: PrismaClient) {}

  // Create role with permissions
  async createRole(
    companyId: string,
    data: CreateRoleRequest
  ) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description || null,
        companyId,
        rolePermissions: {
          create: data.permissionIds.map((id) => ({
            permission: { connect: { id } },
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  // Get role by ID with permissions
  async getRoleById(roleId: string, companyId: string) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        companyId, // Multi-tenant enforcement
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          select: {
            userId: true,
          },
        },
      },
    });
  }

  // Get role with user count
  async getRoleWithStats(roleId: string, companyId: string) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        companyId,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });
  }

  // List roles
  async listRoles(
    companyId: string,
    skip: number,
    take: number,
    search?: string,
    isActive?: boolean
  ) {
    const where: any = {
      companyId, // Multi-tenant enforcement
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: {
              rolePermissions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return { data, total };
  }

  // Update role
  async updateRole(
    roleId: string,
    companyId: string,
    data: UpdateRoleRequest
  ) {
    // Verify role belongs to company
    const role = await this.getRoleById(roleId, companyId);
    if (!role) {
      throw new Error('Role not found');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  // Delete role (soft delete)
  async deleteRole(roleId: string, companyId: string) {
    const role = await this.getRoleById(roleId, companyId);
    if (!role) {
      throw new Error('Role not found');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        isActive: false,
      },
    });
  }

  // Restore role
  async restoreRole(roleId: string, companyId: string) {
    const role = await this.getRoleById(roleId, companyId);
    if (!role) {
      throw new Error('Role not found');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        isActive: true,
      },
    });
  }

  // Assign permissions to role
  async assignPermissions(
    roleId: string,
    companyId: string,
    permissionIds: string[]
  ) {
    // Verify role exists in company
    const role = await this.getRoleById(roleId, companyId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new Error('Some permissions not found');
    }

    // Remove current permissions and assign new ones
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Assign new permissions
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });

    return this.getRoleById(roleId, companyId);
  }

  // Get all available permissions
  async getAvailablePermissions() {
    return this.prisma.permission.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Check if role has users
  async getRoleUserCount(roleId: string) {
    return this.prisma.userRole.count({
      where: { roleId },
    });
  }
}

