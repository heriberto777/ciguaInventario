import { FastifyInstance } from 'fastify';
import { InventoryCountController } from './controller';
import { InventoryCountService } from './service';
import { InventoryVersionController } from './version-controller';
import { InventoryVersionService } from './version-service';
import { tenantGuard } from '../../guards/tenant';

export async function inventoryCountsRoutes(fastify: FastifyInstance) {
  const service = new InventoryCountService(fastify);
  const controller = new InventoryCountController(service);

  const versionService = new InventoryVersionService(fastify);
  const versionController = new InventoryVersionController(versionService);

  // Counts
  fastify.post('/inventory-counts', { preHandler: tenantGuard }, (request, reply) =>
    controller.createCount(request, reply)
  );

  fastify.get('/inventory-counts', { preHandler: tenantGuard }, (request, reply) =>
    controller.listCounts(request, reply)
  );

  fastify.get('/inventory-counts/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.getCount(request, reply)
  );

  fastify.post('/inventory-counts/:countId/prepare', { preHandler: tenantGuard }, (request, reply) =>
    controller.prepareCountItems(request, reply)
  );

  fastify.post('/inventory-counts/:countId/load-from-mapping', { preHandler: tenantGuard }, (request, reply) =>
    controller.loadCountFromMapping(request, reply)
  );

  // Diagnostic endpoint - Debug mapping content
  fastify.get('/inventory-counts/:countId/mapping-debug/:mappingId', { preHandler: tenantGuard }, async (request, reply) => {
    const { countId, mappingId } = request.params as { countId: string; mappingId: string };
    const { companyId } = (request as any).user;

    try {
      const mapping = await fastify.prisma?.mappingConfig?.findUnique({
        where: { id: mappingId },
      });

      if (!mapping) {
        return reply.status(404).send({ error: 'Mapping not found' });
      }

      if (mapping.companyId !== companyId) {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      reply.send({
        id: mapping.id,
        datasetType: mapping.datasetType,
        fieldMappings: mapping.fieldMappings,
        filters: mapping.filters,
        sourceTables: mapping.sourceTables,
      });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  fastify.delete('/inventory-counts/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.deleteCount(request, reply)
  );

  // Count items
  fastify.post('/inventory-counts/:countId/items', { preHandler: tenantGuard }, (request, reply) =>
    controller.addCountItem(request, reply)
  );

  fastify.patch('/inventory-counts/:countId/items/:itemId', { preHandler: tenantGuard }, (request, reply) =>
    controller.updateCountItem(request, reply)
  );

  fastify.delete('/inventory-counts/:countId/items/:itemId', { preHandler: tenantGuard }, (request, reply) =>
    controller.deleteCountItem(request, reply)
  );

  // ═══════════════════════════════════════════════════════════════
  // VERSIONING ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  // Get all items with version information
  fastify.get('/inventory-counts/:countId/items', { preHandler: tenantGuard }, (request, reply) =>
    versionController.getCountItems(request, reply)
  );

  // Get only items with variance for recounting
  fastify.get('/inventory-counts/:countId/variance-items', { preHandler: tenantGuard }, (request, reply) =>
    versionController.getVarianceItems(request, reply)
  );

  // Submit count for a specific version (mobile app -> backend)
  fastify.post('/inventory-counts/:countId/submit-count', { preHandler: tenantGuard }, (request, reply) =>
    versionController.submitCount(request, reply)
  );

  // Create new version for recounting items with variance
  fastify.post('/inventory-counts/:countId/new-version', { preHandler: tenantGuard }, (request, reply) =>
    versionController.createNewVersion(request, reply)
  );

  // Get version history
  fastify.get('/inventory-counts/:countId/version-history', { preHandler: tenantGuard }, (request, reply) =>
    versionController.getVersionHistory(request, reply)
  );

  // NEW: State Management Routes

  // Create a new inventory count (DRAFT state)
  fastify.post('/inventory-counts/create', { preHandler: tenantGuard }, (request, reply) =>
    controller.createNewInventoryCount(request, reply)
  );

  // Start inventory count (DRAFT → ACTIVE)
  fastify.post('/inventory-counts/:countId/start', { preHandler: tenantGuard }, (request, reply) =>
    controller.startInventoryCount(request, reply)
  );

  // Complete inventory count (ACTIVE → COMPLETED)
  fastify.post('/inventory-counts/:countId/complete', { preHandler: tenantGuard }, (request, reply) =>
    controller.completeInventoryCount(request, reply)
  );

  // Pause inventory count (ACTIVE → ON_HOLD)
  fastify.post('/inventory-counts/:countId/pause', { preHandler: tenantGuard }, (request, reply) =>
    controller.pauseInventoryCount(request, reply)
  );

  // Resume inventory count (ON_HOLD → ACTIVE)
  fastify.post('/inventory-counts/:countId/resume', { preHandler: tenantGuard }, (request, reply) =>
    controller.resumeInventoryCount(request, reply)
  );

  // Finalize inventory count (SUBMITTED → COMPLETED)
  fastify.post('/inventory-counts/:id/finalize', { preHandler: tenantGuard }, (request, reply) =>
    controller.finalizeCount(request, reply)
  );

  // Close inventory count (COMPLETED → CLOSED)
  fastify.post('/inventory-counts/:countId/close', { preHandler: tenantGuard }, (request, reply) =>
    controller.closeInventoryCount(request, reply)
  );

  // Cancel inventory count (any state → CANCELLED)
  fastify.post('/inventory-counts/:countId/cancel', { preHandler: tenantGuard }, (request, reply) =>
    controller.cancelInventoryCount(request, reply)
  );

  // Send to ERP (COMPLETED → CLOSED)
  fastify.post('/inventory-counts/:countId/send-to-erp', { preHandler: tenantGuard }, (request, reply) =>
    controller.sendToERP(request, reply)
  );

  // Reactivate count (CLOSED → COMPLETED)
  fastify.post('/inventory-counts/:countId/reactivate', { preHandler: tenantGuard }, (request, reply) =>
    controller.reactivateInventoryCount(request, reply)
  );

  // Delete count permanently
  fastify.delete('/inventory-counts/:countId/delete', { preHandler: tenantGuard }, (request, reply) =>
    controller.deleteInventoryCount(request, reply)
  );

  fastify.get('/inventory-counts/:id/export-excel', { preHandler: tenantGuard }, (request, reply) =>
    controller.exportToExcel(request, reply)
  );

  // ── Excel template download
  fastify.get('/inventory-counts/excel-template', { preHandler: tenantGuard }, (request, reply) =>
    controller.getExcelTemplate(request, reply)
  );

  // ── Load items from Excel (multipart upload)
  fastify.post(
    '/inventory-counts/:countId/load-from-excel',
    { preHandler: tenantGuard },
    (request, reply) => controller.loadCountFromExcel(request, reply)
  );

  // ── Preview items from Excel
  fastify.post(
    '/inventory-counts/excel-preview',
    { preHandler: tenantGuard },
    (request, reply) => controller.previewExcelFile(request, reply)
  );
}
