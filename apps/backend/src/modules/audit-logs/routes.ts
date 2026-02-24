import { FastifyInstance } from 'fastify';
import { auditLogsController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function auditLogsRoutes(app: FastifyInstance) {
  // Stats must be BEFORE /:id to avoid param capturing
  app.get('/audit-logs/stats', { preHandler: [tenantGuard] }, async (request, reply) => auditLogsController.getStats(request, reply));
  app.post('/audit-logs/cleanup', { preHandler: [tenantGuard] }, async (request, reply) => auditLogsController.deleteOldLogs(request, reply));

  // Then standard routes
  app.get('/audit-logs', { preHandler: [tenantGuard] }, async (request, reply) => auditLogsController.listAuditLogs(request, reply));
  app.get('/audit-logs/:id', { preHandler: [tenantGuard] }, async (request, reply) => auditLogsController.getAuditLog(request, reply));
}
