import { FastifyInstance } from 'fastify';
import { WarehouseRepository } from './repository';
import { CreateWarehouseDTO, UpdateWarehouseDTO, CreateLocationDTO, UpdateLocationDTO } from './schema';
import { AppError } from '../../utils/errors';

export class WarehouseService {
  private repository: WarehouseRepository;

  constructor(fastify: FastifyInstance) {
    this.repository = new WarehouseRepository(fastify);
  }

  async createWarehouse(companyId: string, data: CreateWarehouseDTO) {
    // Verificar que el código sea único en la empresa
    const existing = await this.repository.listWarehouses(companyId);
    if (existing.some(w => w.code === data.code)) {
      throw new AppError(400, 'Warehouse code already exists');
    }

    return this.repository.createWarehouse(companyId, data);
  }

  async getWarehouseById(id: string, companyId: string) {
    const warehouse = await this.repository.getWarehouseById(id, companyId);
    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }
    return warehouse;
  }

  async listWarehouses(companyId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    return this.repository.listWarehouses(companyId, skip, pageSize);
  }

  async updateWarehouse(id: string, companyId: string, data: UpdateWarehouseDTO) {
    await this.getWarehouseById(id, companyId);

    // Si se cambia el código, verificar unicidad
    if (data.code) {
      const existing = await this.repository.listWarehouses(companyId);
      if (existing.some(w => w.id !== id && w.code === data.code)) {
        throw new AppError(400, 'Warehouse code already exists');
      }
    }

    return this.repository.updateWarehouse(id, companyId, data);
  }

  async deleteWarehouse(id: string, companyId: string) {
    await this.getWarehouseById(id, companyId);
    return this.repository.deleteWarehouse(id, companyId);
  }

  async createLocation(warehouseId: string, companyId: string, data: CreateLocationDTO) {
    const warehouse = await this.repository.getWarehouseById(warehouseId, companyId);
    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }

    const existing = await this.repository.listLocationsByWarehouse(warehouseId);
    if (existing.some(l => l.code === data.code)) {
      throw new AppError(400, 'Location code already exists in this warehouse');
    }

    return this.repository.createLocation(warehouseId, data);
  }

  async getLocationById(id: string) {
    const location = await this.repository.getLocationById(id);
    if (!location) {
      throw new AppError(404, 'Location not found');
    }
    return location;
  }

  async listLocationsByWarehouse(warehouseId: string, companyId: string) {
    await this.repository.getWarehouseById(warehouseId, companyId);
    return this.repository.listLocationsByWarehouse(warehouseId);
  }

  async updateLocation(id: string, companyId: string, data: UpdateLocationDTO) {
    const location = await this.getLocationById(id);
    const warehouse = await this.repository.getWarehouseById(location.warehouseId, companyId);

    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }

    if (data.code) {
      const existing = await this.repository.listLocationsByWarehouse(location.warehouseId);
      if (existing.some(l => l.id !== id && l.code === data.code)) {
        throw new AppError(400, 'Location code already exists in this warehouse');
      }
    }

    return this.repository.updateLocation(id, data);
  }

  async deleteLocation(id: string, companyId: string) {
    const location = await this.getLocationById(id);
    const warehouse = await this.repository.getWarehouseById(location.warehouseId, companyId);

    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }

    return this.repository.deleteLocation(id);
  }
}
