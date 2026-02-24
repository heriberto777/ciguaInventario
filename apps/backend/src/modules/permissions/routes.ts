import { FastifyInstance } from 'fastify';
import { permissionsController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function permissionsRoutes(app: FastifyInstance) {
  // Get resources and actions available (must be BEFORE /:id)
  app.get(
    '/permissions/resources-and-actions',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.getResourcesAndActions(request, reply)
  );

  // Get categories (must be BEFORE /:id to avoid param capturing)
  app.get(
    '/permissions/categories',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.getCategories(request, reply)
  );

  // Get by category (must be BEFORE /:id)
  app.get(
    '/permissions/category/:category',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.getPermissionsByCategory(request, reply)
  );

  // List permissions
  app.get(
    '/permissions',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.listPermissions(request, reply)
  );

  // Create permission
  app.post(
    '/permissions',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.createPermission(request, reply)
  );

  // Get single permission (must be AFTER /permissions/categories and /permissions/category/:category)
  app.get(
    '/permissions/:id',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.getPermission(request, reply)
  );

  // Update permission
  app.put(
    '/permissions/:id',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.updatePermission(request, reply)
  );

  // Delete permission
  app.delete(
    '/permissions/:id',
    { preHandler: [tenantGuard] },
    async (request, reply) => permissionsController.deletePermission(request, reply)
  );
}
