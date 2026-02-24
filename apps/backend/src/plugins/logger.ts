import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Log incoming request
    request.log.debug(
      {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'Incoming request'
    );
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Log response
    request.log.debug(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
      },
      'Response sent'
    );
  });
});
