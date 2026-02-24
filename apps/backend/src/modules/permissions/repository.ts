import { prisma } from '../../utils/db';

export const permissionsRepository = {
  async createPermission(data: {
    name: string;
    description?: string;
    category: string;
  }) {
    return await prisma.permission.create({
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
      },
    });
  },

  async getPermissionById(id: string) {
    return await prisma.permission.findUnique({
      where: { id },
    });
  },

  async listPermissions(filters: {
    skip?: number;
    take?: number;
    search?: string;
    category?: string;
  }) {
    const skip = filters.skip || 0;
    const take = filters.take || 10;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    const [data, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.permission.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total },
    };
  },

  async updatePermission(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
    }
  ) {
    return await prisma.permission.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
      },
    });
  },

  async deletePermission(id: string) {
    return await prisma.permission.delete({
      where: { id },
    });
  },

  async getPermissionsByCategory(category: string) {
    return await prisma.permission.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  },

  async getCategories() {
    const permissions = await prisma.permission.findMany({
      distinct: ['category'],
      select: { category: true },
    });

    return permissions.map((p) => p.category);
  },

  async countPermissions() {
    return await prisma.permission.count();
  }
};


