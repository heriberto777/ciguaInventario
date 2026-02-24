import { erpConnectionsRepository } from './repository';
import { CreateERPConnection, UpdateERPConnection, TestConnection } from './schemas';
import { AppError } from '../../utils/errors';
import { prisma } from '../../utils/db';

// Simulated connection testing - in production, use actual DB drivers
async function testERPConnection(data: TestConnection): Promise<boolean> {
  try {
    // Mock implementation - replace with actual DB testing logic
    const { erpType, host, port, database, username, password } = data;

    if (!erpType || !host || !port || !database || !username || !password) {
      return false;
    }

    // Simulate connection test based on ERP type
    switch (erpType) {
      case 'MSSQL':
        // TODO: Implement actual MSSQL connection test using mssql package
        return await testMSSQLConnection(host, port, database, username, password);
      case 'SAP':
        // TODO: Implement actual SAP connection test
        return await testSAPConnection(host, port, database, username, password);
      case 'ORACLE':
        // TODO: Implement actual Oracle connection test using oracledb package
        return await testOracleConnection(host, port, database, username, password);
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

async function testMSSQLConnection(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string
): Promise<boolean> {
  // Placeholder - implement with mssql package
  // For now, just validate parameters exist
  return true;
}

async function testSAPConnection(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string
): Promise<boolean> {
  // Placeholder - implement with SAP SDK
  return true;
}

async function testOracleConnection(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string
): Promise<boolean> {
  // Placeholder - implement with oracledb package
  return true;
}

export const erpConnectionsService = {
  async createConnection(companyId: string, data: CreateERPConnection) {
    // Check if connection type already exists for this company
    const existing = await erpConnectionsRepository.getConnectionByTypeAndCompany(
      companyId,
      data.erpType
    );

    if (existing) {
      throw new AppError(
        400,
        `${data.erpType} connection already exists for this company`
      );
    }

    // Test connection before creating
    const isValid = await testERPConnection(data);
    if (!isValid) {
      throw new AppError(400, 'Failed to connect to ERP system. Check credentials.');
    }

    const connection = await erpConnectionsRepository.createConnection(
      companyId,
      data
    );

    return {
      id: connection.id,
      companyId: connection.companyId,
      erpType: connection.erpType,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  },

  async getConnection(id: string, companyId: string) {
    const connection = await erpConnectionsRepository.getConnectionById(id, companyId);

    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    return {
      id: connection.id,
      companyId: connection.companyId,
      erpType: connection.erpType,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  },

  async listConnections(companyId: string, filters: {
    skip?: number;
    take?: number;
    erpType?: string;
    isActive?: boolean;
  }) {
    const result = await erpConnectionsRepository.listConnections(companyId, filters);

    return {
      data: result.data.map((conn) => ({
        id: conn.id,
        companyId: conn.companyId,
        erpType: conn.erpType,
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        isActive: conn.isActive,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
      pagination: result.pagination,
    };
  },

  async updateConnection(id: string, companyId: string, data: UpdateERPConnection) {
    const connection = await erpConnectionsRepository.getConnectionById(id, companyId);

    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    const updated = await erpConnectionsRepository.updateConnection(
      id,
      companyId,
      data
    );

    return {
      id: updated.id,
      companyId: updated.companyId,
      erpType: updated.erpType,
      host: updated.host,
      port: updated.port,
      database: updated.database,
      username: updated.username,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async testConnection(data: TestConnection) {
    const isValid = await testERPConnection(data);

    if (!isValid) {
      throw new AppError(400, 'Connection test failed. Check credentials and network.');
    }

    return { success: true, message: 'Connection successful' };
  },

  async toggleConnection(id: string, companyId: string, isActive: boolean) {
    const connection = await erpConnectionsRepository.getConnectionById(id, companyId);

    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    const updated = await erpConnectionsRepository.toggleConnection(id, companyId, isActive);

    return {
      id: updated.id,
      companyId: updated.companyId,
      erpType: updated.erpType,
      host: updated.host,
      port: updated.port,
      database: updated.database,
      username: updated.username,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deleteConnection(id: string, companyId: string) {
    const connection = await erpConnectionsRepository.getConnectionById(id, companyId);

    if (!connection) {
      throw new AppError(404, 'ERP Connection not found');
    }

    // Check if connection is in use by mapping configs
    const mappingCount = await prisma.mappingConfig.count({
      where: { erpConnectionId: id },
    });

    if (mappingCount > 0) {
      throw new AppError(
        400,
        `Cannot delete connection. It is used by ${mappingCount} mapping(s).`
      );
    }

    await erpConnectionsRepository.deleteConnection(id, companyId);

    return { id, message: 'Connection deleted successfully' };
  },
};
