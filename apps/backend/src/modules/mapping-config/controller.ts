import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MappingConfigRepository, CreateMappingConfigDTO, UpdateMappingConfigDTO } from './repository';
import { AppError } from '../../utils/errors';
import { tenantGuard } from '../../guards/tenant';

export class MappingConfigController {
  private repository: MappingConfigRepository;

  constructor(private fastify: FastifyInstance) {
    this.repository = new MappingConfigRepository(fastify);
  }

  async createConfig(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user?.companyId;
    console.log('📝 [createConfig] Starting - CompanyId:', companyId);

    if (!companyId) {
      throw new AppError(401, 'Company ID not found');
    }

    const body = request.body as CreateMappingConfigDTO;
    console.log('📝 [createConfig] Received body:', JSON.stringify(body, null, 2));

    // Aceptar tanto connectionId como erpConnectionId para compatibilidad
    const connectionId = (body as any).connectionId || (body as any).erpConnectionId;
    if (!connectionId) {
      throw new AppError(400, 'connectionId or erpConnectionId is required');
    }
    if (!body.datasetType) {
      throw new AppError(400, 'datasetType is required');
    }
    if (!body.mainTable && !body.customQuery) {
      throw new AppError(400, 'mainTable or customQuery is required');
    }
    if (!body.fieldMappings || body.fieldMappings.length === 0) {
      throw new AppError(400, 'fieldMappings is required');
    }

    console.log('📝 [createConfig] Validation passed, creating config');

    // Normalizar el body a usar erpConnectionId
    const normalizedBody = {
      ...body,
      erpConnectionId: connectionId,
    };
    delete (normalizedBody as any).connectionId;

    const config = await this.repository.create(companyId, normalizedBody as CreateMappingConfigDTO);
    console.log('✅ [createConfig] Config created:', config);

    return reply.status(201).send({
      data: config,
    });
  }

  async getConfigs(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user?.companyId;
    if (!companyId) {
      throw new AppError(401, 'Company ID not found');
    }

    // Soportar filtro por datasetType como query param
    const { datasetType } = request.query as { datasetType?: string };

    let configs;
    if (datasetType) {
      const config = await this.repository.getByCompanyAndType(companyId, datasetType);
      configs = config ? [config] : [];
    } else {
      configs = await this.repository.listByCompany(companyId);
    }

    return reply.send({
      data: configs,
      total: configs.length,
    });
  }

  async getConfigByType(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user?.companyId;
    if (!companyId) {
      throw new AppError(401, 'Company ID not found');
    }

    const { datasetType } = request.params as { datasetType: string };

    const config = await this.repository.getByCompanyAndType(companyId, datasetType);

    if (!config) {
      throw new AppError(404, `No active MappingConfig found for ${datasetType}`);
    }

    return reply.send({
      data: config,
    });
  }

  async updateConfig(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user?.companyId;
    if (!companyId) {
      throw new AppError(401, 'Company ID not found');
    }

    const { id } = request.params as { id: string };
    const body = request.body as UpdateMappingConfigDTO;

    const updated = await this.repository.update(id, companyId, body);

    return reply.send({
      data: updated,
    });
  }

  async deleteConfig(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user?.companyId;
    if (!companyId) {
      throw new AppError(401, 'Company ID not found');
    }

    const { id } = request.params as { id: string };

    const result = await this.repository.delete(id, companyId);

    return reply.send(result);
  }

  async toggleActive(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user?.companyId;
    if (!companyId) {
      throw new AppError(401, 'Company ID not found');
    }

    const { id } = request.params as { id: string };
    const { isActive } = request.body as { isActive: boolean };

    const updated = await this.repository.toggleActive(id, companyId, isActive);

    return reply.send({
      data: updated,
    });
  }
}

export async function registerMappingConfigRoutes(fastify: FastifyInstance) {
  const controller = new MappingConfigController(fastify);

  // Create
  fastify.post<{ Body: CreateMappingConfigDTO }>(
    '/api/mapping-configs',
    { preHandler: tenantGuard },
    (req, reply) => controller.createConfig(req, reply)
  );

  // List all
  fastify.get(
    '/api/mapping-configs',
    { preHandler: tenantGuard },
    (req, reply) => controller.getConfigs(req, reply)
  );

  // Get by type
  fastify.get<{ Params: { datasetType: string } }>(
    '/api/mapping-configs/type/:datasetType',
    { preHandler: tenantGuard },
    (req, reply) => controller.getConfigByType(req, reply)
  );

  // Update
  fastify.patch<{ Params: { id: string }; Body: UpdateMappingConfigDTO }>(
    '/api/mapping-configs/:id',
    { preHandler: tenantGuard },
    (req, reply) => controller.updateConfig(req, reply)
  );

  // Delete
  fastify.delete<{ Params: { id: string } }>(
    '/api/mapping-configs/:id',
    { preHandler: tenantGuard },
    (req, reply) => controller.deleteConfig(req, reply)
  );

  // Toggle active
  fastify.post<{ Params: { id: string }; Body: { isActive: boolean } }>(
    '/api/mapping-configs/:id/toggle',
    { preHandler: tenantGuard },
    (req, reply) => controller.toggleActive(req, reply)
  );
}
