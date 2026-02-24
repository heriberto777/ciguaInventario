import { FastifyInstance } from 'fastify';
import { loginController, refreshTokenController, logoutController } from './controller';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request, reply) => {
    return loginController(fastify, request, reply);
  });

  fastify.post('/auth/refresh', async (request, reply) => {
    return refreshTokenController(fastify, request, reply);
  });

  fastify.post('/auth/logout', async (request, reply) => {
    return logoutController(fastify, request, reply);
  });
}
