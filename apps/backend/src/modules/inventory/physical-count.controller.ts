import { FastifyRequest, FastifyReply } from 'fastify';
import { PhysicalCountService } from './physical-count.service';
import { z } from 'zod';

const UpdateItemCountSchema = z.object({
  countedQty: z.number().min(0, 'Counted quantity must be non-negative'),
  notes: z.string().optional(),
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

export async function createPhysicalCountController(fastify: any) {
  const service = new PhysicalCountService(fastify);

  return {
    /**
     * Actualizar cantidad contada para un item
     * PATCH /api/inventory/counts/:countId/items/:itemId
     */
    async updateItemCount(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId, itemId } = request.params as { countId: string; itemId: string };

      try {
        const body = UpdateItemCountSchema.parse(request.body);

        const result = await service.updateItemCount(
          countId,
          itemId,
          authRequest.user.companyId,
          {
            itemId,
            countedQty: body.countedQty,
            notes: body.notes,
            countedBy: authRequest.user.id,
          }
        );

        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to update item count' });
      }
    },

    /**
     * Obtener items del conteo
     * GET /api/inventory/counts/:countId/items
     */
    async getCountItems(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const result = await service.getCountItems(countId, authRequest.user.companyId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to get count items' });
      }
    },

    /**
     * Completar conteo
     * POST /api/inventory/counts/:countId/complete
     */
    async completeCount(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const result = await service.completeCount(countId, authRequest.user.companyId, authRequest.user.id);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to complete count' });
      }
    },

    /**
     * Obtener resumen de varianzas
     * GET /api/inventory/counts/:countId/variances
     */
    async getVarianceSummary(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const result = await service.getVarianceSummary(countId, authRequest.user.companyId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to get variance summary' });
      }
    },

    /**
     * Descartar conteo
     * DELETE /api/inventory/counts/:countId
     */
    async discardCount(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        await service.discardCount(countId, authRequest.user.companyId);
        return reply.status(204).send();
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Failed to discard count' });
      }
    },
  };
}
