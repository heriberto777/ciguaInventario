// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { ERPConnectionsService } from './service';
import { PrismaERPConnectionRepository } from './repository';
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

export function createERPConnectionsController(fastify: any) {
  const repository = new PrismaERPConnectionRepository(fastify.prisma);
  const service = new ERPConnectionsService(repository);

  return {
    async listConnections(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const query = ListERPConnectionsQuerySchema.parse(request.query);
      const result = await service.listConnections(authRequest.user.companyId, query);
      return reply.send(result);
    },

    async getConnection(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const connection = await service.getConnection(id, authRequest.user.companyId);
      return reply.send(connection);
    },

    async createConnection(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const body = CreateERPConnectionSchema.parse(request.body);
      const connection = await service.createConnection(authRequest.user.companyId, body);

      await auditLogger.log({
        action: 'CREATE',
        userId: authRequest.user.id,
        companyId: authRequest.user.companyId,
        resourceId: connection.id,
        resource: 'ERPConnection',
        newValue: { ...connection, password: '[REDACTED]' },
      });

      return reply.status(201).send(connection);
    },

    async updateConnection(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = UpdateERPConnectionSchema.parse(request.body);

      const oldConnection = await service.getConnection(id, authRequest.user.companyId);
      const updatedConnection = await service.updateConnection(id, authRequest.user.companyId, body);

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

      const connection = await service.getConnection(id, authRequest.user.companyId);
      await service.deleteConnection(id, authRequest.user.companyId);

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
      const result = await service.testConnection(body);
      return reply.send(result);
    },

    async toggleConnection(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const { isActive } = request.body as { isActive: boolean };

      const updated = await service.toggleConnection(id, authRequest.user.companyId, isActive);

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

      const connection = await service.getConnection(connectionId, authRequest.user.companyId);
      
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
        const errorMessage = error?.message || 'Error desconocido al conectar con ERP';
        return reply.status(500).send({ error: { message: `Failed to connect to ERP: ${errorMessage}` } });
      }
    },

    async getAvailableTables(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { connectionId } = request.params as { connectionId: string };

      const connection = await service.getConnection(connectionId, authRequest.user.companyId);

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
        const errorMessage = error?.message || 'Error desconocido al conectar con ERP';
        return reply.status(500).send({ error: { message: `Failed to connect to ERP: ${errorMessage}` } });
      }
    },

    async previewQuery(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { connectionId } = request.params as { connectionId: string };
      const { sql, limit } = request.body as { sql: string; limit?: number };

      const connection = await service.getConnection(connectionId, authRequest.user.companyId);

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
}
