import { CreateMappingConfigRequest, MappingConfigResponse, PreviewDataResponse } from './schemas';
import { ConfigMappingRepository } from './repository';
import { ERPConnectorFactory } from '../erp-connections';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { FastifyInstance } from 'fastify';

export class ConfigMappingService {
  private repository: ConfigMappingRepository;

  constructor(
    private fastify: FastifyInstance,
    prismaClient: any
  ) {
    this.repository = new ConfigMappingRepository(prismaClient);
  }

  async getMapping(mappingId: string, companyId: string): Promise<MappingConfigResponse> {
    return this.repository.getById(mappingId, companyId);
  }

  async listMappings(
    companyId: string,
    filters?: { datasetType?: string; erpConnectionId?: string; isActive?: boolean }
  ): Promise<MappingConfigResponse[]> {
    return this.repository.listByCompany(companyId, filters);
  }

  async createMapping(
    companyId: string,
    data: CreateMappingConfigRequest
  ): Promise<MappingConfigResponse> {
    await this.validateMetadata(companyId, data);
    const mapping = await this.repository.create(companyId, data);

    await this.fastify.auditLog({
      companyId,
      action: 'CREATE',
      resource: 'MappingConfig',
      resourceId: mapping.id,
      newValue: mapping,
    });

    return mapping;
  }

  /**
   * Prueba un mapping ejecutando la query real del ERP y retornando preview.
   *
   * Usa LoadInventoryFromERPService.buildQueryFromMapping para que el mismo
   * normalizer de filters (array posicional del SimpleMappingBuilder) se aplique
   * tanto en el test como en la carga real.
   */
  async testMapping(
    mappingId: string,
    companyId: string,
    limitRows: number = 10
  ): Promise<PreviewDataResponse> {
    const mapping = await this.repository.getById(mappingId, companyId);

    const erpConnection = await this.fastify.prisma.eRPConnection.findUnique({
      where: { id: mapping.erpConnectionId },
    });

    if (!erpConnection) {
      throw new NotFoundError('ERP Connection not found');
    }

    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { LoadInventoryFromERPService } = await import('../inventory/load-from-erp.service');
      const { ERPIntrospectionService } = await import('../erp-connections/erp-introspection');

      // Construir la query REAL del mapping (normaliza el formato array del SimpleMappingBuilder)
      const loaderService = new LoadInventoryFromERPService(this.fastify);
      const { sql } = loaderService.buildQueryFromMapping(mapping);

      // Crear conector y ejecutar preview
      const connector = ERPConnectorFactory.create({
        erpType: erpConnection.erpType,
        host: erpConnection.host,
        port: erpConnection.port,
        database: erpConnection.database,
        username: erpConnection.username,
        password: erpConnection.password,
      });
      await connector.connect();

      const introspection = new ERPIntrospectionService(connector);
      const startTime = Date.now();
      const rawData = await introspection.previewQuery(sql, limitRows);
      const executionTimeMs = Date.now() - startTime;
      await connector.disconnect();

      // Aplicar fieldMappings: soporta {source, target} y {sourceField, targetField}
      const fieldMappings: any[] = Array.isArray(mapping.fieldMappings) ? mapping.fieldMappings : [];
      const mappedData = rawData.map((row: Record<string, any>) => {
        const mappedRow: Record<string, any> = {};
        for (const fm of fieldMappings) {
          const sourceField: string = fm.source || fm.sourceField;
          const targetField: string = fm.target || fm.targetField;
          if (!sourceField || !targetField) continue;
          // Buscar dentro del row por el nombre de columna (parte tras el último punto)
          const colName = sourceField.split('.').pop()!;
          const value = row[colName] ?? row[colName.toUpperCase()] ?? row[colName.toLowerCase()] ?? row[sourceField];
          if (value !== undefined) mappedRow[targetField] = value;
        }
        return Object.keys(mappedRow).length > 0 ? mappedRow : row;
      });

      return {
        mappingId,
        datasetType: mapping.datasetType,
        rowCount: mappedData.length,
        data: mappedData.slice(0, limitRows),
        executionTimeMs,
      };
    } catch (error) {
      throw new ValidationError(`Failed to test mapping: ${(error as any).message}`);
    }
  }

  private async validateMetadata(
    companyId: string,
    data: CreateMappingConfigRequest
  ): Promise<void> {
    if (!data.fieldMappings || data.fieldMappings.length === 0) {
      throw new ValidationError('Field mappings are required');
    }
    if (!data.sourceTables || data.sourceTables.length === 0) {
      throw new ValidationError('Source tables are required');
    }

    const validDataTypes = ['STRING', 'INT', 'DECIMAL', 'DATE', 'BOOLEAN'];
    for (const mapping of data.fieldMappings) {
      if (!validDataTypes.includes(mapping.dataType)) {
        throw new ValidationError(
          `Invalid data type: ${mapping.dataType}. Must be one of: ${validDataTypes.join(', ')}`
        );
      }
    }
  }
}
