import { FastifyInstance } from 'fastify';
import { WarehouseController } from './controller';
import { WarehouseService } from './service';
import { tenantGuard } from '../../guards/tenant';

export async function warehousesRoutes(fastify: FastifyInstance) {
  const service = new WarehouseService(fastify);
  const controller = new WarehouseController(service);

  fastify.post('/warehouses', { preHandler: tenantGuard }, (request, reply) =>
    controller.createWarehouse(request, reply)
  );

  fastify.get('/warehouses', { preHandler: tenantGuard }, (request, reply) =>
    controller.listWarehouses(request, reply)
  );

  fastify.get('/warehouses/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.getWarehouse(request, reply)
  );

  fastify.patch('/warehouses/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.updateWarehouse(request, reply)
  );

  fastify.delete('/warehouses/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.deleteWarehouse(request, reply)
  );

  // Locations endpoints
  fastify.post('/warehouses/:warehouseId/locations', { preHandler: tenantGuard }, (request, reply) =>
    controller.createLocation(request, reply)
  );

  fastify.get('/warehouses/:warehouseId/locations', { preHandler: tenantGuard }, (request, reply) =>
    controller.listLocations(request, reply)
  );

  fastify.get('/locations/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.getLocation(request, reply)
  );

  fastify.patch('/locations/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.updateLocation(request, reply)
  );

  fastify.delete('/locations/:id', { preHandler: tenantGuard }, (request, reply) =>
    controller.deleteLocation(request, reply)
  );
}
