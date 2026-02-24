import { AppError } from '../../utils/errors';
import { prisma } from '../../utils/db';
import { ERPConnectorFactory } from '../erp-connections/erp-connector-factory';

interface SyncItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  variancePercent: number;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  syncedAt: string;
  details: Array<{
    itemCode: string;
    itemName: string;
    systemQty: number;
    countedQty: number;
    variance: number;
    status: 'SUCCESS' | 'FAILED';
    errorMessage?: string;
  }>;
}

export class SyncToERPService {
  constructor(private fastify: any) {}

  /**
   * Obtener items pendientes de sincronización para un conteo
   * Solo retorna items con varianza (difference != 0)
   */
  async getSyncableItems(countId: string, companyId: string) {
    try {
      const count = (await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
        include: {
          warehouse: true,
          mapping: true,
          items: {
            where: { variance: { not: 0 } }, // Solo items con varianza
            include: { item: true },
          },
        },
      })) as any;

      if (!count) {
        throw new AppError(404, 'Count not found');
      }

      if (count.status !== 'COMPLETED') {
        throw new AppError(409, 'Count must be completed before syncing to ERP');
      }

      // Verificar que el conteo pertenece a la compañía del usuario
      const countOwnership = await (this.fastify.prisma as any).inventoryCount.findFirst({
        where: { id: countId, companyId },
      });

      if (!countOwnership) {
        throw new AppError(403, 'Access denied to this count');
      }

      const items: SyncItem[] = count.items.map((countItem: any) => ({
        itemId: countItem.itemId,
        itemCode: countItem.item.code,
        itemName: countItem.item.name,
        systemQty: countItem.systemQty,
        countedQty: countItem.countedQty,
        variance: countItem.variance,
        variancePercent: countItem.variancePercent,
      }));

      return {
        countId: count.id,
        countCode: count.countCode,
        warehouseId: count.warehouseId,
        warehouseName: count.warehouse.name,
        erpTableName: count.mapping.erpTableName,
        quantityField: count.mapping.quantityField,
        itemsToSync: items,
        totalVariance: items.reduce((sum, item) => sum + item.variance, 0),
        totalItems: items.length,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new AppError(500, 'Failed to get syncable items');
    }
  }

  /**
   * Sincronizar varianzas al ERP
   * Actualiza las cantidades en Catelli según las diferencias encontradas
   */
  async syncToERP(countId: string, companyId: string, input: { updateStrategy: 'REPLACE' | 'ADD' }): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Obtener conteo y items
      const count = (await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
        include: {
          warehouse: true,
          connection: true,
          mapping: true,
          items: {
            where: { variance: { not: 0 } },
            include: { item: true },
          },
        },
      })) as any;

      if (!count) {
        throw new AppError(404, 'Count not found');
      }

      if (count.status !== 'COMPLETED') {
        throw new AppError(409, 'Count must be completed before syncing to ERP');
      }

      // Verificar acceso a compañía
      const countOwnership = await (this.fastify.prisma as any).inventoryCount.findFirst({
        where: { id: countId, companyId },
      });

      if (!countOwnership) {
        throw new AppError(403, 'Access denied to this count');
      }

      if (!count.connection) {
        throw new AppError(400, 'ERP connection not found for this count');
      }

      // Crear connector al ERP
      const connector = ERPConnectorFactory.create({
        erpType: count.connection.type,
        host: count.connection.server,
        database: count.connection.database,
        username: count.connection.username,
        password: count.connection.password,
        port: count.connection.port || 1433,
      });

      const details: SyncResult['details'] = [];
      let itemsSynced = 0;
      let itemsFailed = 0;

      // Sincronizar cada item
      for (const countItem of count.items) {
        try {
          const newQuantity =
            input.updateStrategy === 'REPLACE' ? countItem.countedQty : countItem.systemQty + countItem.variance;

          // Construir query UPDATE
          const updateQuery = `
            UPDATE ${count.mapping.erpTableName}
            SET ${count.mapping.quantityField} = ${newQuantity}
            WHERE ${count.mapping.itemCodeField} = '${countItem.item.code}'
          `;

          // Conectar si es necesario
          await (connector as any).connect();

          // Ejecutar en ERP
          await (connector as any).executeQuery(updateQuery);

          itemsSynced++;
          details.push({
            itemCode: countItem.item.code,
            itemName: countItem.item.name,
            systemQty: countItem.systemQty,
            countedQty: countItem.countedQty,
            variance: countItem.variance,
            status: 'SUCCESS',
          });
        } catch (error: any) {
          itemsFailed++;
          details.push({
            itemCode: countItem.item.code,
            itemName: countItem.item.name,
            systemQty: countItem.systemQty,
            countedQty: countItem.countedQty,
            variance: countItem.variance,
            status: 'FAILED',
            errorMessage: error.message,
          });
        }
      }

      // Registrar sincronización
      const syncRecord = await (this.fastify.prisma as any).inventorySyncHistory.create({
        data: {
          countId,
          companyId,
          status: itemsFailed === 0 ? 'COMPLETED' : 'PARTIAL',
          itemsSynced,
          itemsFailed,
          totalItems: count.items.length,
          strategy: input.updateStrategy,
          details: JSON.stringify(details),
          syncedBy: 'system', // En real, obtendría del usuario
          syncedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });

      // Si todo fue exitoso, actualizar status del conteo a SYNCED
      if (itemsFailed === 0) {
        await (this.fastify.prisma as any).inventoryCount.update({
          where: { id: countId },
          data: { status: 'SYNCED' },
        });
      }

      return {
        success: itemsFailed === 0,
        itemsSynced,
        itemsFailed,
        syncedAt: new Date().toISOString(),
        details,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new AppError(500, 'Failed to sync to ERP');
    }
  }

  /**
   * Obtener historial de sincronizaciones
   */
  async getSyncHistory(countId: string, companyId: string) {
    try {
      // Verificar acceso al conteo
      const count = await (this.fastify.prisma as any).inventoryCount.findFirst({
        where: { id: countId, companyId },
      });

      if (!count) {
        throw new AppError(403, 'Access denied to this count');
      }

      const syncHistory = await (this.fastify.prisma as any).inventorySyncHistory.findMany({
        where: { countId },
        orderBy: { syncedAt: 'desc' },
        select: {
          id: true,
          status: true,
          itemsSynced: true,
          itemsFailed: true,
          totalItems: true,
          strategy: true,
          syncedAt: true,
          duration: true,
        },
      });

      return {
        countId,
        totalSyncs: syncHistory.length,
        syncs: syncHistory.map((sync: any) => ({
          id: sync.id,
          status: sync.status,
          itemsSynced: sync.itemsSynced,
          itemsFailed: sync.itemsFailed,
          totalItems: sync.totalItems,
          successRate: ((sync.itemsSynced / sync.totalItems) * 100).toFixed(2) + '%',
          strategy: sync.strategy,
          syncedAt: sync.syncedAt,
          duration: sync.duration + 'ms',
        })),
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new AppError(500, 'Failed to get sync history');
    }
  }

  /**
   * Obtener detalles de una sincronización específica
   */
  async getSyncDetails(syncHistoryId: string, companyId: string) {
    try {
      const syncRecord = (await (this.fastify.prisma as any).inventorySyncHistory.findUnique({
        where: { id: syncHistoryId },
      })) as any;

      if (!syncRecord) {
        throw new AppError(404, 'Sync record not found');
      }

      // Verificar acceso a la compañía
      if (syncRecord.companyId !== companyId) {
        throw new AppError(403, 'Access denied to this sync record');
      }

      const details = JSON.parse(syncRecord.details);

      return {
        id: syncRecord.id,
        countId: syncRecord.countId,
        status: syncRecord.status,
        itemsSynced: syncRecord.itemsSynced,
        itemsFailed: syncRecord.itemsFailed,
        totalItems: syncRecord.totalItems,
        successRate: ((syncRecord.itemsSynced / syncRecord.totalItems) * 100).toFixed(2) + '%',
        strategy: syncRecord.strategy,
        duration: syncRecord.duration + 'ms',
        syncedAt: syncRecord.syncedAt,
        details: details,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new AppError(500, 'Failed to get sync details');
    }
  }

  /**
   * Validar que la sincronización es posible
   * (sin hacer la sincronización real)
   */
  async validateSync(countId: string, companyId: string): Promise<{
    canSync: boolean;
    reason?: string;
    itemsToSync: number;
    totalVariance: number;
  }> {
    try {
      const count = await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
        include: {
          connection: true,
          items: {
            where: { variance: { not: 0 } },
          },
        },
      });

      if (!count) {
        return {
          canSync: false,
          reason: 'Count not found',
          itemsToSync: 0,
          totalVariance: 0,
        };
      }

      // Verificar acceso
      const countOwnership = await (this.fastify.prisma as any).inventoryCount.findFirst({
        where: { id: countId, companyId },
      });

      if (!countOwnership) {
        return {
          canSync: false,
          reason: 'Access denied',
          itemsToSync: 0,
          totalVariance: 0,
        };
      }

      if ((count as any).status !== 'COMPLETED') {
        return {
          canSync: false,
          reason: 'Count must be completed',
          itemsToSync: (count as any).items.length,
          totalVariance: (count as any).items.reduce((sum: number, item: any) => sum + item.variance, 0),
        };
      }

      if (!(count as any).connection) {
        return {
          canSync: false,
          reason: 'ERP connection not configured',
          itemsToSync: (count as any).items.length,
          totalVariance: (count as any).items.reduce((sum: number, item: any) => sum + item.variance, 0),
        };
      }

      return {
        canSync: true,
        itemsToSync: (count as any).items.length,
        totalVariance: (count as any).items.reduce((sum: number, item: any) => sum + item.variance, 0),
      };
    } catch (error: any) {
      return {
        canSync: false,
        reason: 'Validation failed',
        itemsToSync: 0,
        totalVariance: 0,
      };
    }
  }
}
