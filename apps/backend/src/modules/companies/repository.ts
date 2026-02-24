import { prisma } from '../../utils/db';

export const companiesRepository = {
  async createCompany(data: {
    name: string;
    description?: string;
    email: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
  }) {
    return await prisma.company.create({
      data: {
        name: data.name,
        description: data.description || null,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        isActive: true,
      },
    });
  },

  async getCompanyById(id: string) {
    return await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  },

  async listCompanies(filters: {
    skip?: number;
    take?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const skip = filters.skip || 0;
    const take = filters.take || 10;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [data, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.company.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total },
    };
  },

  async updateCompany(
    id: string,
    data: {
      name?: string;
      description?: string;
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
      city?: string;
      country?: string;
    }
  ) {
    return await prisma.company.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.website && { website: data.website }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.country && { country: data.country }),
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  },

  async deleteCompany(id: string) {
    return await prisma.company.update({
      where: { id },
      data: { isActive: false },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  },

  async restoreCompany(id: string) {
    return await prisma.company.update({
      where: { id },
      data: { isActive: true },
    });
  },

  async getCompanyByEmail(email: string) {
    return await prisma.company.findFirst({
      where: { email },
    });
  },

  async countCompanies() {
    return await prisma.company.count();
  },

  async getUserCount(companyId: string) {
    return await prisma.user.count({
      where: { companyId },
    });
  },
};





