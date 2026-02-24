import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Add CORS headers
    reply.header('Access-Control-Allow-Origin', request.headers.origin || '*');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    reply.header('Access-Control-Allow-Credentials', 'true');

    if (request.method === 'OPTIONS') {
      reply.status(200).send();
    }
  });
});
