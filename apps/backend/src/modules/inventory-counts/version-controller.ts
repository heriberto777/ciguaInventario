import { FastifyRequest, FastifyReply } from 'fastify';
import { InventoryVersionService } from './version-service';

export class InventoryVersionController {
  constructor(private versionService: InventoryVersionService) {}

  /**
   * GET /inventory-counts/{countId}/items
   * Obtener todos los items del conteo con datos de versión
   */
  async getCountItems(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const result = await this.versionService.getCountItems(countId, companyId);
    reply.send(result);
  }

  /**
   * GET /inventory-counts/{countId}/variance-items?version=1
   * Obtener solo los items con varianza para recontar
   */
  async getVarianceItems(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };
    const { version } = request.query as { version?: string };

    if (!version) {
      return reply.status(400).send({
        error: 'Missing query parameter: version',
      });
    }

    const result = await this.versionService.getVarianceItems(countId, companyId, parseInt(version));
    reply.send(result);
  }

  /**
   * POST /inventory-counts/{countId}/submit-count
   * Registrar conteo para una versión específica
   */
  async submitCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const body = request.body as {
      version: number;
      locationId: string;
      items: Array<{
        itemCode: string;
        countedQty: number;
        uom: string;
      }>;
    };

    if (!body.version || !body.locationId || !body.items) {
      return reply.status(400).send({
        error: 'Missing required fields: version, locationId, items',
      });
    }

    const result = await this.versionService.submitCount(
      countId,
      companyId,
      body.version,
      body.locationId,
      body.items
    );

    reply.code(200).send(result);
  }

  /**
   * POST /inventory-counts/{countId}/new-version
   * Crear nueva versión para recontar items con varianza
   */
  async createNewVersion(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const result = await this.versionService.createNewVersion(countId, companyId);
    reply.code(201).send(result);
  }

  /**
   * GET /inventory-counts/{countId}/version-history
   * Obtener historial de todas las versiones
   */
  async getVersionHistory(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user.companyId;
    const { countId } = request.params as { countId: string };

    const result = await this.versionService.getVersionHistory(countId, companyId);
    reply.send(result);
  }
}
