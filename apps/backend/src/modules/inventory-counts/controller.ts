import { FastifyRequest, FastifyReply } from 'fastify';
import { InventoryCountService } from './service';
import { createInventoryCountSchema, prepareCountItemsSchema, addCountItemSchema, updateCountItemSchema, completeCountSchema } from './schema';

export class InventoryCountController {
  constructor(private service: InventoryCountService) {}

  async createCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const body = createInventoryCountSchema.parse(request.body);

    const count = await this.service.createCount(companyId, body.warehouseId, body.description, body.mappingId);
    reply.code(201).send(count);
  }

  async prepareCountItems(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };
    const body = prepareCountItemsSchema.parse(request.body);

    const result = await this.service.prepareCountItems(companyId, countId, body.warehouseId, body.locationId);
    reply.code(200).send(result);
  }

  async getCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    const count = await this.service.getCountById(id, companyId);
    reply.send(count);
  }

  async listCounts(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { warehouseId, status, page = 1, pageSize = 20 } = request.query as {
      warehouseId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    };

    const counts = await this.service.listCounts(companyId, warehouseId, status, page, pageSize);
    reply.send(counts);
  }

  async addCountItem(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };
    const body = addCountItemSchema.parse(request.body);

    const countItem = await this.service.addCountItem(countId, companyId, body);
    reply.code(201).send(countItem);
  }

  async updateCountItem(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId, itemId } = request.params as { countId: string; itemId: string };
    const body = updateCountItemSchema.parse(request.body);

    const countItem = await this.service.updateCountItem(itemId, companyId, body);
    reply.send(countItem);
  }

  async deleteCountItem(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId, itemId } = request.params as { countId: string; itemId: string };

    await this.service.deleteCountItem(itemId, companyId);
    reply.send({ success: true });
  }

  async completeCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };
    const body = completeCountSchema.parse(request.body);

    const count = await this.service.completeCount(id, companyId, body.approvedBy || request.user.id);
    reply.send(count);
  }

  async deleteCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { id } = request.params as { id: string };

    await this.service.deleteCount(id, companyId);
    reply.send({ success: true });
  }

  async loadCountFromMapping(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };
    const body = request.body as { warehouseId: string; mappingId: string; locationId?: string };

    if (!body.mappingId || !body.warehouseId) {
      return reply.status(400).send({
        error: 'Missing required fields: mappingId, warehouseId',
      });
    }

    const result = await this.service.loadCountFromMapping(
      companyId,
      countId,
      body.warehouseId,
      body.mappingId,
      body.locationId // Opcional - si no se proporciona, se usa la default del almacén
    );

    reply.send(result);
  }

  // ========== NUEVOS ENDPOINTS: GESTIÓN DE ESTADO ==========

  async createNewInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const userId = request.user.id;
    const body = request.body as { warehouseId: string; mappingConfigId: string };

    // Validar que el almacén existe y no tiene conteo activo
    const activeCount = await this.service.getActiveCountByWarehouse(companyId, body.warehouseId);
    if (activeCount) {
      return reply.code(400).send({
        error: 'ACTIVE_COUNT_EXISTS',
        message: `Conteo activo existente: ${activeCount.sequenceNumber}`,
        activeCount: {
          id: activeCount.id,
          sequenceNumber: activeCount.sequenceNumber,
          status: activeCount.status,
          currentVersion: activeCount.currentVersion,
        },
      });
    }

    const newCount = await this.service.createNewInventoryCount(
      companyId,
      body.warehouseId,
      body.mappingConfigId,
      userId
    );

    reply.code(201).send({
      message: 'Conteo creado exitosamente',
      count: newCount,
    });
  }

  async startInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const userId = request.user.id;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.startInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo iniciado',
      count: updated,
    });
  }

  async completeInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const userId = request.user.id;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.completeInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo completado',
      count: updated,
    });
  }

  async pauseInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.pauseInventoryCount(countId, companyId);

    reply.send({
      message: 'Conteo pausado',
      count: updated,
    });
  }

  async resumeInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.resumeInventoryCount(countId, companyId);

    reply.send({
      message: 'Conteo reanudado',
      count: updated,
    });
  }

  async closeInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const userId = request.user.id;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.closeInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo cerrado',
      count: updated,
    });
  }

  async cancelInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const userId = request.user.id;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.cancelInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo cancelado',
      count: updated,
    });
  }

  /**
   * POST /inventory-counts/:countId/send-to-erp
   * Enviar conteo completado al ERP
   * Cambio de estado: COMPLETED → CLOSED
   */
  async sendToERP(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const userId = request.user.id;
    const { countId } = request.params as { countId: string };

    const result = await this.service.sendToERP(countId, companyId, userId);

    reply.code(200).send(result);
  }
}
