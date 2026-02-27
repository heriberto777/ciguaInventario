import { FastifyInstance } from 'fastify';
import { UsersController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function usersRoutes(fastify: FastifyInstance) {
  const controller = new UsersController(fastify);

  // List users in company
  fastify.get<{ Querystring: any }>(
    '/users',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'List all users in company',
        tags: ['Users'],
        querystring: {
          type: 'object',
          properties: {
            skip: { type: 'number', default: 0 },
            take: { type: 'number', default: 20 },
            search: { type: 'string' },
            isActive: { enum: ['true', 'false'] },
          },
        },
        response: {
          200: {
            description: 'Users list',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              pagination: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => controller.listUsers(request, reply)
  );

  // Get single user
  fastify.get<{ Params: { id: string } }>(
    '/users/:id',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Get user by ID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => controller.getUser(request, reply)
  );

  // Create user
  fastify.post<{ Body: any }>(
    '/users',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Create new user',
        tags: ['Users'],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            roleId: { type: 'string' },
          },
          required: ['email', 'password', 'firstName', 'lastName', 'roleId'],
        },
      },
    },
    async (request, reply) => controller.createUser(request, reply)
  );

  // Update user
  fastify.patch<{ Params: { id: string }; Body: any }>(
    '/users/:id',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Update user',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => controller.updateUser(request, reply)
  );

  // Delete user
  fastify.delete<{ Params: { id: string } }>(
    '/users/:id',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Delete user (soft delete)',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => controller.deleteUser(request, reply)
  );

  // Assign role to user
  fastify.post<{ Params: { id: string }; Body: { roleId: string } }>(
    '/users/:id/role',
    {
      preHandler: [tenantGuard],
      schema: {
        description: 'Assign role to user',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            roleId: { type: 'string' },
          },
          required: ['roleId'],
        },
      },
    },
    async (request, reply) => controller.assignRole(request, reply)
  );
}
