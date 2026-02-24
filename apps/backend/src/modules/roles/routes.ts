import { FastifyInstance } from 'fastify';
import { RolesController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function rolesRoutes(fastify: FastifyInstance) {
  const controller = new RolesController(fastify);

  // List roles
  fastify.get<{ Querystring: any }>(
    '/roles',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'List all roles in company',
        tags: ['Roles'],
        querystring: {
          type: 'object',
          properties: {
            skip: { type: 'number', default: 0 },
            take: { type: 'number', default: 20 },
            search: { type: 'string' },
            isActive: { enum: ['true', 'false'] },
          },
        },
      },
    },
    async (request, reply) => controller.listRoles(request, reply)
  );

  // Get single role
  fastify.get<{ Params: { id: string } }>(
    '/roles/:id',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Get role by ID with permissions',
        tags: ['Roles'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => controller.getRole(request, reply)
  );

  // Create role
  fastify.post<{ Body: any }>(
    '/roles',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Create new role with permissions',
        tags: ['Roles'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            permissionIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
          },
          required: ['name', 'permissionIds'],
        },
      },
    },
    async (request, reply) => controller.createRole(request, reply)
  );

  // Update role
  fastify.patch<{ Params: { id: string }; Body: any }>(
    '/roles/:id',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Update role',
        tags: ['Roles'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => controller.updateRole(request, reply)
  );

  // Delete role
  fastify.delete<{ Params: { id: string } }>(
    '/roles/:id',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Delete role (soft delete)',
        tags: ['Roles'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => controller.deleteRole(request, reply)
  );

  // Assign permissions to role
  fastify.post<{ Params: { id: string }; Body: { permissionIds: string[] } }>(
    '/roles/:id/permissions',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Assign permissions to role',
        tags: ['Roles'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            permissionIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
          },
          required: ['permissionIds'],
        },
      },
    },
    async (request, reply) => controller.assignPermissions(request, reply)
  );

  // Get available permissions
  fastify.get(
    '/roles/available-permissions',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Get all available permissions',
        tags: ['Roles'],
      },
    },
    async (request, reply) => controller.getAvailablePermissions(request, reply)
  );
}
