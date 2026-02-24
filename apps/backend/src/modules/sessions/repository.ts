import { prisma } from '../../utils/db';

export const sessionsRepository = {
  async createSession(companyId: string, data: {
    userId: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return await prisma.session.create({
      data: {
        userId: data.userId,
        companyId,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        isActive: true,
        lastActivityAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  async getSessionById(id: string, companyId: string) {
    return await prisma.session.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  async listSessions(companyId: string, filters: {
    skip?: number;
    take?: number;
    userId?: string;
    isActive?: boolean;
  }) {
    const skip = filters.skip || 0;
    const take = filters.take || 10;

    const where: any = { companyId };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [data, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
      }),
      prisma.session.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total },
    };
  },

  async updateSessionActivity(id: string) {
    return await prisma.session.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  },

  async endSession(id: string) {
    return await prisma.session.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async endAllUserSessions(userId: string, excludeSessionId?: string) {
    return await prisma.session.updateMany({
      where: {
        userId,
        ...(excludeSessionId && { id: { not: excludeSessionId } }),
      },
      data: { isActive: false },
    });
  },

  async getActiveSessions(companyId: string) {
    return await prisma.session.count({
      where: { companyId, isActive: true },
    });
  },

  async getActiveUsers(companyId: string) {
    const sessions = await prisma.session.findMany({
      where: { companyId, isActive: true },
      distinct: ['userId'],
      select: { userId: true },
    });

    return sessions.length;
  },

  async getSessionsLastHour(companyId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return await prisma.session.count({
      where: {
        companyId,
        createdAt: { gte: oneHourAgo },
      },
    });
  },

  async cleanupInactiveSessions(companyId: string, inactiveMinutes: number = 60) {
    const inactiveTime = new Date(Date.now() - inactiveMinutes * 60 * 1000);

    return await prisma.session.updateMany({
      where: {
        companyId,
        isActive: true,
        lastActivityAt: { lt: inactiveTime },
      },
      data: { isActive: false },
    });
  },
};






