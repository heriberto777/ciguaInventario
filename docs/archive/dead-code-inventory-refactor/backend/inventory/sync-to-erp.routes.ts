import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createSyncToERPController } from './sync-to-erp.controller';
import { tenantGuard } from '../../guards/tenant';

export async function registerSyncToERPRoutes(fastify: FastifyInstance) {
  const controller = await createSyncToERPController(fastify);

  /**
   * Get syncable items
   * GET /api/inventory/counts/:countId/syncable-items
   */
  fastify.get(
    '/counts/:countId/syncable-items',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.getSyncableItems(request, reply)
  );

  /**
   * Sync to ERP
   * POST /api/inventory/counts/:countId/sync
   */
  fastify.post(
    '/counts/:countId/sync',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.syncToERP(request, reply)
  );

  /**
   * Get sync history
   * GET /api/inventory/counts/:countId/sync-history
   */
  fastify.get(
    '/counts/:countId/sync-history',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.getSyncHistory(request, reply)
  );

  /**
   * Get sync details
   * GET /api/inventory/counts/sync/:syncHistoryId
   */
  fastify.get(
    '/counts/sync/:syncHistoryId',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.getSyncDetails(request, reply)
  );

  /**
   * Validate sync
   * GET /api/inventory/counts/:countId/validate-sync
   */
  fastify.get(
    '/counts/:countId/validate-sync',
    { preHandler: tenantGuard },
    (request: FastifyRequest, reply: FastifyReply) => controller.validateSync(request, reply)
  );
}
