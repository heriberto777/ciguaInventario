import { PrismaClient } from '@prisma/client';
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

export interface LoadedItem {
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
  itemProv?: string;     // Código del proveedor (para agrupación de alias)
  lot?: string;          // Lote
  invoiceNumber?: string; // Número de factura (para dataset PENDING_INVOICES)
  clientName?: string;    // Nombre del cliente (para dataset PENDING_INVOICES)
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
              ...(item.lot && { lot: item.lot }),
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
      let filtersStrOrObj = mappingConfig.filters || {};
      let filters: any = filtersStrOrObj;
      if (typeof filtersStrOrObj === 'string') {
        filters = JSON.parse(filtersStrOrObj);
      }

      let normalizedFilters: {
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

      if (Array.isArray(filters)) {
        this.fastify.log.info('🔄 [buildQueryFromMapping] Normalizing array-positional filters...');
        for (const element of filters) {
          if (typeof element === 'string') {
            normalizedFilters.mainTable = element;
          } else if (Array.isArray(element) && element.length > 0) {
            const first = element[0];
            if (typeof first === 'string') {
              normalizedFilters.selectedColumns = element;
            } else if (typeof first === 'object' && first !== null) {
              if ('table' in first || 'joinCondition' in first) {
                normalizedFilters.joins = element;
              } else if ('field' in first || 'operator' in first) {
                normalizedFilters.filters = element;
              }
            }
          }
        }
      } else if (typeof filters === 'object' && filters !== null) {
        normalizedFilters = {
          mainTable: filters.mainTable || '',
          joins: Array.isArray(filters.joins) ? filters.joins : [],
          filters: Array.isArray(filters.filters) ? filters.filters : [],
          selectedColumns: Array.isArray(filters.selectedColumns) ? filters.selectedColumns : [],
        };
      }

      const mainTable = normalizedFilters.mainTable || mappingConfig.mainTable || (Array.isArray(mappingConfig.sourceTables) ? mappingConfig.sourceTables[0] : '') || '';
      const joins = (normalizedFilters.joins.length > 0) ? normalizedFilters.joins : (Array.isArray(mappingConfig.joins) ? mappingConfig.joins : []);

      let rootFilters: any[] = [];
      if (Array.isArray(mappingConfig.filters)) {
        rootFilters = mappingConfig.filters.filter((f: any) =>
          typeof f === 'object' && f !== null && !Array.isArray(f) && 'field' in f
        );
      }
      const whereFilters = [...normalizedFilters.filters, ...rootFilters];
      let selectedColumns = (normalizedFilters.selectedColumns.length > 0) ? normalizedFilters.selectedColumns : (Array.isArray(mappingConfig.selectedColumns) ? mappingConfig.selectedColumns : []);

      // Si aún está vacío, intentar extraer de fieldMappings
      if (selectedColumns.length === 0 && mappingConfig.fieldMappings) {
        let fm = mappingConfig.fieldMappings;
        if (typeof fm === 'string') {
          try { fm = JSON.parse(fm); } catch (e) { fm = []; }
        }
        if (Array.isArray(fm)) {
          selectedColumns = fm.map((m: any) => m.source).filter(Boolean);
        } else if (typeof fm === 'object' && fm !== null) {
          selectedColumns = Object.values(fm).filter(Boolean) as string[];
        }
      }

      if (!mainTable) throw new Error('No main table found');
      if (selectedColumns.length === 0) throw new Error('No selected columns found');

      const tableAliasMap: { [key: string]: string } = {};
      const mainTableName = mainTable.split('.').pop() || mainTable;
      let mainTableAlias = mainTableName.charAt(0).toLowerCase() || 'a';
      tableAliasMap[mainTableName] = mainTableAlias;
      tableAliasMap[mainTable] = mainTableAlias;

      for (const join of joins) {
        if (join.table && join.alias) {
          const joinTableName = join.table.split('.').pop() || join.table;
          tableAliasMap[joinTableName] = join.alias;
          tableAliasMap[join.table] = join.alias;
        }
      }

      const finalColumns = selectedColumns.map((col: string) => {
        const lastDot = col.lastIndexOf('.');
        if (lastDot > 0) {
          const tableName = col.substring(0, lastDot).split('.').pop() || '';
          const colName = col.substring(lastDot + 1);
          const alias = tableAliasMap[tableName];
          return alias ? `${alias}.${colName}` : col;
        }
        return col;
      });

      let sql = `SELECT ${finalColumns.join(', ')} FROM ${mainTable} ${mainTableAlias}`;

      for (const join of joins) {
        if (join.table && join.alias && join.joinCondition) {
          const type = join.joinType || 'LEFT';
          sql += ` ${type} JOIN ${join.table} ${join.alias} ON ${join.joinCondition}`;
        }
      }

      if (whereFilters.length > 0) {
        const conditions = whereFilters.map(f => {
          let field = f.field;
          const lastDot = field.lastIndexOf('.');
          if (lastDot > 0) {
            const tableName = field.substring(0, lastDot).split('.').pop() || '';
            const colName = field.substring(lastDot + 1);
            const alias = tableAliasMap[tableName];
            if (alias) field = `${alias}.${colName}`;
          }

          if (f.operator === 'IN' && Array.isArray(f.value)) {
            const values = f.value.map((v: any) => typeof v === 'string' ? `'${v}'` : v).join(', ');
            return `${field} IN (${values})`;
          }
          const val = typeof f.value === 'string' ? `'${f.value}'` : f.value;
          return `${field} ${f.operator} ${val}`;
        });
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      this.fastify.log.info(`✅ [buildQueryFromMapping] Generated SQL: ${sql}`);
      return { sql, parameters: [] };
    } catch (error: any) {
      throw new AppError(400, `Query Builder Error: ${error.message}`);
    }
  }

  /**
   * Transformar datos crudos del ERP según fieldMappings
   * Soporta el nuevo formato SimpleMappingBuilder: [{source, target, dataType}]
   */
  transformData(rawData: any[], mappingConfig: any): LoadedItem[] {
    let fieldMappings = mappingConfig.fieldMappings || mappingConfig.filters?.fieldMappings || [];
    if (typeof fieldMappings === 'string') fieldMappings = JSON.parse(fieldMappings);

    return rawData.map(row => {
      const result: any = {};
      if (Array.isArray(fieldMappings)) {
        for (const m of fieldMappings) {
          const colName = m.source.split('.').pop();
          result[m.target] = row[m.source] ?? row[colName] ?? '';
        }
      } else {
        for (const [k, v] of Object.entries(fieldMappings)) {
          result[k] = row[v as string] || '';
        }
      }

      const toNum = (v: any) => (v != null && v !== '') ? parseFloat(String(v)) : undefined;
      const toStr = (v: any) => (v != null && v !== '') ? String(v).trim() : undefined;

      return {
        itemCode: String(result.itemCode || '').trim(),
        itemName: String(result.itemName || '').trim(),
        systemQty: toNum(result.systemQty ?? result.quantity ?? result.cantDisponible) ?? 0,
        uom: toStr(result.uom) ?? 'PZ',
        baseUom: toStr(result.baseUom) ?? 'PZ',
        packQty: toNum(result.packQty) ?? 1,
        costPrice: toNum(result.costPrice ?? result.cost),
        salePrice: toNum(result.salePrice ?? result.price),
        barCodeInv: toStr(result.barCodeInv ?? result.barcode),
        barCodeVt: toStr(result.barCodeVt ?? result.barcodeVt),
        brand: toStr(result.brand ?? result.marca),
        category: toStr(result.category ?? result.categoria),
        subcategory: toStr(result.subcategory ?? result.subcategoria),
        itemProv: toStr(result.itemProv ?? result.articulo_del_prov),
        lot: toStr(result.lot ?? result.lote),
      };
    }).filter(i => i.itemCode) as LoadedItem[];
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
