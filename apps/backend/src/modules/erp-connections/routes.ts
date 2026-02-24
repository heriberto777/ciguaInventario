import { FastifyInstance } from 'fastify';
import { erpConnectionsController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function erpConnectionsRoutes(app: FastifyInstance) {
  app.get('/erp-connections', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.listConnections(request, reply));
  app.get('/erp-connections/:id', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.getConnection(request, reply));
  app.post('/erp-connections', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.createConnection(request, reply));
  app.patch('/erp-connections/:id', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.updateConnection(request, reply));
  app.delete('/erp-connections/:id', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.deleteConnection(request, reply));
  app.post('/erp-connections/test', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.testConnection(request, reply));
  app.post('/erp-connections/:id/toggle', { preHandler: [tenantGuard] }, async (request, reply) => erpConnectionsController.toggleConnection(request, reply));

  // ═══════════════════════════════════════════════════════════════
  // INTROSPECTION ENDPOINTS - Obtener estructura del ERP
  // ═══════════════════════════════════════════════════════════════

  // Obtener todas las tablas disponibles en el ERP
  app.get('/erp-connections/:connectionId/tables', { preHandler: [tenantGuard] }, async (request, reply) =>
    erpConnectionsController.getAvailableTables(request, reply)
  );

  // Obtener esquema de múltiples tablas
  app.post('/erp-connections/:connectionId/table-schemas', { preHandler: [tenantGuard] }, async (request, reply) =>
    erpConnectionsController.getTableSchemas(request, reply)
  );

  // Preview de query SQL
  app.post('/erp-connections/:connectionId/preview-query', { preHandler: [tenantGuard] }, async (request, reply) =>
    erpConnectionsController.previewQuery(request, reply)
  );
}
