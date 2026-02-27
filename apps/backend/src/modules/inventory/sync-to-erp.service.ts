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
  constructor(private fastify: any) { }

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
          countItems: {
            where: { hasVariance: true }, // Versión del esquema: hasVariance: true
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
      if (count.companyId !== companyId) {
        throw new AppError(403, 'Access denied to this count');
      }

      const items: SyncItem[] = count.countItems.map((countItem: any) => {
        const systemQty = Number(countItem.systemQty);
        const countedQty = Number(countItem.countedQty || 0);
        const variance = countedQty - systemQty;

        return {
          itemId: countItem.id,
          itemCode: countItem.itemCode,
          itemName: countItem.itemName,
          systemQty,
          countedQty,
          variance: variance,
          variancePercent: systemQty !== 0 ? (variance / systemQty) * 100 : 0,
        };
      });

      return {
        countId: count.id,
        countCode: count.code,
        warehouseId: count.warehouseId,
        warehouseName: count.warehouse.name,
        itemsToSync: items,
        totalVariance: items.reduce((sum, item) => sum + item.variance, 0),
        totalItems: items.length,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      console.error('Error in getSyncableItems:', error);
      throw new AppError(500, 'Failed to get syncable items');
    }
  }

  /**
   * Sincronizar varianzas al ERP
   * Actualiza las cantidades en Catelli según las diferencias encontradas
   */
  async syncToERP(
    countId: string,
    companyId: string,
    input: { updateStrategy: 'REPLACE' | 'ADD'; mappingId?: string; userEmail?: string }
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Obtener conteo y items
      const count = (await (this.fastify.prisma as any).inventoryCount.findUnique({
        where: { id: countId },
        include: {
          warehouse: true,
          countItems: {
            where: { hasVariance: true },
          },
        },
      })) as any;

      if (!count) {
        throw new AppError(404, 'Count not found');
      }

      // Buscar conexión ERP attiva para la compañía
      const connection = await (this.fastify.prisma as any).eRPConnection.findFirst({
        where: { companyId, isActive: true },
      });

      if (!connection) {
        throw new AppError(400, 'ERP connection not found or inactive for this company');
      }

      // 1. Obtener mapping de exportación
      let exportMapping: any = null;
      if (input.mappingId) {
        exportMapping = await (this.fastify.prisma as any).mappingConfig.findUnique({
          where: { id: input.mappingId, companyId },
        });
      } else {
        // Buscar el primer mapping de tipo DESTINATION para esta compañía
        exportMapping = await (this.fastify.prisma as any).mappingConfig.findFirst({
          where: { companyId, datasetType: 'DESTINATION', isActive: true },
        });
      }

      if (!exportMapping) {
        throw new AppError(400, 'No export mapping (DESTINATION) found');
      }

      // Crear connector al ERP
      const connector = ERPConnectorFactory.create({
        erpType: connection.erpType,
        host: connection.host,
        database: connection.database,
        username: connection.username,
        password: connection.password,
        port: connection.port || 1433,
      });

      await (connector as any).connect();

      // Obtener el nombre de la tabla de destino desde el mapping
      const erpTableName = (exportMapping.filters as any)?.mainTable || exportMapping.sourceTables?.[0];
      if (!erpTableName) {
        throw new AppError(400, 'Destination table not found in mapping (filters.mainTable or sourceTables[0])');
      }

      // Generar el primer correlativo para la BOLETA/LOTE en el ERP
      let consecutiveBase = await this.generateNextConsecutive(connector, exportMapping, erpTableName);

      const details: SyncResult['details'] = [];
      let itemsSynced = 0;
      let itemsFailed = 0;

      // Sincronizar cada item
      for (const countItem of count.countItems) {
        try {
          const sysQty = Number(countItem.systemQty);
          const countQty = Number(countItem.countedQty || 0);
          const variance = countQty - sysQty;

          const newQuantity =
            input.updateStrategy === 'REPLACE' ? countQty : sysQty + variance;

          // Incrementar el correlativo para cada item si el usuario lo desea por item
          // O mantener el mismo si es por lote. Según el feedback, parece que lo quiere por item.
          // Para simplificar, generamos un correlativo que incremente el número final.
          const consecutive = this.incrementConsecutive(consecutiveBase, itemsSynced + itemsFailed);

          // FLUJO: INSERT dinámico basado en Mapping
          const { sql, queryParams } = this.buildInsertQuery(
            exportMapping,
            erpTableName,
            count,
            countItem,
            newQuantity,
            consecutive,
            input.userEmail || 'system'
          );

          // Ejecutar en ERP
          await (connector as any).executeQuery(sql, queryParams);

          itemsSynced++;
          details.push({
            itemCode: countItem.itemCode,
            itemName: countItem.itemName,
            systemQty: sysQty,
            countedQty: countQty,
            variance: variance,
            status: 'SUCCESS',
          });
        } catch (error: any) {
          itemsFailed++;
          details.push({
            itemCode: countItem.itemCode,
            itemName: countItem.itemName,
            systemQty: Number(countItem.systemQty),
            countedQty: Number(countItem.countedQty || 0),
            variance: Number(countItem.countedQty || 0) - Number(countItem.systemQty),
            status: 'FAILED',
            errorMessage: error.message,
          });
        }
      }

      // Registrar sincronización
      await (this.fastify.prisma as any).inventorySyncHistory.create({
        data: {
          countId,
          companyId,
          status: itemsFailed === 0 ? 'COMPLETED' : itemsSynced > 0 ? 'PARTIAL' : 'FAILED',
          itemsSynced,
          itemsFailed,
          totalItems: count.countItems.length,
          strategy: input.updateStrategy,
          details: JSON.stringify(details),
          syncedBy: input.userEmail || 'system',
          syncedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });

      // Si todo fue exitoso, actualizar status del conteo a CLOSED
      if (itemsFailed === 0) {
        await (this.fastify.prisma as any).inventoryCount.update({
          where: { id: countId },
          data: { status: 'CLOSED', closedAt: new Date() },
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

  /**
   * Busca el máximo actual y le suma 1.
   */
  private async generateNextConsecutive(connector: any, mapping: any, tableName: string): Promise<string> {
    const fieldMappings = Array.isArray(mapping.fieldMappings) ? mapping.fieldMappings : [];

    // Buscar cuál es la columna de destino mapeada a CONSECUTIVE
    const consecutiveMapping = fieldMappings.find((fm: any) =>
      (fm.transformation || fm.sourceType) === 'AUTO_GENERATE' &&
      (fm.sourceField || fm.source) === 'CONSECUTIVE'
    );

    let consecutiveCol = 'BOLETA';
    if (consecutiveMapping) {
      const target = consecutiveMapping.targetField || consecutiveMapping.target;
      // Si el target es 'boleta.BOLETA', extraemos solo 'BOLETA'
      consecutiveCol = target.split('.').pop() || target;
    }

    try {
      // Intentamos buscar el máximo actual.
      const query = `SELECT MAX(${consecutiveCol}) as last FROM ${tableName} WHERE ${consecutiveCol} LIKE 'B%'`;
      const result = await (connector as any).executeQuery(query);
      const last = result[0]?.last;

      if (!last) return 'B0000001';

      // Intentar extraer el número. Si no es numérico tras la 'B', generamos uno nuevo.
      const match = last.match(/\d+/);
      const currentNum = match ? parseInt(match[0]) : 0;
      return `B${String(currentNum + 1).padStart(7, '0')}`;
    } catch (error) {
      // Si falla (ej: la tabla no existe o no tiene esa columna), 
      // generamos uno basado en tiempo para no bloquear el proceso.
      const now = new Date();
      return `B${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }
  }

  /**
   * Incrementa un correlativo tipo B00000001
   */
  private incrementConsecutive(base: string, increment: number): string {
    if (increment === 0) return base;
    const match = base.match(/\d+/);
    if (!match) return base + increment;

    const numStr = match[0];
    const prefix = base.substring(0, match.index);
    const suffix = base.substring(match.index! + numStr.length);
    const nextNum = parseInt(numStr) + increment;

    return `${prefix}${String(nextNum).padStart(numStr.length, '0')}${suffix}`;
  }

  /**
   * Construye la query de INSERT dinámicamente basándose en el mapping.
   */
  private buildInsertQuery(
    mapping: any,
    tableName: string,
    count: any,
    countItem: any,
    newQuantity: number,
    consecutive: string,
    userEmail: string
  ): { sql: string; queryParams: Record<string, any> } {
    const fieldMappings = Array.isArray(mapping.fieldMappings) ? mapping.fieldMappings : [];
    const columns: string[] = [];
    const placeholders: string[] = [];
    const queryParams: Record<string, any> = {};

    fieldMappings.forEach((fm: any, index: number) => {
      const targetRaw = fm.targetField || fm.target;
      if (!targetRaw) return;

      // Extraer solo el nombre de la columna (en caso de boleta.BOLETA)
      const targetCol = targetRaw.split('.').pop() || targetRaw;

      const sourceType = fm.transformation || fm.sourceType || 'SYSTEM_FIELD';
      const sourceKey = fm.sourceField || fm.source;

      if (!targetCol) return;

      columns.push(targetCol);
      const paramName = `p${index}`;
      placeholders.push(`@${paramName}`);

      let value: any = null;

      if (sourceType === 'CONSTANT') {
        value = sourceKey;
      } else if (sourceType === 'AUTO_GENERATE') {
        if (sourceKey === 'CONSECUTIVE') value = consecutive;
        else if (sourceKey === 'NOW') value = new Date();
        else if (sourceKey === 'USER') value = userEmail;
      } else {
        // SYSTEM_FIELD
        switch (sourceKey) {
          case 'itemCode': value = (countItem.itemCode || countItem.item?.code || '').substring(0, 20); break;
          case 'itemName': value = (countItem.itemName || countItem.item?.name || '').substring(0, 100); break;
          case 'countedQty': value = newQuantity; break;
          case 'systemQty': value = (countItem as any).systemQty; break;
          case 'variance': value = (countItem as any).variance; break;
          case 'warehouseCode': value = (count as any).warehouse?.code?.substring(0, 10); break;
          case 'locationCode': value = (countItem as any).location?.code?.substring(0, 20); break;
          case 'uom': value = (countItem as any).uom?.substring(0, 10); break;
          default: value = null;
        }
      }

      queryParams[paramName] = value;
    });

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    return { sql, queryParams };
  }
}
