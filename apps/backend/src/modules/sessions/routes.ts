import { FastifyInstance } from 'fastify';
import { sessionsController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function sessionsRoutes(app: FastifyInstance) {
  // Special routes (stats, cleanup, current) must be BEFORE /:id to avoid param capturing
  app.get('/sessions/stats', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.getStats(request, reply));
  app.get('/sessions/current', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.getCurrentSession(request, reply));
  app.post('/sessions/cleanup', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.cleanup(request, reply));

  // Standard routes
  app.get('/sessions', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.listSessions(request, reply));
  app.get('/sessions/:id', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.getSession(request, reply));
  app.delete('/sessions/:id', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.endSession(request, reply));
  app.post('/sessions/end-all', { preHandler: [tenantGuard] }, async (request, reply) => sessionsController.endAllUserSessions(request, reply));
}
