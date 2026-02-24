import { FastifyInstance } from 'fastify';
import { CreateAdjustmentDTO } from './schema';

export class AdjustmentRepository {
  constructor(private fastify: FastifyInstance) {}

  async createAdjustment(companyId: string, data: CreateAdjustmentDTO, createdBy: string) {
    const adjustmentNumber = await this.getNextAdjustmentNumber(companyId);
    const code = `ADJ-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(adjustmentNumber).padStart(3, '0')}`;

    return this.fastify.prisma.inventoryAdjustment.create({
      data: {
        companyId,
        warehouseId: data.warehouseId,
        code,
        description: data.description,
        type: data.type,
        items: data.items,
        createdBy,
        status: 'PENDING',
      },
    });
  }

  private async getNextAdjustmentNumber(companyId: string): Promise<number> {
    const lastAdjustment = await this.fastify.prisma.inventoryAdjustment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastAdjustment) return 1;
    const lastNumber = parseInt(lastAdjustment.code.split('-')[3] || '0');
    return lastNumber + 1;
  }

  async getAdjustmentById(id: string, companyId: string) {
    return this.fastify.prisma.inventoryAdjustment.findFirst({
      where: { id, companyId },
      include: {
        warehouse: true,
      },
    });
  }

  async listAdjustments(companyId: string, warehouseId?: string, status?: string, skip = 0, take = 20) {
    return this.fastify.prisma.inventoryAdjustment.findMany({
      where: {
        companyId,
        ...(warehouseId && { warehouseId }),
        ...(status && { status }),
      },
      skip,
      take,
      include: {
        warehouse: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approveAdjustment(id: string, approvedBy: string) {
    return this.fastify.prisma.inventoryAdjustment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  async rejectAdjustment(id: string) {
    return this.fastify.prisma.inventoryAdjustment.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async deleteAdjustment(id: string) {
    return this.fastify.prisma.inventoryAdjustment.delete({
      where: { id },
    });
  }
}
