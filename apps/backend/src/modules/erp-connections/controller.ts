import { FastifyRequest, FastifyReply } from 'fastify';
import { erpConnectionsService } from './service';
import { ERPIntrospectionService } from './erp-introspection';
import { ERPConnectorFactory } from './erp-connector-factory';
import {
  CreateERPConnectionSchema,
  UpdateERPConnectionSchema,
  TestConnectionSchema,
  ListERPConnectionsQuerySchema,
} from './schemas';
import { auditLogger } from '../../utils/audit-logger';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    companyId: string;
    id: string;
    type?: 'access' | 'refresh';
  };
}

export const erpConnectionsController = {
  async listConnections(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const query = ListERPConnectionsQuerySchema.parse(request.query);
    const result = await erpConnectionsService.listConnections(
      authRequest.user.companyId,
      query
    );
    return reply.send(result);
  },

  async getConnection(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const connection = await erpConnectionsService.getConnection(
      id,
      authRequest.user.companyId
    );
    return reply.send(connection);
  },

  async createConnection(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const body = CreateERPConnectionSchema.parse(request.body);
    const connection = await erpConnectionsService.createConnection(
      authRequest.user.companyId,
      body
    );

    await auditLogger.log({
      action: 'CREATE',
      userId: authRequest.user.id,
      companyId: authRequest.user.companyId,
      resourceId: connection.id,
      resource: 'ERPConnection',
      newValue: {
        ...connection,
        password: '[REDACTED]',
      },
    });

    return reply.status(201).send(connection);
  },

  async updateConnection(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = UpdateERPConnectionSchema.parse(request.body);

    const oldConnection = await erpConnectionsService.getConnection(
      id,
      authRequest.user.companyId
    );
    const updatedConnection = await erpConnectionsService.updateConnection(
      id,
      authRequest.user.companyId,
      body
    );

    await auditLogger.log({
      action: 'UPDATE',
      userId: authRequest.user.id,
      companyId: authRequest.user.companyId,
      resourceId: id,
      resource: 'ERPConnection',
      oldValue: { ...oldConnection, password: '[REDACTED]' },
      newValue: { ...updatedConnection, password: '[REDACTED]' },
    });

    return reply.send(updatedConnection);
  },

  async deleteConnection(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const connection = await erpConnectionsService.getConnection(
      id,
      authRequest.user.companyId
    );
    const result = await erpConnectionsService.deleteConnection(
      id,
      authRequest.user.companyId
    );

    await auditLogger.log({
      action: 'DELETE',
      userId: authRequest.user.id,
      companyId: authRequest.user.companyId,
      resourceId: id,
      resource: 'ERPConnection',
      oldValue: { ...connection, password: '[REDACTED]' },
    });

    return reply.status(204).send();
  },

  async testConnection(request: FastifyRequest, reply: FastifyReply) {
    const body = TestConnectionSchema.parse(request.body);
    const result = await erpConnectionsService.testConnection(body);
    return reply.send(result);
  },

  async toggleConnection(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { isActive } = request.body as { isActive: boolean };

    const updated = await erpConnectionsService.toggleConnection(
      id,
      authRequest.user.companyId,
      isActive
    );

    await auditLogger.log({
      action: 'TOGGLE',
      userId: authRequest.user.id,
      companyId: authRequest.user.companyId,
      resourceId: id,
      resource: 'ERPConnection',
      newValue: { isActive },
    });

    return reply.send(updated);
  },

  async getTableSchemas(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { connectionId } = request.params as { connectionId: string };
    const { tableNames } = request.body as { tableNames: string[] };

    const connection = await erpConnectionsService.getConnection(
      connectionId,
      authRequest.user.companyId
    );

    if (!connection) {
      return reply.status(404).send({
        error: {
          message: 'Conexión no encontrada'
        }
      });
    }

    try {
      const connector = ERPConnectorFactory.create({
        erpType: connection.erpType,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password,
      });

      await connector.connect();

      const introspection = new ERPIntrospectionService(connector);

      const schemas = await introspection.getTableSchemas(tableNames);
      await connector.disconnect();
      return reply.send({ schemas });
    } catch (error: any) {
      console.error('❌ Error in getTableSchemas:', error);
      const errorMessage = error?.message || 'Error desconocido al conectar con ERP';
      return reply.status(500).send({
        error: {
          message: `Failed to connect to ERP: ${errorMessage}`,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },

  async getAvailableTables(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { connectionId } = request.params as { connectionId: string };

    const connection = await erpConnectionsService.getConnection(
      connectionId,
      authRequest.user.companyId
    );

    if (!connection) {
      return reply.status(404).send({
        error: {
          message: 'Conexión no encontrada'
        }
      });
    }

    try {
      const connector = ERPConnectorFactory.create({
        erpType: connection.erpType,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password,
      });

      await connector.connect();

      const introspection = new ERPIntrospectionService(connector);

      const tables = await introspection.getAvailableTables();
      await connector.disconnect();
      return reply.send({ tables });
    } catch (error: any) {
      console.error('❌ Error in getAvailableTables:', error);
      const errorMessage = error?.message || 'Error desconocido al conectar con ERP';
      return reply.status(500).send({
        error: {
          message: `Failed to connect to ERP: ${errorMessage}`,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },

  async previewQuery(request: FastifyRequest, reply: FastifyReply) {
    const authRequest = request as AuthenticatedRequest;
    const { connectionId } = request.params as { connectionId: string };
    const { sql, limit } = request.body as { sql: string; limit?: number };

    const connection = await erpConnectionsService.getConnection(
      connectionId,
      authRequest.user.companyId
    );

    if (!connection) {
      return reply.status(404).send({ error: 'Connection not found' });
    }

    const connector = ERPConnectorFactory.create({
      erpType: connection.erpType,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
    });

    await connector.connect();

    const introspection = new ERPIntrospectionService(connector);

    const data = await introspection.previewQuery(sql, limit || 10);
    await connector.disconnect();
    return reply.send({ data });
  },
};
