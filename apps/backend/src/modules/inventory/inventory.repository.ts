export interface InventoryRepository {
  findCountById(id: string): Promise<any>;
  findCountWithItems(id: string, itemsFilter?: any): Promise<any>;
  findAllCounts(companyId: string, filters?: any): Promise<any>;
  createCount(data: any): Promise<any>;
  updateCount(countId: string, data: any): Promise<any>;
  updateCountStatus(countId: string, status: string): Promise<any>;
  deleteCount(id: string): Promise<any>;
  findCountByCompany(companyId: string, orderBy?: any): Promise<any>;

  findItemById(id: string): Promise<any>;
  findItemsByCountId(countId: string): Promise<any[]>;
  getCountItemsWithLocation(countId: string): Promise<any[]>;
  updateItemCount(itemId: string, data: any): Promise<any>;
  createInventoryCountItem(data: any): Promise<any>;
  upsertInventoryCountItem(countId: string, locationId: string, itemCode: string, version: number, data: any): Promise<any>;
  deleteItemsByCountId(countId: string): Promise<any>;
  getLatestItemsByVersion(countId: string, maxVersion: number): Promise<any[]>;

  findReservedInvoices(countId: string): Promise<any[]>;
  reserveInvoice(countId: string, data: any): Promise<any>;
  findReservedItems(countId: string): Promise<any[]>;

  findMappingConfigById(id: string): Promise<any>;
  findWarehouseById(id: string): Promise<any>;
  findLocationsByWarehouseId(warehouseId: string): Promise<any[]>;
  createLocation(data: any): Promise<any>;
  findClassificationDescription(companyId: string, code: string, groupType: string): Promise<string | null>;
  findItemById(id: string): Promise<any>;
  deleteItemById(id: string): Promise<any>;

  upsertVarianceReport(data: any): Promise<any>;
  deleteVarianceReportsByCountId(countId: string, version?: number, itemId?: string): Promise<any>;
  findVarianceReportsByCountId(countId: string): Promise<any[]>;
  deleteSyncHistoryByCountId(countId: string): Promise<any>;

  findMappingConfigByDatasetType(companyId: string, datasetType: string): Promise<any>;
  findERPConnectionById(id: string, companyId: string): Promise<any>;
  upsertReservedInvoice(countId: string, invoiceNumber: string, data: any): Promise<any>;
  deleteReservedItemsByInvoiceId(invoiceId: string): Promise<any>;
  createReservedItems(data: any[]): Promise<any>;
  deleteReservedInvoice(id: string, countId: string): Promise<any>;

  findVarianceItemsByVersion(countId: string, version: number): Promise<any[]>;
  createInventoryCountItems(data: any[]): Promise<any>;
}

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private prisma: any, private logger?: any) {}

  // ── Conteos (Counts) ────────────────────────────────────────────────────────

  async findCountById(id: string) {
    const count = await this.prisma.inventoryCount.findUnique({
      where: { id },
      select: { currentVersion: true }
    });
    
    return await this.prisma.inventoryCount.findUnique({
      where: { id },
      include: { 
        warehouse: true,
        countItems: {
          where: { version: count?.currentVersion || 1 },
          include: { location: true }
        },
        reservedInvoices: {
          include: { items: true }
        }
      }
    });
  }

  async findCountWithItems(id: string, itemsFilter?: any) {
    const countMeta = await this.prisma.inventoryCount.findUnique({
      where: { id },
      select: { currentVersion: true }
    });
    const version = countMeta?.currentVersion || 1;

    const versionFilter = { version, ...(itemsFilter || {}) };

    return await this.prisma.inventoryCount.findUnique({
      where: { id },
      include: {
        countItems: { where: versionFilter },
        reservedInvoices: {
          include: { items: true }
        }
      }
    });
  }

  async findAllCounts(companyId: string, filters: any = {}) {
    const { warehouseId, status, skip = 0, take = 20 } = filters;
    return await this.prisma.inventoryCount.findMany({
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
      orderBy: { createdAt: 'desc' }
    });
  }

  async createCount(data: any) {
    if (!data.sequenceNumber) {
      data.sequenceNumber = await this.generateSequenceNumber();
    }
    return await this.prisma.inventoryCount.create({ 
      data,
      include: { countItems: true }
    });
  }

  async updateCount(countId: string, data: any) {
    return await this.prisma.inventoryCount.update({
      where: { id: countId },
      data,
      include: { countItems: true }
    });
  }

  async updateCountStatus(countId: string, status: string) {
    return await this.prisma.inventoryCount.update({
      where: { id: countId },
      data: { 
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    });
  }

  async deleteCount(id: string) {
    return await this.prisma.inventoryCount.delete({ where: { id } });
  }

  async findCountByCompany(companyId: string, orderBy: any = { createdAt: 'desc' }) {
    return await this.prisma.inventoryCount.findFirst({
      where: { companyId },
      orderBy
    });
  }

  // ── Items del Conteo (Count Items) ──────────────────────────────────────────

  async findItemById(id: string) {
    return await this.prisma.inventoryCount_Item.findUnique({
      where: { id },
      include: { count: true, location: true }
    });
  }

  async deleteItemById(id: string) {
    return await this.prisma.inventoryCount_Item.delete({
      where: { id }
    });
  }

  async findItemsByCountId(countId: string) {
    return await this.prisma.inventoryCount_Item.findMany({
      where: { countId },
      include: { location: true }
    });
  }

  async getCountItemsWithLocation(countId: string) {
    return await this.prisma.inventoryCount_Item.findMany({
      where: { countId },
      include: { location: true },
      orderBy: [{ location: { code: 'asc' } }, { itemCode: 'asc' }],
    });
  }

  async updateItemCount(itemId: string, data: any) {
    return await this.prisma.inventoryCount_Item.update({
      where: { id: itemId },
      data
    });
  }

  async createInventoryCountItem(data: any) {
    return await this.prisma.inventoryCount_Item.create({ data });
  }

  async upsertInventoryCountItem(countId: string, locationId: string, itemCode: string, version: number, data: any) {
    // Campos que el auditor ingresa manualmente — NUNCA se sobreescriben al sincronizar desde ERP
    const { countedQty, countedBy, countedAt, status, ...erpOnlyData } = data;

    return await this.prisma.inventoryCount_Item.upsert({
      where: {
        countId_locationId_itemCode_version: { countId, locationId, itemCode, version }
      },
      create: { countId, locationId, itemCode, version, ...data },
      update: erpOnlyData
    });
  }

  async deleteItemsByCountId(countId: string) {
    return await this.prisma.inventoryCount_Item.deleteMany({
      where: { countId }
    });
  }

  async getLatestItemsByVersion(countId: string, maxVersion: number) {
    const allItems = await this.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        version: { lte: maxVersion },
      },
      orderBy: [
        { itemCode: 'asc' },
        { locationId: 'asc' },
        { version: 'desc' },
      ],
      include: { location: true }
    });

    const seen = new Set<string>();
    return allItems.filter((item: any) => {
      const key = `${item.itemCode}-${item.locationId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ── Reservas (Reservations) ────────────────────────────────────────────────

  async findReservedInvoices(countId: string) {
    return await this.prisma.countReservedInvoice.findMany({
      where: { countId },
      include: { items: true }
    });
  }

  async reserveInvoice(countId: string, data: any) {
    return await this.prisma.countReservedInvoice.create({
      data: { ...data, countId }
    });
  }

  async findReservedItems(countId: string) {
    return await this.prisma.countReservedItem.findMany({
      where: { countId }
    });
  }

  // ── Configuraciones y Maestros (Config & Masters) ──────────────────────────

  async findMappingConfigById(id: string) {
    return await this.prisma.mappingConfig.findUnique({ where: { id } });
  }

  async findWarehouseById(id: string) {
    return await this.prisma.warehouse.findUnique({ where: { id } });
  }

  async findLocationsByWarehouseId(warehouseId: string) {
    return await this.prisma.warehouse_Location.findMany({
      where: { warehouseId, isActive: true }
    });
  }

  async createLocation(data: any) {
    return await this.prisma.warehouse_Location.create({ data });
  }

  async findClassificationDescription(companyId: string, code: string, groupType: string) {
    if (!code) return null;
    const classification = await this.prisma.itemClassification.findFirst({
      where: {
        companyId,
        code: code.trim().toUpperCase(),
        groupType: groupType as any,
      },
      select: { description: true }
    });
    return classification?.description || null;
  }

  async upsertVarianceReport(data: any) {
    const { countId, countItemId, version, ...rest } = data;
    return await this.prisma.varianceReport.upsert({
      where: {
        countId_countItemId_version: { countId, countItemId, version }
      },
      update: rest,
      create: data
    });
  }

  async deleteVarianceReportsByCountId(countId: string, version?: number, itemId?: string) {
    return await this.prisma.varianceReport.deleteMany({
      where: {
        countId,
        ...(version != null && { version }),
        ...(itemId && { countItemId: itemId })
      }
    });
  }

  async findVarianceReportsByCountId(countId: string) {
    return await this.prisma.varianceReport.findMany({
      where: { countId }
    });
  }

  async deleteSyncHistoryByCountId(countId: string) {
    return await this.prisma.inventorySyncHistory.deleteMany({
      where: { countId }
    });
  }

  async findMappingConfigByDatasetType(companyId: string, datasetType: string) {
    return await this.prisma.mappingConfig.findFirst({
      where: { companyId, datasetType, isActive: true }
    });
  }

  async findERPConnectionById(id: string, companyId: string) {
    const where: any = { companyId, isActive: true };
    if (id) where.id = id;
    return await this.prisma.eRPConnection.findFirst({ where });
  }

  async upsertReservedInvoice(countId: string, invoiceNumber: string, data: any) {
    return await this.prisma.countReservedInvoice.upsert({
      where: {
        countId_invoiceNumber: { countId, invoiceNumber }
      },
      update: { updatedAt: new Date(), ...data },
      create: { countId, invoiceNumber, ...data }
    });
  }

  async deleteReservedItemsByInvoiceId(invoiceId: string) {
    return await this.prisma.countReservedItem.deleteMany({
      where: { invoiceId }
    });
  }

  async createReservedItems(data: any[]) {
    return await this.prisma.countReservedItem.createMany({ data });
  }

  async deleteReservedInvoice(id: string, countId: string) {
    return await this.prisma.countReservedInvoice.delete({
      where: { id, countId }
    });
  }

  async findVarianceItemsByVersion(countId: string, version: number) {
    return await this.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        variance_reports: {
          some: {
            version: version,
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
      },
      include: {
        variance_reports: { where: { version } },
      },
    });
  }

  async createInventoryCountItems(data: any[]) {
    return await this.prisma.inventoryCount_Item.createMany({ data });
  }

  // ── Helpers Privados ───────────────────────────────────────────────────────

  private async generateSequenceNumber(): Promise<string> {
    const lastCount = await this.prisma.inventoryCount.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { sequenceNumber: true },
    });

    const countNumber = lastCount ? (parseInt(lastCount.sequenceNumber.split('-').pop() || '0') + 1) : 1;
    return `CONT-${new Date().getFullYear()}-${String(countNumber).padStart(3, '0')}`;
  }
}
