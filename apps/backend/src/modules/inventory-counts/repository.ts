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

    // Obtener reservas para este conteo
    const reservedInvoices = await this.fastify.prisma.countReservedInvoice.findMany({
      where: { countId: id },
      include: { items: true }
    });

    // Agrupar reservas por itemCode y por itemProv (Proveedor)
    // Normalizamos las llaves (Trim + UpperCase) para evitar fallos por espacios del ERP
    const reservedByCode = new Map<string, number>();
    const reservedByProv = new Map<string, number>();
    const inferredProvByCode = new Map<string, string>(); // Para "auto-conectar" items del conteo sin itemProv

    for (const inv of reservedInvoices) {
      for (const item of inv.items) {
        const itemCodeNorm = item.itemCode.trim().toUpperCase();
        const itemProvNorm = item.itemProv ? item.itemProv.trim().toUpperCase() : null;

        // Por código exacto
        const currentCode = reservedByCode.get(itemCodeNorm) || 0;
        reservedByCode.set(itemCodeNorm, currentCode + Number(item.reservedQty));

        // Por código de proveedor (si existe)
        if (itemProvNorm) {
          const currentProv = reservedByProv.get(itemProvNorm) || 0;
          reservedByProv.set(itemProvNorm, currentProv + Number(item.reservedQty));
          inferredProvByCode.set(itemCodeNorm, itemProvNorm); // Mapear código -> proveedor para inferencia
          this.fastify.log.info(`📦 [Consolidate] Mapping item ${itemCodeNorm} to itemProv ${itemProvNorm} with qty ${item.reservedQty}`);
        }
      }
    }

    // Re-query para obtener items de la versión actual
    const countWithCurrentItems = await this.fastify.prisma.inventoryCount.findFirst({
      where: { id, companyId },
      include: {
        countItems: {
          where: {
            version: count.currentVersion,
          },
          include: {
            location: true,
          },
        },
        warehouse: true,
      },
    });

    if (!countWithCurrentItems) return null;

    // Inyectar reservedQty en cada item usando lógica de alias (Proveedor)
    const mapped = this.mapCount(countWithCurrentItems);
    if (mapped.countItems) {
      mapped.countItems = mapped.countItems.map((item: any) => {
        let reservedQty = 0;
        const itemCodeNorm = item.itemCode.trim().toUpperCase();
        let itemProvNorm = item.itemProv ? item.itemProv.trim().toUpperCase() : null;

        // AUTO-INFERENCIA: Si el ítem no tiene itemProv cargado (count anterior), 
        // buscamos si en las facturas reservadas este itemCode tiene un itemProv asociado.
        if (!itemProvNorm && inferredProvByCode.has(itemCodeNorm)) {
          itemProvNorm = inferredProvByCode.get(itemCodeNorm) || null;
          if (itemProvNorm) {
            this.fastify.log.info(`💡 [Inference] Inferred itemProv ${itemProvNorm} for item ${itemCodeNorm} from reservations`);
          }
        }

        // Prioridad 1: Si el ítem del conteo tiene itemProv, buscamos por ese alias
        if (itemProvNorm && reservedByProv.has(itemProvNorm)) {
          reservedQty = reservedByProv.get(itemProvNorm) || 0;
          this.fastify.log.info(`🔗 [Match] Item ${itemCodeNorm} matched by Provider Alias: ${itemProvNorm} -> Total Pool Qty: ${reservedQty}`);
        }
        // Prioridad 2: Si no hubo coincidencia por proveedor, usamos el código exacto
        else if (reservedByCode.has(itemCodeNorm)) {
          reservedQty = reservedByCode.get(itemCodeNorm) || 0;
          this.fastify.log.info(`🔗 [Match] Item ${itemCodeNorm} matched by Exact Code. Qty: ${reservedQty}`);
        } else {
          // No match, reservedQty = 0
        }

        return {
          ...item,
          reservedQty
        };
      });
    }

    // También retornar las facturas reservadas para el detalle
    (mapped as any).reservedInvoices = reservedInvoices;

    return mapped;
  }

  async listCounts(companyId: string, warehouseId?: string, status?: string, skip = 0, take = 20) {
    const counts = await this.fastify.prisma.inventoryCount.findMany({
      where: {
        companyId,
        ...(warehouseId && { warehouseId }),
        ...(status && { status }),
      },
      skip: Math.max(0, parseInt(skip.toString(), 10)),
      take: Math.max(1, parseInt(take.toString(), 10)),
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
    const countedQty = data.countedQty ?? 0;
    const variance = countedQty - data.systemQty;
    const variancePercent = data.systemQty > 0 ? (variance / data.systemQty) * 100 : 0;

    // Obtener la compañía para el enriquecimiento
    const count = await this.fastify.prisma.inventoryCount.findUnique({
      where: { id: countId },
      select: { companyId: true }
    });
    const companyId = count?.companyId || '';

    // Enriquecer clasificaciones: Si existe una descripción oficial, usarla. Si no, preservar el valor original.
    const brand = await this.getClassificationDescription(companyId, data.brand, 'BRAND');
    const category = await this.getClassificationDescription(companyId, data.category, 'CATEGORY');
    const subcategory = await this.getClassificationDescription(companyId, data.subcategory, 'SUBCATEGORY');

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
        brand: brand || data.brand,
        category: category || data.category,
        subcategory: subcategory || data.subcategory,
        lot: data.lot,
        itemProv: data.itemProv,
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

    // Obtener los valores a guardar priorizando el DTO, luego el valor actual
    const countedQty = data.countedQty !== undefined ? data.countedQty : (current.countedQty?.toNumber() ?? 0);
    const systemQty = data.systemQty !== undefined ? data.systemQty : (current.systemQty?.toNumber() ?? 0);

    // Calcular varianza basada en los valores finales que se guardarán
    const variance = countedQty - systemQty;
    const variancePercent = systemQty > 0 ? (variance / systemQty) * 100 : 0;

    console.log(`[updateCountItem] ID: ${id}, countedQty: ${countedQty}, systemQty: ${systemQty}, variance: ${variance}`);

    const updated = await this.fastify.prisma.inventoryCount_Item.update({
      where: { id },
      data: {
        ...(data.itemCode && { itemCode: data.itemCode }),
        ...(data.itemName && { itemName: data.itemName }),
        ...(data.uom && { uom: data.uom }),
        ...(data.systemQty !== undefined && { systemQty: data.systemQty }),
        ...(data.countedQty !== undefined && { countedQty: data.countedQty }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.lot !== undefined && { lot: data.lot }),
        ...(data.itemProv !== undefined && { itemProv: data.itemProv }),
        status: data.countedQty !== undefined ? 'COUNTED' : current.status, // Actualizar estado a COUNTED si se envió cantidad
      },
    });

    // Actualizar o crear reporte de varianza
    const varianceReport = await this.fastify.prisma.varianceReport.findFirst({
      where: { countItemId: id },
    });

    if (varianceReport) {
      await this.fastify.prisma.varianceReport.update({
        where: { id: varianceReport.id },
        data: {
          countedQty: countedQty,
          difference: variance,
          variancePercent,
        },
      });
    } else if (variance !== 0) {
      const count = await this.fastify.prisma.inventoryCount.findUnique({
        where: { id: updated.countId },
      });
      await this.fastify.prisma.varianceReport.create({
        data: {
          companyId: count!.companyId,
          countId: updated.countId,
          countItemId: id,
          itemCode: updated.itemCode,
          itemName: updated.itemName,
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
    // Obtener la compañía para el enriquecimiento
    const count = await this.fastify.prisma.inventoryCount.findUnique({
      where: { id: countId },
      select: { companyId: true }
    });
    const companyId = count?.companyId || '';

    // Enriquecer clasificaciones
    const brand = await this.getClassificationDescription(companyId, data.brand, 'BRAND');
    const category = await this.getClassificationDescription(companyId, data.category, 'CATEGORY');
    const subcategory = await this.getClassificationDescription(companyId, data.subcategory, 'SUBCATEGORY');

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
        countedQty: null,
        status: 'PENDING',
        notes: data.notes,
        ...(data.costPrice != null && { costPrice: data.costPrice }),
        ...(data.salePrice != null && { salePrice: data.salePrice }),
        ...(data.barCodeInv && { barCodeInv: data.barCodeInv }),
        ...(data.barCodeVt && { barCodeVt: data.barCodeVt }),
        brand: brand || data.brand,
        category: category || data.category,
        subcategory: subcategory || data.subcategory,
        lot: data.lot,
        itemProv: data.itemProv,
      },
    });
  }

  /**
   * Obtiene la descripción de una clasificación basada en su código y tipo.
   * Si no se encuentra, retorna null.
   */
  private async getClassificationDescription(companyId: string, code: string | undefined, groupType: string): Promise<string | null> {
    if (!code || !companyId || code.trim() === '') return null;

    const classification = await this.fastify.prisma.itemClassification.findFirst({
      where: {
        companyId,
        code: code.trim().toUpperCase(),
        groupType: groupType as any,
      },
      select: { description: true }
    });

    return classification?.description || null;
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

  /**
   * Obtiene la lista consolidada de items para un conteo, tomando la versión más reciente
   * disponible para cada combinación de itemCode + locationId.
   */
  async getLatestItemsByVersion(countId: string, maxVersion: number) {
    const allItems = await this.fastify.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        version: { lte: maxVersion },
      },
      orderBy: [
        { itemCode: 'asc' },
        { locationId: 'asc' },
        { version: 'desc' },
      ],
      include: {
        location: true,
      }
    });

    // Consolidar: Al estar ordenado por versión desc, el primero que encontremos para cada par
    // (itemCode, locationId) es el más reciente de ese ítem.
    const seen = new Set<string>();
    const consolidated = allItems.filter((item: any) => {
      const key = `${item.itemCode}-${item.locationId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return consolidated.map((item: any) => this.mapCountItem(item));
  }
}
