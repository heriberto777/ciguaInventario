import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Logger } from 'pino';

export interface AuditLogInput {
  companyId: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
  resource: string;
  resourceId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('auditLog', async (input: AuditLogInput) => {
    try {
      await fastify.prisma.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          oldValue: input.oldValue,
          newValue: input.newValue,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to create audit log');
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    auditLog: (input: AuditLogInput) => Promise<void>;
  }
}
