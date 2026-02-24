import { CreateMappingConfigRequest, MappingConfigResponse, PreviewDataResponse } from './schemas';
import { ConfigMappingRepository } from './repository';
import { ERPConnectorFactory } from './erp-connector';
import { SqlTemplateBuilder } from './sql-builder';
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
    // Validate metadata
    await this.validateMetadata(companyId, data);

    const mapping = await this.repository.create(companyId, data);

    // Audit log
    await this.fastify.auditLog({
      companyId,
      action: 'CREATE',
      resource: 'MappingConfig',
      resourceId: mapping.id,
      newValue: mapping,
    });

    return mapping;
  }

  async testMapping(
    mappingId: string,
    companyId: string,
    limitRows: number = 10
  ): Promise<PreviewDataResponse> {
    const mapping = await this.repository.getById(mappingId, companyId);

    // Get ERP connection
    const erpConnection = await this.fastify.prisma.eRPConnection.findUnique({
      where: { id: mapping.erpConnectionId },
    });

    if (!erpConnection) {
      throw new NotFoundError('ERP Connection not found');
    }

    try {
      // Create connector
      const connector = ERPConnectorFactory.create(
        erpConnection.erpType,
        erpConnection.host,
        erpConnection.port,
        erpConnection.database,
        erpConnection.username,
        erpConnection.password
      );

      await connector.connect();

      // Build query from template
      const templateKey = `${mapping.datasetType}_QUERY`;
      const builder = new SqlTemplateBuilder(templateKey);
      builder.setTableName(mapping.sourceTables[0]);
      builder.addParameter('companyId', companyId);
      builder.setLimit(limitRows);

      const { sql, parameters } = builder.build();

      // Execute preview query
      const startTime = Date.now();
      const rawData = await connector.query(sql, parameters);
      const executionTimeMs = Date.now() - startTime;

      await connector.disconnect();

      // Aplicar mapeo de campos
      const mappedData = rawData.map((row: any) => {
        const mappedRow: any = {};

        // Mapear cada campo según fieldMappings
        if (mapping.fieldMappings && Array.isArray(mapping.fieldMappings)) {
          mapping.fieldMappings.forEach((fieldMapping: any) => {
            const sourceField = fieldMapping.source || fieldMapping.sourceField;
            const targetField = fieldMapping.target || fieldMapping.targetField;
            if (sourceField && row.hasOwnProperty(sourceField)) {
              mappedRow[targetField] = row[sourceField];
            }
          });
        }

        // Si no hay fieldMappings, devolver los datos como están
        if (Object.keys(mappedRow).length === 0) {
          return row;
        }

        return mappedRow;
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
    // Validate field mappings are not empty
    if (!data.fieldMappings || data.fieldMappings.length === 0) {
      throw new ValidationError('Field mappings are required');
    }

    // Validate source tables exist
    if (!data.sourceTables || data.sourceTables.length === 0) {
      throw new ValidationError('Source tables are required');
    }

    // Stub: Validate against ERP metadata
    // In production: query ERP for actual table/column metadata
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
