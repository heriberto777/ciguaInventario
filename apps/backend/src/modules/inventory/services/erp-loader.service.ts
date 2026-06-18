import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';
import { ERPConnectorFactory } from '../../erp-connections';
import { ERPIntrospectionService } from '../../erp-connections/erp-introspection';
import { LoadInventoryFromERPService } from './load-from-erp.service';

export class ERPLoaderService {
    constructor(
        private repository: InventoryRepository,
        private logger?: any
    ) { }

    /**
     * Carga artículos al conteo desde un mapping específico.
     */
    async loadCountFromMapping(
        companyId: string,
        countId: string,
        warehouseId: string,
        mappingId: string,
        locationId: string,
        itemCodes?: string[]
    ) {
        if (this.logger) this.logger.info(`📌 [loadCountFromMapping] Starting for count: ${countId}, mapping: ${mappingId}`);

        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, `Count ${countId} not found`);
        }

        const mapping = await this.repository.findMappingConfigById(mappingId);
        if (!mapping || !mapping.isActive) {
            throw new AppError(404, 'Mapping not found or not active');
        }

        const erpConnection = await this.repository.findERPConnectionById(mapping.erpConnectionId, companyId);
        if (!erpConnection) {
            throw new AppError(404, 'ERP Connection not found');
        }

        const connector = ERPConnectorFactory.create({
            erpType: erpConnection.erpType,
            host: erpConnection.host,
            port: erpConnection.port,
            database: erpConnection.database,
            username: erpConnection.username,
            password: erpConnection.password,
        });

        await connector.connect();

        try {
            const loadService = new LoadInventoryFromERPService(this.repository, this.logger);

            let mappingWithFilters: any = { ...mapping };
            if (itemCodes && itemCodes.length > 0) {
                const fieldMappings = Array.isArray(mapping.fieldMappings) ? (mapping.fieldMappings as any[]) : [];
                const itemCodeMapping = fieldMappings.find((m: any) => m.target === 'itemCode');
                if (itemCodeMapping) {
                    const newFilters = [{ field: itemCodeMapping.source, operator: 'IN', value: itemCodes }];
                    mappingWithFilters = this.mergeFiltersIntoMapping(mapping, newFilters);
                }
            }

            const { sql } = loadService.buildQueryFromMapping(mappingWithFilters);
            const introspection = new ERPIntrospectionService(connector);
            const erpData = await introspection.previewQuery(sql, 10000);

            if (erpData.length === 0) return { countId, itemsLoaded: 0, items: [] };

            const items = loadService.transformData(erpData, mapping);
            
            // Deduplicación
            const itemMap = new Map<string, any>();
            for (const item of items) {
                const key = item.itemCode;
                if (!key) continue;
                const existing = itemMap.get(key);
                if (existing) {
                    existing.systemQty = (existing.systemQty || 0) + (item.systemQty || 0);
                } else {
                    itemMap.set(key, { ...item });
                }
            }

            const uniqueItems = Array.from(itemMap.values());
            let insertedCount = 0;

            // 🛠️ PREVENIR BORRADO DE CONTEOS:
            // Obtener locationId reales de los items existentes para asegurar que el upsert haga MATCH
            // y haga UPDATE (preservando countedQty) en vez de CREATE (que lo resetea a null)
            const existingItems = await this.repository.findItemsByCountId(countId);
            const existingLocationsMap = new Map<string, string>();
            for (const existing of existingItems) {
                if (existing.version === count.currentVersion) {
                    existingLocationsMap.set(existing.itemCode, existing.locationId);
                }
            }

            for (const item of uniqueItems) {
                try {
                    const itemLocationId = existingLocationsMap.get(item.itemCode) || locationId;
                    
                    await this.repository.upsertInventoryCountItem(countId, itemLocationId, item.itemCode, count.currentVersion, {
                        itemName: item.itemName || item.itemCode,
                        uom: item.uom || 'PZ',
                        baseUom: item.baseUom || 'PZ',
                        packQty: item.packQty ?? 1,
                        systemQty: item.systemQty ?? 0,
                        countedQty: null, // Solo se aplica si hace CREATE. En UPDATE, el repository lo ignora.
                        status: 'PENDING',
                        notes: `Auto-loaded from ${mapping.datasetType} mapping`,
                        costPrice: item.costPrice,
                        salePrice: item.salePrice,
                        barCodeInv: item.barCodeInv,
                        barCodeVt: item.barCodeVt,
                        brand: item.brand,
                        category: item.category,
                        subcategory: item.subcategory,
                        lot: item.lot,
                        itemProv: item.itemProv,
                    });
                    insertedCount++;
                } catch (itemError) {
                    if (this.logger) this.logger.error(`❌ [loadCountFromMapping] Error upserting item ${item.itemCode}`);
                }
            }

            return { countId, itemsLoaded: insertedCount, items: uniqueItems.slice(0, 10) };

        } finally {
            await connector.disconnect();
        }
    }

    /**
     * Previsualiza artículos del ERP.
     */
    async previewFilteredItems(companyId: string, params: any) {
        const mapping = await this.repository.findMappingConfigById(params.mappingId);
        if (!mapping || mapping.companyId !== companyId) throw new AppError(404, 'Mapping not found');

        const connection = await this.repository.findERPConnectionById(mapping.erpConnectionId, companyId);
        if (!connection) throw new AppError(404, 'ERP Connection not found');

        const connector = ERPConnectorFactory.create({
            erpType: connection.erpType, host: connection.host, port: connection.port,
            database: connection.database, username: connection.username, password: connection.password,
        });

        await connector.connect();
        try {
            const loadService = new LoadInventoryFromERPService(this.repository, this.logger);
            let fieldMappings = mapping.fieldMappings;
            if (typeof fieldMappings === 'string') {
                try {
                    fieldMappings = JSON.parse(fieldMappings);
                } catch (e) {
                    fieldMappings = [];
                }
            }
            const fieldMappingsArray = Array.isArray(fieldMappings) ? (fieldMappings as any[]) : [];
            const newFilters: any[] = [];

            if (params.category) {
                const match = fieldMappingsArray.find((m: any) => m.target === 'category');
                if (match) newFilters.push({ field: match.source, operator: Array.isArray(params.category) ? 'IN' : '=', value: params.category });
            }
            if (params.brand) {
                const match = fieldMappingsArray.find((m: any) => m.target === 'brand');
                if (match) newFilters.push({ field: match.source, operator: Array.isArray(params.brand) ? 'IN' : '=', value: params.brand });
            }

            if (params.search) {
                const escapedSearch = String(params.search).replace(/'/g, "''");
                let itemCodeSource: string | undefined;
                let itemNameSource: string | undefined;

                if (Array.isArray(fieldMappings)) {
                    itemCodeSource = fieldMappings.find((m: any) => m.target === 'itemCode')?.source;
                    itemNameSource = fieldMappings.find((m: any) => m.target === 'itemName')?.source;
                } else if (typeof fieldMappings === 'object' && fieldMappings !== null) {
                    itemCodeSource = (fieldMappings as any).itemCode;
                    itemNameSource = (fieldMappings as any).itemName;
                }

                const fieldsToSearch = [itemCodeSource, itemNameSource].filter(Boolean);
                if (fieldsToSearch.length > 0) {
                    newFilters.push({
                        field: 'search_term',
                        operator: 'OR_LIKE',
                        value: {
                            search: `%${escapedSearch}%`,
                            fields: fieldsToSearch
                        }
                    });
                }
            }

            const mappingWithFilters = this.mergeFiltersIntoMapping(mapping, newFilters);
            let { sql } = loadService.buildQueryFromMapping(mappingWithFilters);

            if (params.randomLimit) {
                if (connection.erpType === 'MSSQL') {
                    sql = sql.replace(/SELECT/i, `SELECT TOP ${params.randomLimit}`) + ' ORDER BY NEWID()';
                } else {
                    sql += ` ORDER BY RANDOM() LIMIT ${params.randomLimit}`;
                }
            }

            const introspection = new ERPIntrospectionService(connector);
            const rawData = await introspection.previewQuery(sql, params.randomLimit || 1000);
            const transformed = loadService.transformData(rawData, mapping);

            return { totalFound: transformed.length, items: transformed.slice(0, 100) };
        } finally {
            await connector.disconnect();
        }
    }

    private mergeFiltersIntoMapping(mapping: any, newFilters: any[]): any {
        const mappingWithFilters: any = { ...mapping };
        const originalFilters = mapping.filters;
        if (Array.isArray(originalFilters)) {
            const normalizedArray = [...(originalFilters as any[])];
            let merged = false;
            for (let i = 0; i < normalizedArray.length; i++) {
                const element = normalizedArray[i];
                if (Array.isArray(element) && element.length > 0 && element[0].field) {
                    normalizedArray[i] = [...element, ...newFilters];
                    merged = true; break;
                }
            }
            if (!merged) normalizedArray.push(newFilters);
            mappingWithFilters.filters = normalizedArray;
        } else if (typeof originalFilters === 'object' && originalFilters !== null) {
            const normalizedObj = { ...originalFilters };
            normalizedObj.filters = Array.isArray(normalizedObj.filters) ? [...normalizedObj.filters, ...newFilters] : newFilters;
            mappingWithFilters.filters = normalizedObj;
        } else {
            mappingWithFilters.filters = newFilters;
        }
        return mappingWithFilters;
    }
}
