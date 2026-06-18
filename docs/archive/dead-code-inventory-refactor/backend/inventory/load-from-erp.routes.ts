import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLoadInventoryController } from './load-from-erp.controller';
import { tenantGuard } from '../../guards/tenant';

export async function loadInventoryFromERPRoutes(fastify: FastifyInstance) {
  // Crear controlador
  const controller = await createLoadInventoryController(fastify);

  // POST /api/inventory/load-from-erp
  fastify.post(
    '/api/inventory/load-from-erp',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) =>
      controller.loadInventoryFromERP(request, reply)
  );

  // GET /api/inventory/load-from-erp/:countId
  fastify.get(
    '/api/inventory/load-from-erp/:countId',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) =>
      controller.getLoadStatus(request, reply)
  );

  // DELETE /api/inventory/load-from-erp/:countId
  fastify.delete(
    '/api/inventory/load-from-erp/:countId',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) =>
      controller.cancelLoad(request, reply)
  );
}
