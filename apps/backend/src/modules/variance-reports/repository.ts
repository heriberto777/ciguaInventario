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

    if (filters.status) {
      if (filters.status === 'SUBMITTED') {
        // Filtro especial: varianzas de conteos en estado SUBMITTED
        where.count = {
          status: 'SUBMITTED'
        };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.brand || filters.category || filters.subCategory) {
      where.countItem = {
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.category && { category: filters.category }),
        ...(filters.subCategory && { subcategory: filters.subCategory }),
      };
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

    // Enriquecimiento de clasificaciones para reportes existentes
    const enrichedVariances = await Promise.all(variances.map(v => this.enrichVariance(v, companyId)));

    return {
      data: enrichedVariances,
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

    const variances = await this.fastify.prisma.varianceReport.findMany({
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

    return Promise.all(variances.map(v => this.enrichVariance(v, companyId)));
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
  /**
   * Enriquece un reporte de varianza con las descripciones oficiales de sus clasificaciones.
   */
  private async enrichVariance(variance: any, companyId: string) {
    if (!variance.countItem) return variance;

    const item = variance.countItem;

    // Si ya parece ser una descripción (más de 10 caracteres o contiene espacios), lo dejamos.
    // Pero mejor consultamos siempre para estar seguros de tener la "Oficial".

    const [brandDesc, catDesc, subDesc] = await Promise.all([
      this.getClassificationDescription(companyId, item.brand, 'BRAND'),
      this.getClassificationDescription(companyId, item.category, 'CATEGORY'),
      this.getClassificationDescription(companyId, item.subcategory, 'SUBCATEGORY'),
    ]);

    return {
      ...variance,
      countItem: {
        ...item,
        brand: brandDesc ? `${brandDesc} (${item.brand})` : item.brand,
        category: catDesc ? `${catDesc} (${item.category})` : item.category,
        subcategory: subDesc ? `${subDesc} (${item.subcategory})` : item.subcategory,
      }
    };
  }

  private async getClassificationDescription(companyId: string, code: string | undefined, groupType: string): Promise<string | null> {
    if (!code || !companyId || code.trim() === '') return null;

    const classification = await this.fastify.prisma.itemClassification.findFirst({
      where: {
        companyId,
        code: code.trim().toUpperCase(),
        groupType: groupType as any,
      },
      select: { description: true }
    });

    return classification?.description || null;
  }
}
