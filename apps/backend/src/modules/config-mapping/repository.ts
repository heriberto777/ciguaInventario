import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CreateMappingConfigRequest, MappingConfigResponse } from './schemas';
import { NotFoundError, ValidationError } from '../../utils/errors';

export class ConfigMappingRepository {
  constructor(private prisma: PrismaClient) {}

  async getById(mappingId: string, companyId: string): Promise<any> {
    const mapping = await this.prisma.mappingConfig.findFirst({
      where: {
        id: mappingId,
        companyId,
      },
      include: {
        erpConnection: true,
      },
    });

    if (!mapping) {
      throw new NotFoundError(`Mapping config ${mappingId} not found`);
    }

    return this.mapToResponse(mapping);
  }

  async listByCompany(
    companyId: string,
    filters?: { datasetType?: string; erpConnectionId?: string; isActive?: boolean }
  ): Promise<MappingConfigResponse[]> {
    const mappings = await this.prisma.mappingConfig.findMany({
      where: {
        companyId,
        ...(filters?.datasetType && { datasetType: filters.datasetType }),
        ...(filters?.erpConnectionId && { erpConnectionId: filters.erpConnectionId }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: {
        erpConnection: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map((m) => this.mapToResponse(m));
  }

  async create(
    companyId: string,
    data: CreateMappingConfigRequest
  ): Promise<MappingConfigResponse> {
    // Validate ERP connection exists
    const erpConnection = await this.prisma.eRPConnection.findFirst({
      where: {
        id: data.erpConnectionId,
        companyId,
        isActive: true,
      },
    });

    if (!erpConnection) {
      throw new ValidationError('ERP Connection not found or inactive');
    }

    // Get current version
    const currentVersion = await this.prisma.mappingConfig.findFirst({
      where: {
        companyId,
        datasetType: data.datasetType,
      },
      select: { version: true },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (currentVersion?.version ?? 0) + 1;

    const mapping = await this.prisma.mappingConfig.create({
      data: {
        companyId,
        erpConnectionId: data.erpConnectionId,
        datasetType: data.datasetType,
        sourceTables: data.sourceTables,
        sourceQuery: data.sourceQuery,
        fieldMappings: data.fieldMappings,
        filters: data.filters,
        version: nextVersion,
        isActive: true,
      },
      include: {
        erpConnection: true,
      },
    });

    return this.mapToResponse(mapping);
  }

  async update(
    mappingId: string,
    companyId: string,
    data: Partial<CreateMappingConfigRequest>
  ): Promise<MappingConfigResponse> {
    const existing = await this.getById(mappingId, companyId);

    const updated = await this.prisma.mappingConfig.update({
      where: { id: mappingId },
      data: {
        fieldMappings: data.fieldMappings ?? existing.fieldMappings,
        filters: data.filters ?? existing.filters,
        sourceQuery: data.sourceQuery ?? existing.sourceQuery,
        sourceTables: data.sourceTables ?? existing.sourceTables,
      },
      include: {
        erpConnection: true,
      },
    });

    return this.mapToResponse(updated);
  }

  async deactivate(mappingId: string, companyId: string): Promise<void> {
    const mapping = await this.prisma.mappingConfig.findFirst({
      where: { id: mappingId, companyId },
    });

    if (!mapping) {
      throw new NotFoundError(`Mapping ${mappingId} not found`);
    }

    await this.prisma.mappingConfig.update({
      where: { id: mappingId },
      data: { isActive: false },
    });
  }

  private mapToResponse(mapping: any): MappingConfigResponse {
    return {
      id: mapping.id,
      companyId: mapping.companyId,
      erpConnectionId: mapping.erpConnectionId,
      datasetType: mapping.datasetType,
      sourceTables: mapping.sourceTables,
      sourceQuery: mapping.sourceQuery,
      fieldMappings: mapping.fieldMappings,
      filters: mapping.filters,
      version: mapping.version,
      isActive: mapping.isActive,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    };
  }
}

