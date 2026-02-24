import { FastifyRequest, FastifyReply } from 'fastify';
import { sessionsService } from './service';
import { ListSessionsQuerySchema } from './schemas';

export const sessionsController = {
  async listSessions(request: FastifyRequest, reply: FastifyReply) {
    const query = ListSessionsQuerySchema.parse(request.query);
    const result = await sessionsService.listSessions(
      request.user.companyId,
      query
    );
    return reply.send(result);
  },

  async getSession(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const session = await sessionsService.getSession(id, request.user.companyId);
    return reply.send(session);
  },

  async getCurrentSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const session = await sessionsService.getCurrentUserSession(
        request.user.id,
        request.user.companyId
      );
      return reply.send(session);
    } catch (error: any) {
      if (error.message === 'No active session found') {
        return reply.status(404).send({ message: 'No active session' });
      }
      throw error;
    }
  },

  async endSession(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const session = await sessionsService.endSession(id, request.user.companyId);
    return reply.send(session);
  },

  async endAllUserSessions(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = request.body as { userId: string };
    const sessionId = request.cookies.sessionId;

    const result = await sessionsService.endAllUserSessions(
      userId,
      request.user.companyId,
      sessionId
    );
    return reply.send(result);
  },

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await sessionsService.getStats(request.user.companyId);
    return reply.send(stats);
  },

  async cleanup(request: FastifyRequest, reply: FastifyReply) {
    const { inactiveMinutes } = request.body as { inactiveMinutes?: number };
    const result = await sessionsService.cleanupInactiveSessions(
      request.user.companyId,
      inactiveMinutes
    );
    return reply.send(result);
  },
};
