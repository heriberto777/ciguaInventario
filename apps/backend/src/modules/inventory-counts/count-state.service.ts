import { FastifyInstance } from 'fastify';
import { AppError } from '../../utils/errors';
import { InventoryCountRepository } from './repository';

/**
 * CountStateService — Responsabilidad única: gestión del ciclo de vida del conteo.
 *
 * Transiciones válidas:
 *   DRAFT → ACTIVE (startInventoryCount)
 *   ACTIVE → COMPLETED (completeInventoryCount)
 *   ACTIVE ↔ ON_HOLD (pauseInventoryCount / resumeInventoryCount)
 *   COMPLETED → CLOSED (closeInventoryCount / sendToERP)
 *   ANY → CANCELLED (cancelInventoryCount)
 */
export class CountStateService {
    private repository: InventoryCountRepository;

    constructor(private fastify: FastifyInstance) {
        this.repository = new InventoryCountRepository(fastify);
    }

    /**
     * Obtiene el conteo activo de un almacén (estado ACTIVE u ON_HOLD)
     */
    async getActiveCountByWarehouse(companyId: string, warehouseId: string) {
        return this.fastify.prisma.inventoryCount.findFirst({
            where: {
                companyId,
                warehouseId,
                status: { in: ['ACTIVE', 'ON_HOLD'] },
            },
            include: { countItems: true },
        });
    }

    /**
     * Crea un nuevo conteo con número de secuencia único (DRAFT)
     */
    async createNewInventoryCount(
        companyId: string,
        warehouseId: string,
        mappingConfigId: string,
        createdBy: string
    ) {
        // Validar warehouse
        const warehouse = await this.fastify.prisma.warehouse.findUnique({
            where: { id: warehouseId },
        });
        if (!warehouse || warehouse.companyId !== companyId) {
            throw new AppError(404, 'Almacén no encontrado', 'WAREHOUSE_NOT_FOUND');
        }

        // Validar que no existe conteo activo
        const activeCount = await this.getActiveCountByWarehouse(companyId, warehouseId);
        if (activeCount) {
            throw new AppError(400, `Ya existe un conteo activo: ${activeCount.sequenceNumber}`, 'INVENTORY_COUNT_ACTIVE');
        }

        // Validar mapping
        const mapping = await this.fastify.prisma.mappingConfig.findUnique({
            where: { id: mappingConfigId },
        });
        if (!mapping || mapping.companyId !== companyId) {
            throw new AppError(404, 'Mapping no encontrado', 'MAPPING_NOT_FOUND');
        }

        const sequenceNumber = await this.generateSequenceNumber(companyId);

        const newCount = await this.fastify.prisma.inventoryCount.create({
            data: {
                sequenceNumber,
                companyId,
                warehouseId,
                code: sequenceNumber,
                status: 'DRAFT',
                currentVersion: 1,
                totalVersions: 1,
                createdBy,
            },
            include: { countItems: true },
        });

        this.fastify.log.info(`✅ [createNewInventoryCount] Conteo creado: ${sequenceNumber}`);
        return newCount;
    }

    /**
     * DRAFT → ACTIVE
     */
    async startInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'DRAFT') {
            throw new AppError(400, `El conteo no está en estado DRAFT (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        const updated = await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'ACTIVE', startedBy: userId, startedAt: new Date() },
            include: { countItems: true },
        });

        this.fastify.log.info(`✅ [startInventoryCount] Conteo iniciado: ${updated.sequenceNumber}`);
        return updated;
    }

    /**
     * ACTIVE → COMPLETED: calcula varianzas y cierra items
     */
    async completeInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'ACTIVE' && count.status !== 'DRAFT') {
            throw new AppError(400, `El conteo debe estar ACTIVO o en BORRADOR (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        this.fastify.log.info(`📋 [completeInventoryCount] Calculando varianzas para conteo ${count.code}...`);

        // 1. Obtener ítems reservados (facturados pero no despachados)
        const reservedInvoices = await this.fastify.prisma.countReservedInvoice.findMany({
            where: { countId },
            include: { items: true }
        });

        // Agrupar reservas por itemCode
        const reservedMap = new Map<string, number>();
        for (const inv of reservedInvoices) {
            for (const item of inv.items) {
                const current = reservedMap.get(item.itemCode) || 0;
                reservedMap.set(item.itemCode, current + Number(item.reservedQty));
            }
        }

        const items = await this.fastify.prisma.inventoryCount_Item.findMany({
            where: { countId, version: count.currentVersion },
        });

        let itemsWithVariance = 0;
        let itemsApproved = 0;

        for (const item of items) {
            const countedVal = item.countedQty ? Number(item.countedQty) : 0;
            const systemVal = Number(item.systemQty);
            const reservedVal = reservedMap.get(item.itemCode) || 0;

            // Formula Maestra: Varianza = Físico - Reserva - Sistema
            const diff = countedVal - reservedVal - systemVal;
            const hasVariance = diff !== 0;

            await this.fastify.prisma.inventoryCount_Item.update({
                where: { id: item.id },
                data: {
                    hasVariance,
                    status: hasVariance ? 'VARIANCE' : 'APPROVED',
                    // Si el operario nunca lo tocó, registramos 0 para el reporte
                    ...(item.countedQty === null && { countedQty: 0 })
                },
            });

            if (hasVariance) {
                // El denominador para el % suele ser el sistema, pero si es 0, usamos 0.
                const variancePercent = systemVal > 0 ? (diff / systemVal) * 100 : 0;

                await this.fastify.prisma.varianceReport.upsert({
                    where: {
                        countId_countItemId_version: {
                            countId,
                            countItemId: item.id,
                            version: count.currentVersion
                        }
                    },
                    update: {
                        countedQty: countedVal,
                        reservedQty: reservedVal, // Snapshot de la reserva en esta versión
                        difference: diff,
                        variancePercent,
                        status: 'PENDING'
                    },
                    create: {
                        companyId,
                        countId,
                        countItemId: item.id,
                        version: count.currentVersion,
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        systemQty: systemVal,
                        countedQty: countedVal,
                        reservedQty: reservedVal,
                        difference: diff,
                        variancePercent,
                        status: 'PENDING'
                    }
                });
                itemsWithVariance++;
            } else {
                // Si ya no hay varianza, eliminamos un posible reporte previo
                await this.fastify.prisma.varianceReport.deleteMany({
                    where: {
                        countId,
                        countItemId: item.id,
                        version: count.currentVersion
                    }
                });
                itemsApproved++;
            }
        }

        this.fastify.log.info(`   ✅ ${itemsApproved} items sin varianza (APPROVED)`);
        this.fastify.log.info(`   ⚠️ ${itemsWithVariance} items con varianza (VARIANCE)`);

        await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'SUBMITTED', completedBy: userId, completedAt: new Date() },
        });

        const result = await this.repository.getCountById(countId, companyId);
        this.fastify.log.info(`✅ [completeInventoryCount] Conteo sometido: ${count.sequenceNumber}`);
        return result;
    }

    /**
     * SUBMITTED → COMPLETED: Finalización administrativa definitiva
     */
    async finalizeInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'SUBMITTED') {
            throw new AppError(400, `El conteo debe estar SOMETIDO para finalizar (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'COMPLETED', approvedBy: userId, approvedAt: new Date() },
        });

        const result = await this.repository.getCountById(countId, companyId);
        this.fastify.log.info(`✅ [finalizeInventoryCount] Conteo finalizado administrativamente: ${count.sequenceNumber}`);
        return result;
    }

    /**
     * Marca una versión como definitiva y CIERRA el conteo para reconteos.
     * Esta es la "Finalización Física" solicitada.
     */
    async finalizePhysicalCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }

        // Solo finalizar si está en un estado avanzado de conteo
        if (!['ACTIVE', 'SUBMITTED', 'COMPLETED', 'ON_HOLD'].includes(count.status)) {
            throw new AppError(400, `No se puede finalizar físicamente un conteo en estado ${count.status}`, 'INVALID_STATUS');
        }

        const updated = await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: {
                status: 'FINALIZED',
                finalizedVersion: count.currentVersion,
                approvedBy: userId,
                approvedAt: new Date(),
            },
            include: { countItems: true },
        });

        this.fastify.log.info(`✅ [finalizePhysicalCount] Conteo finalizado físicamente (V${count.currentVersion}): ${updated.sequenceNumber}`);
        return updated;
    }

    /**
     * ACTIVE → ON_HOLD
     */
    async pauseInventoryCount(countId: string, companyId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'ACTIVE') {
            throw new AppError(400, `El conteo debe estar ACTIVO (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'ON_HOLD' },
        });

        const result = await this.repository.getCountById(countId, companyId);
        this.fastify.log.info(`✅ [pauseInventoryCount] Conteo pausado: ${count.sequenceNumber}`);
        return result;
    }

    /**
     * ON_HOLD → ACTIVE
     */
    async resumeInventoryCount(countId: string, companyId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'ON_HOLD') {
            throw new AppError(400, `El conteo debe estar en PAUSA (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'ACTIVE' },
        });

        const result = await this.repository.getCountById(countId, companyId);
        this.fastify.log.info(`✅ [resumeInventoryCount] Conteo reanudado: ${count.sequenceNumber}`);
        return result;
    }

    /**
     * COMPLETED → CLOSED
     */
    async closeInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'COMPLETED') {
            throw new AppError(400, `El conteo debe estar COMPLETADO (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        const updated = await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'CLOSED', closedBy: userId, closedAt: new Date() },
            include: { countItems: true },
        });

        this.fastify.log.info(`✅ [closeInventoryCount] Conteo cerrado: ${updated.sequenceNumber}`);
        return updated;
    }

    /**
     * ANY → CANCELLED (excepto CLOSED)
     */
    async cancelInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status === 'CLOSED') {
            throw new AppError(400, 'No se puede cancelar un conteo cerrado', 'INVALID_STATUS');
        }

        const updated = await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'CANCELLED', closedBy: userId, closedAt: new Date() },
            include: { countItems: true },
        });

        this.fastify.log.info(`✅ [cancelInventoryCount] Conteo cancelado: ${updated.sequenceNumber}`);
        return updated;
    }

    /**
     * CLOSED → COMPLETED: permite re-editar o re-enviar un conteo
     */
    async reactivateInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'CLOSED') {
            throw new AppError(400, 'Solo se pueden reactivar conteos cerrados/archivados', 'INVALID_STATUS');
        }

        const updated = await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: { status: 'COMPLETED' },
            include: { countItems: true },
        });

        this.fastify.log.info(`✅ [reactivateInventoryCount] Conteo reactivado: ${updated.sequenceNumber}`);
        return updated;
    }

    /**
     * Elimina físicamente un conteo de la base de datos (con sus items y varianzas)
     */
    async deleteInventoryCount(countId: string, companyId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }

        // Eliminar varianzas e items asociados (Prisma delete ya debería manejarlo si están en cascada, pero aseguramos)
        await this.fastify.prisma.varianceReport.deleteMany({ where: { countId } });
        await this.fastify.prisma.inventoryCount_Item.deleteMany({ where: { countId } });
        await this.fastify.prisma.inventorySyncHistory.deleteMany({ where: { countId } });

        await this.fastify.prisma.inventoryCount.delete({
            where: { id: countId },
        });

        this.fastify.log.info(`🗑️ [deleteInventoryCount] Conteo eliminado: ${count.sequenceNumber}`);
        return { success: true };
    }

    /**
     * COMPLETED → CLOSED + sincronización con ERP
     */
    async sendToERP(countId: string, companyId: string, userId: string) {
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'COMPLETED' && count.status !== 'FINALIZED') {
            throw new AppError(400, `No se puede enviar al ERP. Estado actual: ${count.status}. Debe estar en COMPLETED o FINALIZED.`, 'INVALID_STATUS');
        }

        this.fastify.log.info(`🚀 [sendToERP] Enviando conteo al ERP: ${count.sequenceNumber}`);

        // Si no se ha finalizado físicamente, lo hacemos automáticamente ahora
        if (!count.finalizedVersion) {
            this.fastify.log.info(`   - Auto-finalizando versión física: V${count.currentVersion}`);
            await this.fastify.prisma.inventoryCount.update({
                where: { id: countId },
                data: { finalizedVersion: count.currentVersion }
            });
            count.finalizedVersion = count.currentVersion;
        }

        const versionToSync = count.finalizedVersion;
        this.fastify.log.info(`   - Sincronizando Versión: V${versionToSync}`);
        this.fastify.log.info(`   - Total items: ${count.countItems?.length || 0}`);

        // Importar dinámicamente para evitar circular dependencies si fuera el caso
        const { SyncToERPService } = await import('../inventory/sync-to-erp.service');
        const syncService = new SyncToERPService(this.fastify);

        // Obtener el email del usuario (si está disponible en el contexto o BD)
        let userEmail = 'system';
        if (userId) {
            const user = await this.fastify.prisma.user.findUnique({ where: { id: userId } });
            if (user?.email) userEmail = user.email;
        }

        // Ejecutar sincronización real
        // Nota: Hardcodeamos 'REPLACE' como estrategia por defecto para este flujo directo, 
        // o podríamos permitirlo como parámetro si el controller lo envía.
        const syncResult = await syncService.syncToERP(countId, companyId, {
            updateStrategy: 'REPLACE',
            userEmail,
        });

        if (!syncResult.success && syncResult.itemsSynced === 0) {
            this.fastify.log.error(`❌ [sendToERP] Falló la sincronización para ${count.sequenceNumber}`);
            throw new AppError(500, 'Error al sincronizar con el ERP: ' + (syncResult.details[0]?.errorMessage || 'Error desconocido'));
        }

        // Marcar el conteo como cerrado definitivamente tras el envío exitoso
        await this.fastify.prisma.inventoryCount.update({
            where: { id: countId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closedBy: userId
            },
        });

        this.fastify.log.info(`✅ [sendToERP] Conteo enviado al ERP y CERRADO: ${count.sequenceNumber} (${syncResult.itemsSynced} items ok, ${syncResult.itemsFailed} fallidos)`);

        return {
            success: syncResult.success,
            countId: countId,
            message: syncResult.success
                ? `Conteo ${count.sequenceNumber} enviado al ERP exitosamente`
                : `Conteo ${count.sequenceNumber} enviado parcialmente (${syncResult.itemsSynced} sincronizados, ${syncResult.itemsFailed} errores)`,
            itemsSynced: syncResult.itemsSynced,
            itemsFailed: syncResult.itemsFailed,
            sentAt: new Date(),
        };
    }

    // ── Privados ─────────────────────────────────────────────────────────────

    private async generateSequenceNumber(companyId: string, year = new Date().getFullYear()): Promise<string> {
        const lastCount = await this.fastify.prisma.inventoryCount.findFirst({
            where: { companyId, sequenceNumber: { startsWith: `CONT-${year}-` } },
            orderBy: { sequenceNumber: 'desc' },
        });

        let nextNumber = 1;
        if (lastCount?.sequenceNumber) {
            const parts = lastCount.sequenceNumber.split('-');
            nextNumber = parseInt(parts[2] || '0') + 1;
        }

        return `CONT-${year}-${String(nextNumber).padStart(3, '0')}`;
    }
}
