import { FastifyRequest, FastifyReply } from 'fastify';
import { AdjustmentService } from './service';
import { createAdjustmentSchema, approveAdjustmentSchema } from './schema';

export class AdjustmentController {
  constructor(private service: AdjustmentService) {}

  async createAdjustment(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const body = createAdjustmentSchema.parse(request.body);

    const adjustment = await this.service.createAdjustment(companyId, body, request.user.id);
    reply.code(201).send(adjustment);
  }

  async getAdjustment(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    const adjustment = await this.service.getAdjustmentById(id, companyId);
    reply.send(adjustment);
  }

  async listAdjustments(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { warehouseId, status, page = 1, pageSize = 20 } = request.query as {
      warehouseId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    };

    const adjustments = await this.service.listAdjustments(companyId, warehouseId, status, page, pageSize);
    reply.send(adjustments);
  }

  async approveAdjustment(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };
    const body = approveAdjustmentSchema.parse(request.body);

    const adjustment = await this.service.approveAdjustment(id, companyId, {
      ...body,
      approvedBy: body.approvedBy || request.user.id,
    });
    reply.send(adjustment);
  }

  async rejectAdjustment(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    const adjustment = await this.service.rejectAdjustment(id, companyId);
    reply.send(adjustment);
  }

  async deleteAdjustment(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    await this.service.deleteAdjustment(id, companyId);
    reply.send({ success: true });
  }
}
