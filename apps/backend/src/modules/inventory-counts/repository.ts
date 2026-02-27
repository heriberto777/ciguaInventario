import { FastifyInstance } from 'fastify';
import { CreateInventoryCountDTO, AddCountItemDTO, UpdateCountItemDTO } from './schema';

export class InventoryCountRepository {
  constructor(private fastify: FastifyInstance) { }

  async createCount(companyId: string, warehouseId: string, description?: string) {
    const countNumber = await this.getNextCountNumber(companyId);
    const code = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(countNumber).padStart(3, '0')}`;
    // sequenceNumber es único GLOBALMENTE (no por compañía)
    const sequenceNumber = `CONT-${new Date().getFullYear()}-${String(countNumber).padStart(3, '0')}`;

    return this.fastify.prisma.inventoryCount.create({
      data: {
        companyId,
        warehouseId,
        code,
        sequenceNumber, // ← AGREGADO (requerido en BD)
        description,
        status: 'DRAFT',
      },
      include: {
        countItems: true,
      },
    });
  }

  private async getNextCountNumber(companyId: string): Promise<number> {
    // Buscar el máximo sequenceNumber GLOBAL (no por compañía) para generar uno único
    const lastCount = await this.fastify.prisma.inventoryCount.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { sequenceNumber: true },
    });

    if (!lastCount || !lastCount.sequenceNumber) return 1;

    // Extraer número de "CONT-2026-001"
    const parts = lastCount.sequenceNumber.split('-');
    const lastNumber = parseInt(parts[2] || '0');
    return lastNumber + 1;
  }

  async getCountById(id: string, companyId: string) {
    const count = await this.fastify.prisma.inventoryCount.findFirst({
      where: { id, companyId },
      include: {
        countItems: {
          where: {
            // FILTRAR por versión actual del conteo
            version: {
              equals: undefined, // Será reemplazado por el query dinámico
            },
          },
          include: {
            location: true,
          },
        },
        warehouse: true,
      },
    });

    if (!count) return null;

    // Re-query para obtener items de la versión actual
    const countWithCurrentItems = await this.fastify.prisma.inventoryCount.findFirst({
      where: { id, companyId },
      include: {
        countItems: {
          where: {
            version: count.currentVersion, // FILTRAR por currentVersion
          },
          include: {
            location: true,
          },
        },
        warehouse: true,
      },
    });

    return countWithCurrentItems ? this.mapCount(countWithCurrentItems) : null;
  }

  async listCounts(companyId: string, warehouseId?: string, status?: string, skip = 0, take = 20) {
    const counts = await this.fastify.prisma.inventoryCount.findMany({
      where: {
        companyId,
        ...(warehouseId && { warehouseId }),
        ...(status && { status }),
      },
      skip,
      take,
      include: {
        warehouse: true,
        countItems: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return counts.map(count => this.mapCount(count));
  }

  async addCountItem(countId: string, data: AddCountItemDTO) {
    const countedQty = data.countedQty ?? 0;           // aún no contado → 0 por defecto
    const variance = countedQty - data.systemQty;
    const variancePercent = data.systemQty > 0 ? (variance / data.systemQty) * 100 : 0;

    console.log('[addCountItem] Creating item with data:', {
      countId,
      itemCode: data.itemCode,
      locationId: data.locationId,
      systemQty: data.systemQty,
      countedQty,
    });

    const countItem = await this.fastify.prisma.inventoryCount_Item.create({
      data: {
        countId,
        locationId: data.locationId,
        itemCode: data.itemCode,
        itemName: data.itemName,
        uom: data.uom,
        baseUom: data.baseUom ?? 'PZ',
        packQty: data.packQty ?? 1,
        systemQty: data.systemQty,
        countedQty: countedQty,
        version: 1,
        status: 'PENDING',
        notes: data.notes,
        ...(data.costPrice != null && { costPrice: data.costPrice }),
        ...(data.salePrice != null && { salePrice: data.salePrice }),
        ...(data.barCodeInv && { barCodeInv: data.barCodeInv }),
        ...(data.barCodeVt && { barCodeVt: data.barCodeVt }),
        ...(data.brand && { brand: data.brand }),
        ...(data.category && { category: data.category }),
        ...(data.subcategory && { subcategory: data.subcategory }),
      },
    });

    // Crear reporte de varianza si hay diferencia
    if (variance !== 0) {
      const count = await this.fastify.prisma.inventoryCount.findUnique({
        where: { id: countId },
      });

      await this.fastify.prisma.varianceReport.create({
        data: {
          companyId: count!.companyId,
          countId,
          countItemId: countItem.id,
          itemCode: data.itemCode,
          itemName: data.itemName,
          systemQty: data.systemQty,
          countedQty: countedQty,       // valor numérico resuelto, nunca undefined
          difference: variance,
          variancePercent,
          version: 1,
          status: 'PENDING',
        },
      });
    }

    return countItem;
  }

  async getCountItem(id: string) {
    return this.fastify.prisma.inventoryCount_Item.findUnique({
      where: { id },
      include: {
        location: true,
      },
    });
  }

  async updateCountItem(id: string, data: UpdateCountItemDTO) {
    const current = await this.getCountItem(id);
    if (!current) return null;

    const countedQty = data.countedQty ?? current.countedQty?.toNumber() ?? 0;
    const systemQty = data.systemQty ?? current.systemQty?.toNumber() ?? 0;
    const variance = countedQty - systemQty;
    const variancePercent = systemQty > 0 ? (variance / systemQty) * 100 : 0;

    const updated = await this.fastify.prisma.inventoryCount_Item.update({
      where: { id },
      data: {
        ...(data.itemCode && { itemCode: data.itemCode }),
        ...(data.itemName && { itemName: data.itemName }),
        ...(data.uom && { uom: data.uom }),
        ...(data.systemQty !== undefined && { systemQty: data.systemQty }),
        ...(data.countedQty !== undefined && { countedQty: data.countedQty }),
        ...(data.notes && { notes: data.notes }),
      },
    });

    // Actualizar reporte de varianza
    const varianceReport = await this.fastify.prisma.varianceReport.findFirst({
      where: { countItemId: id },
    });

    if (varianceReport) {
      await this.fastify.prisma.varianceReport.update({
        where: { id: varianceReport.id },
        data: {
          difference: variance,
          variancePercent,
        },
      });
    } else if (variance !== 0) {
      // Crear nuevo reporte si no existe y hay varianza
      const countItem = await this.getCountItem(id);
      await this.fastify.prisma.varianceReport.create({
        data: {
          companyId: (await this.fastify.prisma.inventoryCount.findUnique({
            where: { id: countItem!.countId },
          }))!.companyId,
          countId: countItem!.countId,
          countItemId: id,
          itemCode: countItem!.itemCode,
          itemName: countItem!.itemName,
          systemQty,
          countedQty,
          difference: variance,
          variancePercent,
          status: 'PENDING',
        },
      });
    }

    return updated;
  }

  async deleteCountItem(id: string) {
    // Eliminar varianza asociada
    await this.fastify.prisma.varianceReport.deleteMany({
      where: { countItemId: id },
    });

    return this.fastify.prisma.inventoryCount_Item.delete({
      where: { id },
    });
  }

  async completeCount(id: string, approvedBy?: string) {
    return this.fastify.prisma.inventoryCount.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: approvedBy,
        approvedBy: approvedBy,
        approvedAt: new Date(),
      },
      include: {
        countItems: true,
      },
    });
  }

  async deleteCount(id: string) {
    // Eliminar items y varianzas
    await this.fastify.prisma.inventoryCount_Item.deleteMany({
      where: { countId: id },
    });

    return this.fastify.prisma.inventoryCount.delete({
      where: { id },
    });
  }

  async createCountItem(countId: string, locationId: string, data: any) {
    return this.fastify.prisma.inventoryCount_Item.create({
      data: {
        countId,
        locationId,
        itemCode: data.itemCode,
        itemName: data.itemName,
        packQty: data.packQty ?? 1,
        uom: data.uom ?? 'PZ',
        baseUom: data.baseUom ?? 'PZ',
        systemQty: data.systemQty ?? 0,
        countedQty: null,           // El operario lo llenará en el conteo físico
        status: 'PENDING',
        notes: data.notes,
        // Campos enriquecidos — solo se insertan si el mapping los incluye
        ...(data.costPrice != null && { costPrice: data.costPrice }),
        ...(data.salePrice != null && { salePrice: data.salePrice }),
        ...(data.barCodeInv && { barCodeInv: data.barCodeInv }),
        ...(data.barCodeVt && { barCodeVt: data.barCodeVt }),
        ...(data.brand && { brand: data.brand }),
        ...(data.category && { category: data.category }),
        ...(data.subcategory && { subcategory: data.subcategory }),
      },
    });
  }


  async getCountItemByCode(countId: string, itemCode: string) {
    return this.fastify.prisma.inventoryCount_Item.findFirst({
      where: {
        countId,
        itemCode,
      },
    });
  }

  async updateCountStatus(countId: string, status: string) {
    return this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  async findWarehouseById(id: string, companyId: string) {
    return this.fastify.prisma.warehouse.findFirst({
      where: { id, companyId, isActive: true },
    });
  }

  async findLocationById(id: string) {
    return this.fastify.prisma.warehouse_Location.findFirst({
      where: { id, isActive: true },
    });
  }

  async findActiveERPConnection(companyId: string) {
    return this.fastify.prisma.eRPConnection.findFirst({
      where: { companyId, isActive: true },
    });
  }

  // Función para mapear la respuesta y convertir Decimals a números
  private mapCountItem(item: any) {
    return {
      ...item,
      systemQty: typeof item.systemQty === 'object' ? item.systemQty.toNumber() : Number(item.systemQty),
      countedQty: (item.countedQty !== null && item.countedQty !== undefined) ? (typeof item.countedQty === 'object' ? item.countedQty.toNumber() : Number(item.countedQty)) : undefined,
      packQty: typeof item.packQty === 'object' ? item.packQty.toNumber() : Number(item.packQty),
      costPrice: item.costPrice ? (typeof item.costPrice === 'object' ? item.costPrice.toNumber() : Number(item.costPrice)) : undefined,
      salePrice: item.salePrice ? (typeof item.salePrice === 'object' ? item.salePrice.toNumber() : Number(item.salePrice)) : undefined,
    };
  }

  private mapCount(count: any) {
    return {
      ...count,
      countItems: (count.countItems || []).map((item: any) => this.mapCountItem(item)),
    };
  }
}
