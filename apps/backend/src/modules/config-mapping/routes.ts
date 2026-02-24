import { FastifyInstance } from 'fastify';
import { tenantGuard } from '../../guards/tenant';
import {
  getMappingController,
  listMappingsController,
  createMappingController,
  testMappingController,
} from './controller';

export async function configMappingRoutes(fastify: FastifyInstance) {
  // All routes require tenant guard
  fastify.addHook('preHandler', tenantGuard);

  // GET /config/mapping
  fastify.get('/config/mapping', async (request, reply) => {
    return listMappingsController(fastify, request, reply);
  });

  // GET /config/mapping/:mappingId
  fastify.get<{ Params: { mappingId: string } }>(
    '/config/mapping/:mappingId',
    async (request, reply) => {
      return getMappingController(fastify, request, reply);
    }
  );

  // POST /config/mapping
  fastify.post('/config/mapping', async (request, reply) => {
    return createMappingController(fastify, request, reply);
  });

  // POST /config/mapping/test
  fastify.post('/config/mapping/test', async (request, reply) => {
    return testMappingController(fastify, request, reply);
  });
}
