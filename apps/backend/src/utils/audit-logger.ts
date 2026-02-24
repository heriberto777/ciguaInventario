import { FastifyRequest } from 'fastify';
import { prisma } from './db';

export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const auditLogger = {
  async log(data: Omit<AuditLogData, 'ipAddress' | 'userAgent'> & { companyId?: string; ipAddress?: string; userAgent?: string }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId || undefined,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldValue: data.oldValue,
          newValue: data.newValue,
          ipAddress: data.ipAddress || 'unknown',
          userAgent: data.userAgent || 'unknown',
          companyId: data.companyId || 'system',
        },
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  },
};
