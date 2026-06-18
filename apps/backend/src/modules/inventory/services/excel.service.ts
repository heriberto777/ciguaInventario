import * as XLSX from 'xlsx';
import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';
import { formatDateForERP } from '../../../utils/date';
import { ExcelCountItem, parseExcelBuffer, generateTemplateBuffer } from '../utils/excel.util';

export class ExcelService {
    constructor(
        private repository: InventoryRepository,
        private logger?: any
    ) { }

    /**
     * Exporta los resultados del conteo a Excel basándose en un mapping.
     */
    async exportToExcel(countId: string, companyId: string, mappingId?: string): Promise<Buffer> {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado');
        }

        // Auto-Finalización si no tiene versión finalizada
        if (!count.finalizedVersion) {
            await this.repository.updateCount(countId, {
                status: 'FINALIZED',
                finalizedVersion: count.currentVersion,
                approvedAt: new Date(),
            });
            count.finalizedVersion = count.currentVersion;
        }

        const versionToExport = count.finalizedVersion;
        const countItems = await this.repository.getLatestItemsByVersion(countId, versionToExport);

        let mapping: any = null;
        if (mappingId) {
            mapping = await this.repository.findMappingConfigById(mappingId);
        } else {
            mapping = await this.repository.findMappingConfigByDatasetType(companyId, 'DESTINATION');
        }

        const fieldMappings = (mapping?.fieldMappings as any[]) || [];
        
        // 3. Obtener reservaciones SEPARATED para ajustar la varianza
        const reservedInvoices = await this.repository.findReservedInvoices(countId);
        const reservedSeparatedMap = new Map<string, number>();
        for (const inv of reservedInvoices) {
            if (inv.type === 'SEPARATED') {
                for (const item of inv.items) {
                    const code = item.itemCode.trim().toUpperCase();
                    reservedSeparatedMap.set(code, (reservedSeparatedMap.get(code) || 0) + Number(item.reservedQty));
                }
            }
        }

        if (fieldMappings.length === 0) {
            return this.generateDefaultExcel(countItems, reservedSeparatedMap);
        }

        let currentConsecutiveNum = 1;
        const rows = countItems.map((item: any, index: number) => {
            const row: Record<string, any> = {};
            const itemCodeNorm = item.itemCode.trim().toUpperCase();
            const separatedQty = reservedSeparatedMap.get(itemCodeNorm) || 0;
            const expectedQty = Number(item.systemQty) - separatedQty;

            fieldMappings.forEach(fm => {
                const targetCol = fm.targetField || fm.target;
                const sourceType = fm.transformation || fm.sourceType || 'SYSTEM_FIELD';
                const sourceKey = fm.sourceField || fm.source;
                if (!targetCol) return;

                let value: any = null;
                if (sourceType === 'CONSTANT') {
                    value = sourceKey;
                } else if (sourceType === 'AUTO_GENERATE') {
                    if (sourceKey === 'NOW') value = formatDateForERP();
                    else if (sourceKey === 'USER') value = 'system';
                    else if (sourceKey === 'CONSECUTIVE') {
                        value = `B${String(currentConsecutiveNum + index).padStart(8, '0')}`;
                    }
                } else {
                    switch (sourceKey) {
                        case 'itemCode': value = item.itemCode; break;
                        case 'itemName': value = item.itemName; break;
                        case 'countedQty': value = Number(item.countedQty || 0); break;
                        case 'systemQty': value = Number(item.systemQty); break;
                        case 'expectedQty': value = expectedQty; break;
                        case 'reservedSeparated': value = separatedQty; break;
                        case 'variance': value = Number(item.countedQty || 0) - expectedQty; break;
                        case 'warehouseCode': value = count.warehouse?.code; break;
                        case 'uom': value = item.uom; break;
                        case 'category': value = item.category; break;
                        case 'subcategory': value = item.subcategory; break;
                        case 'brand': value = item.brand; break;
                        default: value = '';
                    }
                }
                row[targetCol] = value;
            });
            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Resultados Conteo');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    private generateDefaultExcel(countItems: any[], reservedMap: Map<string, number>): Buffer {
        const rows = countItems.map((item: any) => {
            const code = item.itemCode.trim().toUpperCase();
            const separated = reservedMap.get(code) || 0;
            const expected = Number(item.systemQty) - separated;
            const counted = Number(item.countedQty || 0);

            return {
                'Código': item.itemCode,
                'Descripción': item.itemName,
                'Ubicación': item.location?.code || item.locationId,
                'Sistema': Number(item.systemQty),
                'Reservado (Sep.)': separated,
                'Stock Esp.': expected,
                'Contado': counted,
                'Varianza': counted - expected,
                'Estado': item.status,
                'Notas': item.notes || ''
            };
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    /**
     * Carga masiva de artículos desde un Excel parseado.
     */
    async bulkLoadItemsFromExcel(
        countId: string,
        companyId: string,
        items: ExcelCountItem[],
    ): Promise<{ loaded: number; updated: number }> {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado');
        }

        const locations = await this.repository.findLocationsByWarehouseId(count.warehouseId);
        if (locations.length === 0) {
            throw new AppError(400, 'El almacén del conteo no tiene ubicaciones activas');
        }
        const locationId = locations[0].id;

        const existingItems = await this.repository.findItemsByCountId(countId);
        const existingCodes = new Set(existingItems.filter((i: any) => i.version === 1).map((i: any) => i.itemCode));

        let loaded = 0;
        let updated = 0;

        for (const item of items) {
            const brand = await this.repository.findClassificationDescription(companyId, item.brand || '', 'BRAND');
            const category = await this.repository.findClassificationDescription(companyId, item.category || '', 'CATEGORY');
            const subcategory = await this.repository.findClassificationDescription(companyId, item.subcategory || '', 'SUBCATEGORY');

            const itemData = {
                itemName: item.itemName,
                systemQty: item.systemQty,
                uom: item.uom || 'UND',
                packQty: item.packQty || 1,
                baseUom: item.uom || 'UND',
                category: category || item.category,
                subcategory: subcategory || item.subcategory,
                brand: brand || item.brand,
                costPrice: item.costPrice,
                salePrice: item.salePrice,
                barCodeInv: item.barCodeInv,
                barCodeVt: item.barCodeVt,
            };

            if (existingCodes.has(item.itemCode)) {
                // Actualizar versión 1
                const targetItem = existingItems.find((i: any) => i.itemCode === item.itemCode && i.version === 1);
                if (targetItem) {
                    await this.repository.updateItemCount(targetItem.id, itemData);
                    updated++;
                }
            } else {
                await this.repository.createInventoryCountItem({
                    countId,
                    locationId,
                    itemCode: item.itemCode,
                    version: 1,
                    status: 'PENDING',
                    countedQty: null,
                    notes: 'Cargado desde Excel',
                    ...itemData
                });
                loaded++;
            }
        }

        return { loaded, updated };
    }

    getTemplate() {
        return generateTemplateBuffer();
    }
}
