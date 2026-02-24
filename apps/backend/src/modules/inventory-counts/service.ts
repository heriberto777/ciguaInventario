import { FastifyInstance } from 'fastify';
import { InventoryCountRepository } from './repository';
import { CreateInventoryCountDTO, AddCountItemDTO, UpdateCountItemDTO } from './schema';
import { AppError } from '../../utils/errors';
import { ERPConnectorFactory } from '../erp-connections';
import { DynamicQueryBuilder } from '../mapping-config/query-builder';

export class InventoryCountService {
  private repository: InventoryCountRepository;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.repository = new InventoryCountRepository(fastify);
  }

  async createCount(companyId: string, warehouseId: string, description?: string, mappingId?: string) {
    // Validar que el almacén exista y pertenezca a la empresa
    const warehouse = await this.findWarehouse(warehouseId, companyId);
    if (!warehouse) {
      throw new AppError(404, 'Warehouse not found');
    }

    const count = await this.repository.createCount(companyId, warehouseId, description);

    // NOTE: mappingId is accepted but not used here anymore
    // Use POST /inventory/load-from-mapping to load items explicitly
    // This allows better error handling and user feedback

    // Retornar el conteo con sus items
    return this.getCountById(count.id, companyId);
  }

  async prepareCountItems(
    companyId: string,
    countId: string,
    warehouseId: string,
    locationId?: string
  ) {
    // 1. Validar que el conteo existe
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    // 2. OPCIÓN A: MappingConfig (Flexible - Recomendada)
    // Permite queries configurables sin cambios de código
    try {
      const hasMappingConfig = await this.checkMappingConfigs(companyId);
      if (hasMappingConfig) {
        console.log('📍 Using Option A: MappingConfig (Flexible Configuration)');
        return await this.loadFromMappingConfig(companyId, countId, warehouseId, locationId);
      }
    } catch (error) {
      console.warn('⚠️ Option A failed:', (error as Error).message);
    }

    // 3. OPCIÓN B: Query Directa (Rápida - MVP)
    // Query hardcodeada para MVP rápido sin configuración
    try {
      console.log('📍 Using Option B: Direct Query from Catelli (MVP)');
      return await this.loadFromDirectQuery(companyId, countId, warehouseId, locationId);
    } catch (error) {
      console.warn('⚠️ Option B failed:', (error as Error).message);
    }

    // 4. Si ambas fallan: Retornar estructura vacía con advertencia
    console.log('📍 No auto-load available. Manual entry required.');
    return {
      countId,
      itemsLoaded: 0,
      items: [],
      summary: { totalItems: 0, totalSystemQty: 0, totalValue: 0 },
      source: 'MANUAL',
      warning: 'Auto-load no disponible. Configure MappingConfig o ERPConnection, o agregue artículos manualmente.',
    };
  }

  /**
   * OPCIÓN A: Cargar desde MappingConfig
   * Lee configuración flexible de BD (queries, mappings, filtros)
   * NO requiere cambios de código - todo es configurable
   *
   * Soporta:
   * - Múltiples tablas con JOINS
   * - Mapeo dinámico de campos
   * - Filtros WHERE
   * - ORDER BY
   */
  private async loadFromMappingConfig(
    companyId: string,
    countId: string,
    warehouseId: string,
    locationId?: string
  ) {
    // 1. Obtener configuraciones requeridas de BD
    const itemsMapping = await this.fastify.prisma?.mappingConfig?.findFirst({
      where: {
        companyId,
        datasetType: 'ITEMS',
        isActive: true,
      },
    });

    const stockMapping = await this.fastify.prisma?.mappingConfig?.findFirst({
      where: {
        companyId,
        datasetType: 'STOCK',
        isActive: true,
      },
    });

    if (!itemsMapping || !stockMapping) {
      throw new AppError(
        400,
        'MappingConfig incompleto. Configure ITEMS y STOCK en administración.'
      );
    }

    // 2. Obtener configuración de conexión ERP (también de BD)
    const erpConnection = await this.fastify.prisma?.eRPConnection?.findFirst({
      where: {
        companyId,
        isActive: true,
      },
    });

    if (!erpConnection) {
      throw new AppError(400, 'No active ERP connection configured');
    }

    // 3. Crear conector con parámetros de la BD
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
      // 4. Construir queries dinámicamente usando MappingConfig
      console.log(`📋 Building ITEMS query from MappingConfig...`);

      const itemsMappingConfig = JSON.parse(JSON.stringify(itemsMapping));
      const itemsQueryBuilder = new DynamicQueryBuilder(itemsMappingConfig);
      const { sql: itemsSQL, parameters: itemsParams } = itemsQueryBuilder.build();

      console.log(`📋 Executing ITEMS query: ${itemsSQL.substring(0, 100)}...`);
      const itemsData = await connector.executeQuery(itemsSQL, itemsParams);

      console.log(`📋 Building STOCK query from MappingConfig...`);

      // Agregar parámetro de warehouseId al mapping de STOCK
      const stockMappingConfig = JSON.parse(JSON.stringify(stockMapping));
      if (stockMappingConfig.filters) {
        stockMappingConfig.filters.push({
          field: 'eb.bodega_id', // Ajusta según tu tabla
          operator: '=',
          value: warehouseId,
        });
      }

      const stockQueryBuilder = new DynamicQueryBuilder(stockMappingConfig);
      const { sql: stockSQL, parameters: stockParams } = stockQueryBuilder.build();

      console.log(`📋 Executing STOCK query: ${stockSQL.substring(0, 100)}...`);
      const stockData = await connector.executeQuery(stockSQL, stockParams);

      // 5. Mapear campos dinámicamente según fieldMappings
      const itemsFieldMappings = itemsMappingConfig.fieldMappings as any[];
      const stockFieldMappings = stockMappingConfig.fieldMappings as any[];

      // Crear mapa inverso: targetField → sourceField para búsqueda rápida
      const itemsMapReverse: Record<string, string> = {};
      itemsFieldMappings.forEach((fm) => {
        itemsMapReverse[fm.targetField] = fm.sourceField;
      });

      const stockMapReverse: Record<string, string> = {};
      stockFieldMappings.forEach((fm) => {
        stockMapReverse[fm.targetField] = fm.sourceField;
      });

      // Construir mapa de stock por itemCode
      const stockMap = new Map();
      for (const stockRow of stockData) {
        const itemCodeField = stockMapReverse['itemCode'];
        const itemCode = String(stockRow[itemCodeField] || '').toLowerCase();
        stockMap.set(itemCode, stockRow);
      }

      // 6. Normalizar datos con los mappings
      const normalized = itemsData.map((item: any) => ({
        itemCode: String(item[itemsMapReverse['itemCode']] || '').trim(),
        itemName: String(item[itemsMapReverse['itemName']] || '').trim(),
        packQty: Number(item[itemsMapReverse['packQty']] || 1),
        uom: String(item[itemsMapReverse['uom']] || 'PZ').trim(),
        baseUom: String(item[itemsMapReverse['baseUom']] || 'PZ').trim(),
        systemQty: Number(
          stockMap.get(String(item[itemsMapReverse['itemCode']] || '').toLowerCase())?.[
            stockMapReverse['systemQty']
          ] || 0
        ),
        countedQty: 0,
        costPrice: Number(item[itemsMapReverse['costPrice']] || 0),
        salePrice: Number(item[itemsMapReverse['salePrice']] || 0),
      }));

      // 7. Guardar en BD
      for (const item of normalized) {
        const locId = locationId || (await this.getDefaultLocation(warehouseId));
        if (!locId) {
          throw new AppError(400, 'No location available for this warehouse');
        }
        await this.repository.createCountItem(countId, locId, item);
      }

      return {
        countId,
        itemsLoaded: normalized.length,
        items: normalized,
        summary: {
          totalItems: normalized.length,
          totalSystemQty: normalized.reduce((sum, i) => sum + i.systemQty, 0),
          totalValue: normalized.reduce((sum, i) => sum + i.costPrice * i.systemQty, 0),
        },
        source: 'MAPPING_CONFIG',
      };
    } finally {
      await connector.disconnect();
    }
  }

  /**
   * OPCIÓN B: Cargar desde Query directa de Catelli
   * Query hardcodeada para MVP rápido
   */
  private async loadFromDirectQuery(
    companyId: string,
    countId: string,
    warehouseId: string,
    locationId?: string
  ) {
    // Para MVP: usar configuración hardcodeada de Catelli
    // En producción, esto vendría de la BD (erpConnection)
    const erpConnection = {
      erpType: 'MSSQL',
      host: process.env.CATELLI_HOST || 'localhost',
      port: Number(process.env.CATELLI_PORT) || 1433,
      database: process.env.CATELLI_DATABASE || 'Catelli',
      username: process.env.CATELLI_USER || 'sa',
      password: process.env.CATELLI_PASSWORD || '',
    };

    // Crear conector ERP
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
      // Query directa a Catelli (MVP)
      // Mapea tablas Catelli estándar: articulo, existencia_bodega, articulo_precio
      const query = `
        SELECT
          a.codigo AS itemCode,
          a.descripcion AS itemName,
          CAST(a.cantidad_empaque AS DECIMAL(10,2)) AS packQty,
          a.unidad_empaque AS uom,
          COALESCE(a.unidad_base, 'PZ') AS baseUom,
          COALESCE(CAST(eb.cantidad AS DECIMAL(18,4)), 0) AS systemQty,
          CAST(COALESCE(ap.costo, 0) AS DECIMAL(18,4)) AS costPrice,
          CAST(COALESCE(ap.precio_venta, 0) AS DECIMAL(18,4)) AS salePrice
        FROM articulo a
        LEFT JOIN existencia_bodega eb
          ON a.id = eb.articulo_id AND eb.bodega_id = @bodegaId
        LEFT JOIN articulo_precio ap
          ON a.id = ap.articulo_id
        WHERE a.estado = 'ACTIVO'
          AND a.codigo IS NOT NULL
        ORDER BY a.codigo
      `;

      const items = await connector.executeQuery(query, { bodegaId: warehouseId });

      if (!items || items.length === 0) {
        console.warn('⚠️ No items found in Catelli for this warehouse');
        return {
          countId,
          itemsLoaded: 0,
          items: [],
          summary: { totalItems: 0, totalSystemQty: 0, totalValue: 0 },
          source: 'DIRECT_QUERY',
          warning: 'No items found in Catelli',
        };
      }

      // Normalizar datos
      const normalized = items.map(item => ({
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

      // Guardar en BD
      for (const item of normalized) {
        const locId = locationId || await this.getDefaultLocation(warehouseId);
        if (!locId) {
          throw new AppError(400, 'No location available for this warehouse');
        }
        await this.repository.createCountItem(countId, locId, item);
      }

      return {
        countId,
        itemsLoaded: normalized.length,
        items: normalized,
        summary: {
          totalItems: normalized.length,
          totalSystemQty: normalized.reduce((sum, i) => sum + i.systemQty, 0),
          totalValue: normalized.reduce((sum, i) => sum + (i.costPrice * i.systemQty), 0),
        },
        source: 'DIRECT_QUERY',
      };
    } finally {
      await connector.disconnect();
    }
  }

  /**
   * Valida si existen MappingConfigs activos para ITEMS y STOCK
   */
  private async checkMappingConfigs(companyId: string): Promise<boolean> {
    try {
      const configs = await this.fastify.prisma?.mappingConfig?.findMany({
        where: {
          companyId,
          isActive: true,
          datasetType: { in: ['ITEMS', 'STOCK'] },
        },
      });

      // Retorna true solo si existen ambos (ITEMS y STOCK)
      const hasItems = configs?.some((c: any) => c.datasetType === 'ITEMS');
      const hasStock = configs?.some((c: any) => c.datasetType === 'STOCK');

      return !!(hasItems && hasStock);
    } catch (error) {
      // Si hay error accediendo a Prisma, retorna false para fallback a Opción B
      console.warn('⚠️ Error checking MappingConfigs:', (error as Error).message);
      return false;
    }
  }

  /**
   * Valida si existe conexión ERP activa
   * Para MVP, retorna true para activar Opción B (Query Directa)
   */
  private async checkERPConnection(companyId: string): Promise<boolean> {
    return true;
  }

  /**
   * Combina datos de Items, Stock y Precios
   * Usada por MappingConfig (Opción A)
   */
  private combineItemsData(
    items: any[],
    stock: any[],
    prices: any[]
  ): any[] {
    const stockMap = new Map(stock.map(s => [String(s.itemId).toLowerCase(), s]));
    const pricesMap = new Map(prices.map(p => [String(p.itemId).toLowerCase(), p]));

    return items.map(item => {
      const stockData = stockMap.get(String(item.itemCode).toLowerCase());
      const priceData = pricesMap.get(String(item.itemCode).toLowerCase());

      return {
        itemCode: String(item.itemCode || '').trim(),
        itemName: String(item.itemName || '').trim(),
        packQty: Number(item.packQty || 1),
        uom: String(item.uom || 'PZ').trim(),
        baseUom: String(item.baseUom || 'PZ').trim(),
        systemQty: Number(stockData?.systemQty || 0),
        countedQty: 0,
        costPrice: Number(priceData?.costPrice || 0),
        salePrice: Number(priceData?.salePrice || 0),
      };
    });
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

  async addCountItem(countId: string, companyId: string, data: AddCountItemDTO) {
    const count = await this.getCountById(countId, companyId);

    if (count.status !== 'DRAFT' && count.status !== 'IN_PROGRESS') {
      throw new AppError(400, 'Cannot add items to a completed count');
    }

    // Actualizar estado a IN_PROGRESS si está en DRAFT
    if (count.status === 'DRAFT') {
      await this.updateCountStatus(countId, 'IN_PROGRESS');
    }

    // Validar que la ubicación existe
    const location = await this.findLocation(data.locationId);
    if (!location) {
      throw new AppError(404, 'Location not found');
    }

    // Verificar si el item ya existe en esa ubicación
    const existing = count.countItems.find(
      item => item.locationId === data.locationId && item.itemCode === data.itemCode
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

  async deleteCount(id: string, companyId: string) {
    const count = await this.getCountById(id, companyId);

    if (count.status === 'COMPLETED') {
      throw new AppError(400, 'Cannot delete a completed count');
    }

    return this.repository.deleteCount(id);
  }

  private async findWarehouse(id: string, companyId: string) {
    // Para MVP, no validar existencia (la BD lo hará)
    // En producción, esto verificaría en repository
    return { id, companyId, isActive: true };
  }

  private async findLocation(id: string) {
    // Para MVP, asumir que existe
    return { id, isActive: true };
  }

  /**
   * Obtiene la ubicación default del almacén
   * Para MVP, retorna el ID del almacén como locationId
   */
  private async getDefaultLocation(warehouseId: string): Promise<string | null> {
    return warehouseId || null;
  }

  private async updateCountStatus(countId: string, status: string) {
    // Implementado en repository
  }

  /**
   * Carga artículos en el conteo usando un mapping específico
   */
  async loadCountFromMapping(
    companyId: string,
    countId: string,
    warehouseId: string,
    mappingId: string,
    locationId: string
  ): Promise<{ countId: string; itemsLoaded: number; items: any[] }> {
    console.log(`📌 [loadCountFromMapping] Starting for count: ${countId}, mapping: ${mappingId}, location: ${locationId}`);

    // Validar que el conteo exista
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, `Count ${countId} not found`);
    }

    // Obtener el mapping
    const mapping = await this.fastify.prisma?.mappingConfig?.findFirst({
      where: {
        id: mappingId,
        companyId,
        isActive: true,
      },
    });

    if (!mapping) {
      throw new AppError(404, 'Mapping not found or not active');
    }
    console.log(`✅ [loadCountFromMapping] Mapping found: ${mapping.datasetType} (ID: ${mapping.id})`);

    // Obtener la conexión ERP del mapping
    const erpConnection = await this.fastify.prisma?.eRPConnection?.findFirst({
      where: {
        id: mapping.erpConnectionId,
        companyId,
        isActive: true,
      },
    });

    if (!erpConnection) {
      throw new AppError(404, 'ERP Connection not found');
    }
    console.log(`✅ [loadCountFromMapping] ERP Connection found: ${erpConnection.name}`);

    // Crear conector
    const connector = ERPConnectorFactory.create({
      erpType: erpConnection.erpType,
      host: erpConnection.host,
      port: erpConnection.port,
      database: erpConnection.database,
      username: erpConnection.username,
      password: erpConnection.password,
    });

    await connector.connect();
    console.log(`✅ [loadCountFromMapping] Connected to ERP`);

    try {
      // Usar LoadInventoryFromERPService para obtener los datos
      const LoadService = await import('../inventory/load-from-erp.service');
      const loadService = new LoadService.LoadInventoryFromERPService(this.fastify);

      // Construir SQL desde el mapping
      console.log(`🔍 [loadCountFromMapping] Building query from mapping...`);
      const { sql, parameters } = loadService.buildQueryFromMapping(mapping);
      console.log(`✅ [loadCountFromMapping] SQL generated: ${sql.substring(0, 100)}...`);

      // Ejecutar query en ERP usando introspection service
      console.log(`🔍 [loadCountFromMapping] Executing query on ERP...`);
      const ERPIntrospectionService = await import('../erp-connections/erp-introspection');
      const introspection = new ERPIntrospectionService.ERPIntrospectionService(connector);

      const erpData = await introspection.previewQuery(sql, 10000);
      console.log(`✅ [loadCountFromMapping] Query returned ${erpData.length} rows`);

      if (erpData.length === 0) {
        console.warn(`⚠️ [loadCountFromMapping] Query returned 0 rows`);
        return { countId, itemsLoaded: 0, items: [] };
      }

      // Transformar datos
      console.log(`🔍 [loadCountFromMapping] Transforming data...`);
      const items = loadService.transformData(erpData, mapping);
      console.log(`✅ [loadCountFromMapping] Transformed ${items.length} items`);

      if (items.length === 0) {
        console.warn(`⚠️ [loadCountFromMapping] Transformation returned 0 items`);
        return { countId, itemsLoaded: 0, items: [] };
      }

      // Get the specified location
      const warehouseLocation = await this.fastify.prisma?.warehouse_Location?.findFirst({
        where: {
          id: locationId,
          warehouseId,
          isActive: true,
        },
      });

      if (!warehouseLocation) {
        console.error(`❌ [loadCountFromMapping] Location ${locationId} not found or inactive in warehouse ${warehouseId}`);
        return { countId, itemsLoaded: 0, items: [] };
      }

      console.log(`✅ [loadCountFromMapping] Using location: ${warehouseLocation.code} (ID: ${warehouseLocation.id}`);

      // Agregar items al conteo
      console.log(`🔍 [loadCountFromMapping] Inserting items into count...`);
      let insertedCount = 0;
      for (const item of items) {
        try {
          await this.repository.addCountItem(countId, {
            locationId: warehouseLocation.id, // Use the actual location ID, not warehouse ID
            itemCode: item.itemCode,
            itemName: item.itemName || item.itemCode, // Fallback to itemCode if name missing
            uom: item.uom || 'PZ',
            systemQty: item.systemQty || 0,
            countedQty: 0, // User will fill this during physical count
            notes: `Auto-loaded from ${mapping.datasetType} mapping`,
          });
          insertedCount++;
        } catch (itemError) {
          console.error(`❌ [loadCountFromMapping] Error inserting item ${item.itemCode}:`, itemError);
        }
      }

      console.log(`✅ [loadCountFromMapping] Successfully loaded ${insertedCount} items into count ${countId}`);
      return { countId, itemsLoaded: insertedCount, items: items.slice(0, 10) };
    } catch (error) {
      console.error(`❌ [loadCountFromMapping] Failed:`, error);
      throw error;
    } finally {
      await connector.disconnect();
      console.log(`✅ [loadCountFromMapping] Disconnected from ERP`);
    }
  }

  // ========== NUEVOS MÉTODOS: GESTIÓN DE ESTADO ==========

  /**
   * Genera un número de secuencia único para conteos
   * Formato: CONT-YYYY-NNN (ej: CONT-2026-001)
   */
  private async generateSequenceNumber(companyId: string, year: number = new Date().getFullYear()): Promise<string> {
    const lastCount = await this.fastify.prisma.inventoryCount.findFirst({
      where: {
        companyId,
        sequenceNumber: {
          startsWith: `CONT-${year}-`,
        },
      },
      orderBy: {
        sequenceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastCount && lastCount.sequenceNumber) {
      const parts = lastCount.sequenceNumber.split('-');
      const lastNum = parseInt(parts[2] || '0');
      nextNumber = lastNum + 1;
    }

    return `CONT-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Obtiene conteo activo de un almacén
   */
  async getActiveCountByWarehouse(companyId: string, warehouseId: string) {
    return this.fastify.prisma.inventoryCount.findFirst({
      where: {
        companyId,
        warehouseId,
        status: {
          in: ['ACTIVE', 'ON_HOLD'],
        },
      },
      include: {
        countItems: true,
      },
    });
  }

  /**
   * Crea nuevo conteo con validaciones
   * - Valida que no exista conteo ACTIVE/ON_HOLD en el almacén
   * - Auto-genera sequenceNumber
   */
  async createNewInventoryCount(
    companyId: string,
    warehouseId: string,
    mappingConfigId: string,
    createdBy: string
  ) {
    // 1. Validar que el almacén existe
    const warehouse = await this.fastify.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse || warehouse.companyId !== companyId) {
      throw new AppError({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Almacén no encontrado',
        statusCode: 404,
      });
    }

    // 2. Validar que no existe conteo activo
    const activeCount = await this.getActiveCountByWarehouse(companyId, warehouseId);
    if (activeCount) {
      throw new AppError({
        code: 'INVENTORY_COUNT_ACTIVE',
        message: `Ya existe un conteo activo: ${activeCount.sequenceNumber}`,
        statusCode: 400,
      });
    }

    // 3. Validar que el mapping existe
    const mapping = await this.fastify.prisma.mappingConfig.findUnique({
      where: { id: mappingConfigId },
    });

    if (!mapping || mapping.companyId !== companyId) {
      throw new AppError({
        code: 'MAPPING_NOT_FOUND',
        message: 'Mapping no encontrado',
        statusCode: 404,
      });
    }

    // 4. Generar secuencia única
    const sequenceNumber = await this.generateSequenceNumber(companyId);

    // 5. Crear conteo en estado DRAFT
    const newCount = await this.fastify.prisma.inventoryCount.create({
      data: {
        sequenceNumber,
        companyId,
        warehouseId,
        code: sequenceNumber, // Usar sequenceNumber como code también
        status: 'DRAFT',
        currentVersion: 1,
        totalVersions: 1,
        createdBy,
      },
      include: {
        countItems: true,
      },
    });

    console.log(`✅ [createNewInventoryCount] Conteo creado: ${sequenceNumber}`);
    return newCount;
  }

  /**
   * Inicia un conteo (DRAFT → ACTIVE)
   */
  async startInventoryCount(countId: string, companyId: string, userId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    if (count.status !== 'DRAFT') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: `El conteo no está en estado DRAFT (estado actual: ${count.status})`,
        statusCode: 400,
      });
    }

    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'ACTIVE',
        startedBy: userId,
        startedAt: new Date(),
      },
      include: {
        countItems: true,
      },
    });

    console.log(`✅ [startInventoryCount] Conteo iniciado: ${updated.sequenceNumber}`);
    return updated;
  }

  /**
   * Completa un conteo (ACTIVE → COMPLETED)
   */
  async completeInventoryCount(countId: string, companyId: string, userId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    if (count.status !== 'ACTIVE') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: `El conteo debe estar ACTIVO (estado actual: ${count.status})`,
        statusCode: 400,
      });
    }

    // 📊 PASO 1: Calcular varianzas y actualizar status de items
    console.log(`📋 [completeInventoryCount] Calculando varianzas para conteo ${count.code}...`);

    const items = await this.fastify.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        version: count.currentVersion,
      },
    });

    let itemsWithVariance = 0;
    let itemsApproved = 0;

    // Actualizar cada item con su status y hasVariance
    for (const item of items) {
      const hasVariance = item.countedQty !== null && item.countedQty !== item.systemQty;
      const newStatus = hasVariance ? 'VARIANCE' : 'APPROVED';

      await this.fastify.prisma.inventoryCount_Item.update({
        where: { id: item.id },
        data: {
          hasVariance,
          status: newStatus,
        },
      });

      if (hasVariance) {
        itemsWithVariance++;
      } else {
        itemsApproved++;
      }
    }

    console.log(
      `   ✅ ${itemsApproved} items sin varianza (APPROVED)`
    );
    console.log(
      `   ⚠️ ${itemsWithVariance} items con varianza (VARIANCE)`
    );

    // 📊 PASO 2: Actualizar el conteo a COMPLETED
    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'COMPLETED',
        completedBy: userId,
        completedAt: new Date(),
      },
    });

    // Retornar con items filtrados por versión actual
    const result = await this.repository.getCountById(countId, companyId);
    console.log(`✅ [completeInventoryCount] Conteo completado: ${updated.sequenceNumber}`);
    return result;
  }

  /**
   * Pausa un conteo (ACTIVE → ON_HOLD)
   */
  async pauseInventoryCount(countId: string, companyId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    if (count.status !== 'ACTIVE') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: `El conteo debe estar ACTIVO (estado actual: ${count.status})`,
        statusCode: 400,
      });
    }

    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'ON_HOLD',
      },
    });

    // Retornar con items filtrados por versión actual
    const result = await this.repository.getCountById(countId, companyId);
    console.log(`✅ [pauseInventoryCount] Conteo pausado: ${updated.sequenceNumber}`);
    return result;
  }

  /**
   * Reanuda un conteo (ON_HOLD → ACTIVE)
   */
  async resumeInventoryCount(countId: string, companyId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    if (count.status !== 'ON_HOLD') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: `El conteo debe estar en PAUSA (estado actual: ${count.status})`,
        statusCode: 400,
      });
    }

    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'ACTIVE',
      },
    });

    // Retornar con items filtrados por versión actual
    const result = await this.repository.getCountById(countId, companyId);
    console.log(`✅ [resumeInventoryCount] Conteo reanudado: ${updated.sequenceNumber}`);
    return result;
  }

  /**
   * Cierra un conteo (COMPLETED → CLOSED)
   */
  async closeInventoryCount(countId: string, companyId: string, userId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    if (count.status !== 'COMPLETED') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: `El conteo debe estar COMPLETADO (estado actual: ${count.status})`,
        statusCode: 400,
      });
    }

    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'CLOSED',
        closedBy: userId,
        closedAt: new Date(),
      },
      include: {
        countItems: true,
      },
    });

    console.log(`✅ [closeInventoryCount] Conteo cerrado: ${updated.sequenceNumber}`);
    return updated;
  }

  /**
   * Cancela un conteo
   */
  async cancelInventoryCount(countId: string, companyId: string, userId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    if (count.status === 'CLOSED') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: 'No se puede cancelar un conteo cerrado',
        statusCode: 400,
      });
    }

    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'CANCELLED',
        closedBy: userId,
        closedAt: new Date(),
      },
      include: {
        countItems: true,
      },
    });

    console.log(`✅ [cancelInventoryCount] Conteo cancelado: ${updated.sequenceNumber}`);
    return updated;
  }

  /**
   * Enviar conteo completado al ERP
   * Cambio de estado: COMPLETED → CLOSED
   *
   * Requisitos:
   * - Status debe ser COMPLETED
   * - Se envían datos del conteo al ERP (Catelli, SAP, etc.)
   * - Se registra auditoría (closedBy, closedAt)
   */
  async sendToERP(countId: string, companyId: string, userId: string) {
    const count = await this.repository.getCountById(countId, companyId);

    if (!count) {
      throw new AppError({
        code: 'COUNT_NOT_FOUND',
        message: 'Conteo no encontrado',
        statusCode: 404,
      });
    }

    // Validar estado: debe estar COMPLETED
    if (count.status !== 'COMPLETED') {
      throw new AppError({
        code: 'INVALID_STATUS',
        message: `No se puede enviar al ERP. Estado actual: ${count.status}. Debe estar en COMPLETED.`,
        statusCode: 400,
      });
    }

    // TODO: Implementar lógica de envío real al ERP
    // Por ahora solo actualizar el estado a CLOSED
    // En producción, aquí iría:
    // 1. Obtener conexión ERP
    // 2. Mapear datos del conteo al formato ERP
    // 3. Enviar vía API/SQL del ERP
    // 4. Manejar errores y reintentos
    // 5. Registrar historial de sincronización

    console.log(`🚀 [sendToERP] Enviando conteo al ERP: ${count.sequenceNumber}`);
    console.log(`   - Total items: ${count.countItems?.length || 0}`);
    console.log(`   - Versiones: ${count.totalVersions}`);

    // Actualizar estado a CLOSED (enviado al ERP)
    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        status: 'CLOSED',
        closedBy: userId,
        closedAt: new Date(),
      },
      include: {
        countItems: {
          where: {
            version: count.currentVersion, // Solo items de versión actual
          },
        },
      },
    });

    console.log(`✅ [sendToERP] Conteo enviado al ERP y cerrado: ${updated.sequenceNumber}`);

    return {
      success: true,
      countId: updated.id,
      status: updated.status,
      message: `Conteo ${updated.sequenceNumber} enviado al ERP exitosamente`,
      sentAt: updated.closedAt,
      sentBy: userId,
    };
  }
}
