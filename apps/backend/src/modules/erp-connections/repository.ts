export interface ERPConnectionRepository {
  createConnection(companyId: string, data: any): Promise<any>;
  getConnectionById(id: string, companyId: string): Promise<any>;
  listConnections(companyId: string, filters: any): Promise<{ data: any[]; pagination: any }>;
  updateConnection(id: string, companyId: string, data: any): Promise<any>;
  toggleConnection(id: string, companyId: string, isActive: boolean): Promise<any>;
  deleteConnection(id: string, companyId: string): Promise<any>;
  getConnectionByTypeAndCompany(companyId: string, erpType: string): Promise<any>;
  countConnectionsByCompany(companyId: string): Promise<number>;
  getERPTypes(): Promise<string[]>;
  countMappingConfigsByConnection(connectionId: string): Promise<number>;
}

export class PrismaERPConnectionRepository implements ERPConnectionRepository {
  constructor(private prisma: any) {}

  async createConnection(companyId: string, data: any) {
    return await this.prisma.eRPConnection.create({
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
  }

  async getConnectionById(id: string, companyId: string) {
    return await this.prisma.eRPConnection.findFirst({
      where: { id, companyId },
    });
  }

  async listConnections(companyId: string, filters: any) {
    const skip = filters.skip || 0;
    const take = filters.take || 10;
    const where: any = { companyId };

    if (filters.erpType) where.erpType = filters.erpType;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.eRPConnection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eRPConnection.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total },
    };
  }

  async updateConnection(id: string, companyId: string, data: any) {
    return await this.prisma.eRPConnection.update({
      where: { id },
      data: {
        ...(data.host && { host: data.host }),
        ...(data.port && { port: data.port }),
        ...(data.database && { database: data.database }),
        ...(data.username && { username: data.username }),
        ...(data.password && { password: data.password }),
      },
    });
  }

  async toggleConnection(id: string, companyId: string, isActive: boolean) {
    return await this.prisma.eRPConnection.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteConnection(id: string, companyId: string) {
    return await this.prisma.eRPConnection.delete({
      where: { id },
    });
  }

  async getConnectionByTypeAndCompany(companyId: string, erpType: string) {
    return await this.prisma.eRPConnection.findFirst({
      where: { companyId, erpType },
    });
  }

  async countConnectionsByCompany(companyId: string) {
    return await this.prisma.eRPConnection.count({
      where: { companyId },
    });
  }

  async getERPTypes() {
    const connections = await this.prisma.eRPConnection.findMany({
      distinct: ['erpType'],
      select: { erpType: true },
    });
    return connections.map((c: any) => c.erpType);
  }

  async countMappingConfigsByConnection(connectionId: string) {
    return await this.prisma.mappingConfig.count({
      where: { erpConnectionId: connectionId },
    });
  }
}
