import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import pino from 'pino';

import envPlugin from './plugins/env';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import auditPlugin from './plugins/audit';
import loggerPlugin from './plugins/logger';

import { authRoutes } from './modules/auth/routes';
import { configMappingRoutes } from './modules/config-mapping/routes';
import { registerMappingConfigRoutes } from './modules/mapping-config';
import { usersRoutes } from './modules/users/routes';
import { rolesRoutes } from './modules/roles/routes';
import { permissionsRoutes } from './modules/permissions/routes';
import { companiesRoutes } from './modules/companies/routes';
import { erpConnectionsRoutes } from './modules/erp-connections/routes';
import { auditLogsRoutes } from './modules/audit-logs/routes';
import { sessionsRoutes } from './modules/sessions/routes';
import { warehousesRoutes } from './modules/warehouses/routes';
import { inventoryCountsRoutes } from './modules/inventory-counts/routes';
import { varianceReportsRoutes } from './modules/variance-reports/routes';
import { adjustmentsRoutes } from './modules/adjustments/routes';
import { itemClassificationsRoutes } from './modules/item-classifications/routes';
import { reportsRoutes } from './modules/reports/routes';
import { errorHandler } from './utils/errors';

export async function createApp() {
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  });

  const app = Fastify({
    logger: logger as any,
  });

  // Register plugins
  await app.register(envPlugin);

  // Register cookie before auth
  await app.register(import('@fastify/cookie'), {
    secret: (app as any).config?.JWT_SECRET || process.env.JWT_SECRET,
  });

  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'https://app.cigua.com'
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  });
  await app.register(helmet);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(auditPlugin);
  await app.register(loggerPlugin);

  // Error handler
  app.setErrorHandler(errorHandler as any);

  // Health check — disponible en /health y /api/health
  const healthHandler = async () => ({ status: 'ok', timestamp: new Date().toISOString() });
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);


  // Register routes
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(configMappingRoutes, { prefix: '/api' });
  await app.register(registerMappingConfigRoutes);
  await app.register(usersRoutes, { prefix: '/api' });
  await app.register(rolesRoutes, { prefix: '/api' });
  await app.register(permissionsRoutes, { prefix: '/api' });
  await app.register(companiesRoutes, { prefix: '/api' });
  await app.register(erpConnectionsRoutes, { prefix: '/api' });
  await app.register(auditLogsRoutes, { prefix: '/api' });
  await app.register(sessionsRoutes, { prefix: '/api' });
  await app.register(warehousesRoutes, { prefix: '/api' });
  await app.register(inventoryCountsRoutes, { prefix: '/api' });
  await app.register(varianceReportsRoutes, { prefix: '/api' });
  await app.register(adjustmentsRoutes, { prefix: '/api' });
  await app.register(itemClassificationsRoutes, { prefix: '/api' });
  await app.register(reportsRoutes, { prefix: '/api/reports' });


  // Swagger documentation
  app.get('/docs', async (request, reply) => {
    return {
      title: 'Cigua Inventory API',
      version: '1.0.0',
      endpoints: {
        auth: ['POST /auth/login', 'POST /auth/refresh', 'POST /auth/logout'],
        users: [
          'GET /users',
          'GET /users/:id',
          'POST /users',
          'PATCH /users/:id',
          'DELETE /users/:id',
          'POST /users/:id/role',
        ],
        roles: [
          'GET /roles',
          'GET /roles/:id',
          'POST /roles',
          'PATCH /roles/:id',
          'DELETE /roles/:id',
          'POST /roles/:id/permissions',
        ],
        permissions: [
          'GET /permissions',
          'GET /permissions/:id',
          'POST /permissions',
          'PATCH /permissions/:id',
          'DELETE /permissions/:id',
          'GET /permissions/categories',
          'GET /permissions/category/:category',
        ],
        companies: [
          'GET /companies',
          'GET /companies/:id',
          'POST /companies',
          'PATCH /companies/:id',
          'DELETE /companies/:id',
          'POST /companies/:id/restore',
        ],
        erpConnections: [
          'GET /erp-connections',
          'GET /erp-connections/:id',
          'POST /erp-connections',
          'PATCH /erp-connections/:id',
          'DELETE /erp-connections/:id',
          'POST /erp-connections/test',
          'POST /erp-connections/:id/toggle',
        ],
        auditLogs: [
          'GET /audit-logs',
          'GET /audit-logs/:id',
          'GET /audit-logs/stats',
          'POST /audit-logs/cleanup',
        ],
        sessions: [
          'GET /sessions',
          'GET /sessions/:id',
          'GET /sessions/current',
          'DELETE /sessions/:id',
          'POST /sessions/end-all',
          'GET /sessions/stats',
          'POST /sessions/cleanup',
        ],
        mapping: [
          'GET /config/mapping',
          'GET /config/mapping/:mappingId',
          'POST /config/mapping',
          'POST /config/mapping/test',
        ],
      },
    };
  });

  return app;
}
