import { FastifyRequest, FastifyReply } from 'fastify';
import { ItemClassificationsService } from './service';
import {
    createClassificationSchema,
    updateClassificationSchema,
    bulkClassificationSchema,
} from './schema';

export class ItemClassificationsController {
    constructor(private readonly service: ItemClassificationsService) { }

    async list(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const { groupType } = request.query as { groupType?: string };
        const data = await this.service.findAll(companyId, groupType);
        return reply.send({ data });
    }

    async getOne(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const { id } = request.params as { id: string };
        const item = await this.service.findById(companyId, id);
        if (!item) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Clasificación no encontrada' } });
        return reply.send({ data: item });
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const body = createClassificationSchema.parse(request.body);
        const data = await this.service.create(companyId, body);
        return reply.status(201).send({ data });
    }

    async update(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const { id } = request.params as { id: string };
        const body = updateClassificationSchema.parse(request.body);
        const data = await this.service.update(companyId, id, body);
        if (!data) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Clasificación no encontrada' } });
        return reply.send({ data });
    }

    async remove(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const { id } = request.params as { id: string };
        const data = await this.service.remove(companyId, id);
        if (!data) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Clasificación no encontrada' } });
        return reply.status(204).send();
    }

    async bulkImport(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const body = bulkClassificationSchema.parse(request.body);
        const result = await this.service.bulkImport(companyId, body);
        return reply.send({ data: result });
    }
    async syncFromItems(request: FastifyRequest, reply: FastifyReply) {
        const companyId = (request as any).companyId as string;
        const result = await this.service.syncFromItems(companyId);
        return reply.send({ data: result });
    }
}
