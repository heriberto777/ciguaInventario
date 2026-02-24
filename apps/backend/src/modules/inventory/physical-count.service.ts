import { FastifyInstance } from 'fastify';
import { AppError } from '../../utils/errors';

interface CountItemInput {
  itemId: string;
  countedQty: number;
  notes?: string;
  countedBy: string;
}

interface CountItemResult {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  variancePercent: number;
}

interface CompleteCountResult {
  countId: string;
  status: string;
  totalItems: number;
  itemsWithVariance: number;
  totalVariance: number;
  totalVarianceValue?: number;
}

export class PhysicalCountService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Actualizar cantidad contada para un item
   */
  async updateItemCount(
    countId: string,
    itemId: string,
    companyId: string,
    input: CountItemInput
  ): Promise<CountItemResult> {
    try {
      // Validar que el item pertenece al conteo
      const item = await (this.fastify.prisma as any).inventoryCount_Item.findUnique({
        where: { id: itemId },
        include: { count: true },
      });

      if (!item) {
        throw new AppError(404, 'Item not found');
      }

      if (item.count.id !== countId || item.count.companyId !== companyId) {
        throw new AppError(403, 'Unauthorized');
      }

      // Validar que el conteo está en estado correcto
      if (!['DRAFT', 'IN_PROGRESS'].includes(item.count.status)) {
        throw new AppError(400, `Cannot update items in ${item.count.status} status`);
      }

      // Validar cantidades
      if (input.countedQty < 0) {
        throw new AppError(400, 'Counted quantity cannot be negative');
      }

      // Actualizar item
      const updatedItem = await (this.fastify.prisma as any).inventoryCount_Item.update({
        where: { id: itemId },
        data: {
          countedQty: input.countedQty,
          notes: input.notes || item.notes,
          countedBy: input.countedBy,
          countedAt: new Date(),
        },
      });

      // Cambiar status del conteo a IN_PROGRESS si está en DRAFT
      if (item.count.status === 'DRAFT') {
        await (this.fastify.prisma as any).inventoryCount.update({
          where: { id: countId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      // Calcular varianza
      const variance = Number(updatedItem.countedQty) - Number(updatedItem.systemQty);
      const variancePercent =
        Number(updatedItem.systemQty) > 0
          ? (variance / Number(updatedItem.systemQty)) * 100
          : 0;

      return {
        id: updatedItem.id,
        itemCode: updatedItem.itemCode,
        itemName: updatedItem.itemName,
        systemQty: Number(updatedItem.systemQty),
        countedQty: Number(updatedItem.countedQty),
        variance,
        variancePercent: Math.round(variancePercent * 100) / 100,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Failed to update count item: ${error.message}`);
    }
  }

  /**
   * Obtener items del conteo con estado
   */
  async getCountItems(countId: string, companyId: string) {
    try {
      const count = await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
      });

      if (!count || count.companyId !== companyId) {
        throw new AppError(404, 'Count not found');
      }

      const items = await (this.fastify.prisma as any).inventoryCount_Item.findMany({
        where: { countId },
        include: {
          location: true,
        },
        orderBy: [{ location: { code: 'asc' } }, { itemCode: 'asc' }],
      });

      // Calcular estadísticas
      const stats = {
        totalItems: items.length,
        itemsCountedFully: items.filter((i: any) => i.countedQty > 0).length,
        itemsNotCounted: items.filter((i: any) => i.countedQty === null || i.countedQty === 0)
          .length,
        itemsWithVariance: items.filter(
          (i: any) => i.countedQty !== null && i.countedQty !== i.systemQty
        ).length,
        totalSystemQty: items.reduce((sum: number, i: any) => sum + Number(i.systemQty), 0),
        totalCountedQty: items.reduce(
          (sum: number, i: any) => sum + (i.countedQty || 0),
          0
        ),
      };

      const itemsWithVariance = items
        .filter((i: any) => i.countedQty !== null && i.countedQty !== i.systemQty)
        .map((i: any) => ({
          id: i.id,
          itemCode: i.itemCode,
          itemName: i.itemName,
          location: i.location.code,
          systemQty: Number(i.systemQty),
          countedQty: Number(i.countedQty),
          variance: Number(i.countedQty) - Number(i.systemQty),
          variancePercent:
            Math.round(
              ((Number(i.countedQty) - Number(i.systemQty)) / Number(i.systemQty)) * 10000
            ) / 100,
        }));

      return {
        count: {
          id: count.id,
          code: count.code,
          status: count.status,
          description: count.description,
          startedAt: count.startedAt,
          completedAt: count.completedAt,
        },
        stats,
        items: items.map((i: any) => ({
          id: i.id,
          itemCode: i.itemCode,
          itemName: i.itemName,
          location: i.location.code,
          systemQty: Number(i.systemQty),
          countedQty: i.countedQty ? Number(i.countedQty) : null,
          uom: i.uom,
          baseUom: i.baseUom,
          notes: i.notes,
          countedBy: i.countedBy,
        })),
        variances: itemsWithVariance,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Failed to get count items: ${error.message}`);
    }
  }

  /**
   * Completar conteo y generar reportes de varianza
   */
  async completeCount(
    countId: string,
    companyId: string,
    approvedBy: string
  ): Promise<CompleteCountResult> {
    try {
      // Validar que el conteo existe
      const count = await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
      });

      if (!count || count.companyId !== companyId) {
        throw new AppError(404, 'Count not found');
      }

      // Solo se puede completar si está en IN_PROGRESS o DRAFT
      if (!['DRAFT', 'IN_PROGRESS'].includes(count.status)) {
        throw new AppError(400, `Cannot complete count in ${count.status} status`);
      }

      // Obtener items
      const items = await (this.fastify.prisma as any).inventoryCount_Item.findMany({
        where: { countId },
      });

      if (items.length === 0) {
        throw new AppError(400, 'Cannot complete count with no items');
      }

      // Verificar que todos los items fueron contados
      const uncountedItems = items.filter(
        (i: any) => i.countedQty === null || i.countedQty === 0
      );
      if (uncountedItems.length > 0) {
        throw new AppError(400, `${uncountedItems.length} items have not been counted`);
      }

      // Calcular varianzas
      let totalVariance = 0;
      let itemsWithVariance = 0;

      for (const item of items) {
        const variance = Number(item.countedQty) - Number(item.systemQty);
        totalVariance += variance;
        if (variance !== 0) {
          itemsWithVariance++;
        }
      }

      // Actualizar estado del conteo
      const updatedCount = await (this.fastify.prisma as any).inventoryCount.update({
        where: { id: countId },
        data: {
          status: 'COMPLETED',
          completedBy: approvedBy,
          completedAt: new Date(),
        },
      });

      // Registrar en audit log
      await this.fastify.auditLog({
        action: 'UPDATE',
        userId: approvedBy,
        companyId,
        resourceId: countId,
        resource: 'InventoryCount',
        newValue: {
          status: 'COMPLETED',
          itemsWithVariance,
          totalVariance,
        },
      });

      return {
        countId: updatedCount.id,
        status: updatedCount.status,
        totalItems: items.length,
        itemsWithVariance,
        totalVariance,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Failed to complete count: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de varianzas
   */
  async getVarianceSummary(countId: string, companyId: string) {
    try {
      const count = await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
        include: {
          countItems: {
            where: {
              NOT: {
                countedQty: null,
              },
            },
          },
        },
      });

      if (!count || count.companyId !== companyId) {
        throw new AppError(404, 'Count not found');
      }

      // Calcular varianzas
      const variances = count.countItems
        .map((item: any) => {
          const variance = Number(item.countedQty) - Number(item.systemQty);
          return {
            id: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            systemQty: Number(item.systemQty),
            countedQty: Number(item.countedQty),
            variance,
            variancePercent:
              Number(item.systemQty) > 0
                ? Math.round(((variance / Number(item.systemQty)) * 10000) / 100)
                : 0,
            status: variance === 0 ? 'OK' : variance > 0 ? 'OVERAGE' : 'SHORTAGE',
          };
        })
        .filter((v: any) => v.variance !== 0)
        .sort((a: any, b: any) => Math.abs(b.variance) - Math.abs(a.variance));

      const summary = {
        countId,
        countCode: count.code,
        totalItems: count.countItems.length,
        itemsOK: count.countItems.filter(
          (i: any) => Number(i.countedQty) === Number(i.systemQty)
        ).length,
        itemsWithVariance: variances.length,
        totalSystemQty: count.countItems.reduce(
          (sum: number, i: any) => sum + Number(i.systemQty),
          0
        ),
        totalCountedQty: count.countItems.reduce(
          (sum: number, i: any) => sum + Number(i.countedQty),
          0
        ),
        totalVariance: variances.reduce((sum: number, v: any) => sum + v.variance, 0),
        overages: variances
          .filter((v: any) => v.variance > 0)
          .reduce((sum: number, v: any) => sum + v.variance, 0),
        shortages: Math.abs(
          variances
            .filter((v: any) => v.variance < 0)
            .reduce((sum: number, v: any) => sum + v.variance, 0)
        ),
      };

      return {
        summary,
        variances: variances.slice(0, 20), // Top 20 varianzas
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Failed to get variance summary: ${error.message}`);
    }
  }

  /**
   * Descartar un conteo
   */
  async discardCount(countId: string, companyId: string): Promise<void> {
    try {
      const count = await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
      });

      if (!count || count.companyId !== companyId) {
        throw new AppError(404, 'Count not found');
      }

      // Solo se puede descartar si está en DRAFT o IN_PROGRESS
      if (!['DRAFT', 'IN_PROGRESS'].includes(count.status)) {
        throw new AppError(400, `Cannot discard count in ${count.status} status`);
      }

      // Eliminar items
      await (this.fastify.prisma as any).inventoryCount_Item.deleteMany({
        where: { countId },
      });

      // Eliminar conteo
      await (this.fastify.prisma as any).inventoryCount.delete({
        where: { id: countId },
      });

      // Registrar en audit log
      await this.fastify.auditLog({
        action: 'DELETE',
        userId: 'system',
        companyId,
        resourceId: countId,
        resource: 'InventoryCount',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Failed to discard count: ${error.message}`);
    }
  }
}

export async function createPhysicalCountService(fastify: FastifyInstance) {
  return new PhysicalCountService(fastify);
}
