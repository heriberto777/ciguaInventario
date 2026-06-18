import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createPhysicalCountController } from './physical-count.controller';
import { tenantGuard } from '../../guards/tenant';

export async function registerPhysicalCountRoutes(fastify: FastifyInstance) {
  const controller = await createPhysicalCountController(fastify);

  /**
   * Update item count
   * PATCH /api/inventory/counts/:countId/items/:itemId
   */
  fastify.patch(
    '/counts/:countId/items/:itemId',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.updateItemCount(request, reply)
  );

  /**
   * Get count items
   * GET /api/inventory/counts/:countId/items
   */
  fastify.get(
    '/counts/:countId/items',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.getCountItems(request, reply)
  );

  /**
   * Complete count
   * POST /api/inventory/counts/:countId/complete
   */
  fastify.post(
    '/counts/:countId/complete',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.completeCount(request, reply)
  );

  /**
   * Get variance summary
   * GET /api/inventory/counts/:countId/variances
   */
  fastify.get(
    '/counts/:countId/variances',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.getVarianceSummary(request, reply)
  );

  /**
   * Discard count
   * DELETE /api/inventory/counts/:countId
   */
  fastify.delete(
    '/counts/:countId',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.discardCount(request, reply)
  );
}
