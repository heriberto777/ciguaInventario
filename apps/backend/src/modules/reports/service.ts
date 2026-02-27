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
    }) {
        const { countId, companyId, onlyVariances, brand } = params;

        // Obtener la versión actual del conteo
        const count = await this.prisma.inventoryCount.findUnique({
            where: { id: countId },
            select: { currentVersion: true }
        });

        const items = await this.prisma.inventoryCount_Item.findMany({
            where: {
                countId,
                version: count?.currentVersion || 1, // ← FILTRO CRÍTICO
                count: { companyId },
                ...(brand ? { brand } : {}),
            },
            orderBy: [
                { brand: 'asc' },
                { itemCode: 'asc' }
            ]
        });

        const reportData = items.map(item => {
            const systemQty = item.systemQty || new Decimal(0);
            const countedQty = item.countedQty || new Decimal(0);
            const difference = countedQty.minus(systemQty);
            const costPrice = item.costPrice || new Decimal(0);
            const varianceCost = difference.times(costPrice);

            return {
                itemCode: item.itemCode,
                itemName: item.itemName,
                category: item.category,
                brand: item.brand || 'SIN MARCA',
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

        // Agrupar por Marca
        const groupedByBrand = filteredData.reduce((acc, item) => {
            const brandName = item.brand;
            if (!acc[brandName]) {
                acc[brandName] = {
                    brand: brandName,
                    items: [],
                    totalSystemValue: 0,
                    totalCountedValue: 0,
                    totalVarianceCost: 0,
                };
            }

            acc[brandName].items.push(item);

            // Totales del grupo
            const systemVal = item.systemQty * item.costPrice;
            const countedVal = (item.countedQty || 0) * item.costPrice;

            acc[brandName].totalSystemValue += systemVal;
            acc[brandName].totalCountedValue += countedVal;
            acc[brandName].totalVarianceCost += (item.varianceCost || 0);

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
}
