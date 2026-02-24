import { FastifyRequest, FastifyReply } from 'fastify';
import { SyncToERPService } from './sync-to-erp.service';
import { z } from 'zod';

const SyncToERPSchema = z.object({
  updateStrategy: z.enum(['REPLACE', 'ADD'], {
    errorMap: () => ({ message: 'updateStrategy must be REPLACE or ADD' }),
  }),
});

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    companyId: string;
    id: string;
    type?: 'access' | 'refresh';
  };
}

export async function createSyncToERPController(fastify: any) {
  const service = new SyncToERPService(fastify);

  return {
    /**
     * Obtener items sincronizables
     * GET /api/inventory/counts/:countId/syncable-items
     */
    async getSyncableItems(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const result = await service.getSyncableItems(countId, authRequest.user.companyId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to get syncable items' });
      }
    },

    /**
     * Sincronizar al ERP
     * POST /api/inventory/counts/:countId/sync
     */
    async syncToERP(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const body = SyncToERPSchema.parse(request.body);

        const result = await service.syncToERP(countId, authRequest.user.companyId, {
          updateStrategy: body.updateStrategy,
        });

        return reply.send(result);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to sync to ERP' });
      }
    },

    /**
     * Obtener historial de sincronizaciones
     * GET /api/inventory/counts/:countId/sync-history
     */
    async getSyncHistory(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const result = await service.getSyncHistory(countId, authRequest.user.companyId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to get sync history' });
      }
    },

    /**
     * Obtener detalles de una sincronización
     * GET /api/inventory/counts/sync/:syncHistoryId
     */
    async getSyncDetails(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { syncHistoryId } = request.params as { syncHistoryId: string };

      try {
        const result = await service.getSyncDetails(syncHistoryId, authRequest.user.companyId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to get sync details' });
      }
    },

    /**
     * Validar sincronización
     * GET /api/inventory/counts/:countId/validate-sync
     */
    async validateSync(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const result = await service.validateSync(countId, authRequest.user.companyId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to validate sync' });
      }
    },
  };
}
