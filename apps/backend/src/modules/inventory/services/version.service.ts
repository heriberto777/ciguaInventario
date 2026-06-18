import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';

export class VersionService {
    constructor(
        private repository: InventoryRepository,
        private logger?: any
    ) { }

    async getCountItems(countId: string, companyId: string) {
        const count = await this.repository.findCountWithItems(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        const items = count.countItems?.filter((i: any) => i.version === count.currentVersion) || [];
        
        // Calcular mapas de reservas por tipo
        const separatedMap = new Map<string, number>();
        const inAisleMap = new Map<string, number>();

        if (count.reservedInvoices) {
            for (const inv of count.reservedInvoices) {
                if (inv.items) {
                    const isSeparated = inv.type === 'SEPARATED';
                    for (const resItem of inv.items) {
                        const targetMap = isSeparated ? separatedMap : inAisleMap;
                        const current = targetMap.get(resItem.itemCode) || 0;
                        targetMap.set(resItem.itemCode, current + Number(resItem.reservedQty));
                    }
                }
            }
        }

        // Ajustar el systemQty de cada item
        const adjustedItems = items.map((item: any) => {
            const separated = separatedMap.get(item.itemCode) || 0;
            const inAisle = inAisleMap.get(item.itemCode) || 0;
            const originalSystemQty = Number(item.systemQty);
            
            // El stock que el auditor DEBE encontrar es: ERP - Lo que ya se llevaron (Separado)
            const adjustedSystemQty = Math.max(0, originalSystemQty - separated);
            
            return {
                ...item,
                originalSystemQty,
                reservedSeparated: separated,
                reservedInAisle: inAisle,
                systemQty: adjustedSystemQty // Este es el que usa la UI para calcular varianza
            };
        });

        return {
            countId,
            currentVersion: count.currentVersion,
            totalVersions: count.totalVersions,
            items: adjustedItems,
        };
    }

    async getVarianceItems(countId: string, companyId: string, previousVersion: number) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        const varianceItems = await this.repository.findVarianceItemsByVersion(countId, previousVersion);
        return {
            countId,
            version: previousVersion + 1,
            previousVersion,
            totalItems: varianceItems.length,
            items: varianceItems.map((item: any) => ({
                id: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                uom: item.uom,
                systemQty: item.systemQty,
                previousCountedQty: item.countedQty,
                varianceReport: item.variance_reports?.[0],
            })),
        };
    }

    async submitCount(
        countId: string,
        companyId: string,
        version: number,
        locationId: string,
        items: Array<{ itemCode: string; countedQty: number; uom: string }>
    ) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        if (version !== count.currentVersion + 1 && version !== count.currentVersion) {
            throw new AppError(400, `Invalid version. Expected ${count.currentVersion}, got ${version}`);
        }

        let itemsProcessed = 0;
        let variancesDetected = 0;

        for (const item of items) {
            // This logic usually happens in the mobile app, but we process the batch here
            const existingItems = await this.repository.findItemsByCountId(countId);
            const targetItem = existingItems.find((i: any) => i.itemCode === item.itemCode && i.locationId === locationId);

            if (!targetItem) continue;

            await this.repository.updateItemCount(targetItem.id, {
                countedQty: item.countedQty,
                status: 'PENDING',
                version: version
            });

            itemsProcessed++;

            const variance = Number(item.countedQty) - Number(targetItem.systemQty);
            if (Math.abs(variance) > 0.01) {
                variancesDetected++;
                await this.repository.upsertVarianceReport({
                    countId,
                    countItemId: targetItem.id,
                    version,
                    itemCode: item.itemCode,
                    itemName: targetItem.itemName,
                    systemQty: targetItem.systemQty,
                    countedQty: item.countedQty,
                    difference: variance,
                    variancePercent: Number(targetItem.systemQty) !== 0 ? (variance / Number(targetItem.systemQty)) * 100 : 0,
                    companyId,
                    status: 'PENDING'
                });
            }
        }

        if (version === count.currentVersion + 1) {
            await this.repository.updateCount(countId, { currentVersion: version, totalVersions: version });
        }

        return { success: true, version, itemsProcessed, variancesDetected };
    }

    async createNewVersion(countId: string, companyId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        if (count.status === 'CLOSED' || count.finalizedVersion) {
            throw new AppError(400, 'Cannot create new version for closed count');
        }

        const newVersion = count.currentVersion + 1;
        const currentItems = await this.repository.findItemsByCountId(countId);
        const versionItems = currentItems.filter((i: any) => i.version === count.currentVersion);

        const itemsToCreate = versionItems.map((item: any) => ({
            countId,
            locationId: item.locationId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            barCodeInv: item.barCodeInv,
            barCodeVt: item.barCodeVt,
            category: item.category,
            brand: item.brand,
            subcategory: item.subcategory,
            packQty: item.packQty,
            uom: item.uom,
            baseUom: item.baseUom,
            systemQty: item.systemQty,
            countedQty: item.countedQty,
            version: newVersion,
            status: item.hasVariance ? 'PENDING' : 'COMPLETED',
            hasVariance: item.hasVariance,
            costPrice: item.costPrice,
            salePrice: item.salePrice,
            notes: item.hasVariance ? `Reconteo V${newVersion}` : `Mantenido de V${count.currentVersion}`,
            countedBy: item.countedBy,
            countedAt: item.countedAt,
        }));

        await this.repository.createInventoryCountItems(itemsToCreate);
        await this.repository.updateCount(countId, {
            currentVersion: newVersion,
            totalVersions: newVersion,
            status: 'ACTIVE',
            completedAt: null,
            completedBy: null,
        });

        return { success: true, newVersion };
    }

    async getVersionHistory(countId: string, companyId: string) {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) throw new AppError(404, 'Count not found');

        const versions = [];
        for (let v = 1; v <= count.totalVersions; v++) {
            const reports = await this.repository.findVarianceReportsByCountId(countId);
            const vReports = reports.filter((r: any) => r.version === v);
            versions.push({
                version: v,
                itemsWithVariance: vReports.length,
                status: v === count.currentVersion ? 'IN_PROGRESS' : 'COMPLETED',
            });
        }
        return { countId, currentVersion: count.currentVersion, versions };
    }
}
