import { FastifyRequest, FastifyReply } from 'fastify';
import { VarianceReportService } from './service';
import { approveVarianceSchema, rejectVarianceSchema, varianceFilterSchema } from './schema';

export class VarianceReportController {
  constructor(private service: VarianceReportService) {}

  async getVariance(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    const variance = await this.service.getVarianceById(id, companyId);
    reply.send(variance);
  }

  async listVariances(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const filters = varianceFilterSchema.parse(request.query);

    const result = await this.service.listVariances(companyId, filters);
    reply.send(result);
  }

  async getVariancesByCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const variances = await this.service.getVariancesByCount(countId, companyId);
    reply.send(variances);
  }

  async approveVariance(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };
    const body = approveVarianceSchema.parse(request.body);

    const variance = await this.service.approveVariance(id, companyId, {
      ...body,
      approvedBy: body.approvedBy || request.user.id,
    });
    reply.send(variance);
  }

  async rejectVariance(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };
    const body = rejectVarianceSchema.parse(request.body);

    const variance = await this.service.rejectVariance(id, companyId, body);
    reply.send(variance);
  }

  async getVarianceSummary(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.query as { countId?: string };

    const summary = await this.service.getVarianceSummary(companyId, countId);
    reply.send(summary);
  }

  async getHighVarianceItems(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { threshold = 10 } = request.query as { threshold?: number };

    const items = await this.service.getHighVarianceItems(companyId, threshold);
    reply.send(items);
  }
}
