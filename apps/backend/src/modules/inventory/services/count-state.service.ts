import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';

/**
 * CountStateService — Responsabilidad única: gestión del ciclo de vida del conteo.
 */
export class CountStateService {
    constructor(
        private repository: InventoryRepository,
        private logger?: any
    ) { }

    /**
     * Obtiene el conteo activo de un almacén (estado ACTIVE u ON_HOLD)
     */
    async getActiveCountByWarehouse(companyId: string, warehouseId: string) {
        const counts = await this.repository.findAllCounts(companyId, {
            warehouseId,
            status: { in: ['ACTIVE', 'ON_HOLD'] },
            take: 1
        });
        return counts.length > 0 ? counts[0] : null;
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
        const warehouse = await this.repository.findWarehouseById(warehouseId);
        if (!warehouse || warehouse.companyId !== companyId) {
            throw new AppError(404, 'Almacén no encontrado', 'WAREHOUSE_NOT_FOUND');
        }

        const activeCount = await this.getActiveCountByWarehouse(companyId, warehouseId);
        if (activeCount) {
            throw new AppError(400, `Ya existe un conteo activo: ${activeCount.sequenceNumber}`, 'INVENTORY_COUNT_ACTIVE');
        }

        if (mappingConfigId) {
            const mapping = await this.repository.findMappingConfigById(mappingConfigId);
            if (!mapping || mapping.companyId !== companyId) {
                throw new AppError(404, 'Mapping no encontrado', 'MAPPING_NOT_FOUND');
            }
        }

        const countCode = this.generateCountCode();

        const newCount = await this.repository.createCount({
            companyId,
            warehouseId,
            status: 'DRAFT',
            currentVersion: 1,
            totalVersions: 1,
            createdBy,
            code: countCode,
        });

        if (this.logger) this.logger.info(`✅ [createNewInventoryCount] Conteo creado: ${newCount.sequenceNumber}`);
        return newCount;
    }

    /**
     * DRAFT → ACTIVE
     */
    async startInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'DRAFT') {
            throw new AppError(400, `El conteo no está en estado DRAFT (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        const updated = await this.repository.updateCount(countId, {
            status: 'ACTIVE',
            startedBy: userId,
            startedAt: new Date()
        });

        if (this.logger) this.logger.info(`✅ [startInventoryCount] Conteo iniciado: ${updated.sequenceNumber}`);
        return updated;
    }

    /**
     * ACTIVE → SUBMITTED: calcula varianzas y cierra items
     */
    async completeInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'ACTIVE' && count.status !== 'ON_HOLD') {
            throw new AppError(400, `El conteo debe estar ACTIVO o EN PAUSA (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        if (this.logger) this.logger.info(`📋 [completeInventoryCount] Calculando varianzas para conteo ${count.code}...`);

        // Construir mapas de reserva por tipo
        // Separado: ERP lo tiene, pero ya no está en estante → restar
        // Pasillo: ERP ya lo descontó (factura pendiente), pero sigue en estante → sumar
        const reservedInvoices = await this.repository.findReservedInvoices(countId);
        const separatedMap = new Map<string, number>();
        const inAisleMap = new Map<string, number>();
        for (const inv of reservedInvoices) {
            const targetMap = inv.type === 'SEPARATED' ? separatedMap : inAisleMap;
            for (const item of (inv.items || [])) {
                const code = item.itemCode.trim().toUpperCase();
                targetMap.set(code, (targetMap.get(code) || 0) + Number(item.reservedQty));
            }
        }

        const items = await this.repository.findCountWithItems(countId, { version: count.currentVersion });
        const countItems = items.countItems || [];

        let itemsWithVariance = 0;
        let itemsApproved = 0;

        for (const item of countItems) {
            const countedVal = item.countedQty ? Number(item.countedQty) : 0;
            const systemVal = Number(item.systemQty);
            const code = item.itemCode.trim().toUpperCase();
            const separatedVal = separatedMap.get(code) || 0;
            const inAisleVal = inAisleMap.get(code) || 0;

            // Fórmula unificada: Stock Esperado = ERP - Separado + Pasillo
            const expectedStock = systemVal - separatedVal + inAisleVal;
            const diff = countedVal - expectedStock;
            const hasVariance = diff !== 0;

            await this.repository.updateItemCount(item.id, {
                hasVariance,
                status: hasVariance ? 'VARIANCE' : 'APPROVED',
                ...(item.countedQty === null && { countedQty: 0 })
            });

            if (hasVariance) {
                const variancePercent = expectedStock > 0 ? (diff / expectedStock) * 100 : 0;
                await this.repository.upsertVarianceReport({
                    companyId,
                    countId,
                    countItemId: item.id,
                    version: count.currentVersion,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    systemQty: systemVal,
                    countedQty: countedVal,
                    reservedQty: separatedVal,
                    difference: diff,
                    variancePercent,
                    status: 'PENDING'
                });
                itemsWithVariance++;
            } else {
                await this.repository.deleteVarianceReportsByCountId(countId, count.currentVersion, item.id);
                itemsApproved++;
            }
        }

        if (this.logger) {
            this.logger.info(`   ✅ ${itemsApproved} items sin varianza (APPROVED)`);
            this.logger.info(`   ⚠️ ${itemsWithVariance} items con varianza (VARIANCE)`);
        }

        await this.repository.updateCount(countId, {
            status: 'SUBMITTED',
            completedBy: userId,
            completedAt: new Date()
        });

        const result = await this.repository.findCountById(countId);
        if (this.logger) this.logger.info(`✅ [completeInventoryCount] Conteo sometido: ${count.sequenceNumber}`);
        return result;
    }

    /**
     * SUBMITTED → COMPLETED
     */
    async finalizeInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'SUBMITTED') {
            throw new AppError(400, `El conteo debe estar SOMETIDO para finalizar (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        await this.repository.updateCount(countId, {
            status: 'COMPLETED',
            approvedBy: userId,
            approvedAt: new Date()
        });

        if (this.logger) this.logger.info(`✅ [finalizeInventoryCount] Conteo finalizado administrativamente: ${count.sequenceNumber}`);
        return await this.repository.findCountById(countId);
    }

    /**
     * FINALIZED (Físico)
     */
    async finalizePhysicalCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }

        if (!['ACTIVE', 'SUBMITTED', 'COMPLETED', 'ON_HOLD'].includes(count.status)) {
            throw new AppError(400, `No se puede finalizar físicamente un conteo en estado ${count.status}`, 'INVALID_STATUS');
        }

        const updated = await this.repository.updateCount(countId, {
            status: 'FINALIZED',
            finalizedVersion: count.currentVersion,
            approvedBy: userId,
            approvedAt: new Date(),
        });

        if (this.logger) this.logger.info(`✅ [finalizePhysicalCount] Conteo finalizado físicamente (V${count.currentVersion}): ${updated.sequenceNumber}`);
        return updated;
    }

    async pauseInventoryCount(countId: string, companyId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'ACTIVE') {
            throw new AppError(400, `El conteo debe estar ACTIVO (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        await this.repository.updateCountStatus(countId, 'ON_HOLD');
        if (this.logger) this.logger.info(`✅ [pauseInventoryCount] Conteo pausado: ${count.sequenceNumber}`);
        return await this.repository.findCountById(countId);
    }

    async resumeInventoryCount(countId: string, companyId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'ON_HOLD') {
            throw new AppError(400, `El conteo debe estar en PAUSA (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        await this.repository.updateCountStatus(countId, 'ACTIVE');
        if (this.logger) this.logger.info(`✅ [resumeInventoryCount] Conteo reanudado: ${count.sequenceNumber}`);
        return await this.repository.findCountById(countId);
    }

    async closeInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'COMPLETED' && count.status !== 'FINALIZED') {
            throw new AppError(400, `El conteo debe estar COMPLETADO o FINALIZADO (estado actual: ${count.status})`, 'INVALID_STATUS');
        }

        const updated = await this.repository.updateCount(countId, {
            status: 'CLOSED',
            closedBy: userId,
            closedAt: new Date()
        });

        if (this.logger) this.logger.info(`✅ [closeInventoryCount] Conteo cerrado: ${updated.sequenceNumber}`);
        return updated;
    }

    async cancelInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status === 'CLOSED') {
            throw new AppError(400, 'No se puede cancelar un conteo cerrado', 'INVALID_STATUS');
        }

        const updated = await this.repository.updateCount(countId, {
            status: 'CANCELLED',
            closedBy: userId,
            closedAt: new Date()
        });

        if (this.logger) this.logger.info(`✅ [cancelInventoryCount] Conteo cancelado: ${updated.sequenceNumber}`);
        return updated;
    }

    async reactivateInventoryCount(countId: string, companyId: string, userId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }
        if (count.status !== 'CLOSED') {
            throw new AppError(400, 'Solo se pueden reactivar conteos cerrados/archivados', 'INVALID_STATUS');
        }

        const updated = await this.repository.updateCountStatus(countId, 'COMPLETED');
        if (this.logger) this.logger.info(`✅ [reactivateInventoryCount] Conteo reactivado: ${updated.sequenceNumber}`);
        return updated;
    }

    async deleteInventoryCount(countId: string, companyId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado', 'COUNT_NOT_FOUND');
        }

        await this.repository.deleteVarianceReportsByCountId(countId);
        await this.repository.deleteItemsByCountId(countId);
        await this.repository.deleteSyncHistoryByCountId(countId);
        await this.repository.deleteCount(countId);

        if (this.logger) this.logger.info(`🗑️ [deleteInventoryCount] Conteo eliminado: ${count.sequenceNumber}`);
        return { success: true };
    }

    private generateCountCode(): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const uniqueSuffix = String(date.getDate()).padStart(2, '0') + String(date.getHours()).padStart(2, '0');
        return `INV-${year}-${month}-${uniqueSuffix}`;
    }
}
