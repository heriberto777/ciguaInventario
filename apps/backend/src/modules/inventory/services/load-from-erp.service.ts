import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';
import { ERPConnectorFactory } from '../../erp-connections/erp-connector-factory';
import { ERPIntrospectionService } from '../../erp-connections/erp-introspection';

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
  costPrice?: number;
  salePrice?: number;
  barCodeInv?: string;
  barCodeVt?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  itemProv?: string;
  lot?: string;
  invoiceNumber?: string;
  clientName?: string;
}

interface LoadInventoryResult {
  countId: string;
  itemsLoaded: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  message: string;
  errors?: string[];
}

export class LoadInventoryFromERPService {
  constructor(
    private repository: InventoryRepository,
    private logger?: any,
    private auditLogger?: (data: any) => Promise<void>
  ) { }

  /**
   * Cargar inventario desde ERP basado en configuración de mapeo
   */
  async loadInventoryFromERP(params: LoadInventoryParams): Promise<LoadInventoryResult> {
    const { mappingId, warehouseId, companyId, userId } = params;

    try {
      const mappingConfig = await this.repository.findMappingConfigById(mappingId);

      if (!mappingConfig || mappingConfig.companyId !== companyId) {
        throw new AppError(404, 'Mapping configuration not found');
      }

      if (!mappingConfig.erpConnectionId) {
        throw new AppError(400, 'Mapping configuration does not have an ERP connection');
      }

      if (!mappingConfig.isActive) {
        throw new AppError(400, 'Mapping configuration is not active');
      }

      const warehouse = await this.repository.findWarehouseById(warehouseId);

      if (!warehouse || warehouse.companyId !== companyId) {
        throw new AppError(404, 'Warehouse not found');
      }

      const connection = await this.repository.findERPConnectionById(
        mappingConfig.erpConnectionId,
        companyId
      );

      if (!connection || !connection.isActive) {
        throw new AppError(400, 'ERP connection not found or not active');
      }

      const connector = ERPConnectorFactory.create({
        erpType: connection.erpType,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password,
      });

      const introspection = new ERPIntrospectionService(connector);
      let sqlQuery = mappingConfig.sourceQuery;

      if (!sqlQuery) {
        const queryObj = this.buildQueryFromMapping(mappingConfig);
        sqlQuery = queryObj.sql;
      }

      let rawData: any[] = [];
      try {
        rawData = await introspection.previewQuery(sqlQuery, 10000); 
      } catch (error: any) {
        throw new AppError(400, `Failed to execute ERP query: ${error.message}`);
      }

      if (!rawData || rawData.length === 0) {
        throw new AppError(400, 'No data returned from ERP query');
      }

      const transformedItems = this.transformData(rawData, mappingConfig);

      const inventoryCount = await this.repository.createCount({
        companyId,
        warehouseId,
        code: this.generateCountCode(companyId),
        description: `Loaded from ERP via ${mappingConfig.datasetType}`,
        status: 'DRAFT',
        startedBy: userId,
        startedAt: new Date(),
        sequenceNumber: this.generateSequenceNumber(), 
      });

      let locations = await this.repository.findLocationsByWarehouseId(warehouseId);

      if (locations.length === 0) {
        const defaultLocation = await this.repository.createLocation({
          warehouseId,
          code: 'DEFAULT',
          name: 'Default Location',
          type: 'FLOOR',
        });
        locations = [defaultLocation];
      }

      const createdItems: typeof transformedItems = [];
      const errors: string[] = [];

      for (const item of transformedItems) {
        try {
          const location = locations[0];
          await this.repository.createInventoryCountItem({
            countId: inventoryCount.id,
            locationId: location.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            systemQty: item.systemQty,
            countedQty: null,
            uom: item.uom || 'PZ',
            baseUom: item.baseUom || 'PZ',
            packQty: item.packQty || 1,
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
          });

          createdItems.push(item);
        } catch (error: any) {
          errors.push(`Failed to create item ${item.itemCode}: ${error.message}`);
        }
      }

      if (this.auditLogger) {
        await this.auditLogger({
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
      }

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
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to load inventory from ERP: ${error.message}`);
    }
  }

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
        // Si no tiene punto, le ponemos el alias de la tabla principal por defecto para evitar ambigüedades
        return `${mainTableAlias}.${col}`;
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
          if (f.operator === 'OR_LIKE') {
            const searchVal = typeof f.value === 'object' ? f.value.search : f.value;
            const fieldsToSearch = typeof f.value === 'object' && Array.isArray(f.value.fields) ? f.value.fields : [f.field];
            const subConditions = fieldsToSearch.map((fieldItem: string) => {
              let field = fieldItem;
              const lastDot = field.lastIndexOf('.');
              if (lastDot > 0) {
                const tableName = field.substring(0, lastDot).split('.').pop() || '';
                const colName = field.substring(lastDot + 1);
                const alias = tableAliasMap[tableName];
                if (alias) field = `${alias}.${colName}`;
              } else {
                field = `${mainTableAlias}.${field}`;
              }
              return `${field} LIKE '${searchVal}'`;
            });
            return `(${subConditions.join(' OR ')})`;
          }

          let field = f.field;
          const lastDot = field.lastIndexOf('.');
          if (lastDot > 0) {
            const tableName = field.substring(0, lastDot).split('.').pop() || '';
            const colName = field.substring(lastDot + 1);
            const alias = tableAliasMap[tableName];
            if (alias) field = `${alias}.${colName}`;
          } else {
            // Si no tiene alias, le ponemos el de la tabla principal
            field = `${mainTableAlias}.${field}`;
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

      if (this.logger) this.logger.info(`✅ [buildQueryFromMapping] Generated SQL: ${sql}`);
      return { sql, parameters: [] };
    } catch (error: any) {
      throw new AppError(400, `Query Builder Error: ${error.message}`);
    }
  }

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
        systemQty: toNum(result.systemQty ?? result.reservedQty ?? result.quantity ?? result.cantDisponible) ?? 0,
        uom: toStr(result.uom) ?? 'PZ',
        baseUom: toStr(result.baseUom) ?? 'PZ',
        packQty: toNum(result.packQty) ?? 1,
        costPrice: toNum(result.costPrice ?? result.cost ?? result.costo ?? result.costo_promedio ?? result.COSTO_PROMEDIO ?? result.COSTO ?? result.COSTO_ESTANDAR ?? result.ULTIMO_COSTO ?? 0),
        salePrice: toNum(result.salePrice ?? result.price ?? result.precio ?? result.precio_venta ?? result.PRECIO_VENTA ?? result.PRECIO ?? result.PRECIO_LISTA ?? 0),
        barCodeInv: toStr(result.barCodeInv ?? result.barcode),
        barCodeVt: toStr(result.barCodeVt ?? result.barcodeVt),
        brand: toStr(result.brand ?? result.marca),
        category: toStr(result.category ?? result.categoria),
        subcategory: toStr(result.subcategory ?? result.subcategoria),
        itemProv: toStr(result.itemProv ?? result.articulo_del_prov),
        lot: toStr(result.lot ?? result.lote),
        invoiceNumber: toStr(result.invoiceNumber),
        clientName: toStr(result.clientName),
      };
    }).filter(i => i.itemCode) as LoadedItem[];
  }

  private generateCountCode(companyId: string): string {
    const date = new Date();
    return `INV-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  private generateSequenceNumber(): string {
    return `CONT-${Date.now()}`; 
  }

  /**
   * Fusiona filtros externos en la configuración de mapeo sin romper la estructura.
   */
  public mergeFiltersIntoMapping(mapping: any, newFilters: any[]): any {
    const mappingWithFilters: any = { ...mapping };
    const originalFilters = mapping.filters;
    
    if (Array.isArray(originalFilters)) {
        const normalizedArray = [...(originalFilters as any[])];
        let merged = false;
        
        // Buscamos si ya existe una sección de filtros (array de objetos con 'field')
        for (let i = 0; i < normalizedArray.length; i++) {
            const element = normalizedArray[i];
            if (Array.isArray(element) && element.length > 0 && typeof element[0] === 'object' && element[0].field) {
                normalizedArray[i] = [...element, ...newFilters];
                merged = true; 
                break;
            }
        }
        
        if (!merged) {
            // Si no se encontró un bloque de filtros, lo añadimos al final
            normalizedArray.push(newFilters);
        }
        mappingWithFilters.filters = normalizedArray;
    } else if (typeof originalFilters === 'object' && originalFilters !== null) {
        const normalizedObj = { ...originalFilters };
        normalizedObj.filters = Array.isArray(normalizedObj.filters) 
            ? [...normalizedObj.filters, ...newFilters] 
            : newFilters;
        mappingWithFilters.filters = normalizedObj;
    } else {
        // Si no había filtros o era string, creamos la estructura básica
        mappingWithFilters.filters = newFilters;
    }
    
    return mappingWithFilters;
  }
}
