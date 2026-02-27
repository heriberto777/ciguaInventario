import { FastifyInstance } from 'fastify';
import { ApproveVarianceDTO, RejectVarianceDTO, VarianceFilterDTO } from './schema';

export class VarianceReportRepository {
  constructor(private fastify: FastifyInstance) { }

  async getVarianceById(id: string, companyId: string) {
    return this.fastify.prisma.varianceReport.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        count: {
          include: {
            warehouse: true,
          },
        },
        countItem: true,
      },
    });
  }

  async listVariances(companyId: string, filters: VarianceFilterDTO) {
    const skip = (filters.page - 1) * filters.pageSize;

    const where: any = {
      companyId,
    };

    if (filters.countId) {
      where.countId = filters.countId;

      // Obtener la versión actual del conteo para filtrar
      const count = await this.fastify.prisma.inventoryCount.findUnique({
        where: { id: filters.countId },
        select: { currentVersion: true }
      });

      if (count) {
        where.version = count.currentVersion;
      }
    }

    const [variances, total] = await Promise.all([
      this.fastify.prisma.varianceReport.findMany({
        where,
        skip,
        take: filters.pageSize,
        include: {
          count: {
            include: {
              warehouse: true,
            },
          },
          countItem: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.fastify.prisma.varianceReport.count({ where }),
    ]);

    return {
      data: variances,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize),
    };
  }

  async getVariancesByCount(countId: string, companyId: string) {
    const count = await this.fastify.prisma.inventoryCount.findUnique({
      where: { id: countId },
      select: { currentVersion: true }
    });

    return this.fastify.prisma.varianceReport.findMany({
      where: {
        countId,
        companyId,
        version: count?.currentVersion || 1,
      },
      include: {
        countItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approveVariance(id: string, data: ApproveVarianceDTO) {
    return this.fastify.prisma.varianceReport.update({
      where: { id },
      data: {
        status: 'APPROVED',
        resolution: data.resolution,
        approvedBy: data.approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  async rejectVariance(id: string, data: RejectVarianceDTO) {
    return this.fastify.prisma.varianceReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reason: data.reason,
      },
    });
  }

  async getVarianceSummary(companyId: string, countId?: string) {
    let version = 1;
    if (countId) {
      const count = await this.fastify.prisma.inventoryCount.findUnique({
        where: { id: countId },
        select: { currentVersion: true }
      });
      version = count?.currentVersion || 1;
    }

    const where = {
      companyId,
      ...(countId && { countId, version })
    };

    const [
      totalVariances,
      approvedVariances,
      rejectedVariances,
      pendingVariances,
      totalDifference,
      avgVariancePercent,
    ] = await Promise.all([
      this.fastify.prisma.varianceReport.count({ where }),
      this.fastify.prisma.varianceReport.count({ where: { ...where, status: 'APPROVED' } }),
      this.fastify.prisma.varianceReport.count({ where: { ...where, status: 'REJECTED' } }),
      this.fastify.prisma.varianceReport.count({ where: { ...where, status: 'PENDING' } }),
      this.fastify.prisma.varianceReport.aggregate({
        where,
        _sum: { difference: true },
      }),
      this.fastify.prisma.varianceReport.aggregate({
        where,
        _avg: { variancePercent: true },
      }),
    ]);

    return {
      totalVariances,
      approvedVariances,
      rejectedVariances,
      pendingVariances,
      totalDifference: totalDifference._sum.difference || 0,
      avgVariancePercent: avgVariancePercent._avg.variancePercent || 0,
    };
  }

  async getHighVarianceItems(companyId: string, threshold = 10) {
    return this.fastify.prisma.varianceReport.findMany({
      where: {
        companyId,
        variancePercent: {
          gte: threshold,
        },
      },
      include: {
        countItem: true,
      },
      orderBy: {
        variancePercent: 'desc',
      },
      take: 20,
    });
  }
}
