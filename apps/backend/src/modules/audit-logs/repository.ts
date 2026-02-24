import { prisma } from '../../utils/db';

export const auditLogsRepository = {
  async listAuditLogs(companyId: string, filters: {
    skip?: number;
    take?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const skip = filters.skip || 0;
    const take = filters.take || 10;

    const where: any = { companyId };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.resourceType) {
      where.resource = { contains: filters.resourceType, mode: 'insensitive' };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        companyId: log.companyId,
        userId: log.userId,
        userName: log.user ? `${log.user.firstName} ${log.user.lastName}`.trim() : log.user?.email || null,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      pagination: { skip, take, total },
    };
  },

  async getAuditLogById(id: string, companyId: string) {
    const log = await prisma.auditLog.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!log) return null;

    return {
      id: log.id,
      companyId: log.companyId,
      userId: log.userId,
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}`.trim() : log.user?.email || null,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  },

  async getAuditLogsStats(companyId: string) {
    const totalLogs = await prisma.auditLog.count({
      where: { companyId },
    });

    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: { companyId },
      _count: true,
    });

    const resourceCounts = await prisma.auditLog.groupBy({
      by: ['resource'],
      where: { companyId },
      _count: true,
    });

    const topUserLogs = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: { companyId },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    });

    const userIds = topUserLogs
      .map((log) => log.userId)
      .filter((id) => id !== null) as string[];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const actions: Record<string, number> = {};
    actionCounts.forEach((count) => {
      actions[count.action] = count._count;
    });

    const resourceTypes: Record<string, number> = {};
    resourceCounts.forEach((count) => {
      resourceTypes[count.resource] = count._count;
    });

    const topUsers = topUserLogs
      .map((log) => {
        const user = userMap.get(log.userId!);
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() : user?.email || 'Unknown';
        return {
          userId: log.userId!,
          userName,
          count: log._count,
        };
      })
      .filter((u) => u.userId);

    return {
      totalLogs,
      actions,
      resourceTypes,
      topUsers,
    };
  },

  async deleteOldLogs(companyId: string, beforeDate: Date) {
    return await prisma.auditLog.deleteMany({
      where: {
        companyId,
        createdAt: { lt: beforeDate },
      },
    });
  },
};






