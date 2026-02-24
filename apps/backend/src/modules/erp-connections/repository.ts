import { prisma } from '../../utils/db';

export const erpConnectionsRepository = {
  async createConnection(companyId: string, data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }) {
    return await prisma.eRPConnection.create({
      data: {
        companyId,
        erpType: data.erpType,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        password: data.password,
        isActive: true,
      },
    });
  },

  async getConnectionById(id: string, companyId: string) {
    return await prisma.eRPConnection.findFirst({
      where: { id, companyId },
    });
  },

  async listConnections(companyId: string, filters: {
    skip?: number;
    take?: number;
    erpType?: string;
    isActive?: boolean;
  }) {
    const skip = filters.skip || 0;
    const take = filters.take || 10;

    const where: any = { companyId };

    if (filters.erpType) {
      where.erpType = filters.erpType;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [data, total] = await Promise.all([
      prisma.eRPConnection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.eRPConnection.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total },
    };
  },

  async updateConnection(id: string, companyId: string, data: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  }) {
    return await prisma.eRPConnection.update({
      where: { id },
      data: {
        ...(data.host && { host: data.host }),
        ...(data.port && { port: data.port }),
        ...(data.database && { database: data.database }),
        ...(data.username && { username: data.username }),
        ...(data.password && { password: data.password }),
      },
    });
  },

  async toggleConnection(id: string, companyId: string, isActive: boolean) {
    return await prisma.eRPConnection.update({
      where: { id },
      data: { isActive },
    });
  },

  async deleteConnection(id: string, companyId: string) {
    return await prisma.eRPConnection.delete({
      where: { id },
    });
  },

  async getConnectionByTypeAndCompany(companyId: string, erpType: string) {
    return await prisma.eRPConnection.findFirst({
      where: { companyId, erpType },
    });
  },

  async countConnectionsByCompany(companyId: string) {
    return await prisma.eRPConnection.count({
      where: { companyId },
    });
  },

  async getERPTypes() {
    const connections = await prisma.eRPConnection.findMany({
      distinct: ['erpType'],
      select: { erpType: true },
    });

    return connections.map((c) => c.erpType);
  },
};






