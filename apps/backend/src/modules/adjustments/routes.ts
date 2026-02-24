import { FastifyInstance } from 'fastify';
import { AdjustmentController } from './controller';
import { AdjustmentService } from './service';
import { tenantGuard } from '../../guards/tenant';

export async function adjustmentsRoutes(fastify: FastifyInstance) {
  const service = new AdjustmentService(fastify);
  const controller = new AdjustmentController(service);

  fastify.post('/adjustments', { preHandler: tenantGuard }, (request, reply) =>
    controller.createAdjustment(request, reply)
  );

  fastify.get('/adjustments', { preHandler: tenantGuard }, (request, reply) =>
    controller.listAdjustments(request, reply)
  );

  fastify.get('/adjustments/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.getAdjustment(request, reply)
  );

  fastify.patch('/adjustments/:id/approve', { preHandler: tenantGuard }, (request, reply) =>
    controller.approveAdjustment(request, reply)
  );

  fastify.patch('/adjustments/:id/reject', { preHandler: tenantGuard }, (request, reply) =>
    controller.rejectAdjustment(request, reply)
  );

  fastify.delete('/adjustments/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.deleteAdjustment(request, reply)
  );
}
