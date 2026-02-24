import { companiesRepository } from './repository';
import { CreateCompany, UpdateCompany } from './schemas';
import { AppError } from '../../utils/errors';

export const companiesService = {
  async createCompany(data: CreateCompany) {
    // Check if company with this email already exists
    const existing = await companiesRepository.getCompanyByEmail(data.email);

    if (existing) {
      throw new AppError('Company with this email already exists', 400);
    }

    const company = await companiesRepository.createCompany(data);

    return {
      id: company.id,
      name: company.name,
      description: company.description,
      email: company.email,
      phone: company.phone,
      website: company.website,
      address: company.address,
      city: company.city,
      country: company.country,
      isActive: company.isActive,
      userCount: 0,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  },

  async getCompany(id: string) {
    const company = await companiesRepository.getCompanyById(id);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return {
      id: company.id,
      name: company.name,
      description: company.description,
      email: company.email,
      phone: company.phone,
      website: company.website,
      address: company.address,
      city: company.city,
      country: company.country,
      isActive: company.isActive,
      userCount: company._count.users,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  },

  async listCompanies(filters: {
    skip?: number;
    take?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const result = await companiesRepository.listCompanies(filters);

    return {
      data: result.data.map((company) => ({
        id: company.id,
        name: company.name,
        description: company.description,
        email: company.email,
        phone: company.phone,
        website: company.website,
        address: company.address,
        city: company.city,
        country: company.country,
        isActive: company.isActive,
        userCount: company._count.users,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      })),
      pagination: result.pagination,
    };
  },

  async updateCompany(id: string, data: UpdateCompany) {
    const company = await companiesRepository.getCompanyById(id);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check for duplicate email if updating email
    if (data.email && data.email !== company.email) {
      const existing = await companiesRepository.getCompanyByEmail(data.email);

      if (existing) {
        throw new AppError('Company with this email already exists', 400);
      }
    }

    const updated = await companiesRepository.updateCompany(id, data);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      email: updated.email,
      phone: updated.phone,
      website: updated.website,
      address: updated.address,
      city: updated.city,
      country: updated.country,
      isActive: updated.isActive,
      userCount: updated._count.users,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deleteCompany(id: string) {
    const company = await companiesRepository.getCompanyById(id);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company._count.users > 0) {
      throw new AppError(
        `Cannot delete company with active users. Please remove or reassign ${company._count.users} user(s) first.`,
        400
      );
    }

    const deleted = await companiesRepository.deleteCompany(id);

    return {
      id: deleted.id,
      name: deleted.name,
      description: deleted.description,
      email: deleted.email,
      phone: deleted.phone,
      website: deleted.website,
      address: deleted.address,
      city: deleted.city,
      country: deleted.country,
      isActive: deleted.isActive,
      userCount: deleted._count.users,
      createdAt: deleted.createdAt,
      updatedAt: deleted.updatedAt,
    };
  },

  async restoreCompany(id: string) {
    const company = await companiesRepository.getCompanyById(id);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const restored = await companiesRepository.restoreCompany(id);

    return {
      id: restored.id,
      name: restored.name,
      description: restored.description,
      email: restored.email,
      phone: restored.phone,
      website: restored.website,
      address: restored.address,
      city: restored.city,
      country: restored.country,
      isActive: restored.isActive,
      userCount: 0,
      createdAt: restored.createdAt,
      updatedAt: restored.updatedAt,
    };
  },
};
