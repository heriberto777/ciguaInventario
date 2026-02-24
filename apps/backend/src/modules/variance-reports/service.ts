import { FastifyInstance } from 'fastify';
import { VarianceReportRepository } from './repository';
import { ApproveVarianceDTO, RejectVarianceDTO, VarianceFilterDTO } from './schema';
import { AppError } from '../../utils/errors';

export class VarianceReportService {
  private repository: VarianceReportRepository;

  constructor(fastify: FastifyInstance) {
    this.repository = new VarianceReportRepository(fastify);
  }

  async getVarianceById(id: string, companyId: string) {
    const variance = await this.repository.getVarianceById(id, companyId);
    if (!variance) {
      throw new AppError(404, 'Variance report not found');
    }
    return variance;
  }

  async listVariances(companyId: string, filters: VarianceFilterDTO) {
    return this.repository.listVariances(companyId, filters);
  }

  async getVariancesByCount(countId: string, companyId: string) {
    return this.repository.getVariancesByCount(countId, companyId);
  }

  async approveVariance(id: string, companyId: string, data: ApproveVarianceDTO) {
    const variance = await this.getVarianceById(id, companyId);

    if (variance.status !== 'PENDING') {
      throw new AppError(400, `Cannot approve a ${variance.status} variance`);
    }

    return this.repository.approveVariance(id, data);
  }

  async rejectVariance(id: string, companyId: string, data: RejectVarianceDTO) {
    const variance = await this.getVarianceById(id, companyId);

    if (variance.status !== 'PENDING') {
      throw new AppError(400, `Cannot reject a ${variance.status} variance`);
    }

    return this.repository.rejectVariance(id, data);
  }

  async getVarianceSummary(companyId: string, countId?: string) {
    return this.repository.getVarianceSummary(companyId, countId);
  }

  async getHighVarianceItems(companyId: string, threshold = 10) {
    return this.repository.getHighVarianceItems(companyId, threshold);
  }
}
