/**
 * ERP Introspection Service
 *
 * Obtiene dinámicamente las tablas y columnas del ERP Catelli
 * para poblar los campos disponibles en el mapping
 */

import { MSSQLConnector } from './mssql-connector';
import { AppError } from '../../utils/errors';

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  maxLength?: number;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
}

export interface AvailableTable {
  name: string;
  label: string;
  description?: string;
  columnCount: number;
}

/**
 * Servicio para introspección de esquema del ERP
 */
export class ERPIntrospectionService {
  private connector: MSSQLConnector;

  constructor(connector: MSSQLConnector) {
    this.connector = connector;
  }

  /**
   * Obtiene todas las tablas disponibles en Catelli
   * Filtra por las tablas relevantes para inventario
   * Busca en TODOS los schemas (dbo, catelli, etc.)
   */
  async getAvailableTables(): Promise<AvailableTable[]> {
    try {
      const query = `
        SELECT
          TABLE_SCHEMA + '.' + TABLE_NAME as name,
          COUNT(*) as columnCount
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_CATALOG = DB_NAME()
          AND TABLE_SCHEMA NOT IN ('sys', 'information_schema')
        GROUP BY TABLE_SCHEMA, TABLE_NAME
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `;

      const results = await this.connector.executeQuery(query);

      // Mapear resultados a AvailableTable
      const tables: AvailableTable[] = results.map((row: any) => ({
        name: row.name,
        label: this.formatTableName(row.name),
        columnCount: row.columnCount,
      }));

      return tables;
    } catch (error) {
      throw new AppError(
        500,
        `Failed to retrieve available tables: ${(error as Error).message}`
      );
    }
  }

  /**
   * Obtiene el esquema completo de una tabla (columnas, tipos, etc.)
   * Soporta tablas con schema (ej: catelli.articulo)
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    try {
      // Soportar formato schema.table
      let schemaName = 'dbo';
      let actualTableName = tableName;

      if (tableName.includes('.')) {
        const parts = tableName.split('.');
        schemaName = parts[0];
        actualTableName = parts[1];
      }

      // Validar nombre de tabla contra inyección SQL
      if (!/^[a-zA-Z0-9_]+$/.test(actualTableName) || !/^[a-zA-Z0-9_]+$/.test(schemaName)) {
        throw new AppError(400, 'Invalid table or schema name');
      }

      const query = `
        SELECT
          COLUMN_NAME as name,
          DATA_TYPE as type,
          CHARACTER_MAXIMUM_LENGTH as maxLength,
          IS_NULLABLE as isNullable,
          COLUMNPROPERTY(OBJECT_ID('${schemaName}.${actualTableName}'), COLUMN_NAME, 'IsIdentity') as isPrimaryKey
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${actualTableName}'
          AND TABLE_SCHEMA = '${schemaName}'
        ORDER BY ORDINAL_POSITION
      `;

      const columns = await this.connector.executeQuery(query);

      // Transformar a ColumnSchema
      const schema: TableSchema = {
        name: tableName,
        columns: columns.map((col: any) => ({
          name: col.name,
          type: this.mapSQLType(col.type),
          maxLength: col.maxLength,
          isNullable: col.isNullable === 'YES',
          isPrimaryKey: col.isPrimaryKey === 1,
          isForeignKey: false, // TODO: Implementar detección de FK
        })),
      };

      return schema;
    } catch (error) {
      throw new AppError(
        500,
        `Failed to retrieve table schema: ${(error as Error).message}`
      );
    }
  }

  /**
   * Obtiene columnas de múltiples tablas
   */
  async getTableSchemas(tableNames: string[]): Promise<TableSchema[]> {
    try {
      const schemas = await Promise.all(
        tableNames.map(name => this.getTableSchema(name))
      );
      return schemas;
    } catch (error) {
      throw new AppError(
        500,
        `Failed to retrieve table schemas: ${(error as Error).message}`
      );
    }
  }

  /**
   * Ejecuta un preview del query con datos reales
   * Usa TOP para MSSQL (no LIMIT)
   */
  async previewQuery(
    sql: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // MSSQL usa TOP, no LIMIT
      let cleanSql = sql.trim();

      // Sanitizar caracteres de escape que vienen del JSON
      // Convertir literales \n, \t, etc. a verdaderos saltos de línea
      cleanSql = cleanSql.replace(/\\n/g, '\n');
      cleanSql = cleanSql.replace(/\\t/g, '\t');
      cleanSql = cleanSql.replace(/\\r/g, '\r');
      cleanSql = cleanSql.replace(/\\\\/g, '\\');

      // Remover LIMIT clauses (PostgreSQL/MySQL) que puedan venir del frontend
      // Patrón: LIMIT n o LIMIT n OFFSET m o LIMIT n, m
      cleanSql = cleanSql.replace(/\s+LIMIT\s+\d+(\s*,\s*\d+|\s+OFFSET\s+\d+)?\s*$/i, '');
      cleanSql = cleanSql.trim();

      let safeQuery: string;
      const upperSql = cleanSql.toUpperCase().trim();

      if (upperSql.startsWith('SELECT')) {
        // Insertar TOP después de SELECT
        // Evitar duplicar TOP si ya existe
        if (upperSql.includes(' TOP ')) {
          safeQuery = cleanSql;
        } else {
          safeQuery = cleanSql.replace(/^SELECT\s+/i, `SELECT TOP ${limit} `);
        }
      } else {
        // Si no es SELECT, es inválido
        throw new AppError(
          400,
          'Query debe comenzar con SELECT'
        );
      }

      const results = await this.connector.executeQuery(safeQuery);
      return results;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        500,
        `Failed to preview query: ${(error as Error).message}`
      );
    }
  }

  /**
   * Formatea nombres de tabla para etiquetas legibles
   */
  private formatTableName(tableName: string): string {
    return tableName
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Mapea tipos de datos SQL Server a tipos TypeScript
   */
  private mapSQLType(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'int': 'number',
      'bigint': 'number',
      'smallint': 'number',
      'tinyint': 'number',
      'decimal': 'number',
      'numeric': 'number',
      'float': 'number',
      'real': 'number',
      'varchar': 'string',
      'nvarchar': 'string',
      'char': 'string',
      'nchar': 'string',
      'text': 'string',
      'ntext': 'string',
      'datetime': 'date',
      'datetime2': 'date',
      'date': 'date',
      'time': 'date',
      'bit': 'boolean',
    };

    return typeMap[sqlType.toLowerCase()] || 'string';
  }
}
