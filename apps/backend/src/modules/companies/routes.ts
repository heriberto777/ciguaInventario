import { FastifyInstance } from 'fastify';
import { companiesController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function companiesRoutes(app: FastifyInstance) {
  app.get('/companies', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.listCompanies(request, reply));
  app.get('/companies/:id', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.getCompany(request, reply));
  app.post('/companies', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.createCompany(request, reply));
  app.put('/companies/:id', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.updateCompany(request, reply));
  app.patch('/companies/:id', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.updateCompany(request, reply));
  app.delete('/companies/:id', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.deleteCompany(request, reply));
  app.post('/companies/:id/restore', { preHandler: [tenantGuard] }, async (request, reply) => companiesController.restoreCompany(request, reply));
}
