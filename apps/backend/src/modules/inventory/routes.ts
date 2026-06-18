import { FastifyInstance } from 'fastify';
import { InventoryController } from './controller';
import { PrismaInventoryRepository } from './inventory.repository';
import { CountStateService } from './services/count-state.service';
import { ERPLoaderService } from './services/erp-loader.service';
import { ExcelService } from './services/excel.service';
import { ReservedInvoicesService } from './services/reserved-invoices.service';
import { SyncToERPService } from './services/sync-to-erp.service';
import { VersionService } from './services/version.service';
import { tenantGuard } from '../../guards/tenant';

export async function inventoryRoutes(fastify: FastifyInstance) {
    // ── Dependency Injection ────────────────────────────────────────────────
    const repository = new PrismaInventoryRepository(fastify.prisma);
    const countStateService = new CountStateService(repository, fastify.log);
    const erpLoaderService = new ERPLoaderService(repository, fastify.log);
    const excelService = new ExcelService(repository, fastify.log);
    const reservedInvoicesService = new ReservedInvoicesService(repository, fastify.log);
    const syncToERPService = new SyncToERPService(repository, fastify.log);
    const versionService = new VersionService(repository, fastify.log);

    const controller = new InventoryController(
        repository,
        countStateService,
        erpLoaderService,
        excelService,
        reservedInvoicesService,
        syncToERPService,
        versionService
    );

    // ── Middleware ──────────────────────────────────────────────────────────
    fastify.addHook('preHandler', tenantGuard);

    // ── Routes: Counts (Base Compatibility) ─────────────────────────────────
    fastify.get('/inventory-counts', (req, rep) => controller.listCounts(req, rep));
    fastify.post('/inventory-counts', (req, rep) => controller.createCount(req, rep));
    fastify.post('/inventory-counts/create', (req, rep) => controller.createCount(req, rep)); // Alias
    fastify.get('/inventory-counts/:id', (req, rep) => controller.getCount(req, rep));
    fastify.delete('/inventory-counts/:id', (req, rep) => controller.deleteCount(req, rep));
    fastify.delete('/inventory-counts/:id/delete', (req, rep) => controller.deleteCount(req, rep));

    // ── Routes: Lifecycle ───────────────────────────────────────────────────
    fastify.post('/inventory-counts/:id/start', (req, rep) => controller.startCount(req, rep));
    fastify.post('/inventory-counts/:id/complete', (req, rep) => controller.completeCount(req, rep));
    fastify.post('/inventory-counts/:id/pause', (req, rep) => controller.pauseCount(req, rep));
    fastify.post('/inventory-counts/:id/resume', (req, rep) => controller.resumeCount(req, rep));
    fastify.post('/inventory-counts/:id/finalize', (req, rep) => controller.finalizeCount(req, rep));
    fastify.post('/inventory-counts/:id/finalize-physical', (req, rep) => controller.finalizeCount(req, rep));
    fastify.post('/inventory-counts/:id/close', (req, rep) => controller.pauseCount(req, rep)); // Map to pause or close if added
    fastify.post('/inventory-counts/:id/cancel', (req, rep) => controller.deleteCount(req, rep)); // Map to cancel
    fastify.post('/inventory-counts/:id/reactivate', (req, rep) => controller.reactivateCount(req, rep));

    // ── Routes: ERP & Sync ──────────────────────────────────────────────────
    fastify.post('/inventory-counts/:id/prepare', (req, rep) => controller.loadFromERP(req, rep));
    fastify.post('/inventory-counts/:id/load-from-mapping', (req, rep) => controller.loadFromERP(req, rep));
    fastify.post('/inventory-counts/:id/sync-erp', (req, rep) => controller.syncToERP(req, rep));
    fastify.post('/inventory-counts/:id/send-to-erp', (req, rep) => controller.syncToERP(req, rep));
    fastify.post('/inventory-counts/preview-erp-items', (req, rep) => controller.erpLoaderService.previewFilteredItems((req as any).user.companyId, req.body).then(r => rep.send(r)));

    // ── Routes: Reservations ────────────────────────────────────────────────
    fastify.post('/inventory-counts/:id/reserve-invoice', (req, rep) => controller.reserveInvoice(req, rep));
    fastify.post('/inventory-counts/:id/reserve-picking-list', (req, rep) => controller.reservePickingList(req, rep));
    fastify.post('/inventory-counts/:id/load-reservations-from-excel', (req, rep) => controller.reserveFromExcel(req, rep));
    fastify.get('/inventory-counts/:id/reserved-invoices', (req, rep) => controller.listReservedInvoices(req, rep));
    fastify.delete('/inventory-counts/:id/reserved-invoices/:invoiceId', (req, rep) => controller.deleteReservation(req, rep));

    // ── Routes: Excel ───────────────────────────────────────────────────────
    fastify.get('/inventory-counts/:id/export-excel', (req, rep) => controller.exportExcel(req, rep));
    fastify.post('/inventory-counts/:id/load-from-excel', (req, rep) => controller.uploadExcel(req, rep));
    fastify.get('/inventory-counts/excel-template', (req, rep) => controller.downloadTemplate(req, rep));

    // ── Routes: Items ───────────────────────────────────────────────────────
    fastify.post('/inventory-counts/:id/items', (req, rep) => controller.updateItem(req, rep)); // Alias for add
    fastify.patch('/inventory-counts/:id/items/:itemId', (req, rep) => controller.updateItem(req, rep));
    fastify.delete('/inventory-counts/:id/items/:itemId', (req, rep) => controller.deleteItem(req, rep));

    // ── Routes: Versioning & Submission ─────────────────────────────────────
    fastify.get('/inventory-counts/:id/items', (req, rep) => controller.getVersionItems(req, rep));
    fastify.get('/inventory-counts/:id/variance-items', (req, rep) => controller.getVarianceItems(req, rep));
    fastify.post('/inventory-counts/:id/submit-count', (req, rep) => controller.submitCount(req, rep));
    fastify.post('/inventory-counts/:id/new-version', (req, rep) => controller.createNewVersion(req, rep));
    fastify.get('/inventory-counts/:id/version-history', (req, rep) => controller.getVersionHistory(req, rep));
}
