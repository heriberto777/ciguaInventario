import { FastifyRequest, FastifyReply } from 'fastify';
import { permissionsService } from './service';
import { CreatePermissionSchema, UpdatePermissionSchema, ListPermissionsQuerySchema } from './schemas';
import { auditLogger } from '../../utils/audit-logger';

export const permissionsController = {
  async listPermissions(request: FastifyRequest, reply: FastifyReply) {
    const query = ListPermissionsQuerySchema.parse(request.query);
    const result = await permissionsService.listPermissions(query);
    return reply.send(result);
  },

  async getPermission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const permission = await permissionsService.getPermission(id);
    return reply.send(permission);
  },

  async createPermission(request: FastifyRequest, reply: FastifyReply) {
    const body = CreatePermissionSchema.parse(request.body);
    const permission = await permissionsService.createPermission(body);

    await auditLogger.log({
      action: 'CREATE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: permission.id,
      resource: 'Permission',
      newValue: permission,
    });

    return reply.status(201).send(permission);
  },

  async updatePermission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = UpdatePermissionSchema.parse(request.body);

    const oldPermission = await permissionsService.getPermission(id);
    const updatedPermission = await permissionsService.updatePermission(id, body);

    await auditLogger.log({
      action: 'UPDATE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: id,
      resource: 'Permission',
      oldValue: oldPermission,
      newValue: updatedPermission,
    });

    return reply.send(updatedPermission);
  },

  async deletePermission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const permission = await permissionsService.getPermission(id);
    await permissionsService.deletePermission(id);

    await auditLogger.log({
      action: 'DELETE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: id,
      resource: 'Permission',
      oldValue: permission,
    });

    return reply.status(204).send();
  },

  async getCategories(request: FastifyRequest, reply: FastifyReply) {
    const categories = await permissionsService.getCategories();
    return reply.send({ categories });
  },

  async getPermissionsByCategory(request: FastifyRequest, reply: FastifyReply) {
    const { category } = request.params as { category: string };
    const permissions = await permissionsService.getPermissionsByCategory(category);
    return reply.send({ category, permissions });
  },

  async getResourcesAndActions(request: FastifyRequest, reply: FastifyReply) {
    const resourcesAndActions = await permissionsService.getResourcesAndActions();
    return reply.send(resourcesAndActions);
  },
};
