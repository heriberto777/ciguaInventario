import { FastifyInstance } from 'fastify';
import { InventoryCountRepository } from './repository';
import { CreateInventoryCountDTO, AddCountItemDTO, UpdateCountItemDTO } from './schema';
import { AppError } from '../../utils/errors';
import { ERPDataLoaderService } from './erp-data-loader.service';
import { CountStateService } from './count-state.service';
import { ExcelCountItem } from './excel-loader';
import { ExcelExporterService } from './excel-exporter.service';

/**
 * InventoryCountService — Responsabilidad: operaciones CRUD del conteo e items.
 *
 * La gestión de estado se delega a CountStateService.
 * La carga de datos ERP se delega a ERPDataLoaderService.
 */
export class InventoryCountService {
  private repository: InventoryCountRepository;

  /** Sub-servicios públicos para que el controller pueda accederlos directamente */
  readonly erpLoader: ERPDataLoaderService;
  readonly countState: CountStateService;
  readonly excelExporter: ExcelExporterService;

  constructor(private fastify: FastifyInstance) {
    this.repository = new InventoryCountRepository(fastify);
    this.erpLoader = new ERPDataLoaderService(fastify);
    this.countState = new CountStateService(fastify);
    this.excelExporter = new ExcelExporterService(fastify);
  }

  // ── CRUD Conteos ─────────────────────────────────────────────────────────

  async createCount(companyId: string, warehouseId: string, description?: string) {
    const warehouse = await this.repository.findWarehouseById(warehouseId, companyId);
    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }

    const count = await this.repository.createCount(companyId, warehouseId, description);
    return this.getCountById(count.id, companyId);
  }

  async getCountById(id: string, companyId: string) {
    const count = await this.repository.getCountById(id, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }
    return count;
  }

  async listCounts(companyId: string, warehouseId?: string, status?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    return this.repository.listCounts(companyId, warehouseId, status, skip, pageSize);
  }

  async deleteCount(id: string, companyId: string) {
    const count = await this.getCountById(id, companyId);
    if (count.status === 'COMPLETED') {
      throw new AppError(400, 'Cannot delete a completed count');
    }
    return this.repository.deleteCount(id);
  }

  async completeCount(id: string, companyId: string, approvedBy?: string) {
    const count = await this.getCountById(id, companyId);
    if (count.status === 'COMPLETED') {
      throw new AppError(400, 'Count is already completed');
    }
    if (count.countItems.length === 0) {
      throw new AppError(400, 'Cannot complete a count with no items');
    }
    return this.repository.completeCount(id, approvedBy);
  }

  // ── CRUD Items ───────────────────────────────────────────────────────────

  async addCountItem(countId: string, companyId: string, data: AddCountItemDTO) {
    const count = await this.getCountById(countId, companyId);

    if (count.status !== 'DRAFT' && count.status !== 'IN_PROGRESS') {
      throw new AppError(400, 'Cannot add items to a completed count');
    }

    if (count.status === 'DRAFT') {
      await this.repository.updateCountStatus(countId, 'IN_PROGRESS');
    }

    const location = await this.repository.findLocationById(data.locationId);
    if (!location) {
      throw new AppError(404, 'Location not found');
    }

    const existing = count.countItems.find(
      (item: { locationId: string; itemCode: string }) =>
        item.locationId === data.locationId && item.itemCode === data.itemCode
    );
    if (existing) {
      throw new AppError(400, 'Item already exists in this location for this count');
    }

    return this.repository.addCountItem(countId, data);
  }

  async updateCountItem(id: string, companyId: string, data: UpdateCountItemDTO) {
    const countItem = await this.repository.getCountItem(id);
    if (!countItem) {
      throw new AppError(404, 'Count item not found');
    }
    const count = await this.getCountById(countItem.countId, companyId);
    if (count.status === 'COMPLETED') {
      throw new AppError(400, 'Cannot modify items in a completed count');
    }
    return this.repository.updateCountItem(id, data);
  }

  async deleteCountItem(id: string, companyId: string) {
    const countItem = await this.repository.getCountItem(id);
    if (!countItem) {
      throw new AppError(404, 'Count item not found');
    }
    const count = await this.getCountById(countItem.countId, companyId);
    if (count.status === 'COMPLETED') {
      throw new AppError(400, 'Cannot delete items from a completed count');
    }
    return this.repository.deleteCountItem(id);
  }

  // ── Delegación a sub-servicios (mantiene compatibilidad con el controller) ──

  /** @see ERPDataLoaderService.loadCountFromMapping */
  async loadCountFromMapping(companyId: string, countId: string, warehouseId: string, mappingId: string, locationId: string) {
    return this.erpLoader.loadCountFromMapping(companyId, countId, warehouseId, mappingId, locationId);
  }

  /** @see ERPDataLoaderService.prepareCountItems */
  async prepareCountItems(companyId: string, countId: string, warehouseId: string, locationId?: string) {
    return this.erpLoader.prepareCountItems(companyId, countId, warehouseId, locationId);
  }

  /** @see CountStateService.getActiveCountByWarehouse */
  async getActiveCountByWarehouse(companyId: string, warehouseId: string) {
    return this.countState.getActiveCountByWarehouse(companyId, warehouseId);
  }

  /** @see CountStateService.createNewInventoryCount */
  async createNewInventoryCount(companyId: string, warehouseId: string, mappingConfigId: string, createdBy: string) {
    return this.countState.createNewInventoryCount(companyId, warehouseId, mappingConfigId, createdBy);
  }

  /** @see CountStateService.startInventoryCount */
  async startInventoryCount(countId: string, companyId: string, userId: string) {
    return this.countState.startInventoryCount(countId, companyId, userId);
  }

  /** @see CountStateService.completeInventoryCount */
  async completeInventoryCount(countId: string, companyId: string, userId: string) {
    return this.countState.completeInventoryCount(countId, companyId, userId);
  }

  /** @see CountStateService.pauseInventoryCount */
  async pauseInventoryCount(countId: string, companyId: string) {
    return this.countState.pauseInventoryCount(countId, companyId);
  }

  /** @see CountStateService.resumeInventoryCount */
  async resumeInventoryCount(countId: string, companyId: string) {
    return this.countState.resumeInventoryCount(countId, companyId);
  }

  /** @see CountStateService.closeInventoryCount */
  async closeInventoryCount(countId: string, companyId: string, userId: string) {
    return this.countState.closeInventoryCount(countId, companyId, userId);
  }

  /** @see CountStateService.cancelInventoryCount */
  async cancelInventoryCount(countId: string, companyId: string, userId: string) {
    return this.countState.cancelInventoryCount(countId, companyId, userId);
  }

  /** @see CountStateService.reactivateInventoryCount */
  async reactivateInventoryCount(countId: string, companyId: string, userId: string) {
    return this.countState.reactivateInventoryCount(countId, companyId, userId);
  }

  /** @see CountStateService.deleteInventoryCount */
  async deleteInventoryCount(countId: string, companyId: string) {
    return this.countState.deleteInventoryCount(countId, companyId);
  }

  /** @see CountStateService.sendToERP */
  async sendToERP(countId: string, companyId: string, userId: string) {
    return this.countState.sendToERP(countId, companyId, userId);
  }

  /** @see CountStateService.finalizeInventoryCount */
  async finalizeInventoryCount(countId: string, companyId: string, userId: string) {
    return this.countState.finalizeInventoryCount(countId, companyId, userId);
  }

  /**
   * Carga masiva de artículos desde un Excel parseado.
   * Usa upsert: si el itemCode ya existe en el conteo, lo omite (no sobreescribe la cantidad contada).
   */
  async bulkLoadItemsFromExcel(
    countId: string,
    companyId: string,
    items: ExcelCountItem[],
  ): Promise<{ loaded: number; skipped: number }> {
    const count = await this.getCountById(countId, companyId);

    // Obtener la ubicación por defecto del almacén del conteo
    const defaultLocation = await this.fastify.prisma.warehouse_Location.findFirst({
      where: { warehouseId: count.warehouseId, isActive: true },
    });

    if (!defaultLocation) {
      throw new AppError(400, 'El almacén del conteo no tiene ubicaciones activas configuradas');
    }

    const locationId = defaultLocation.id;

    // Obtener códigos ya cargados para evitar duplicados
    const existingCodes = new Set(
      count.countItems.map((i: { itemCode: string }) => i.itemCode)
    );

    let loaded = 0;
    let skipped = 0;

    for (const item of items) {
      if (existingCodes.has(item.itemCode)) {
        skipped++;
        continue;
      }

      await this.fastify.prisma.inventoryCount_Item.create({
        data: {
          countId,
          locationId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          systemQty: item.systemQty,
          uom: item.uom || 'UND',
          packQty: item.packQty || 1,
          baseUom: item.uom || 'UND',
          version: 1,
          status: 'PENDING',
          countedQty: null,
          notes: 'Cargado desde Excel',
          ...(item.category && { category: item.category }),
          ...(item.subcategory && { subcategory: item.subcategory }),
          ...(item.brand && { brand: item.brand }),
          ...(item.costPrice != null && { costPrice: item.costPrice }),
          ...(item.salePrice != null && { salePrice: item.salePrice }),
          ...(item.barCodeInv && { barCodeInv: item.barCodeInv }),
          ...(item.barCodeVt && { barCodeVt: item.barCodeVt }),
        },
      });

      existingCodes.add(item.itemCode);
      loaded++;
    }

    return { loaded, skipped };
  }
}


