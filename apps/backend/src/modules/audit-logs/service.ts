import { auditLogsRepository } from './repository';
import { ListAuditLogsQuery } from './schemas';
import { AppError } from '../../utils/errors';

export const auditLogsService = {
  async listAuditLogs(companyId: string, filters: ListAuditLogsQuery) {
    return await auditLogsRepository.listAuditLogs(companyId, filters);
  },

  async getAuditLog(id: string, companyId: string) {
    const log = await auditLogsRepository.getAuditLogById(id, companyId);

    if (!log) {
      throw new AppError('Audit log not found', 404);
    }

    return log;
  },

  async getStats(companyId: string) {
    return await auditLogsRepository.getAuditLogsStats(companyId);
  },

  async deleteOldLogs(companyId: string, daysOld: number = 90) {
    const beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() - daysOld);

    const result = await auditLogsRepository.deleteOldLogs(companyId, beforeDate);

    return {
      deletedCount: result.count,
      message: `Deleted ${result.count} logs older than ${daysOld} days`,
    };
  },
};
