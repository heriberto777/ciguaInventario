import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConfigMappingService } from './service';
import {
  GetMappingConfigRequestSchema,
  ListMappingConfigsQuerySchema,
  CreateMappingConfigRequestSchema,
  TestMappingRequestSchema,
} from './schemas';

export async function getMappingController(
  fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { mappingId: string };
  }>,
  reply: FastifyReply
) {
  const { mappingId } = request.params;
  const companyId = request.companyId!;

  const service = new ConfigMappingService(fastify, fastify.prisma);
  const mapping = await service.getMapping(mappingId, companyId);

  return reply.send({ data: mapping });
}

export async function listMappingsController(
  fastify: FastifyInstance,
  request: FastifyRequest<{
    Querystring: Record<string, any>;
  }>,
  reply: FastifyReply
) {
  const query = ListMappingConfigsQuerySchema.parse(request.query);
  const companyId = request.companyId!;

  console.log('📊 [listMappingsController] Query:', query);
  console.log('📊 [listMappingsController] CompanyId:', companyId);

  const service = new ConfigMappingService(fastify, fastify.prisma);
  const mappings = await service.listMappings(companyId, {
    datasetType: query.datasetType,
    erpConnectionId: query.erpConnectionId,
    isActive: query.isActive,
  });

  console.log('📊 [listMappingsController] Found mappings:', mappings.length);
  console.log('📊 [listMappingsController] Mappings:', mappings);

  return reply.send({ data: mappings, count: mappings.length });
}

export async function createMappingController(
  fastify: FastifyInstance,
  request: FastifyRequest<{
    Body: Record<string, any>;
  }>,
  reply: FastifyReply
) {
  const body = CreateMappingConfigRequestSchema.parse(request.body);
  const companyId = request.companyId!;

  const service = new ConfigMappingService(fastify, fastify.prisma);
  const mapping = await service.createMapping(companyId, body);

  return reply.status(201).send({ data: mapping });
}

export async function testMappingController(
  fastify: FastifyInstance,
  request: FastifyRequest<{
    Body: Record<string, any>;
  }>,
  reply: FastifyReply
) {
  const body = TestMappingRequestSchema.parse(request.body);
  const companyId = request.companyId!;

  const service = new ConfigMappingService(fastify, fastify.prisma);
  const preview = await service.testMapping(body.mappingId, companyId, body.limitRows);

  return reply.send({ data: preview });
}
