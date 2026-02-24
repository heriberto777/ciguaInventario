import { sessionsRepository } from './repository';
import { ListSessionsQuery } from './schemas';
import { AppError } from '../../utils/errors';

export const sessionsService = {
  async listSessions(companyId: string, filters: ListSessionsQuery) {
    const result = await sessionsRepository.listSessions(companyId, filters);

    return {
      data: result.data.map((session) => ({
        id: session.id,
        userId: session.userId,
        userName: session.user?.name || session.user?.email || 'Unknown',
        companyId: session.companyId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      })),
      pagination: result.pagination,
    };
  },

  async getSession(id: string, companyId: string) {
    const session = await sessionsRepository.getSessionById(id, companyId);

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    return {
      id: session.id,
      userId: session.userId,
      userName: session.user?.name || session.user?.email || 'Unknown',
      companyId: session.companyId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isActive: session.isActive,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    };
  },

  async getCurrentUserSession(userId: string, companyId: string) {
    // Get the most recent active session for the user
    const sessions = await sessionsRepository.listSessions(companyId, {
      userId, // Filter by user ID
      isActive: true, // Only active sessions
      take: 1, // Only need the most recent one
    });

    if (!sessions.data || sessions.data.length === 0) {
      throw new AppError(404, 'No active session found');
    }

    const userSession = sessions.data[0];

    return {
      id: userSession.id,
      userId: userSession.userId,
      userName: userSession.user?.name || userSession.user?.email || 'Unknown',
      companyId: userSession.companyId,
      userAgent: userSession.userAgent,
      ipAddress: userSession.ipAddress,
      isActive: userSession.isActive,
      lastActivityAt: userSession.lastActivityAt,
      createdAt: userSession.createdAt,
    };
  },

  async endSession(id: string, companyId: string) {
    const session = await sessionsRepository.getSessionById(id, companyId);

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    const updated = await sessionsRepository.endSession(id);

    return {
      id: updated.id,
      userId: updated.userId,
      userName: session.user?.name || session.user?.email || 'Unknown',
      companyId: updated.companyId,
      userAgent: updated.userAgent,
      ipAddress: updated.ipAddress,
      isActive: updated.isActive,
      lastActivityAt: updated.lastActivityAt,
      createdAt: updated.createdAt,
    };
  },

  async endAllUserSessions(userId: string, companyId: string, excludeSessionId?: string) {
    const result = await sessionsRepository.endAllUserSessions(
      userId,
      excludeSessionId
    );

    return {
      message: `Ended ${result.count} session(s)`,
      count: result.count,
    };
  },

  async getStats(companyId: string) {
    const [activeSessions, activeUsers, sessionsLastHour] = await Promise.all([
      sessionsRepository.getActiveSessions(companyId),
      sessionsRepository.getActiveUsers(companyId),
      sessionsRepository.getSessionsLastHour(companyId),
    ]);

    const totalSessions = await sessionsRepository.listSessions(companyId, {
      take: 1,
    });

    return {
      activeSessions,
      totalSessions: totalSessions.pagination.total,
      activeUsers,
      sessionsLastHour,
    };
  },

  async cleanupInactiveSessions(companyId: string, inactiveMinutes?: number) {
    const result = await sessionsRepository.cleanupInactiveSessions(
      companyId,
      inactiveMinutes
    );

    return {
      message: `Cleaned up ${result.count} inactive session(s)`,
      count: result.count,
    };
  },
};
