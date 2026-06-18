import { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';

export class ReportsService {
    constructor(private fastify: FastifyInstance) { }

    private get prisma() {
        return this.fastify.prisma;
    }

    /**
     * Genera los datos para el Reporte de Inventario Físico
     * Agrupado por Marca e incluyendo Reservas (Facturas no despachadas)
     */
    async getPhysicalInventoryReport(params: {
        countId: string;
        companyId: string;
        onlyVariances?: boolean;
        brand?: string;
        category?: string;
    }) {
        const { countId, companyId, onlyVariances, brand, category } = params;

        // 1. Obtener la versión actual del conteo
        const count = await this.prisma.inventoryCount.findUnique({
            where: { id: countId },
            select: { currentVersion: true }
        });

        // 2. Obtener reservaciones para este conteo
        const reservedInvoices = await this.prisma.countReservedInvoice.findMany({
            where: { countId },
            include: { items: true }
        });

        // Consolidar reservas por itemCode y itemProv discriminando por TIPO
        const reservedSeparatedByCode = new Map<string, number>();
        const reservedInAisleByCode = new Map<string, number>();
        const inferredProvByCode = new Map<string, string>();

        for (const inv of reservedInvoices) {
            const isSeparated = inv.type === 'SEPARATED';
            for (const item of inv.items) {
                const itemCodeNorm = item.itemCode.trim().toUpperCase();
                const qty = Number(item.reservedQty);

                if (isSeparated) {
                    reservedSeparatedByCode.set(itemCodeNorm, (reservedSeparatedByCode.get(itemCodeNorm) || 0) + qty);
                } else {
                    reservedInAisleByCode.set(itemCodeNorm, (reservedInAisleByCode.get(itemCodeNorm) || 0) + qty);
                }
                
                if (item.itemProv) {
                    inferredProvByCode.set(itemCodeNorm, item.itemProv.trim().toUpperCase());
                }
            }
        }

        // 3. Obtener items del conteo
        const items = await this.prisma.inventoryCount_Item.findMany({
            where: {
                countId,
                version: count?.currentVersion || 1,
                count: { companyId },
                ...(brand ? { brand } : {}),
                ...(category ? { category } : {}),
            },
            orderBy: [
                { brand: 'asc' },
                { itemCode: 'asc' }
            ]
        });

        // Obtener descripciones de marcas y categorías
        const uniqueBrandCodes = [...new Set(items.map(i => i.brand).filter(Boolean))] as string[];
        const uniqueCategoryCodes = [...new Set(items.map(i => i.category).filter(Boolean))] as string[];

        const classifications = await this.prisma.itemClassification.findMany({
            where: {
                companyId,
                code: { in: [...uniqueBrandCodes, ...uniqueCategoryCodes] },
                isActive: true
            }
        });

        const classificationMap = new Map(classifications.map(c => [`${c.groupType}_${c.code}`, c.description]));

        const reportData = items.map(item => {
            const systemQty = item.systemQty || new Decimal(0);
            const countedQty = item.countedQty || new Decimal(0);

            // Lógica de Matching de Reservas
            const itemCodeNorm = item.itemCode.trim().toUpperCase();
            
            const reservedSeparated = reservedSeparatedByCode.get(itemCodeNorm) || 0;
            const reservedInAisle = reservedInAisleByCode.get(itemCodeNorm) || 0;

            // FORMULA MAESTRA UNIFICADA: 
            // Stock Esperado = ERP - Separado + Pasillo
            const expectedStock = systemQty.minus(reservedSeparated).plus(reservedInAisle);
            const difference = countedQty.minus(expectedStock);
            
            const costPrice = item.costPrice || new Decimal(0);
            const varianceCost = difference.times(costPrice);

            const brandDesc = classificationMap.get(`BRAND_${item.brand}`);
            const categoryDesc = classificationMap.get(`CATEGORY_${item.category}`);

            return {
                itemCode: item.itemCode,
                itemName: item.itemName,
                category: item.category,
                categoryName: categoryDesc ? `${categoryDesc} (${item.category})` : item.category,
                brand: item.brand || 'SIN MARCA',
                brandName: brandDesc ? `${brandDesc} (${item.brand})` : (item.brand || 'SIN MARCA'),
                subcategory: item.subcategory,
                systemQty: systemQty.toNumber(),
                reservedSeparated: reservedSeparated,
                reservedInAisle: reservedInAisle,
                expectedStock: expectedStock.toNumber(),
                countedQty: item.countedQty !== null ? countedQty.toNumber() : null,
                difference: item.countedQty !== null ? difference.toNumber() : null,
                costPrice: costPrice.toNumber(),
                varianceCost: item.countedQty !== null ? varianceCost.toNumber() : null,
                hasVariance: item.countedQty !== null ? !difference.isZero() : false,
            };
        });

        // Filtrar si solo se piden varianzas
        const filteredData = onlyVariances
            ? reportData.filter(d => d.hasVariance)
            : reportData;

        // Agrupar por Marca
        const groupedByBrand = filteredData.reduce((acc, item) => {
            const brandLabel = item.brandName;
            if (!acc[brandLabel]) {
                acc[brandLabel] = {
                    brand: brandLabel,
                    items: [],
                    totalSystemValue: 0,
                    totalCountedValue: 0,
                    totalVarianceCost: 0,
                    totalReservedSeparated: 0,
                    totalReservedInAisle: 0,
                };
            }

            acc[brandLabel].items.push(item);

            // Totales del grupo
            acc[brandLabel].totalSystemValue += item.systemQty * item.costPrice;
            acc[brandLabel].totalCountedValue += (item.countedQty || 0) * item.costPrice;
            acc[brandLabel].totalVarianceCost += (item.varianceCost || 0);
            acc[brandLabel].totalReservedSeparated += item.reservedSeparated;
            acc[brandLabel].totalReservedInAisle += item.reservedInAisle;

            return acc;
        }, {} as Record<string, any>);

        return Object.values(groupedByBrand);
    }

    /**
     * Resumen ejecutivo de mermas/varianzas (Inyectando Reservas)
     */
    async getVarianceSummary(params: { countId: string; companyId: string }) {
        const { countId, companyId } = params;

        const count = await this.prisma.inventoryCount.findUnique({
            where: { id: countId },
            select: { currentVersion: true }
        });

        // Obtener Reservas por tipo
        const allReservedInvoices = await this.prisma.countReservedInvoice.findMany({
            where: { countId },
            include: { items: true }
        });

        const separatedMap = new Map<string, number>();
        const inAisleMap = new Map<string, number>();
        for (const inv of allReservedInvoices) {
            const targetMap = inv.type === 'SEPARATED' ? separatedMap : inAisleMap;
            for (const item of inv.items) {
                const code = item.itemCode.trim().toUpperCase();
                targetMap.set(code, (targetMap.get(code) || 0) + Number(item.reservedQty));
            }
        }

        const items = await this.prisma.inventoryCount_Item.findMany({
            where: {
                countId: countId,
                version: count?.currentVersion || 1,
                count: { companyId: companyId },
            }
        });

        let totalLossValue = new Decimal(0);
        let totalGainValue = new Decimal(0);
        let itemsWithVariance = 0;
        let totalMissing = 0;
        let totalSurplus = 0;
        let totalPhysicalValue = new Decimal(0);
        let totalSystemValue = new Decimal(0);
        let totalReservedValue = new Decimal(0);

        items.forEach(item => {
            const code = item.itemCode.trim().toUpperCase();
            const separatedQty = separatedMap.get(code) || 0;
            const inAisleQty = inAisleMap.get(code) || 0;

            const systemQty = item.systemQty || new Decimal(0);
            const countedQty = item.countedQty || new Decimal(0);
            const costPrice = item.costPrice || new Decimal(0);

            // Fórmula unificada: Stock Esperado = ERP - Separado + Pasillo
            const expected = systemQty.minus(separatedQty).plus(inAisleQty);
            const diff = countedQty.minus(expected);
            const cost = diff.times(costPrice);

            // Valores de inventario
            totalSystemValue = totalSystemValue.plus(expected.times(costPrice));
            totalPhysicalValue = totalPhysicalValue.plus(countedQty.times(costPrice));
            totalReservedValue = totalReservedValue.plus(new Decimal(separatedQty + inAisleQty).times(costPrice));

            if (!diff.isZero()) {
                itemsWithVariance++;
                if (diff.isNegative()) {
                    totalMissing++;
                    totalLossValue = totalLossValue.plus(cost.abs());
                } else {
                    totalSurplus++;
                    totalGainValue = totalGainValue.plus(cost);
                }
            }
        });

        return {
            totalItems: items.length,
            itemsWithVariance,
            totalMissing,
            totalSurplus,
            accuracyRate: items.length > 0 ? ((items.length - itemsWithVariance) / items.length) * 100 : 100,
            netVarianceCost: totalGainValue.minus(totalLossValue).toNumber(),
            totalLossValue: totalLossValue.toNumber(),
            totalGainValue: totalGainValue.toNumber(),
            totalPhysicalValue: totalPhysicalValue.toNumber(),
            totalSystemValue: totalSystemValue.toNumber(),
            totalReservedValue: totalReservedValue.toNumber(),
        };
    }

    /**
     * Obtiene datos agregados de múltiples conteos para auditoría histórica
     */
    async getHistoricalAuditData(params: {
        companyId: string;
        startDate?: string;
        endDate?: string;
        warehouseId?: string;
        status?: string[];
    }) {
        const { companyId, startDate, endDate, warehouseId, status } = params;

        const where: any = { companyId };
        if (startDate || endDate) {
            where.completedAt = {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
            };
        }
        if (warehouseId) where.warehouseId = warehouseId;
        if (status && status.length > 0) where.status = { in: status };

        const counts = await this.prisma.inventoryCount.findMany({
            where,
            include: {
                warehouse: { select: { name: true, code: true } },
                _count: { select: { countItems: true, variances: true } }
            },
            orderBy: { completedAt: 'desc' },
            take: 50
        });

        const summaries = await Promise.all(counts.map(async (count: any) => {
            const summary = await this.getVarianceSummary({ countId: count.id, companyId });
            return {
                id: count.id,
                code: count.sequenceNumber,
                date: count.completedAt || count.updatedAt,
                warehouse: count.warehouse.name,
                status: count.status,
                totalItems: summary.totalItems,
                variances: summary.itemsWithVariance,
                accuracy: summary.accuracyRate,
                netCost: summary.netVarianceCost,
                loss: summary.totalLossValue,
                gain: summary.totalGainValue
            };
        }));

        return summaries;
    }

    /**
     * Cross-Count Reconciliation (Comparador de Múltiples Conteos)
     * Analiza la evolución de las varianzas a lo largo de varios conteos.
     */
    async getCrossCountReconciliation(params: {
        companyId: string;
        countIds: string[];
    }) {
        const { companyId, countIds } = params;

        if (!countIds || countIds.length < 2) {
            throw new Error("Se requieren al menos 2 conteos para hacer una comparación cruzada.");
        }

        // Obtener detalles de los conteos y ordenarlos cronológicamente
        const counts = await this.prisma.inventoryCount.findMany({
            where: { id: { in: countIds }, companyId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, sequenceNumber: true, code: true, createdAt: true, completedAt: true, currentVersion: true, description: true }
        });

        if (counts.length === 0) return { counts: [], matrix: [] };

        // Obtener reservas consolidadas para todos los conteos
        const reservedInvoices = await this.prisma.countReservedInvoice.findMany({
            where: { countId: { in: countIds } },
            include: { items: true }
        });

        // reservationMap: countId -> itemCode -> { separated: qty, inAisle: qty }
        const reservationsByCount = new Map<string, Map<string, { separated: number, inAisle: number }>>();
        for (const count of counts) {
            reservationsByCount.set(count.id, new Map());
        }

        for (const inv of reservedInvoices) {
            const countMap = reservationsByCount.get(inv.countId);
            if (!countMap) continue;

            const isSeparated = inv.type === 'SEPARATED';
            for (const item of inv.items) {
                const code = item.itemCode.trim().toUpperCase();
                let current = countMap.get(code) || { separated: 0, inAisle: 0 };
                const qty = Number(item.reservedQty);
                if (isSeparated) current.separated += qty;
                else current.inAisle += qty;
                countMap.set(code, current);
            }
        }

        // Obtener items por cada conteo (en su currentVersion)
        const allItems = await Promise.all(counts.map(async (count) => {
            const countItems = await this.prisma.inventoryCount_Item.findMany({
                where: { countId: count.id, version: count.currentVersion },
            });
            return { countId: count.id, items: countItems };
        }));

        // Matriz por ItemCode
        const matrixMap = new Map<string, any>();

        for (const countGroup of allItems) {
            const countId = countGroup.countId;
            const countMap = reservationsByCount.get(countId);

            for (const item of countGroup.items) {
                const code = item.itemCode.trim().toUpperCase();
                
                if (!matrixMap.has(code)) {
                    matrixMap.set(code, {
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        brand: item.brand || 'N/A',
                        category: item.category || 'N/A',
                        results: {}
                    });
                }

                const matrixItem = matrixMap.get(code);
                
                const systemQty = new Decimal(item.systemQty || 0);
                const countedQty = new Decimal(item.countedQty || 0);
                const costPrice = new Decimal(item.costPrice || 0);

                const res = countMap?.get(code) || { separated: 0, inAisle: 0 };
                
                // Fórmula Maestra Unificada
                const expectedStock = systemQty.minus(res.separated).plus(res.inAisle);
                const difference = countedQty.minus(expectedStock);
                const varianceCost = difference.times(costPrice);

                matrixItem.results[countId] = {
                    systemQty: systemQty.toNumber(),
                    countedQty: item.countedQty !== null ? countedQty.toNumber() : null,
                    expectedStock: expectedStock.toNumber(),
                    variance: item.countedQty !== null ? difference.toNumber() : null,
                    varianceCost: item.countedQty !== null ? varianceCost.toNumber() : null,
                    costPrice: costPrice.toNumber(),
                    hasVariance: item.countedQty !== null ? !difference.isZero() : false
                };
            }
        }

        const matrix = Array.from(matrixMap.values());

        // Calcular la tendencia (comparando el primer y último conteo donde el item apareció)
        for (const row of matrix) {
            const activeCounts = counts.filter(c => row.results[c.id] && row.results[c.id].countedQty !== null);
            if (activeCounts.length >= 2) {
                const first = row.results[activeCounts[0].id];
                const last = row.results[activeCounts[activeCounts.length - 1].id];
                
                const firstVar = Math.abs(first.variance || 0);
                const lastVar = Math.abs(last.variance || 0);

                if (lastVar === 0 && firstVar > 0) row.trend = 'RESOLVED';
                else if (lastVar < firstVar) row.trend = 'IMPROVED';
                else if (lastVar > firstVar) row.trend = 'WORSENED';
                else row.trend = 'UNCHANGED';
            } else {
                row.trend = 'INSUFFICIENT_DATA';
            }
        }

        return {
            counts: counts.map(c => ({ id: c.id, code: c.sequenceNumber || c.code, date: c.completedAt || c.createdAt, description: c.description })),
            matrix: matrix.sort((a, b) => a.itemCode.localeCompare(b.itemCode))
        };
    }
}
