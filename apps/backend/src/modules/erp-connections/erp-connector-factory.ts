import { FastifyInstance } from 'fastify';
import { MSSQLConnector, MSSQLConfig } from './mssql-connector';
import { AppError } from '../../utils/errors';

export interface ERPConnectorConfig {
  erpType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Factory para crear conectores ERP
 * Soporta múltiples tipos de bases de datos (MSSQL, SAP, ORACLE, etc.)
 */
export class ERPConnectorFactory {
  /**
   * Crea un conector basado en el tipo de ERP
   */
  static create(config: ERPConnectorConfig): MSSQLConnector {
    switch (config.erpType.toUpperCase()) {
      case 'MSSQL':
      case 'SQLSERVER':
        return new MSSQLConnector({
          host: config.host,
          port: config.port,
          database: config.database,
          username: config.username,
          password: config.password,
        } as MSSQLConfig);

      case 'SAP':
        throw new AppError(500, 'SAP connector not implemented yet');

      case 'ORACLE':
        throw new AppError(500, 'ORACLE connector not implemented yet');

      default:
        throw new AppError(400, `Unknown ERP type: ${config.erpType}`);
    }
  }

  /**
   * Obtiene conector desde BD de la empresa
   */
  static async getConnectorForCompany(
    fastify: FastifyInstance,
    companyId: string,
    erpType: string = 'MSSQL'
  ): Promise<MSSQLConnector> {
    try {
      const erpConnection = await fastify.prisma.erpConnection.findFirst({
        where: {
          companyId,
          erpType: erpType.toUpperCase(),
          isActive: true,
        },
      });

      if (!erpConnection) {
        throw new AppError(
          400,
          `No active ${erpType} connection configured for this company`
        );
      }

      return this.create({
        erpType: erpConnection.erpType,
        host: erpConnection.host,
        port: erpConnection.port,
        database: erpConnection.database,
        username: erpConnection.username,
        password: erpConnection.password,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to get ERP connector: ${(error as Error).message}`);
    }
  }

  /**
   * Lista todos los tipos de ERP soportados
   */
  static getSupportedTypes(): string[] {
    return ['MSSQL', 'SAP', 'ORACLE'];
  }
}
