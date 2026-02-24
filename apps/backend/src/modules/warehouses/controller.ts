import { FastifyRequest, FastifyReply } from 'fastify';
import { WarehouseService } from './service';
import { createWarehouseSchema, updateWarehouseSchema, createLocationSchema, updateLocationSchema } from './schema';

export class WarehouseController {
  constructor(private service: WarehouseService) {}

  async createWarehouse(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const body = createWarehouseSchema.parse(request.body);

    const warehouse = await this.service.createWarehouse(companyId, body);
    reply.code(201).send(warehouse);
  }

  async getWarehouse(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    const warehouse = await this.service.getWarehouseById(id, companyId);
    reply.send(warehouse);
  }

  async listWarehouses(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { page = 1, pageSize = 20 } = request.query as { page?: number; pageSize?: number };

    const warehouses = await this.service.listWarehouses(companyId, page, pageSize);
    reply.send(warehouses);
  }

  async updateWarehouse(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };
    const body = updateWarehouseSchema.parse(request.body);

    const warehouse = await this.service.updateWarehouse(id, companyId, body);
    reply.send(warehouse);
  }

  async deleteWarehouse(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    await this.service.deleteWarehouse(id, companyId);
    reply.send({ success: true });
  }

  async createLocation(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { warehouseId } = request.params as { warehouseId: string };
    const body = createLocationSchema.parse(request.body);

    const location = await this.service.createLocation(warehouseId, companyId, body);
    reply.code(201).send(location);
  }

  async getLocation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const location = await this.service.getLocationById(id);
    reply.send(location);
  }

  async listLocations(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { warehouseId } = request.params as { warehouseId: string };

    const locations = await this.service.listLocationsByWarehouse(warehouseId, companyId);
    reply.send(locations);
  }

  async updateLocation(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };
    const body = updateLocationSchema.parse(request.body);

    const location = await this.service.updateLocation(id, companyId, body);
    reply.send(location);
  }

  async deleteLocation(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    await this.service.deleteLocation(id, companyId);
    reply.send({ success: true });
  }
}
