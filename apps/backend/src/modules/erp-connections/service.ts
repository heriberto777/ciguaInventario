import { ERPConnectionRepository } from './repository';
import { CreateERPConnection, UpdateERPConnection, TestConnection } from './schemas';
import { AppError } from '../../utils/errors';

// Helper functions for testing connections (logic remains identical)
async function testERPConnection(data: TestConnection): Promise<boolean> {
  const { erpType, host, port, database, username, password } = data;
  if (!erpType || !host || !port || !database || !username || !password) return false;

  switch (erpType) {
    case 'MSSQL': return true; // Placeholder
    case 'SAP': return true;   // Placeholder
    case 'ORACLE': return true;// Placeholder
    default: return false;
  }
}

export class ERPConnectionsService {
  constructor(private repository: ERPConnectionRepository) {}

  async createConnection(companyId: string, data: CreateERPConnection) {
    const existing = await this.repository.getConnectionByTypeAndCompany(companyId, data.erpType);
    if (existing) {
      throw new AppError(400, `${data.erpType} connection already exists for this company`);
    }

    const isValid = await testERPConnection(data);
    if (!isValid) {
      throw new AppError(400, 'Failed to connect to ERP system. Check credentials.');
    }

    const connection = await this.repository.createConnection(companyId, data);
    return this.mapResponse(connection);
  }

  async getConnection(id: string, companyId: string) {
    const connection = await this.repository.getConnectionById(id, companyId);
    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }
    return connection;
  }

  async listConnections(companyId: string, filters: any) {
    const result = await this.repository.listConnections(companyId, filters);
    return {
      data: result.data.map((conn: any) => this.mapResponse(conn)),
      pagination: result.pagination,
    };
  }

  async updateConnection(id: string, companyId: string, data: UpdateERPConnection) {
    const connection = await this.repository.getConnectionById(id, companyId);
    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    const updated = await this.repository.updateConnection(id, companyId, data);
    return this.mapResponse(updated);
  }

  async testConnection(data: TestConnection) {
    const isValid = await testERPConnection(data);
    if (!isValid) {
      throw new AppError(400, 'Connection test failed. Check credentials and network.');
    }
    return { success: true, message: 'Connection successful' };
  }

  async toggleConnection(id: string, companyId: string, isActive: boolean) {
    const connection = await this.repository.getConnectionById(id, companyId);
    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    const updated = await this.repository.toggleConnection(id, companyId, isActive);
    return this.mapResponse(updated);
  }

  async deleteConnection(id: string, companyId: string) {
    const connection = await this.repository.getConnectionById(id, companyId);
    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    const mappingCount = await this.repository.countMappingConfigsByConnection(id);
    if (mappingCount > 0) {
      throw new AppError(400, `Cannot delete connection. It is used by ${mappingCount} mapping(s).`);
    }

    await this.repository.deleteConnection(id, companyId);
    return { id, message: 'Connection deleted successfully' };
  }

  private mapResponse(connection: any) {
    const { password, ...rest } = connection;
    return rest;
  }
}

// Support for legacy exports if needed, but recommended to use DI
export const createERPConnectionsService = (repository: ERPConnectionRepository) => {
  return new ERPConnectionsService(repository);
};
