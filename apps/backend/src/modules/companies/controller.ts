import { FastifyRequest, FastifyReply } from 'fastify';
import { companiesService } from './service';
import { CreateCompanySchema, UpdateCompanySchema, ListCompaniesQuerySchema } from './schemas';
import { auditLogger } from '../../utils/audit-logger';

export const companiesController = {
  async listCompanies(request: FastifyRequest, reply: FastifyReply) {
    const query = ListCompaniesQuerySchema.parse(request.query);
    const result = await companiesService.listCompanies(query);
    return reply.send(result);
  },

  async getCompany(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const company = await companiesService.getCompany(id);
    return reply.send(company);
  },

  async createCompany(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateCompanySchema.parse(request.body);
    const company = await companiesService.createCompany(body);

    await auditLogger.log({
      action: 'CREATE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: company.id,
      resource: 'Company',
      newValue: company,
    });

    return reply.status(201).send(company);
  },

  async updateCompany(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = UpdateCompanySchema.parse(request.body);

    const oldCompany = await companiesService.getCompany(id);
    const updatedCompany = await companiesService.updateCompany(id, body);

    await auditLogger.log({
      action: 'UPDATE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: id,
      resource: 'Company',
      oldValue: oldCompany,
      newValue: updatedCompany,
    });

    return reply.send(updatedCompany);
  },

  async deleteCompany(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const company = await companiesService.getCompany(id);
    const deletedCompany = await companiesService.deleteCompany(id);

    await auditLogger.log({
      action: 'DELETE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: id,
      resource: 'Company',
      oldValue: company,
    });

    return reply.status(204).send();
  },

  async restoreCompany(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const restoredCompany = await companiesService.restoreCompany(id);

    await auditLogger.log({
      action: 'RESTORE',
      userId: request.user.id,
      companyId: request.user.companyId,
      resourceId: id,
      resource: 'Company',
      newValue: restoredCompany,
    });

    return reply.send(restoredCompany);
  },
};
