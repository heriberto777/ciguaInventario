import { PrismaClient } from '@prisma/client';
import { CreateUserRequest, UpdateUserRequest } from './schemas';

export class UsersRepository {
  constructor(private prisma: PrismaClient) { }

  // Create user
  async createUser(companyId: string, data: CreateUserRequest & { hashedPassword?: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.hashedPassword,
        companyId,
        userRoles: {
          create: {
            roleId: data.roleId,
          },
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // Get user by ID
  async getUserById(userId: string, companyId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId, // Enforce multi-tenancy
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Get user by email (with company context)
  async getUserByEmail(email: string, companyId: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        companyId,
      },
    });
  }

  // List users
  async listUsers(
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
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  // Update user
  async updateUser(userId: string, companyId: string, data: UpdateUserRequest & { hashedPassword?: string }) {
    const updateData: any = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: data.isActive,
    };

    if (data.hashedPassword) {
      updateData.password = data.hashedPassword;
    }

    // Role update
    if (data.roleId) {
      await this.prisma.userRole.deleteMany({
        where: { userId },
      });
      updateData.userRoles = {
        create: {
          roleId: data.roleId,
        },
      };
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // Delete user (soft delete)
  async deleteUser(userId: string, companyId: string) {
    const user = await this.getUserById(userId, companyId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });
  }

  // Restore user
  async restoreUser(userId: string, companyId: string) {
    const user = await this.getUserById(userId, companyId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    });
  }

  // Assign role to user
  async assignRole(userId: string, companyId: string, roleId: string) {
    // Verify user exists in company
    const user = await this.getUserById(userId, companyId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify role belongs to company
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        companyId,
      },
    });

    if (!role) {
      throw new Error('Role not found in this company');
    }

    // Remove existing role and assign new one
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }
}

