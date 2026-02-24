import { FastifyInstance } from 'fastify';
import { AdjustmentRepository } from './repository';
import { CreateAdjustmentDTO, ApproveAdjustmentDTO } from './schema';
import { AppError } from '../../utils/errors';

export class AdjustmentService {
  private repository: AdjustmentRepository;

  constructor(fastify: FastifyInstance) {
    this.repository = new AdjustmentRepository(fastify);
  }

  async createAdjustment(companyId: string, data: CreateAdjustmentDTO, createdBy: string) {
    // Validar que el almacén existe
    const warehouse = await this.findWarehouse(data.warehouseId, companyId);
    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }

    // Validar que hay ítems
    if (!data.items || data.items.length === 0) {
      throw new AppError(400, 'Adjustment must include at least one item');
    }

    return this.repository.createAdjustment(companyId, data, createdBy);
  }

  async getAdjustmentById(id: string, companyId: string) {
    const adjustment = await this.repository.getAdjustmentById(id, companyId);
    if (!adjustment) {
      throw new AppError(404, 'Adjustment not found');
    }
    return adjustment;
  }

  async listAdjustments(companyId: string, warehouseId?: string, status?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    return this.repository.listAdjustments(companyId, warehouseId, status, skip, pageSize);
  }

  async approveAdjustment(id: string, companyId: string, data: ApproveAdjustmentDTO) {
    const adjustment = await this.getAdjustmentById(id, companyId);

    if (adjustment.status !== 'PENDING') {
      throw new AppError(400, `Cannot approve a ${adjustment.status} adjustment`);
    }

    return this.repository.approveAdjustment(id, data.approvedBy || '');
  }

  async rejectAdjustment(id: string, companyId: string) {
    const adjustment = await this.getAdjustmentById(id, companyId);

    if (adjustment.status !== 'PENDING') {
      throw new AppError(400, `Cannot reject a ${adjustment.status} adjustment`);
    }

    return this.repository.rejectAdjustment(id);
  }

  async deleteAdjustment(id: string, companyId: string) {
    const adjustment = await this.getAdjustmentById(id, companyId);

    if (adjustment.status === 'APPROVED') {
      throw new AppError(400, 'Cannot delete an approved adjustment');
    }

    return this.repository.deleteAdjustment(id);
  }

  private async findWarehouse(id: string, companyId: string) {
    return null;
  }
}
