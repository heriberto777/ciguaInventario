import { FastifyInstance } from 'fastify';
import { AppError } from '../../utils/errors';
import { erpConnectionsService } from '../erp-connections/service';
import { ERPConnectorFactory } from '../erp-connections/erp-connector-factory';
import { ERPIntrospectionService } from '../erp-connections/erp-introspection';

interface LoadInventoryParams {
  mappingId: string;
  warehouseId: string;
  companyId: string;
  userId: string;
}

interface LoadedItem {
  itemCode: string;
  itemName: string;
  systemQty: number;
  uom: string;
  baseUom: string;
  packQty: number;
  // Campos opcionales — se mapean desde el ERP si están configurados
  costPrice?: number;
  salePrice?: number;
  barCodeInv?: string;   // Código de barras inventario
  barCodeVt?: string;    // Código de barras venta
  brand?: string;        // Marca
  category?: string;     // Categoría
  subcategory?: string;  // Subcategoría
}

interface LoadInventoryResult {
  countId: string;
  itemsLoaded: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  message: string;
  errors?: string[];
}

export class LoadInventoryFromERPService {
  constructor(private fastify: FastifyInstance) { }

  /**
   * Cargar inventario desde ERP basado en configuración de mapeo
   *
   * Proceso:
   * 1. Obtener configuración de mapeo
   * 2. Obtener conexión ERP
   * 3. Crear conector y ejecutar query
   * 4. Transformar datos según mapeo
   * 5. Crear InventoryCount y cargar items
   */
  async loadInventoryFromERP(params: LoadInventoryParams): Promise<LoadInventoryResult> {
    const { mappingId, warehouseId, companyId, userId } = params;

    try {
      // 1. Validar que el mapeo existe y pertenece a la empresa
      const mappingConfig = await (this.fastify.prisma as any).mappingConfig.findUnique({
        where: { id: mappingId },
      });

      if (!mappingConfig || mappingConfig.companyId !== companyId) {
        throw new AppError(404, 'Mapping configuration not found');
      }

      if (!mappingConfig.erpConnectionId) {
        throw new AppError(400, 'Mapping configuration does not have an ERP connection');
      }

      if (!mappingConfig.isActive) {
        throw new AppError(400, 'Mapping configuration is not active');
      }

      // 2. Validar que el warehouse existe
      const warehouse = await (this.fastify.prisma as any).warehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse || warehouse.companyId !== companyId) {
        throw new AppError(404, 'Warehouse not found');
      }

      // 3. Obtener conexión ERP
      const connection = await erpConnectionsService.getConnection(
        mappingConfig.erpConnectionId,
        companyId
      );

      if (!connection.isActive) {
        throw new AppError(400, 'ERP connection is not active');
      }

      // 4. Crear conector ERP
      const connector = ERPConnectorFactory.create({
        erpType: connection.erpType,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password,
      });

      // 5. Ejecutar query para obtener datos
      const introspection = new ERPIntrospectionService(connector);

      // Usar la query de mapeo o construirla desde las tablas
      let sqlQuery = mappingConfig.sourceQuery;

      if (!sqlQuery) {
        // Construir query automáticamente desde sourceTables y fieldMappings
        const queryObj = this.buildQueryFromMapping(mappingConfig);
        sqlQuery = queryObj.sql;
      }

      // Ejecutar query
      let rawData: any[] = [];
      try {
        rawData = await introspection.previewQuery(sqlQuery, 10000); // Máximo 10k items
      } catch (error: any) {
        throw new AppError(
          400,
          `Failed to execute ERP query: ${error.message}`
        );
      }

      if (!rawData || rawData.length === 0) {
        throw new AppError(400, 'No data returned from ERP query');
      }

      // 6. Transformar datos según fieldMappings
      const transformedItems = this.transformData(rawData, mappingConfig);

      // 7. Crear InventoryCount
      const inventoryCount = await (this.fastify.prisma as any).inventoryCount.create({
        data: {
          companyId,
          warehouseId,
          code: this.generateCountCode(companyId),
          description: `Loaded from ERP via ${mappingConfig.datasetType}`,
          status: 'DRAFT',
          startedBy: userId,
          startedAt: new Date(),
        },
      });

      // 8. Obtener ubicaciones del warehouse
      const locations = await (this.fastify.prisma as any).warehouse_Location.findMany({
        where: { warehouseId },
      });

      if (locations.length === 0) {
        // Si no hay ubicaciones, crear una por defecto
        const defaultLocation = await (this.fastify.prisma as any).warehouse_Location.create({
          data: {
            warehouseId,
            code: 'DEFAULT',
            name: 'Default Location',
            type: 'FLOOR',
          },
        });
        locations.push(defaultLocation);
      }

      // 9. Cargar items en la BD
      const createdItems: typeof transformedItems = [];
      const errors: string[] = [];

      for (const item of transformedItems) {
        try {
          // Usar la primera ubicación disponible
          const location = locations[0];

          const createdItem = await (this.fastify.prisma as any).inventoryCount_Item.create({
            data: {
              countId: inventoryCount.id,
              locationId: location.id,
              itemCode: item.itemCode,
              itemName: item.itemName,
              systemQty: item.systemQty,
              countedQty: null,           // Usuario llenará durante el conteo físico
              uom: item.uom || 'PZ',
              baseUom: item.baseUom || 'PZ',
              packQty: item.packQty || 1,
              // Campos enriquecidos del ERP
              ...(item.costPrice != null && { costPrice: item.costPrice }),
              ...(item.salePrice != null && { salePrice: item.salePrice }),
              ...(item.barCodeInv && { barCodeInv: item.barCodeInv }),
              ...(item.barCodeVt && { barCodeVt: item.barCodeVt }),
              ...(item.brand && { brand: item.brand }),
              ...(item.category && { category: item.category }),
              ...(item.subcategory && { subcategory: item.subcategory }),
              status: 'PENDING',
              notes: 'Loaded from ERP',
            },
          });

          createdItems.push(item);
        } catch (error: any) {
          errors.push(`Failed to create item ${item.itemCode}: ${error.message}`);
        }
      }

      // 10. Registrar en audit log
      await this.fastify.auditLog({
        action: 'CREATE',
        userId,
        companyId,
        resourceId: inventoryCount.id,
        resource: 'InventoryCount',
        newValue: {
          itemsLoaded: createdItems.length,
          totalAttempted: transformedItems.length,
          status: inventoryCount.status,
        },
      });

      // Determinar status del resultado
      let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS';
      let message = `Successfully loaded ${createdItems.length} items from ERP`;

      if (errors.length > 0 && createdItems.length === 0) {
        status = 'FAILED';
        message = `Failed to load any items: ${errors[0]}`;
      } else if (errors.length > 0) {
        status = 'PARTIAL';
        message = `Loaded ${createdItems.length}/${transformedItems.length} items. ${errors.length} items failed`;
      }

      return {
        countId: inventoryCount.id,
        itemsLoaded: createdItems.length,
        status,
        message,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, `Failed to load inventory from ERP: ${error.message}`);
    }
  }

  /**
   * Construir query SQL automáticamente desde la configuración de mapeo
   * Soporta el nuevo formato SimpleMappingBuilder con mainTable, joins, filters, selectedColumns
   */
  buildQueryFromMapping(mappingConfig: any): { sql: string; parameters: any[] } {
    try {
      // Parsear la estructura de filters que contiene la lógica completa
      let filters = mappingConfig.filters || {};

      // Si filters es string (JSON), parsearlo
      if (typeof filters === 'string') {
        filters = JSON.parse(filters);
      }

      // ─── Normalizar formato array posicional del SimpleMappingBuilder ────────────
      // El frontend guarda filters como: [joins[], whereFilters[], mainTable(string), selectedColumns[]]
      // Lo convertimos al formato objeto que espera el builder.
      if (Array.isArray(filters)) {
        this.fastify.log.info('🔄 [buildQueryFromMapping] Detecting array-positional filters format, normalizing...');
        const rawArray = filters as any[];
        const normalizedFilters: {
          mainTable: string;
          joins: any[];
          filters: any[];
          selectedColumns: string[];
        } = {
          mainTable: '',
          joins: [],
          filters: [],
          selectedColumns: [],
        };

        for (const element of rawArray) {
          if (typeof element === 'string') {
            // Es la tabla principal
            normalizedFilters.mainTable = element;
          } else if (Array.isArray(element) && element.length > 0) {
            const first = element[0];
            if (typeof first === 'string') {
              // Array de strings → selectedColumns: ["a.ARTICULO", "a.DESCRIPCION", ...]
              normalizedFilters.selectedColumns = element;
            } else if (typeof first === 'object' && first !== null) {
              if ('table' in first || 'joinType' in first || 'joinCondition' in first) {
                // Array de JOINs: [{table, alias, joinType, joinCondition}]
                normalizedFilters.joins = element;
              } else if ('field' in first || 'operator' in first || 'value' in first) {
                // Array de filtros WHERE: [{field, operator, value}]
                normalizedFilters.filters = element;
              }
            }
          }
        }

        filters = normalizedFilters;
        this.fastify.log.info(`✅ [buildQueryFromMapping] Normalized: mainTable="${normalizedFilters.mainTable}", ${normalizedFilters.joins.length} joins, ${normalizedFilters.filters.length} filters, ${normalizedFilters.selectedColumns.length} columns`);
      }

      const mainTable = filters.mainTable || mappingConfig.sourceTables?.[0] || '';
      const joins = filters.joins || [];
      const whereFilters = filters.filters || [];
      let selectedColumns = filters.selectedColumns || [];

      console.log('🔗 [buildQueryFromMapping] Raw mainTable:', mainTable);
      console.log('🔗 [buildQueryFromMapping] filters object:', JSON.stringify(filters, null, 2));

      if (!mainTable || mainTable.trim() === '') {
        throw new Error('No main table found in mapping configuration. filters.mainTable is empty or undefined');
      }

      // Validar estructura básica
      if (!Array.isArray(selectedColumns) || selectedColumns.length === 0) {
        throw new Error('No selectedColumns found in mapping configuration');
      }

      // Crear mapa de aliases incluyendo la tabla principal
      const tableAliasMap: { [key: string]: string } = {};

      // Alias de tabla principal: usar la primera letra en minúscula
      const mainTableName = mainTable.split('.').pop() || mainTable;
      let mainTableAlias = mainTableName.charAt(0).toLowerCase();

      // Asegurar que el alias es válido (no vacío)
      if (!mainTableAlias || mainTableAlias.trim() === '') {
        mainTableAlias = mainTableName.toLowerCase().substring(0, 2) || 'a';
      }

      tableAliasMap[mainTableName] = mainTableAlias;
      tableAliasMap[mainTable] = mainTableAlias; // También mapear con schema completo

      console.log('🔗 [buildQueryFromMapping] Main table:', mainTable, '-> Alias:', mainTableAlias);
      console.log('🔗 [buildQueryFromMapping] mainTableAlias type:', typeof mainTableAlias, 'value:', JSON.stringify(mainTableAlias));

      // Agregar aliases de JOINs
      for (const join of joins) {
        if (join.table && join.alias) {
          const joinTableName = join.table.split('.').pop() || join.table;
          tableAliasMap[joinTableName] = join.alias;
          tableAliasMap[join.table] = join.alias; // También mapear con schema completo
          console.log('🔗 [buildQueryFromMapping] JOIN table:', join.table, '-> Alias:', join.alias);
        }
      }

      console.log('🔗 [buildQueryFromMapping] Table alias map:', tableAliasMap);
      console.log('🔗 [buildQueryFromMapping] Selected columns (before replacement):', selectedColumns);
      console.log('🔗 [buildQueryFromMapping] JOIN conditions (before replacement):', joins.map(j => j.joinCondition));

      // Reemplazar nombres de tabla por alias en selectedColumns
      selectedColumns = selectedColumns.map((col: string) => {
        // col format: "schema.TABLE_NAME.COLUMN_NAME" o "TABLE_NAME.COLUMN_NAME"
        const parts = col.split('.');
        if (parts.length >= 2) {
          // Obtener el nombre de la tabla (penúltima parte) y la columna (última parte)
          const lastDotIndex = col.lastIndexOf('.');
          const tableAndColumn = col.substring(0, lastDotIndex);
          const columnName = col.substring(lastDotIndex + 1);

          // Extraer el nombre de la tabla (última parte de tableAndColumn)
          const tablePartsInTableAndColumn = tableAndColumn.split('.');
          const possibleTableName = tablePartsInTableAndColumn[tablePartsInTableAndColumn.length - 1];

          console.log(`🔗 [buildQueryFromMapping] Column: "${col}" -> TableAndColumn: "${tableAndColumn}", PossibleTableName: "${possibleTableName}", ColumnName: "${columnName}"`);

          // Buscar si existe alias para esta tabla (primero buscar por el nombre exacto de la tabla)
          const alias = tableAliasMap[possibleTableName] || tableAliasMap[tableAndColumn];

          if (alias) {
            console.log(`🔗 [buildQueryFromMapping] Replacing "${col}" with "${alias}.${columnName}"`);
            return `${alias}.${columnName}`;
          }
        }
        return col;
      });

      console.log('🔗 [buildQueryFromMapping] Selected columns (after replacement):', selectedColumns);

      // Construir SELECT
      let selectClause = '*';
      if (selectedColumns.length > 0) {
        selectClause = selectedColumns.join(', ');
      }

      // Construir FROM con alias (SIEMPRE agregar el alias a la tabla principal)
      let fromClause = `${mainTable} ${mainTableAlias}`;
      console.log('🔗 [buildQueryFromMapping] FROM clause:', fromClause);

      // Construir JOINs
      let joinClauses = '';
      if (joins && Array.isArray(joins)) {
        for (const join of joins) {
          if (!join.table || !join.alias || !join.joinCondition) {
            console.warn(`⚠️ [buildQueryFromMapping] Invalid join, skipping:`, join);
            continue;
          }

          const joinType = join.joinType || 'LEFT';
          let joinCondition = join.joinCondition;

          console.log(`🔗 [buildQueryFromMapping] Processing JOIN condition (before): "${joinCondition}"`);

          // Reemplazar nombres de tabla en joinCondition
          // Puede contener: "TABLA1.COLUMN = TABLA2.COLUMN" o con schema: "catelli.TABLA1.COLUMN = catelli.TABLA2.COLUMN"
          const parts = joinCondition.split('=').map(p => p.trim());
          const replacedParts = parts.map(part => {
            const dotIndex = part.lastIndexOf('.');
            if (dotIndex > 0) {
              const tableAndColumn = part.substring(0, dotIndex);
              const columnName = part.substring(dotIndex + 1);

              // Extraer nombre de tabla
              const tablePartsInTableAndColumn = tableAndColumn.split('.');
              const possibleTableName = tablePartsInTableAndColumn[tablePartsInTableAndColumn.length - 1];

              const alias = tableAliasMap[possibleTableName] || tableAliasMap[tableAndColumn];

              if (alias) {
                return `${alias}.${columnName}`;
              }
            }
            return part;
          });

          joinCondition = replacedParts.join(' = ');

          console.log(`🔗 [buildQueryFromMapping] Processing JOIN condition (after): "${joinCondition}"`);
          console.log(`🔗 [buildQueryFromMapping] JOIN: ${join.table} ${join.alias} ON ${joinCondition}`);
          joinClauses += ` ${joinType} JOIN ${join.table} ${join.alias} ON ${joinCondition}`;
        }
      }

      // Construir WHERE
      let whereClause = '';
      if (whereFilters && Array.isArray(whereFilters) && whereFilters.length > 0) {
        const conditions = whereFilters.map((filter: any) => {
          if (!filter.field || !filter.operator || filter.value === undefined) {
            console.warn(`⚠️ [buildQueryFromMapping] Invalid filter, skipping:`, filter);
            return null;
          }

          let field = filter.field;
          const operator = filter.operator;
          const value = typeof filter.value === 'string' ? `'${filter.value}'` : filter.value;

          console.log(`🔍 [buildQueryFromMapping] Processing WHERE field: "${field}"`);

          // Reemplazar nombres de tabla en field por alias
          // field format: "schema.TABLE_NAME.COLUMN_NAME" o "TABLE_NAME.COLUMN_NAME"
          const lastDotIndex = field.lastIndexOf('.');
          if (lastDotIndex > 0) {
            const tableAndColumn = field.substring(0, lastDotIndex);
            const columnName = field.substring(lastDotIndex + 1);

            // Extraer el nombre de la tabla (última parte de tableAndColumn)
            const tablePartsInTableAndColumn = tableAndColumn.split('.');
            const possibleTableName = tablePartsInTableAndColumn[tablePartsInTableAndColumn.length - 1];

            // Buscar alias para esta tabla
            const alias = tableAliasMap[possibleTableName] || tableAliasMap[tableAndColumn];

            if (alias) {
              field = `${alias}.${columnName}`;
              console.log(`🔍 [buildQueryFromMapping] Replaced WHERE field to: "${field}"`);
            }
          }

          return `${field} ${operator} ${value}`;
        }).filter(c => c !== null);

        if (conditions.length > 0) {
          whereClause = ' WHERE ' + conditions.join(' AND ');
        }
      }

      // Combinar query
      const query = `SELECT ${selectClause} FROM ${fromClause}${joinClauses}${whereClause}`;

      console.log('✅ [buildQueryFromMapping] Generated SQL:', query);
      return { sql: query, parameters: [] };
    } catch (error: any) {
      console.error('❌ [buildQueryFromMapping] Error:', error.message);
      throw new AppError(400, `Failed to build query from mapping: ${error.message}`);
    }
  }

  /**
   * Transformar datos crudos del ERP según fieldMappings
   * Soporta el nuevo formato SimpleMappingBuilder: [{source, target, dataType}]
   */
  transformData(rawData: any[], mappingConfig: any): LoadedItem[] {
    let fieldMappings = mappingConfig.fieldMappings || mappingConfig.filters?.fieldMappings || {};

    // Si fieldMappings es string (JSON), parsearlo
    if (typeof fieldMappings === 'string') {
      fieldMappings = JSON.parse(fieldMappings);
    }

    console.log(`🔍 [transformData] Transforming ${rawData.length} rows with ${Array.isArray(fieldMappings) ? fieldMappings.length : Object.keys(fieldMappings).length} field mappings`);
    if (rawData.length > 0) {
      console.log(`🔍 [transformData] First row keys:`, Object.keys(rawData[0]));
      console.log(`🔍 [transformData] First row data:`, JSON.stringify(rawData[0], null, 2));
      console.log(`🔍 [transformData] Field mappings:`, JSON.stringify(fieldMappings, null, 2));
    }

    return rawData
      .map((row, rowIndex) => {
        try {
          const result: any = {};
          const isFirstRow = rowIndex === 0;

          // Soportar ambos formatos: viejo (objeto) y nuevo (array)
          if (Array.isArray(fieldMappings)) {
            // Nuevo formato: [{source: "campo_erp", target: "campo_local", dataType: "string"}]
            for (const mapping of fieldMappings) {
              let sourceValue = '';

              // El source puede ser:
              // - "ARTICULO.codigo" (full path with table name)
              // - "a.CANT_DISPONIBLE" (with alias)
              // - "CANT_DISPONIBLE" (just column name)

              const sourceParts = mapping.source.split('.');
              const columnName = sourceParts[sourceParts.length - 1];  // Último segmento

              if (isFirstRow) {
                console.log(`  🔎 Row[${rowIndex}] Mapping "${mapping.target}": searching for "${mapping.source}" (column: "${columnName}")`);
              }

              // Buscar en el row:
              // 1. Por el nombre exacto (si source es simple)
              if (row[mapping.source]) {
                sourceValue = row[mapping.source];
                if (isFirstRow) {
                  console.log(`    ✅ Found by exact key: "${mapping.source}" = "${sourceValue}"`);
                }
              }
              // 2. Por el nombre de columna
              else if (row[columnName]) {
                sourceValue = row[columnName];
                if (isFirstRow) {
                  console.log(`    ✅ Found by column name: "${columnName}" = "${sourceValue}"`);
                }
              }
              // 3. Case-insensitive búsqueda
              else {
                const key = Object.keys(row).find(k => k.toUpperCase() === columnName.toUpperCase());
                if (key) {
                  sourceValue = row[key];
                  if (isFirstRow) {
                    console.log(`    ✅ Found case-insensitive: "${key}" = "${sourceValue}"`);
                  }
                } else {
                  if (isFirstRow) {
                    console.log(`    ❌ Not found: "${mapping.source}" (column: "${columnName}")`);
                    console.log(`       Available keys in row: ${Object.keys(row).join(', ')}`);
                  }
                }
              }

              result[mapping.target] = sourceValue || '';
            }
          } else {
            // Viejo formato: {itemCode: "campo", itemName: "campo"}
            for (const [key, value] of Object.entries(fieldMappings)) {
              result[key] = row[value as string] || '';
            }
          }

          // Mapear a estructura completa de LoadedItem
          const toNum = (v: any) => v != null && v !== '' ? parseFloat(String(v)) : undefined;
          const toStr = (v: any) => v != null && v !== '' ? String(v).trim() : undefined;

          return {
            itemCode: String(result.itemCode || '').trim(),
            itemName: String(result.itemName || '').trim(),
            systemQty: toNum(result.systemQty ?? result.quantity ?? result.cantDisponible ?? result.cant_disponible) ?? 0,
            uom: toStr(result.uom) ?? 'PZ',
            baseUom: toStr(result.baseUom) ?? 'PZ',
            packQty: toNum(result.packQty ?? result.pesoBruto ?? result.peso_bruto) ?? 1,
            // Campos opcionales — si el mapping los incluye, se persisten
            // Se aceptan tanto los nombres del mapping (cost, price) como los canónicos (costPrice, salePrice)
            costPrice: toNum(result.costPrice ?? result.cost ?? result.costoUltLoc ?? result.costo_ult_loc),
            salePrice: toNum(result.salePrice ?? result.price ?? result.precio),
            barCodeInv: toStr(result.barCodeInv ?? result.barcode ?? result.barCode ?? result.codigoBarrasInventario),
            barCodeVt: toStr(result.barCodeVt ?? result.barcodeVt ?? result.barCodeVenta ?? result.codigoBarrasVenta),
            brand: toStr(result.brand ?? result.marca),
            category: toStr(result.category ?? result.categoria ?? result.clasificacion1 ?? result.clasificacion_1),
            subcategory: toStr(result.subcategory ?? result.subcategoria ?? result.clasificacion2 ?? result.clasificacion_2),
          };
        } catch (error) {
          console.error('Error transforming row:', error);
          return null;
        }
      })
      .filter((item) => item !== null && item.itemCode) as LoadedItem[];
  }

  /**
   * Generar código único para el conteo
   */
  private generateCountCode(companyId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `INV-${year}-${month}-${randomSuffix}`;
  }
}

export async function createLoadInventoryService(fastify: FastifyInstance) {
  return new LoadInventoryFromERPService(fastify);
}
