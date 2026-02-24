import { FastifyRequest, FastifyReply } from 'fastify';
import { auditLogsService } from './service';
import { ListAuditLogsQuerySchema } from './schemas';

export const auditLogsController = {
  async listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const query = ListAuditLogsQuerySchema.parse(request.query);
    const result = await auditLogsService.listAuditLogs(
      request.user.companyId,
      query
    );
    return reply.send(result);
  },

  async getAuditLog(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const log = await auditLogsService.getAuditLog(id, request.user.companyId);
    return reply.send(log);
  },

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await auditLogsService.getStats(request.user.companyId);
    return reply.send(stats);
  },

  async deleteOldLogs(request: FastifyRequest, reply: FastifyReply) {
    const { daysOld } = request.body as { daysOld?: number };
    const result = await auditLogsService.deleteOldLogs(
      request.user.companyId,
      daysOld
    );
    return reply.send(result);
  },
};
