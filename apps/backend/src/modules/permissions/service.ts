import { permissionsRepository } from './repository';
import { CreatePermission, UpdatePermission } from './schemas';
import { AppError } from '../../utils/errors';

export const permissionsService = {
  async createPermission(data: CreatePermission) {
    // Check if permission already exists
    const permissions = await permissionsRepository.listPermissions({});
    const existing = permissions.data?.find(
      (p) => p.name.toLowerCase() === data.name.toLowerCase()
    );

    if (existing) {
      throw new AppError('Permission already exists', 400);
    }

    const permission = await permissionsRepository.createPermission(data);
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  },

  async getPermission(id: string) {
    const permission = await permissionsRepository.getPermissionById(id);

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  },

  async listPermissions(filters: {
    skip?: number;
    take?: number;
    search?: string;
    category?: string;
  }) {
    const result = await permissionsRepository.listPermissions(filters);

    return {
      data: result.data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: result.pagination,
    };
  },

  async updatePermission(id: string, data: UpdatePermission) {
    const permission = await permissionsRepository.getPermissionById(id);

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    // Check for duplicate name if updating name
    if (data.name && data.name.toLowerCase() !== permission.name.toLowerCase()) {
      const existing = await permissionsRepository.listPermissions({
        search: data.name,
      });

      if (existing.data.some((p) => p.name.toLowerCase() === data.name.toLowerCase())) {
        throw new AppError('Permission with this name already exists', 400);
      }
    }

    const updated = await permissionsRepository.updatePermission(id, data);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deletePermission(id: string) {
    const permission = await permissionsRepository.getPermissionById(id);

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    return await permissionsRepository.deletePermission(id);
  },

  async getCategories() {
    return await permissionsRepository.getCategories();
  },

  async getPermissionsByCategory(category: string) {
    const permissions = await permissionsRepository.getPermissionsByCategory(
      category
    );

    if (permissions.length === 0) {
      throw new AppError(`No permissions found in category: ${category}`, 404);
    }

    return permissions.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },

  async getResourcesAndActions() {
    // Predefined resources and actions available in the system
    const resourcesAndActions = {
      users: ['view', 'create', 'update', 'delete'],
      companies: ['view', 'create', 'update', 'delete'],
      roles: ['view', 'create', 'update', 'delete'],
      permissions: ['view', 'create', 'update', 'delete'],
      'erp-connections': ['view', 'create', 'update', 'delete', 'test'],
      mappings: ['view', 'create', 'update', 'delete', 'test'],
      sessions: ['view', 'close'],
      'audit-logs': ['view'],
      reports: ['view', 'export'],
    };

    return resourcesAndActions;
  },
};
