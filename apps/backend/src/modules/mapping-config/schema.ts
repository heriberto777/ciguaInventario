/**
 * Schema de validación para MappingConfig
 * Soporta múltiples tablas con JOINS y mapeo de campos
 */

export interface TableJoin {
  name: string;
  alias: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  joinCondition: string; // e.g., "a.articulo_id = b.id"
}

export interface FieldMapping {
  sourceField: string; // Campo en Catelli: "articulo.codigo"
  targetField: string; // Campo en nuestra app: "itemCode"
  dataType: 'string' | 'number' | 'date' | 'boolean';
  transformation?: string; // Ej: "UPPER({})" o "CAST({} AS INT)"
}

export interface Filter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'BETWEEN';
  value: any;
  logicalOperator?: 'AND' | 'OR'; // Para múltiples filtros
}

export interface CreateMappingConfigDTO {
  connectionId: string; // ID de conexión ERP
  datasetType: string; // ITEMS, STOCK, COST, PRICE

  // Tabla principal (string, ej: "catelli.ARTICULO")
  mainTable: string;

  // Tablas adicionales con JOINS
  joins?: Array<{
    table: string;
    alias: string;
    joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    joinCondition: string;
  }>;

  // Query personalizada (alternativa a mainTable + joins)
  customQuery?: string;

  // Columnas seleccionadas del ERP
  selectedColumns?: string[];

  // Mapeo de campos: qué campos traer y a dónde mapear
  fieldMappings: Array<{
    source: string; // Campo ERP, ej: "catelli.ARTICULO.CODIGO"
    target: string; // Campo local, ej: "itemCode"
    dataType: 'string' | 'number' | 'date' | 'boolean';
    transformation?: string;
  }>;

  // Filtros opcionales (WHERE clause)
  filters?: Array<{
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'BETWEEN';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;

  // Índice para orden
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;

  // Límite de filas
  limit?: number;

  isActive?: boolean;
}

export interface UpdateMappingConfigDTO extends Partial<CreateMappingConfigDTO> {
  isActive?: boolean;
}

export interface MappingConfigResponse extends CreateMappingConfigDTO {
  id: string;
  companyId: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionResult {
  mappingId: string;
  datasetType: string;
  rowsReturned: number;
  executionTimeMs: number;
  data: any[];
}
