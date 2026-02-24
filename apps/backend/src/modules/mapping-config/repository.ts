import { FastifyInstance } from 'fastify';
import { AppError } from '../../utils/errors';

export interface CreateMappingConfigDTO {
  connectionId?: string; // ID de conexión ERP (también acepta erpConnectionId)
  erpConnectionId?: string; // Alias para connectionId
  datasetType: string; // ITEMS, STOCK, COST, PRICE
  mainTable: string; // Tabla principal
  joins?: Array<{
    table: string;
    alias: string;
    joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    joinCondition: string;
  }>;
  selectedColumns?: string[];
  fieldMappings: Array<{
    source: string;
    target: string;
    dataType: 'string' | 'number' | 'date' | 'boolean';
    transformation?: string;
  }>;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  customQuery?: string;
  isActive?: boolean;
}

export interface UpdateMappingConfigDTO extends Partial<CreateMappingConfigDTO> {
  isActive?: boolean;
}

export class MappingConfigRepository {
  constructor(private fastify: FastifyInstance) {}

  async create(companyId: string, data: CreateMappingConfigDTO) {
    try {
      console.log('💾 [MappingConfigRepository.create] Starting - companyId:', companyId);
      console.log('💾 [MappingConfigRepository.create] Data:', JSON.stringify(data, null, 2));

      // Aceptar tanto connectionId como erpConnectionId
      const connectionId = data.connectionId || data.erpConnectionId;
      if (!connectionId) {
        throw new Error('connectionId or erpConnectionId is required');
      }

      const config = await this.fastify.prisma.mappingConfig.create({
        data: {
          companyId,
          erpConnectionId: connectionId, // Usar cualquiera de los dos
          datasetType: data.datasetType,
          sourceTables: [data.mainTable], // Almacenar como array
          sourceQuery: data.customQuery,
          fieldMappings: data.fieldMappings,
          filters: {
            mainTable: data.mainTable,
            joins: data.joins,
            filters: data.filters,
            selectedColumns: data.selectedColumns,
          },
          version: 1,
          isActive: true,
        },
      });

      console.log('✅ [MappingConfigRepository.create] Config created successfully:', config.id);
      return config;
    } catch (error: any) {
      console.error('❌ [MappingConfigRepository.create] Error:', error);
      if (error.code === 'P2002') {
        throw new AppError(400, 'MappingConfig already exists for this datasetType');
      }
      throw error;
    }
  }

  async getByCompanyAndType(companyId: string, datasetType: string) {
    const config = await this.fastify.prisma.mappingConfig.findFirst({
      where: {
        companyId,
        datasetType,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });
    return config;
  }

  async getById(id: string, companyId: string) {
    const config = await this.fastify.prisma.mappingConfig.findFirst({
      where: {
        id,
        companyId,
      },
    });
    return config;
  }

  async listByCompany(companyId: string) {
    const configs = await this.fastify.prisma.mappingConfig.findMany({
      where: {
        companyId,
      },
      orderBy: {
        datasetType: 'asc',
      },
    });
    return configs;
  }

  async update(id: string, companyId: string, data: UpdateMappingConfigDTO) {
    const config = await this.getById(id, companyId);
    if (!config) {
      throw new AppError(404, 'MappingConfig not found');
    }

    const updateData: any = {
      datasetType: data.datasetType || config.datasetType,
      sourceTables: data.mainTable ? [data.mainTable] : config.sourceTables,
      sourceQuery: (data as any).customQuery !== undefined ? (data as any).customQuery : config.sourceQuery,
      fieldMappings: (data.fieldMappings || config.fieldMappings) as any,
      filters: (data.filters !== undefined ? { mainTable: data.mainTable, joins: (data as any).joins, filters: data.filters, selectedColumns: (data as any).selectedColumns } : config.filters) as any,
      isActive: data.isActive !== undefined ? data.isActive : config.isActive,
    };

    const updated = await this.fastify.prisma.mappingConfig.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  async delete(id: string, companyId: string) {
    const config = await this.getById(id, companyId);
    if (!config) {
      throw new AppError(404, 'MappingConfig not found');
    }

    await this.fastify.prisma.mappingConfig.delete({
      where: { id },
    });

    return { success: true };
  }

  async toggleActive(id: string, companyId: string, isActive: boolean) {
    const config = await this.getById(id, companyId);
    if (!config) {
      throw new AppError(404, 'MappingConfig not found');
    }

    // Si activando, desactivar otros del mismo tipo
    if (isActive) {
      await this.fastify.prisma.mappingConfig.updateMany({
        where: {
          companyId,
          datasetType: config.datasetType,
          id: { not: id },
        },
        data: { isActive: false },
      });
    }

    const updated = await this.fastify.prisma.mappingConfig.update({
      where: { id },
      data: { isActive },
    });

    return updated;
  }
}
