import { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';

export class ReportsService {
    constructor(private fastify: FastifyInstance) { }

    private get prisma() {
        return this.fastify.prisma;
    }
    /**
     * Genera los datos para el Reporte de Inventario Físico
     * Agrupado por Marca
     */
    async getPhysicalInventoryReport(params: {
        countId: string;
        companyId: string;
        onlyVariances?: boolean;
        brand?: string;
        category?: string;
    }) {
        const { countId, companyId, onlyVariances, brand, category } = params;

        // Obtener la versión actual del conteo
        const count = await this.prisma.inventoryCount.findUnique({
            where: { id: countId },
            select: { currentVersion: true }
        });

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

        // Obtener descripciones de marcas y categorías para enriquecer el reporte
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
            const difference = countedQty.minus(systemQty);
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

        // Agrupar por Marca (usando el nombre enriquecido)
        const groupedByBrand = filteredData.reduce((acc, item) => {
            const brandLabel = item.brandName;
            if (!acc[brandLabel]) {
                acc[brandLabel] = {
                    brand: brandLabel,
                    items: [],
                    totalSystemValue: 0,
                    totalCountedValue: 0,
                    totalVarianceCost: 0,
                };
            }

            acc[brandLabel].items.push(item);

            // Totales del grupo
            const systemVal = item.systemQty * item.costPrice;
            const countedVal = (item.countedQty || 0) * item.costPrice;

            acc[brandLabel].totalSystemValue += systemVal;
            acc[brandLabel].totalCountedValue += countedVal;
            acc[brandLabel].totalVarianceCost += (item.varianceCost || 0);

            return acc;
        }, {} as Record<string, any>);

        return Object.values(groupedByBrand);
    }

    /**
     * Resumen ejecutivo de mermas/varianzas
     */
    async getVarianceSummary(params: { countId: string; companyId: string }) {
        const count = await this.prisma.inventoryCount.findUnique({
            where: { id: params.countId },
            select: { currentVersion: true }
        });

        const items = await this.prisma.inventoryCount_Item.findMany({
            where: {
                countId: params.countId,
                version: count?.currentVersion || 1, // ← FILTRO CRÍTICO
                count: { companyId: params.companyId },
                NOT: { countedQty: null }
            }
        });

        let totalLoss = new Decimal(0);
        let totalGain = new Decimal(0);
        let itemsWithVariance = 0;

        items.forEach(item => {
            const diff = (item.countedQty as Decimal).minus(item.systemQty);
            const cost = diff.times(item.costPrice || 0);

            if (!diff.isZero()) {
                itemsWithVariance++;
                if (cost.isNegative()) {
                    totalLoss = totalLoss.plus(cost.abs());
                } else {
                    totalGain = totalGain.plus(cost);
                }
            }
        });

        return {
            totalItems: items.length,
            itemsWithVariance,
            accuracyRate: items.length > 0 ? ((items.length - itemsWithVariance) / items.length) * 100 : 100,
            netVarianceCost: totalGain.minus(totalLoss).toNumber(),
            totalLossValue: totalLoss.toNumber(),
            totalGainValue: totalGain.toNumber(),
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
}
