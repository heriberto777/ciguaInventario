import { FastifyInstance } from 'fastify';
import { CreateWarehouseDTO, UpdateWarehouseDTO, CreateLocationDTO, UpdateLocationDTO } from './schema';

export class WarehouseRepository {
  constructor(private fastify: FastifyInstance) {}

  async createWarehouse(companyId: string, data: CreateWarehouseDTO) {
    return this.fastify.prisma.warehouse.create({
      data: {
        companyId,
        code: data.code,
        name: data.name,
        address: data.address,
        city: data.city,
        manager: data.manager,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getWarehouseById(id: string, companyId: string) {
    return this.fastify.prisma.warehouse.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        locations: true,
      },
    });
  }

  async listWarehouses(companyId: string, skip = 0, take = 20) {
    return this.fastify.prisma.warehouse.findMany({
      where: {
        companyId,
      },
      skip,
      take,
      include: {
        locations: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateWarehouse(id: string, companyId: string, data: UpdateWarehouseDTO) {
    return this.fastify.prisma.warehouse.update({
      where: {
        id,
      },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.manager && { manager: data.manager }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteWarehouse(id: string, companyId: string) {
    return this.fastify.prisma.warehouse.delete({
      where: {
        id,
      },
    });
  }

  async createLocation(warehouseId: string, data: CreateLocationDTO) {
    return this.fastify.prisma.warehouse_Location.create({
      data: {
        warehouseId,
        code: data.code,
        description: data.description,
        capacity: data.capacity,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getLocationById(id: string) {
    return this.fastify.prisma.warehouse_Location.findUnique({
      where: { id },
    });
  }

  async listLocationsByWarehouse(warehouseId: string) {
    return this.fastify.prisma.warehouse_Location.findMany({
      where: {
        warehouseId,
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  async updateLocation(id: string, data: UpdateLocationDTO) {
    return this.fastify.prisma.warehouse_Location.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.description && { description: data.description }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteLocation(id: string) {
    return this.fastify.prisma.warehouse_Location.delete({
      where: { id },
    });
  }
}
