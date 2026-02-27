import { FastifyRequest, FastifyReply } from 'fastify';
import { InventoryCountService } from './service';
import { createInventoryCountSchema, prepareCountItemsSchema, addCountItemSchema, updateCountItemSchema, completeCountSchema } from './schema';
import { parseExcelBuffer, generateTemplateBuffer, ExcelValidationError } from './excel-loader';

export class InventoryCountController {
  constructor(private service: InventoryCountService) { }

  async createCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const body = createInventoryCountSchema.parse(request.body);

    const count = await this.service.createCount(companyId, body.warehouseId, body.description);
    reply.code(201).send(this.maskCountData(count, user.permissions));
  }

  async prepareCountItems(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { countId } = request.params as { countId: string };
    const body = prepareCountItemsSchema.parse(request.body);

    const result = await this.service.prepareCountItems(companyId, countId, body.warehouseId, body.locationId);
    reply.code(200).send(result);
  }

  async getCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const { id } = request.params as { id: string };

    const count = await this.service.getCountById(id, companyId);
    reply.send(this.maskCountData(count, user.permissions));
  }

  async listCounts(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const { warehouseId, status, page = 1, pageSize = 20 } = request.query as {
      warehouseId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    };

    const result = await this.service.listCounts(companyId, warehouseId, status, page, pageSize);

    // Si es un array de conteos, enmascarar cada uno si tiene countItems
    if (result && Array.isArray((result as any).counts)) {
      (result as any).counts = (result as any).counts.map((c: any) => this.maskCountData(c, user.permissions));
    } else if (Array.isArray(result)) {
      return reply.send(result.map(c => this.maskCountData(c, user.permissions)));
    }

    reply.send(result);
  }

  async addCountItem(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { countId } = request.params as { countId: string };
    const body = addCountItemSchema.parse(request.body);

    const countItem = await this.service.addCountItem(countId, companyId, body);
    reply.code(201).send(countItem);
  }

  async updateCountItem(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { countId, itemId } = request.params as { countId: string; itemId: string };
    const body = updateCountItemSchema.parse(request.body);

    const countItem = await this.service.updateCountItem(itemId, companyId, body);
    reply.send(countItem);
  }

  async deleteCountItem(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { countId, itemId } = request.params as { countId: string; itemId: string };

    await this.service.deleteCountItem(itemId, companyId);
    reply.send({ success: true });
  }

  async completeCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const { id } = request.params as { id: string };
    const body = completeCountSchema.parse(request.body);

    const count = await this.service.completeCount(id, companyId, body.approvedBy || user.id);
    reply.send(this.maskCountData(count, user.permissions));
  }

  async deleteCount(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { id } = request.params as { id: string };

    await this.service.deleteCount(id, companyId);
    reply.send({ success: true });
  }

  async finalizeCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const { id } = request.params as { id: string };

    const count = await this.service.finalizeInventoryCount(id, companyId, user.id || user.userId);
    reply.send(this.maskCountData(count, user.permissions));
  }

  async loadCountFromMapping(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
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
      body.locationId || '' // Opcional - si no se proporciona, se usa la default del almacén
    );

    reply.send(this.maskCountData(result, (request as any).user.permissions));
  }

  /**
   * POST /inventory-counts/:countId/load-from-excel
   * Carga artículos desde un archivo Excel (.xlsx/.xls) subido como multipart.
   */
  async loadCountFromExcel(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { countId } = request.params as { countId: string };

    let fileBuffer: Buffer;
    let filename = 'archivo.xlsx';

    try {
      const data = await (request as any).file();
      if (!data) return reply.status(400).send({ error: 'No se envió ningún archivo' });

      filename = data.filename ?? 'archivo';
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        return reply.status(400).send({
          error: `Formato inválido: "${filename}". Solo se aceptan archivos .xlsx o .xls`,
        });
      }

      // Leer el stream a un Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }
      fileBuffer = Buffer.concat(chunks);
    } catch {
      return reply.status(400).send({ error: 'Error al leer el archivo enviado' });
    }

    try {
      const { items, rowErrors } = parseExcelBuffer(fileBuffer);

      if (items.length === 0) {
        return reply.status(400).send({
          error: 'El Excel no contiene artículos válidos',
          rowErrors,
        });
      }

      const count = await this.service.getCountById(countId, companyId);
      if (!count) return reply.status(404).send({ error: 'Conteo no encontrado' });

      // Insertar ítems usando el servicio existente
      const loadResult = await this.service.bulkLoadItemsFromExcel(countId, companyId, items);

      return reply.send({
        message: `Se cargaron ${loadResult.loaded} artículos desde "${filename}"`,
        loaded: loadResult.loaded,
        skipped: loadResult.skipped,
        rowErrors: rowErrors.length > 20 ? rowErrors.slice(0, 20) : rowErrors,
      });
    } catch (err: any) {
      if (err?.type && err?.message) {
        return reply.status(400).send({ error: err.message, type: err.type });
      }
      return reply.status(500).send({ error: 'Error procesando el archivo Excel' });
    }
  }

  /**
   * POST /inventory-counts/excel-preview
   * Parsea un Excel y retorna un preview de los artículos sin guardar nada.
   */
  async previewExcelFile(request: FastifyRequest, reply: FastifyReply) {
    let fileBuffer: Buffer;
    try {
      const data = await (request as any).file();
      if (!data) return reply.status(400).send({ error: 'No se envió ningún archivo' });

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }
      fileBuffer = Buffer.concat(chunks);
    } catch {
      return reply.status(400).send({ error: 'Error al leer el archivo' });
    }

    try {
      const { items, rowErrors } = parseExcelBuffer(fileBuffer);
      return reply.send({
        total: items.length,
        preview: items.slice(0, 10),
        errorsCount: rowErrors.length,
        rowErrors: rowErrors.slice(0, 5),
      });
    } catch (err: any) {
      if (err?.type && err?.message) {
        return reply.status(400).send({ error: err.message, type: err.type });
      }
      return reply.status(500).send({ error: 'Error procesando el archivo Excel' });
    }
  }

  async getExcelTemplate(_request: FastifyRequest, reply: FastifyReply) {
    const buffer = generateTemplateBuffer();
    const filename = 'plantilla_conteo_inventario.xlsx';

    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  /**
   * GET /inventory-counts/:id/export-excel
   * Descarga los resultados del conteo en Excel usando un mapeo.
   */
  async exportToExcel(request: FastifyRequest, reply: FastifyReply) {
    const companyId = (request as any).user.companyId;
    const { id } = request.params as { id: string };
    const { mappingId } = request.query as { mappingId?: string };

    try {
      const buffer = await this.service.excelExporter.exportToExcel(id, companyId, mappingId);
      const filename = `resultado_conteo_${id}.xlsx`;

      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  }

  // ========== NUEVOS ENDPOINTS: GESTIÓN DE ESTADO ==========


  async createNewInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const userId = user.id || user.userId;
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
    const user = (request as any).user;
    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.startInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo iniciado',
      count: updated,
    });
  }

  async completeInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.completeInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo completado',
      count: updated,
    });
  }

  async pauseInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.pauseInventoryCount(countId, companyId);

    reply.send({
      message: 'Conteo pausado',
      count: updated,
    });
  }

  async resumeInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.resumeInventoryCount(countId, companyId);

    reply.send({
      message: 'Conteo reanudado',
      count: updated,
    });
  }

  async closeInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.closeInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo cerrado',
      count: updated,
    });
  }

  async cancelInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.cancelInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo cancelado',
      count: updated,
    });
  }

  async reactivateInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    this.checkPermission(user, 'inventory:edit_settings');

    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const { countId } = request.params as { countId: string };

    const updated = await this.service.reactivateInventoryCount(countId, companyId, userId);

    reply.send({
      message: 'Conteo reactivado',
      count: this.maskCountData(updated, user.permissions),
    });
  }

  async deleteInventoryCount(request: FastifyRequest, reply: FastifyReply) {
    this.checkPermission((request as any).user, 'users:manage'); // Requiere permiso administrativo
    const companyId = (request as any).user.companyId;
    const { countId } = request.params as { countId: string };

    const result = await this.service.deleteInventoryCount(countId, companyId);

    reply.send({
      message: 'Conteo eliminado permanentemente',
      ...result,
    });
  }

  /**
   * POST /inventory-counts/:countId/send-to-erp
   * Enviar conteo completado al ERP
   * Cambio de estado: COMPLETED → CLOSED
   */
  async sendToERP(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    this.checkPermission(user, 'inventory:sync');

    const companyId = user.companyId;
    const userId = user.id || user.userId;
    const { countId } = request.params as { countId: string };

    const result = await this.service.countState.sendToERP(countId, companyId, userId);

    reply.code(200).send(result);
  }

  /**
   * Enmascara datos sensibles de un conteo si el usuario no tiene permiso para verlos.
   * Implementa el concepto de "Blind Count" (Conteo Ciego).
   */
  private maskCountData(count: any, permissions: string[] = []) {
    if (!count) return count;

    // Si tiene permiso de ver todo, retornamos tal cual (Admin o rol con permiso)
    if (permissions && permissions.includes('inventory:view_qty')) {
      return count;
    }

    // Clonar para no mutar el original
    const masked = JSON.parse(JSON.stringify(count));

    // Enmascarar items del conteo
    if (masked.countItems && Array.isArray(masked.countItems)) {
      masked.countItems = masked.countItems.map((item: any) => ({
        ...item,
        systemQty: null, // Ocultar stock teórico
        variance: null,  // Ocultar diferencia calculada
        hasVariance: null,
      }));
    }

    // Enmascarar reportes de varianza asociados (ocultar por completo)
    if (masked.variances) {
      masked.variances = [];
    }

    return masked;
  }

  private checkPermission(user: any, permission: string) {
    // SuperAdmin bypass
    if (user && user.roles && user.roles.includes('SuperAdmin')) {
      return;
    }

    if (!user || !user.permissions || !user.permissions.includes(permission)) {
      const error: any = new Error(`Forbidden: Missing permission ${permission}`);
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }
}
