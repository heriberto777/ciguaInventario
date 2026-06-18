import { FastifyInstance } from 'fastify';
import { createERPConnectionsController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function erpConnectionsRoutes(app: FastifyInstance) {
  const controller = createERPConnectionsController(app);

  app.get('/erp-connections', { preHandler: [tenantGuard] }, async (request, reply) => controller.listConnections(request, reply));
  app.get('/erp-connections/:id', { preHandler: [tenantGuard] }, async (request, reply) => controller.getConnection(request, reply));
  app.post('/erp-connections', { preHandler: [tenantGuard] }, async (request, reply) => controller.createConnection(request, reply));
  app.patch('/erp-connections/:id', { preHandler: [tenantGuard] }, async (request, reply) => controller.updateConnection(request, reply));
  app.delete('/erp-connections/:id', { preHandler: [tenantGuard] }, async (request, reply) => controller.deleteConnection(request, reply));
  app.post('/erp-connections/test', { preHandler: [tenantGuard] }, async (request, reply) => controller.testConnection(request, reply));
  app.post('/erp-connections/:id/toggle', { preHandler: [tenantGuard] }, async (request, reply) => controller.toggleConnection(request, reply));

  // ═══════════════════════════════════════════════════════════════
  // INTROSPECTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  app.get('/erp-connections/:connectionId/tables', { preHandler: [tenantGuard] }, async (request, reply) =>
    controller.getAvailableTables(request, reply)
  );

  app.post('/erp-connections/:connectionId/table-schemas', { preHandler: [tenantGuard] }, async (request, reply) =>
    controller.getTableSchemas(request, reply)
  );

  app.post('/erp-connections/:connectionId/preview-query', { preHandler: [tenantGuard] }, async (request, reply) =>
    controller.previewQuery(request, reply)
  );
}
