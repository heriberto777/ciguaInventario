import { FastifyRequest, FastifyReply } from 'fastify';
import { InventoryRepository } from './inventory.repository';
import { CountStateService } from './services/count-state.service';
import { ERPLoaderService } from './services/erp-loader.service';
import { ExcelService } from './services/excel.service';
import { ReservedInvoicesService } from './services/reserved-invoices.service';
import { SyncToERPService } from './services/sync-to-erp.service';
import { VersionService } from './services/version.service';
import { AppError } from '../../utils/errors';
import { parseExcelBuffer } from './utils/excel.util';

export class InventoryController {
    constructor(
        private repository: InventoryRepository,
        private countStateService: CountStateService,
        public erpLoaderService: ERPLoaderService,
        private excelService: ExcelService,
        private reservedInvoicesService: ReservedInvoicesService,
        private syncToERPService: SyncToERPService,
        private versionService: VersionService
    ) { }

    // ── Gestión de Conteos ───────────────────────────────────────────────────

    async listCounts(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const query = request.query as any;
        const warehouseId = query.warehouseId;
        const status = query.status;

        const counts = await this.repository.findAllCounts(user.companyId, {
            warehouseId,
            status,
            include: { warehouse: true }
        });

        reply.send(counts.map((c: any) => this.maskCountData(c, user.permissions)));
    }

    async createCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const body = request.body as any;
        
        // El countStateService se encarga de la lógica de negocio (validar que no haya otro activo, etc)
        const count = await this.countStateService.createNewInventoryCount(
            user.companyId,
            body.warehouseId,
            body.mappingConfigId || '',
            user.id
        );

        reply.code(201).send(this.maskCountData(count, user.permissions));
    }

    async getCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        const count = await this.repository.findCountWithItems(id);
        if (!count || count.companyId !== user.companyId) {
            throw new AppError(404, 'Conteo no encontrado');
        }

        reply.send(this.maskCountData(count, user.permissions));
    }

    async deleteCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        await this.countStateService.deleteInventoryCount(id, user.companyId);
        reply.send({ success: true });
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    async startCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.startInventoryCount(id, user.companyId, user.id);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async completeCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.completeInventoryCount(id, user.companyId, user.id);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async pauseCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.pauseInventoryCount(id, user.companyId);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async resumeCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.resumeInventoryCount(id, user.companyId);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async finalizeCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.finalizePhysicalCount(id, user.companyId, user.id);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async reactivateCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.reactivateInventoryCount(id, user.companyId, user.id);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async closeCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.closeInventoryCount(id, user.companyId, user.id);
        reply.send(this.maskCountData(result, user.permissions));
    }

    async cancelCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.countStateService.cancelInventoryCount(id, user.companyId, user.id);
        reply.send(this.maskCountData(result, user.permissions));
    }

    // ── ERP Integration ──────────────────────────────────────────────────────

    async loadFromERP(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const body = request.body as any;

        const result = await this.erpLoaderService.loadCountFromMapping(
            user.companyId,
            id,
            body.warehouseId,
            body.mappingId,
            body.locationId,
            body.itemCodes
        );
        reply.send(result);
    }

    async syncToERP(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const body = request.body as any;

        const result = await this.syncToERPService.syncToERP(id, user.companyId, {
            updateStrategy: body.updateStrategy || 'REPLACE',
            mappingId: body.mappingId,
            userEmail: user.email
        });
        reply.send(result);
    }

    async getSyncHistory(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.syncToERPService.getSyncHistory(id, user.companyId);
        reply.send(result);
    }

    async getSyncDetail(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { syncId } = request.params as { syncId: string };
        const result = await this.syncToERPService.getSyncDetail(syncId, user.companyId);
        reply.send(result);
    }

    // ── Reservas ─────────────────────────────────────────────────────────────

    async reserveInvoice(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const { invoiceNumber, reservationType } = request.body as { invoiceNumber: string, reservationType?: any };

        const result = await this.reservedInvoicesService.reserveInvoice({
            countId: id,
            companyId: user.companyId,
            invoiceNumber,
            reservationType
        });
        reply.send(result);
    }

    async listReservedInvoices(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await this.reservedInvoicesService.getReservedInvoices(id);
        reply.send(result);
    }

    async deleteReservation(request: FastifyRequest, reply: FastifyReply) {
        const { id, invoiceId } = request.params as { id: string, invoiceId: string };
        await this.reservedInvoicesService.removeInvoiceReservation(id, invoiceId);
        reply.send({ success: true });
    }

    async reservePickingList(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const body = request.body as any;

        const result = await this.reservedInvoicesService.reservePickingList({
            countId: id,
            companyId: user.companyId,
            startDate: body.startDate,
            endDate: body.endDate,
            sellerCode: body.sellerCode,
            reservationType: body.reservationType,
            dryRun: body.dryRun
        });
        reply.send(result);
    }

    async reserveFromExcel(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const file = await (request as any).file();

        if (!file) throw new AppError(400, 'No file uploaded');

        const buffer = await file.toBuffer();
        const { items, rowErrors } = parseExcelBuffer(buffer);

        if (items.length === 0) throw new AppError(400, 'El Excel no contiene datos válidos');

        const { type } = request.query as { type?: any };
        const result = await this.reservedInvoicesService.reserveFromExcel(id, user.companyId, items, type);
        reply.send({ ...result, rowErrors });
    }

    // ── Excel ────────────────────────────────────────────────────────────────

    async exportExcel(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const query = request.query as any;

        const buffer = await this.excelService.exportToExcel(id, user.companyId, query.mappingId);
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', `attachment; filename=inventario-${id}.xlsx`);
        reply.send(buffer);
    }

    async uploadExcel(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const file = await (request as any).file();

        if (!file) throw new AppError(400, 'No file uploaded');

        const buffer = await file.toBuffer();
        const { items, rowErrors } = parseExcelBuffer(buffer);

        if (items.length === 0) throw new AppError(400, 'El Excel no contiene datos válidos');

        const result = await this.excelService.bulkLoadItemsFromExcel(id, user.companyId, items);
        reply.send({ ...result, rowErrors });
    }

    async downloadTemplate(_request: FastifyRequest, reply: FastifyReply) {
        const buffer = this.excelService.getTemplate();
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', 'attachment; filename=plantilla-inventario.xlsx');
        reply.send(buffer);
    }

    // ── Versioning & Submission ──────────────────────────────────────────────

    async getVersionItems(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.versionService.getCountItems(id, user.companyId);
        reply.send(result);
    }

    async getVarianceItems(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const query = request.query as any;
        const result = await this.versionService.getVarianceItems(id, user.companyId, parseInt(query.version || '1'));
        reply.send(result);
    }

    async submitCount(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const result = await this.versionService.submitCount(id, user.companyId, body.version, body.locationId, body.items);
        reply.send(result);
    }

    async createNewVersion(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.versionService.createNewVersion(id, user.companyId);
        reply.send(result);
    }

    async getVersionHistory(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const result = await this.versionService.getVersionHistory(id, user.companyId);
        reply.send(result);
    }

    // ── Items Management ─────────────────────────────────────────────────────

    async updateItem(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id, itemId } = request.params as { id: string, itemId: string };
        const body = request.body as any;

        const count = await this.repository.findCountById(id);
        if (!count || count.companyId !== user.companyId) throw new AppError(404, 'Conteo no encontrado');
        if (count.status !== 'ACTIVE') throw new AppError(400, `No se pueden modificar items en estado ${count.status}. Solo se permite en estado ACTIVE.`);

        const item = await this.repository.findItemById(itemId);
        if (!item || item.countId !== id) throw new AppError(404, 'Item no encontrado');

        const result = await this.repository.updateItemCount(itemId, body);
        reply.send(result);
    }

    async deleteItem(request: FastifyRequest, reply: FastifyReply) {
        const user = (request as any).user;
        const { id, itemId } = request.params as { id: string, itemId: string };

        const item = await this.repository.findItemById(itemId);
        if (!item || item.countId !== id) throw new AppError(404, 'Item no encontrado');

        await this.repository.deleteItemById(itemId);
        reply.send({ success: true });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private maskCountData(count: any, permissions: string[] = []) {
        if (!count) return null;
        
        const canViewAll = permissions.includes('inv_counts:view_all') || permissions.includes('admin');
        const canViewQty = canViewAll || permissions.includes('inventory:view_qty');
        const canViewVariances = canViewAll || permissions.includes('inventory:view_variances');

        // Aggregate reserved quantities
        const reservedInAisleMap = new Map<string, number>();
        const reservedSeparatedMap = new Map<string, number>();
        const reservedTotalMap = new Map<string, number>();

        if (count.reservedInvoices) {
            for (const inv of count.reservedInvoices) {
                if (inv.items) {
                    const targetMap = inv.type === 'SEPARATED' ? reservedSeparatedMap : reservedInAisleMap;
                    for (const item of inv.items) {
                        const code = item.itemCode.trim().toUpperCase();
                        const qty = Number(item.reservedQty);
                        
                        targetMap.set(code, (targetMap.get(code) || 0) + qty);
                        reservedTotalMap.set(code, (reservedTotalMap.get(code) || 0) + qty);
                    }
                }
            }
        }

        const masked = { ...count };
        if (masked.countItems) {
            masked.countItems = masked.countItems.map((item: any) => {
                const newItem = { ...item };
                const code = item.itemCode.trim().toUpperCase();
                
                // Set aggregated quantities
                newItem.reservedQty = reservedTotalMap.get(code) || 0;
                newItem.reservedInAisle = reservedInAisleMap.get(code) || 0;
                newItem.reservedSeparated = reservedSeparatedMap.get(code) || 0;
                
                if (!canViewQty) {
                    delete newItem.systemQty;
                }
                
                if (!canViewVariances) {
                    delete newItem.variance;
                    delete newItem.variancePercent;
                }

                // costPrice se deja disponible siempre para que el resumen financiero funcione.
                // No se considera dato sensible como systemQty o variance.

                return newItem;
            });
        }
        return masked;
    }
}
