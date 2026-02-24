import { FastifyInstance } from 'fastify';
import { VarianceReportController } from './controller';
import { VarianceReportService } from './service';
import { tenantGuard } from '../../guards/tenant';

export async function varianceReportsRoutes(fastify: FastifyInstance) {
  const service = new VarianceReportService(fastify);
  const controller = new VarianceReportController(service);

  fastify.get('/variance-reports', { preHandler: tenantGuard }, (request, reply) =>
    controller.listVariances(request, reply)
  );

  fastify.get('/variance-reports/summary', { preHandler: tenantGuard }, (request, reply) =>
    controller.getVarianceSummary(request, reply)
  );

  fastify.get('/variance-reports/high-variance', { preHandler: tenantGuard }, (request, reply) =>
    controller.getHighVarianceItems(request, reply)
  );

  fastify.get('/variance-reports/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.getVariance(request, reply)
  );

  fastify.get('/inventory-counts/:countId/variances', { preHandler: tenantGuard }, (request, reply) =>
    controller.getVariancesByCount(request, reply)
  );

  fastify.patch('/variance-reports/:id/approve', { preHandler: tenantGuard }, (request, reply) =>
    controller.approveVariance(request, reply)
  );

  fastify.patch('/variance-reports/:id/reject', { preHandler: tenantGuard }, (request, reply) =>
    controller.rejectVariance(request, reply)
  );
}
