import { FastifyInstance } from 'fastify';
import { AppError } from '../../utils/errors';
import { ERPConnectorFactory } from '../erp-connections';
import { DynamicQueryBuilder } from '../mapping-config/query-builder';
import { LoadInventoryFromERPService, LoadedItem } from '../inventory/load-from-erp.service';
import { ERPIntrospectionService } from '../erp-connections/erp-introspection';
import { InventoryCountRepository } from './repository';
import { PreviewCountItemsDTO } from './schema';

/**
 * ERPDataLoaderService — Responsabilidad única: cargar datos desde ERP al conteo.
 *
 * Maneja:
 * - loadCountFromMapping (Opción A con mapping configurable)
 * - prepareCountItems (Opción A → B → manual fallback)
 * - loadFromMappingConfig (Opción A interna)
 * - loadFromDirectQuery (DEPRECATED — Opción B hardcodeada MVP)
 */
export class ERPDataLoaderService {
    private repository: InventoryCountRepository;

    constructor(private fastify: FastifyInstance) {
        this.repository = new InventoryCountRepository(fastify);
    }

    /**
     * Punto de entrada principal: carga artículos al conteo desde un mapping específico.
     * Usa upsert idempotente y deduplicación de filas duplicadas por JOINs del ERP.
     */
    async loadCountFromMapping(
        companyId: string,
        countId: string,
        warehouseId: string,
        mappingId: string,
        locationId: string,
        itemCodes?: string[]
    ): Promise<{ countId: string; itemsLoaded: number; items: any[] }> {
        this.fastify.log.info(`📌 [loadCountFromMapping] Starting for count: ${countId}, mapping: ${mappingId}, location: ${locationId}`);

        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, `Count ${countId} not found`);
        }

        const mapping = await this.fastify.prisma?.mappingConfig?.findFirst({
            where: { id: mappingId, companyId, isActive: true },
        });

        if (!mapping) {
            throw new AppError(404, 'Mapping not found or not active');
        }
        this.fastify.log.info(`✅ [loadCountFromMapping] Mapping found: ${mapping.datasetType} (ID: ${mapping.id})`);

        const erpConnection = await this.fastify.prisma?.eRPConnection?.findFirst({
            where: { id: mapping.erpConnectionId, companyId, isActive: true },
        });

        if (!erpConnection) {
            throw new AppError(404, 'ERP Connection not found');
        }
        this.fastify.log.info(`✅ [loadCountFromMapping] ERP Connection found: ${erpConnection.erpType} @ ${erpConnection.host}`);

        const connector = ERPConnectorFactory.create({
            erpType: erpConnection.erpType,
            host: erpConnection.host,
            port: erpConnection.port,
            database: erpConnection.database,
            username: erpConnection.username,
            password: erpConnection.password,
        });

        await connector.connect();
        this.fastify.log.info(`✅ [loadCountFromMapping] Connected to ERP`);

        try {
            const loadService = new LoadInventoryFromERPService(this.fastify);
            this.fastify.log.info(`🔍 [loadCountFromMapping] Building query from mapping...`);

            // Inyectar filtros de códigos si se proporcionan con fusión inteligente (Preserva JOINS)
            let mappingWithFilters: any = { ...mapping };
            if (itemCodes && itemCodes.length > 0) {
                const fieldMappings = Array.isArray(mapping.fieldMappings) ? (mapping.fieldMappings as any[]) : [];
                const itemCodeMapping = fieldMappings.find((m: any) => m.target === 'itemCode');
                if (itemCodeMapping) {
                    const newFilters = [{
                        field: itemCodeMapping.source,
                        operator: 'IN',
                        value: itemCodes
                    }];
                    mappingWithFilters = this.mergeFiltersIntoMapping(mapping, newFilters);
                }
            }

            const { sql } = loadService.buildQueryFromMapping(mappingWithFilters);
            this.fastify.log.info(`✅ [loadCountFromMapping] SQL generated: ${sql.substring(0, 100)}...`);

            this.fastify.log.info(`🔍 [loadCountFromMapping] Executing query on ERP...`);
            const introspection = new ERPIntrospectionService(connector);
            const erpData = await introspection.previewQuery(sql, 10000);
            this.fastify.log.info(`✅ [loadCountFromMapping] Query returned ${erpData.length} rows`);

            if (erpData.length === 0) {
                this.fastify.log.warn(`⚠️ [loadCountFromMapping] Query returned 0 rows`);
                return { countId, itemsLoaded: 0, items: [] };
            }

            this.fastify.log.info(`🔍 [loadCountFromMapping] Transforming data...`);
            const items = loadService.transformData(erpData, mapping);
            this.fastify.log.info(`✅ [loadCountFromMapping] Transformed ${items.length} items`);

            if (items.length === 0) {
                this.fastify.log.warn(`⚠️ [loadCountFromMapping] Transformation returned 0 items`);
                return { countId, itemsLoaded: 0, items: [] };
            }

            const warehouseLocation = await this.fastify.prisma?.warehouse_Location?.findFirst({
                where: { id: locationId, warehouseId, isActive: true },
            });

            if (!warehouseLocation) {
                this.fastify.log.error(`❌ [loadCountFromMapping] Location ${locationId} not found or inactive in warehouse ${warehouseId}`);
                return { countId, itemsLoaded: 0, items: [] };
            }

            this.fastify.log.info(`✅ [loadCountFromMapping] Using location: ${warehouseLocation.code} (ID: ${warehouseLocation.id}`);

            // ── Deduplicar items por itemCode (JOINs del ERP generan duplicados)
            const itemMap = new Map<string, typeof items[0]>();
            for (const item of items) {
                const key = item.itemCode;
                if (!key) continue;
                const existing = itemMap.get(key);
                if (existing) {
                    existing.systemQty = (existing.systemQty || 0) + (item.systemQty || 0);
                    if (!existing.costPrice && item.costPrice) existing.costPrice = item.costPrice;
                    if (!existing.salePrice && item.salePrice) existing.salePrice = item.salePrice;
                    if (!existing.barCodeInv && item.barCodeInv) existing.barCodeInv = item.barCodeInv;
                    if (!existing.barCodeVt && item.barCodeVt) existing.barCodeVt = item.barCodeVt;
                    if (!existing.brand && item.brand) existing.brand = item.brand;
                    if (!existing.category && item.category) existing.category = item.category;
                    if (!existing.subcategory && item.subcategory) existing.subcategory = item.subcategory;
                    if (!existing.itemProv && item.itemProv) existing.itemProv = item.itemProv;
                } else {
                    itemMap.set(key, { ...item });
                }
            }

            const uniqueItems = Array.from(itemMap.values());
            this.fastify.log.info(`✅ [loadCountFromMapping] Deduplicated: ${items.length} rows → ${uniqueItems.length} unique items`);

            // Upsert idempotente: si ya existe, actualiza; si no, crea
            this.fastify.log.info(`🔍 [loadCountFromMapping] Inserting items into count...`);
            let insertedCount = 0;

            for (const item of uniqueItems) {
                try {
                    await this.fastify.prisma.inventoryCount_Item.upsert({
                        where: {
                            countId_locationId_itemCode_version: {
                                countId,
                                locationId: warehouseLocation.id,
                                itemCode: item.itemCode,
                                version: 1,
                            },
                        },
                        create: {
                            countId,
                            locationId: warehouseLocation.id,
                            itemCode: item.itemCode,
                            itemName: item.itemName || item.itemCode,
                            uom: item.uom || 'PZ',
                            baseUom: item.baseUom || 'PZ',
                            packQty: item.packQty ?? 1,
                            systemQty: item.systemQty ?? 0,
                            countedQty: null,
                            version: 1,
                            status: 'PENDING',
                            notes: `Auto-loaded from ${mapping.datasetType} mapping`,
                            ...(item.costPrice != null && { costPrice: item.costPrice }),
                            ...(item.salePrice != null && { salePrice: item.salePrice }),
                            ...(item.barCodeInv && { barCodeInv: item.barCodeInv }),
                            ...(item.barCodeVt && { barCodeVt: item.barCodeVt }),
                            ...(item.brand && { brand: item.brand }),
                            ...(item.category && { category: item.category }),
                            ...(item.subcategory && { subcategory: item.subcategory }),
                            ...(item.lot && { lot: item.lot }),
                            ...(item.itemProv && { itemProv: item.itemProv }),
                        },
                        update: {
                            itemName: item.itemName || item.itemCode,
                            uom: item.uom || 'PZ',
                            systemQty: item.systemQty ?? 0,
                            packQty: item.packQty ?? 1,
                            notes: `Auto-loaded from ${mapping.datasetType} mapping`,
                            ...(item.costPrice != null && { costPrice: item.costPrice }),
                            ...(item.salePrice != null && { salePrice: item.salePrice }),
                            ...(item.barCodeInv && { barCodeInv: item.barCodeInv }),
                            ...(item.barCodeVt && { barCodeVt: item.barCodeVt }),
                            ...(item.brand && { brand: item.brand }),
                            ...(item.category && { category: item.category }),
                            ...(item.subcategory && { subcategory: item.subcategory }),
                            ...(item.lot && { lot: item.lot }),
                            ...(item.itemProv && { itemProv: item.itemProv }),
                        },
                    });
                    insertedCount++;
                } catch (itemError) {
                    this.fastify.log.error({ err: itemError }, `❌ [loadCountFromMapping] Error upserting item ${item.itemCode}`);
                }
            }

            this.fastify.log.info(`✅ [loadCountFromMapping] Successfully loaded ${insertedCount} items into count ${countId}`);
            return { countId, itemsLoaded: insertedCount, items: uniqueItems.slice(0, 10) };

        } catch (error) {
            this.fastify.log.error({ err: error }, `❌ [loadCountFromMapping] Failed`);
            throw error;
        } finally {
            await connector.disconnect();
            this.fastify.log.info(`✅ [loadCountFromMapping] Disconnected from ERP`);
        }
    }

    /**
     * Previsualiza artículos del ERP aplicando filtros de categoría y marca.
     * Permite selección aleatoria si se solicita.
     */
    async previewFilteredItems(
        companyId: string,
        params: PreviewCountItemsDTO
    ) {
        const mapping = await this.fastify.prisma?.mappingConfig?.findFirst({
            where: { id: params.mappingId, companyId, isActive: true },
        });

        if (!mapping) throw new AppError(404, 'Mapping not found');

        const connection = await this.fastify.prisma?.eRPConnection?.findFirst({
            where: { id: mapping.erpConnectionId, companyId, isActive: true },
        });

        if (!connection) throw new AppError(404, 'ERP Connection not found');

        const connector = ERPConnectorFactory.create({
            erpType: connection.erpType,
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password: connection.password,
        });

        await connector.connect();

        try {
            const loadService = new LoadInventoryFromERPService(this.fastify);

            // Inyectar filtros adicionales en el mapping para el builder sin perder JOINS o configuración original
            const fieldMappings = Array.isArray(mapping.fieldMappings) ? (mapping.fieldMappings as any[]) : [];
            const newFilters: any[] = [];

            if (params.category) {
                const categoryMatch = fieldMappings.find((m: any) => m.target === 'category');
                if (categoryMatch) {
                    const operator = Array.isArray(params.category) ? 'IN' : '=';
                    newFilters.push({ field: categoryMatch.source, operator, value: params.category });
                }
            }

            if (params.brand) {
                const brandMatch = fieldMappings.find((m: any) => m.target === 'brand');
                if (brandMatch) {
                    const operator = Array.isArray(params.brand) ? 'IN' : '=';
                    newFilters.push({ field: brandMatch.source, operator, value: params.brand });
                }
            }

            const mappingWithFilters = this.mergeFiltersIntoMapping(mapping, newFilters);

            let { sql } = loadService.buildQueryFromMapping(mappingWithFilters);

            // Manejar aleatorización y límite en el motor de BD si es posible
            if (params.randomLimit) {
                if (connection.erpType === 'MSSQL') {
                    // MSSQL: Reemplazar SELECT por SELECT TOP N y ORDER BY NEWID()
                    sql = sql.replace(/SELECT/i, `SELECT TOP ${params.randomLimit}`);
                    sql += ' ORDER BY NEWID()';
                } else if (connection.erpType === 'MYSQL' || connection.erpType === 'POSTGRESQL') {
                    sql += ` ORDER BY RANDOM() LIMIT ${params.randomLimit}`;
                }
            }

            const introspection = new ERPIntrospectionService(connector);
            const rawData = await introspection.previewQuery(sql, params.randomLimit || 1000);
            const transformed = loadService.transformData(rawData, mapping);

            return {
                totalFound: transformed.length,
                items: transformed.slice(0, 100), // Preview de máximo 100 para UI
            };
        } finally {
            await connector.disconnect();
        }
    }

    /**
     * Intenta cargar artículos sin mapping explícito:
     * Opción A → MappingConfig → Opción B → DirectQuery (deprecated) → fallback manual
     */
    async prepareCountItems(
        companyId: string,
        countId: string,
        warehouseId: string,
        locationId?: string
    ) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Inventory count not found');
        }

        // Opción A: MappingConfig configurable (recomendada)
        try {
            const hasMappingConfig = await this.checkMappingConfigs(companyId);
            if (hasMappingConfig) {
                this.fastify.log.info('📍 Using Option A: MappingConfig (Flexible Configuration)');
                return await this.loadFromMappingConfig(companyId, countId, warehouseId, locationId);
            }
        } catch (error) {
            this.fastify.log.warn(`⚠️ Option A failed: ${(error as Error).message}`);
        }

        // Opción B: Query directa (DEPRECATED — solo para MVP sin configuración)
        try {
            this.fastify.log.info('📍 Using Option B: Direct Query from Catelli (DEPRECATED MVP)');
            return await this.loadFromDirectQuery(companyId, countId, warehouseId, locationId);
        } catch (error) {
            this.fastify.log.warn(`⚠️ Option B failed: ${(error as Error).message}`);
        }

        // Fallback: entrada manual requerida
        this.fastify.log.info('📍 No auto-load available. Manual entry required.');
        return {
            countId,
            itemsLoaded: 0,
            items: [],
            summary: { totalItems: 0, totalSystemQty: 0, totalValue: 0 },
            source: 'MANUAL',
            warning: 'Auto-load no disponible. Configure MappingConfig o ERPConnection, o agregue artículos manualmente.',
        };
    }

    // ── Privados ─────────────────────────────────────────────────────────────

    private async loadFromMappingConfig(
        companyId: string,
        countId: string,
        warehouseId: string,
        locationId?: string
    ) {
        const itemsMapping = await this.fastify.prisma?.mappingConfig?.findFirst({
            where: { companyId, datasetType: 'ITEMS', isActive: true },
        });
        const stockMapping = await this.fastify.prisma?.mappingConfig?.findFirst({
            where: { companyId, datasetType: 'STOCK', isActive: true },
        });

        if (!itemsMapping || !stockMapping) {
            throw new AppError(400, 'MappingConfig incompleto. Configure ITEMS y STOCK en administración.');
        }

        const erpConnection = await this.fastify.prisma?.eRPConnection?.findFirst({
            where: { companyId, isActive: true },
        });

        if (!erpConnection) {
            throw new AppError(400, 'No active ERP connection configured');
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
            this.fastify.log.info(`📋 Building ITEMS query from MappingConfig...`);
            const itemsMappingConfig = JSON.parse(JSON.stringify(itemsMapping));
            const { sql: itemsSQL, parameters: itemsParams } = new DynamicQueryBuilder(itemsMappingConfig).build();
            this.fastify.log.info(`📋 Executing ITEMS query: ${itemsSQL.substring(0, 100)}...`);
            const itemsData = await connector.executeQuery(itemsSQL, itemsParams);

            this.fastify.log.info(`📋 Building STOCK query from MappingConfig...`);
            const stockMappingConfig = JSON.parse(JSON.stringify(stockMapping));
            if (stockMappingConfig.filters) {
                stockMappingConfig.filters.push({ field: 'eb.bodega_id', operator: '=', value: warehouseId });
            }
            const { sql: stockSQL, parameters: stockParams } = new DynamicQueryBuilder(stockMappingConfig).build();
            this.fastify.log.info(`📋 Executing STOCK query: ${stockSQL.substring(0, 100)}...`);
            const stockData = await connector.executeQuery(stockSQL, stockParams);

            const itemsMapReverse: Record<string, string> = {};
            (itemsMappingConfig.fieldMappings as any[]).forEach((fm) => {
                const target = fm.target || fm.targetField;
                if (target) itemsMapReverse[target] = target;
            });

            const stockMapReverse: Record<string, string> = {};
            (stockMappingConfig.fieldMappings as any[]).forEach((fm) => {
                const target = fm.target || fm.targetField;
                if (target) stockMapReverse[target] = target;
            });

            const stockMap = new Map<string, any>();
            for (const row of stockData) {
                stockMap.set(String(row[stockMapReverse['itemCode']] || '').toLowerCase(), row);
            }

            const normalized = itemsData.map((item: any) => ({
                itemCode: String(item[itemsMapReverse['itemCode']] || '').trim(),
                itemName: String(item[itemsMapReverse['itemName']] || '').trim(),
                packQty: Number(item[itemsMapReverse['packQty']] || 1),
                uom: String(item[itemsMapReverse['uom']] || 'PZ').trim(),
                baseUom: String(item[itemsMapReverse['baseUom']] || 'PZ').trim(),
                systemQty: Number(stockMap.get(String(item[itemsMapReverse['itemCode']] || '').toLowerCase())?.[stockMapReverse['systemQty']] || 0),
                countedQty: 0,
                costPrice: Number(item[itemsMapReverse['costPrice']] || 0),
                salePrice: Number(item[itemsMapReverse['salePrice']] || 0),
                itemProv: String(item[itemsMapReverse['itemProv']] || '').trim() || null,
                lot: String(stockMap.get(String(item[itemsMapReverse['itemCode']] || '').toLowerCase())?.[stockMapReverse['lot']] || '').trim() ||
                    String(item[itemsMapReverse['lot']] || '').trim() || null,
            }));

            for (const item of normalized) {
                const locId = locationId || (await this.getDefaultLocation(warehouseId));
                if (!locId) throw new AppError(400, 'No location available for this warehouse');
                await this.repository.createCountItem(countId, locId, item);
            }

            return {
                countId,
                itemsLoaded: normalized.length,
                items: normalized,
                summary: {
                    totalItems: normalized.length,
                    totalSystemQty: normalized.reduce((s, i) => s + i.systemQty, 0),
                    totalValue: normalized.reduce((s, i) => s + i.costPrice * i.systemQty, 0),
                },
                source: 'MAPPING_CONFIG',
            };
        } finally {
            await connector.disconnect();
        }
    }

    /**
     * @deprecated Opción B: query SQL hardcodeada para Catelli.
     * Solo para MVP sin configuración de ERP. Migrar a loadCountFromMapping con MappingConfig.
     */
    private async loadFromDirectQuery(
        companyId: string,
        countId: string,
        warehouseId: string,
        locationId?: string
    ) {
        this.fastify.log.warn(`⚠️ [loadFromDirectQuery] DEPRECATED: using hardcoded Catelli query. Migrate to MappingConfig.`);

        const connector = ERPConnectorFactory.create({
            erpType: 'MSSQL',
            host: process.env.CATELLI_HOST || 'localhost',
            port: Number(process.env.CATELLI_PORT) || 1433,
            database: process.env.CATELLI_DATABASE || 'Catelli',
            username: process.env.CATELLI_USER || 'sa',
            password: process.env.CATELLI_PASSWORD || '',
        });

        await connector.connect();

        try {
            const query = `
        SELECT
          a.codigo   AS itemCode,
          a.descripcion AS itemName,
          CAST(a.cantidad_empaque AS DECIMAL(10,2)) AS packQty,
          a.unidad_empaque AS uom,
          COALESCE(a.unidad_base, 'PZ') AS baseUom,
          COALESCE(CAST(eb.cantidad AS DECIMAL(18,4)), 0) AS systemQty,
          CAST(COALESCE(ap.costo, 0)        AS DECIMAL(18,4)) AS costPrice,
          CAST(COALESCE(ap.precio_venta, 0) AS DECIMAL(18,4)) AS salePrice
        FROM articulo a
        LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id AND eb.bodega_id = @bodegaId
        LEFT JOIN articulo_precio   ap ON a.id = ap.articulo_id
        WHERE a.estado = 'ACTIVO' AND a.codigo IS NOT NULL
        ORDER BY a.codigo
      `;

            const items = await connector.executeQuery(query, { bodegaId: warehouseId });

            if (!items?.length) {
                this.fastify.log.warn('⚠️ No items found in Catelli for this warehouse');
                return { countId, itemsLoaded: 0, items: [], summary: { totalItems: 0, totalSystemQty: 0, totalValue: 0 }, source: 'DIRECT_QUERY', warning: 'No items found in Catelli' };
            }

            const normalized = items.map((item: any) => ({
                itemCode: String(item.itemCode || '').trim(),
                itemName: String(item.itemName || '').trim(),
                packQty: Number(item.packQty || 1),
                uom: String(item.uom || 'PZ').trim(),
                baseUom: String(item.baseUom || 'PZ').trim(),
                systemQty: Number(item.systemQty || 0),
                countedQty: 0,
                costPrice: Number(item.costPrice || 0),
                salePrice: Number(item.salePrice || 0),
            }));

            for (const item of normalized) {
                const locId = locationId || await this.getDefaultLocation(warehouseId);
                if (!locId) throw new AppError(400, 'No location available for this warehouse');
                await this.repository.createCountItem(countId, locId, item);
            }

            return {
                countId,
                itemsLoaded: normalized.length,
                items: normalized,
                summary: {
                    totalItems: normalized.length,
                    totalSystemQty: normalized.reduce((s, i) => s + i.systemQty, 0),
                    totalValue: normalized.reduce((s, i) => s + i.costPrice * i.systemQty, 0),
                },
                source: 'DIRECT_QUERY',
            };
        } finally {
            await connector.disconnect();
        }
    }

    private async checkMappingConfigs(companyId: string): Promise<boolean> {
        try {
            const configs = await this.fastify.prisma?.mappingConfig?.findMany({
                where: { companyId, isActive: true, datasetType: { in: ['ITEMS', 'STOCK'] } },
            });
            return !!(configs?.some((c: any) => c.datasetType === 'ITEMS') && configs?.some((c: any) => c.datasetType === 'STOCK'));
        } catch (error) {
            this.fastify.log.warn({ err: error }, '⚠️ Error checking MappingConfigs');
            return false;
        }
    }

    private async getDefaultLocation(warehouseId: string): Promise<string | null> {
        const loc = await this.fastify.prisma.warehouse_Location.findFirst({
            where: { warehouseId, isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        return loc?.id ?? null;
    }

    /**
     * Fusiona filtros adicionales en el objeto MappingConfig sin perder JOINS o estructura original.
     */
    private mergeFiltersIntoMapping(mapping: any, newFilters: any[]): any {
        const mappingWithFilters: any = { ...mapping };
        const originalFilters = mapping.filters;

        if (Array.isArray(originalFilters)) {
            // Formato array-posicional: Intentar encontrar un array de filtros existente para mergear
            const normalizedArray = [...(originalFilters as any[])];
            let merged = false;
            for (let i = 0; i < normalizedArray.length; i++) {
                const element = normalizedArray[i];
                if (Array.isArray(element) && element.length > 0) {
                    const first = element[0];
                    if (typeof first === 'object' && first !== null && ('field' in first || 'operator' in first)) {
                        normalizedArray[i] = [...element, ...newFilters];
                        merged = true;
                        break;
                    }
                }
            }
            if (!merged && newFilters.length > 0) normalizedArray.push(newFilters);
            mappingWithFilters.filters = normalizedArray;
        } else if (typeof originalFilters === 'object' && originalFilters !== null) {
            // Formato objeto estructurado
            const normalizedObj = { ...(originalFilters as any) };
            normalizedObj.filters = Array.isArray(normalizedObj.filters) ? [...normalizedObj.filters, ...newFilters] : newFilters;
            mappingWithFilters.filters = normalizedObj;
        } else {
            // Caso vacío o nulo
            mappingWithFilters.filters = newFilters;
        }

        return mappingWithFilters;
    }
}
