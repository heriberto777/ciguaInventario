import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';
import { ERPConnectorFactory } from '../../erp-connections';
import { formatDateForERP } from '../../../utils/date';

interface SyncItem {
    itemId: string;
    itemCode: string;
    itemName: string;
    systemQty: number;
    countedQty: number;
    variance: number;
    variancePercent: number;
    lot?: string;
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
    constructor(
        private repository: InventoryRepository,
        private logger?: any
    ) { }

    async getSyncableItems(countId: string, companyId: string) {
        const count = await this.repository.findCountWithItems(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        const versionToSync = count.finalizedVersion || count.currentVersion;
        const countItems = await this.repository.getLatestItemsByVersion(countId, versionToSync);

        const items: SyncItem[] = countItems.map((countItem: any) => {
            const systemQty = Number(countItem.systemQty);
            const countedQty = Number(countItem.countedQty || 0);
            const variance = countedQty - systemQty;
            return {
                itemId: countItem.id,
                itemCode: countItem.itemCode,
                itemName: countItem.itemName,
                systemQty,
                countedQty,
                variance,
                variancePercent: countItem.variancePercent || (systemQty !== 0 ? (variance / systemQty) * 100 : 0),
                lot: countItem.lot,
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
    }

    async syncToERP(
        countId: string,
        companyId: string,
        input: { updateStrategy: 'REPLACE' | 'ADD'; mappingId?: string; userEmail?: string }
    ): Promise<SyncResult> {
        const startTime = Date.now();
        const count = await this.repository.findCountWithItems(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        const connection = await this.repository.findERPConnectionById('', companyId); // Finds first active
        if (!connection) throw new AppError(400, 'ERP connection not found or inactive');

        let exportMapping = input.mappingId 
            ? await this.repository.findMappingConfigById(input.mappingId)
            : await this.repository.findMappingConfigByDatasetType(companyId, 'DESTINATION');

        if (!exportMapping) throw new AppError(400, 'No export mapping (DESTINATION) found');

        const connector = ERPConnectorFactory.create({
            erpType: connection.erpType, host: connection.host, database: connection.database,
            username: connection.username, password: connection.password, port: connection.port || 1433,
        });

        await connector.connect();

        try {
            const erpTableName = (exportMapping.filters as any)?.mainTable || exportMapping.sourceTables?.[0];
            if (!erpTableName) throw new AppError(400, 'Destination table not found in mapping');

            let consecutiveBase = await this.generateNextConsecutive(connector, exportMapping, erpTableName);
            const reservedInvoices = await this.repository.findReservedInvoices(countId);
            const reservedInAisleMap = new Map<string, number>();
            const reservedSeparatedMap = new Map<string, number>();

            for (const inv of reservedInvoices) {
                const targetMap = inv.type === 'SEPARATED' ? reservedSeparatedMap : reservedInAisleMap;
                for (const item of inv.items) {
                    const code = item.itemCode.trim().toUpperCase();
                    targetMap.set(code, (targetMap.get(code) || 0) + Number(item.reservedQty));
                }
            }

            const versionToSync = count.finalizedVersion || count.currentVersion;
            const itemsToSync = await this.repository.getLatestItemsByVersion(countId, versionToSync);

            const details: SyncResult['details'] = [];
            let itemsSynced = 0;
            let itemsFailed = 0;

            for (const countItem of itemsToSync) {
                try {
                    const sysQty = Number(countItem.systemQty);
                    const countQty = Number(countItem.countedQty || 0);
                    const code = countItem.itemCode.trim().toUpperCase();
                    
                    // Only subtract reservations that are still in the aisle (Pasillo)
                    // because those are the ones the auditor would have counted on the shelf.
                    const inAisleVal = reservedInAisleMap.get(code) || 0;
                    const physicalReal = countQty - inAisleVal;
                    
                    const variance = physicalReal - sysQty;
                    const newQuantity = input.updateStrategy === 'REPLACE' ? physicalReal : sysQty + variance;
                    const consecutive = this.incrementConsecutive(consecutiveBase, itemsSynced + itemsFailed);

                    const { sql, queryParams } = this.buildInsertQuery(exportMapping, erpTableName, count, countItem, newQuantity, consecutive, input.userEmail || 'system');
                    await connector.executeQuery(sql, queryParams);

                    itemsSynced++;
                    details.push({ itemCode: countItem.itemCode, itemName: countItem.itemName, systemQty: sysQty, countedQty: countQty, variance, status: 'SUCCESS' });
                } catch (error: any) {
                    itemsFailed++;
                    details.push({ itemCode: countItem.itemCode, itemName: countItem.itemName, systemQty: Number(countItem.systemQty), countedQty: Number(countItem.countedQty || 0), variance: 0, status: 'FAILED', errorMessage: error.message });
                }
            }

            const syncedAt = new Date();
            await this.repository.createSyncHistory({
                countId,
                companyId,
                version: count.finalizedVersion || count.currentVersion,
                status: itemsFailed === 0 ? 'COMPLETED' : itemsSynced > 0 ? 'PARTIAL' : 'FAILED',
                itemsSynced,
                itemsFailed,
                totalItems: itemsToSync.length,
                strategy: input.updateStrategy,
                details: JSON.stringify(details),
                syncedBy: input.userEmail || 'system',
                syncedAt,
                duration: Date.now() - startTime,
            });

            if (itemsFailed === 0) {
                await this.repository.updateCount(countId, { status: 'CLOSED', closedAt: new Date() });
            }

            return { success: itemsFailed === 0, itemsSynced, itemsFailed, syncedAt: syncedAt.toISOString(), details };
        } finally {
            await connector.disconnect();
        }
    }

    async getSyncHistory(countId: string, companyId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) throw new AppError(403, 'Access denied to this count');

        const syncs = await this.repository.findSyncHistoryByCountId(countId);
        return {
            countId,
            totalSyncs: syncs.length,
            syncs: syncs.map((s: any) => ({
                id: s.id,
                status: s.status,
                itemsSynced: s.itemsSynced,
                itemsFailed: s.itemsFailed,
                totalItems: s.totalItems,
                successRate: s.totalItems > 0 ? ((s.itemsSynced / s.totalItems) * 100).toFixed(2) + '%' : '0%',
                strategy: s.strategy,
                version: s.version,
                syncedAt: s.syncedAt,
                duration: s.duration + 'ms',
            })),
        };
    }

    async getSyncDetail(syncHistoryId: string, companyId: string) {
        const record = await this.repository.findSyncHistoryById(syncHistoryId);
        if (!record) throw new AppError(404, 'Sync record not found');
        if (record.companyId !== companyId) throw new AppError(403, 'Access denied');

        return {
            id: record.id,
            countId: record.countId,
            status: record.status,
            itemsSynced: record.itemsSynced,
            itemsFailed: record.itemsFailed,
            totalItems: record.totalItems,
            successRate: record.totalItems > 0 ? ((record.itemsSynced / record.totalItems) * 100).toFixed(2) + '%' : '0%',
            strategy: record.strategy,
            version: record.version,
            duration: record.duration + 'ms',
            syncedAt: record.syncedAt,
            details: JSON.parse(record.details || '[]'),
        };
    }

    private async generateNextConsecutive(connector: any, mapping: any, tableName: string): Promise<string> {
        const fieldMappings = Array.isArray(mapping.fieldMappings) ? mapping.fieldMappings : [];
        const consecutiveMapping = fieldMappings.find((fm: any) => (fm.transformation || fm.sourceType) === 'AUTO_GENERATE' && (fm.sourceField || fm.source) === 'CONSECUTIVE');
        let consecutiveCol = 'BOLETA';
        if (consecutiveMapping) {
            const target = consecutiveMapping.targetField || consecutiveMapping.target;
            consecutiveCol = target.split('.').pop() || target;
        }
        try {
            const query = `SELECT MAX(${consecutiveCol}) as last FROM ${tableName} WHERE ${consecutiveCol} LIKE 'B%'`;
            const result = await connector.executeQuery(query);
            const last = result[0]?.last;
            if (!last) return 'B0000001';
            const match = last.match(/\d+/);
            const currentNum = match ? parseInt(match[0]) : 0;
            return `B${String(currentNum + 1).padStart(7, '0')}`;
        } catch {
            return `B${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
        }
    }

    private incrementConsecutive(base: string, increment: number): string {
        if (increment === 0) return base;
        const match = base.match(/\d+/);
        if (!match) return base + increment;
        const numStr = match[0];
        const prefix = base.substring(0, match.index);
        const nextNum = parseInt(numStr) + increment;
        return `${prefix}${String(nextNum).padStart(numStr.length, '0')}`;
    }

    private buildInsertQuery(mapping: any, tableName: string, count: any, countItem: any, newQuantity: number, consecutive: string, userEmail: string) {
        const fieldMappings = Array.isArray(mapping.fieldMappings) ? mapping.fieldMappings : [];
        const columns: string[] = [];
        const placeholders: string[] = [];
        const queryParams: Record<string, any> = {};

        fieldMappings.forEach((fm: any, index: number) => {
            const targetRaw = fm.targetField || fm.target;
            if (!targetRaw) return;
            const targetCol = targetRaw.split('.').pop() || targetRaw;
            const sourceType = fm.transformation || fm.sourceType || 'SYSTEM_FIELD';
            const sourceKey = fm.sourceField || fm.source;
            columns.push(targetCol);
            const paramName = `p${index}`;
            placeholders.push(`@${paramName}`);
            let value: any = null;
            if (sourceType === 'CONSTANT') value = sourceKey;
            else if (sourceType === 'AUTO_GENERATE') {
                if (sourceKey === 'CONSECUTIVE') value = consecutive;
                else if (sourceKey === 'NOW') value = formatDateForERP();
                else if (sourceKey === 'USER') value = userEmail;
            } else {
                switch (sourceKey) {
                    case 'itemCode': value = countItem.itemCode.substring(0, 20); break;
                    case 'itemName': value = countItem.itemName.substring(0, 100); break;
                    case 'countedQty': value = newQuantity; break;
                    case 'systemQty': value = countItem.systemQty; break;
                    case 'warehouseCode': value = count.warehouse?.code?.substring(0, 10); break;
                    case 'uom': value = countItem.uom?.substring(0, 10); break;
                    case 'lot': value = (countItem.lot || 'ND').substring(0, 50); break;
                    default: value = null;
                }
            }
            queryParams[paramName] = value;
        });

        return { sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`, queryParams };
    }
}
