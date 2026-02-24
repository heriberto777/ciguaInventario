import sql from 'mssql';
import { AppError } from '../../utils/errors';

export interface MSSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  timeout?: number;
}

export interface QueryResult {
  recordset: any[];
  rowsAffected: number[];
}

/**
 * Conector para SQL Server / Catelli
 * Maneja conexiones a bases de datos MSSQL
 */
export class MSSQLConnector {
  private pool: sql.ConnectionPool | null = null;
  private config: MSSQLConfig;
  private isConnected = false;

  constructor(config: MSSQLConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Establece conexión con la BD
   */
  async connect(): Promise<void> {
    try {
      this.pool = new sql.ConnectionPool({
        server: this.config.host,
        port: this.config.port,
        database: this.config.database,
        authentication: {
          type: 'default',
          options: {
            userName: this.config.username,
            password: this.config.password,
          },
        },
        options: {
          trustServerCertificate: true,
          enableKeepAlive: true,
          connectionTimeout: this.config.timeout,
        },
      });

      await this.pool.connect();
      this.isConnected = true;
      console.log(`✅ Connected to MSSQL: ${this.config.host}:${this.config.port}/${this.config.database}`);
    } catch (error) {
      this.isConnected = false;
      throw new AppError(
        500,
        `Failed to connect to MSSQL: ${(error as Error).message}`
      );
    }
  }

  /**
   * Cierra la conexión
   */
  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.close();
        this.isConnected = false;
        console.log('✅ Disconnected from MSSQL');
      }
    } catch (error) {
      console.error('Error disconnecting from MSSQL:', error);
    }
  }

  /**
   * Valida que exista conexión activa
   */
  private validateConnection(): void {
    if (!this.isConnected || !this.pool) {
      throw new AppError(500, 'Database connection not established');
    }
  }

  /**
   * Ejecuta query con parámetros
   * @param query - SQL query
   * @param params - Parámetros nombrados {key: value}
   * @returns Resultados
   */
  async executeQuery(query: string, params?: Record<string, any>): Promise<any[]> {
    this.validateConnection();

    try {
      const request = this.pool!.request();

      // Agregar parámetros
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }

      const result = await request.query(query);
      return result.recordset || [];
    } catch (error) {
      throw new AppError(
        500,
        `Query execution failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Ejecuta query con paginación
   */
  async executeQueryPaginated(
    query: string,
    page = 1,
    pageSize = 100,
    params?: Record<string, any>
  ): Promise<{ data: any[]; total: number }> {
    this.validateConnection();

    try {
      const request = this.pool!.request();

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }

      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
      const countResult = await request.query(countQuery);
      const total = countResult.recordset[0]?.total || 0;

      // Query con paginación
      const offset = (page - 1) * pageSize;
      const paginatedQuery = `
        ${query}
        ORDER BY 1
        OFFSET ${offset} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY
      `;

      const dataResult = await request.query(paginatedQuery);
      return {
        data: dataResult.recordset || [],
        total,
      };
    } catch (error) {
      throw new AppError(
        500,
        `Paginated query failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Ejecuta query basada en MappingConfig
   * Construye dinámicamente la query desde fieldMappings
   */
  async executeMappingQuery(
    mappingConfig: {
      sourceTables: string[];
      sourceQuery?: string;
      fieldMappings: Array<{ sourceField: string; targetField: string }>;
      filters?: Record<string, any>;
    },
    runtimeParams?: Record<string, any>
  ): Promise<any[]> {
    this.validateConnection();

    try {
      let query: string;

      // Si hay query personalizada, usarla
      if (mappingConfig.sourceQuery) {
        query = mappingConfig.sourceQuery;
      } else {
        // Construir query desde mappings
        const selectClause = mappingConfig.fieldMappings
          .map(f => `${f.sourceField} AS ${f.targetField}`)
          .join(', ');

        const fromClause = mappingConfig.sourceTables[0];
        query = `SELECT ${selectClause} FROM ${fromClause}`;

        // Agregar WHERE si hay filtros
        if (mappingConfig.filters && Object.keys(mappingConfig.filters).length > 0) {
          const whereClauses: string[] = [];
          for (const [key, value] of Object.entries(mappingConfig.filters)) {
            if (value === 'parameter') {
              whereClauses.push(`${key} = @${key}`);
            } else {
              whereClauses.push(`${key} = '${value}'`);
            }
          }
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      return this.executeQuery(query, runtimeParams);
    } catch (error) {
      throw new AppError(
        500,
        `Mapping query execution failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Test de conexión
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.executeQuery('SELECT 1 as test');
      await this.disconnect();
      return result.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Obtiene estado de conexión
   */
  getConnectionStatus(): {
    isConnected: boolean;
    config: { host: string; database: string };
  } {
    return {
      isConnected: this.isConnected,
      config: {
        host: this.config.host,
        database: this.config.database,
      },
    };
  }
}
