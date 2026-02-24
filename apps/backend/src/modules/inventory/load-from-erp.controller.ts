import { FastifyRequest, FastifyReply } from 'fastify';
import { LoadInventoryFromERPService } from './load-from-erp.service';
import { z } from 'zod';

// Schema de validación
const LoadInventorySchema = z.object({
  mappingId: z.string().min(1, 'Mapping ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
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

export async function createLoadInventoryController(fastify: any) {
  const service = new LoadInventoryFromERPService(fastify);

  return {
    /**
     * Cargar inventario desde ERP
     * POST /api/inventory/load-from-erp
     *
     * Body:
     * {
     *   "mappingId": "...",
     *   "warehouseId": "..."
     * }
     */
    async loadInventoryFromERP(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;

      try {
        const body = LoadInventorySchema.parse(request.body);

        const result = await service.loadInventoryFromERP({
          mappingId: body.mappingId,
          warehouseId: body.warehouseId,
          companyId: authRequest.user.companyId,
          userId: authRequest.user.id,
        });

        // Si la carga fue exitosa o parcial, devolver 200
        if (result.status === 'SUCCESS' || result.status === 'PARTIAL') {
          return reply.status(200).send(result);
        }

        // Si falló completamente, devolver 400
        return reply.status(400).send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({
            error: error.message,
          });
        }

        return reply.status(500).send({
          error: 'Failed to load inventory from ERP',
          details: error.message,
        });
      }
    },

    /**
     * Obtener estado de una carga
     * GET /api/inventory/load-from-erp/:countId
     */
    async getLoadStatus(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        const count = await fastify.prisma.inventoryCount.findUnique({
          where: { id: countId },
          include: {
            countItems: {
              select: {
                id: true,
                itemCode: true,
                itemName: true,
                systemQty: true,
                uom: true,
              },
            },
          },
        });

        if (!count) {
          return reply.status(404).send({ error: 'Inventory count not found' });
        }

        if (count.companyId !== authRequest.user.companyId) {
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        return reply.send({
          countId: count.id,
          code: count.code,
          status: count.status,
          itemsCount: count.countItems.length,
          items: count.countItems,
          createdAt: count.createdAt,
          startedAt: count.startedAt,
        });
      } catch (error: any) {
        return reply.status(500).send({
          error: 'Failed to get load status',
          details: error.message,
        });
      }
    },

    /**
     * Cancelar una carga (cambiar status a DRAFT)
     * DELETE /api/inventory/load-from-erp/:countId
     */
    async cancelLoad(request: FastifyRequest, reply: FastifyReply) {
      const authRequest = request as AuthenticatedRequest;
      const { countId } = request.params as { countId: string };

      try {
        // Obtener el conteo
        const count = await fastify.prisma.inventoryCount.findUnique({
          where: { id: countId },
        });

        if (!count) {
          return reply.status(404).send({ error: 'Inventory count not found' });
        }

        if (count.companyId !== authRequest.user.companyId) {
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Solo se puede cancelar si está en estado DRAFT
        if (count.status !== 'DRAFT') {
          return reply.status(400).send({
            error: `Cannot cancel inventory count in ${count.status} status`,
          });
        }

        // Eliminar items
        await fastify.prisma.inventoryCount_Item.deleteMany({
          where: { countId },
        });

        // Eliminar el conteo
        await fastify.prisma.inventoryCount.delete({
          where: { id: countId },
        });

        // Registrar en audit log
        await fastify.auditLog({
          action: 'CANCEL_LOAD_FROM_ERP',
          userId: authRequest.user.id,
          companyId: authRequest.user.companyId,
          resourceId: countId,
          resource: 'InventoryCount',
        });

        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(500).send({
          error: 'Failed to cancel load',
          details: error.message,
        });
      }
    },
  };
}
