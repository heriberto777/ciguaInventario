import { FastifyInstance } from 'fastify';
import * as XLSX from 'xlsx';
import { AppError } from '../../utils/errors';

export class ExcelExporterService {
    constructor(private fastify: FastifyInstance) { }

    async exportToExcel(countId: string, companyId: string, mappingId?: string): Promise<Buffer> {
        // 1. Obtener el conteo e items
        const countInfo = await this.fastify.prisma.inventoryCount.findUnique({
            where: { id: countId },
            select: { currentVersion: true }
        });

        if (!countInfo) {
            throw new AppError(404, 'Conteo no encontrado');
        }

        const count = await this.fastify.prisma.inventoryCount.findUnique({
            where: { id: countId },
            include: {
                warehouse: true,
                countItems: {
                    where: { version: countInfo.currentVersion },
                },
            },
        });

        if (!count || count.companyId !== companyId) {
            throw new AppError(404, 'Conteo no encontrado');
        }

        // 2. Obtener el mapping
        let mapping: any = null;
        if (mappingId) {
            mapping = await this.fastify.prisma.mappingConfig.findUnique({
                where: { id: mappingId },
            });
        } else {
            // Buscar mapping por defecto de tipo DESTINATION
            mapping = await this.fastify.prisma.mappingConfig.findFirst({
                where: { companyId, datasetType: 'DESTINATION', isActive: true },
            });
        }

        const fieldMappings = (mapping?.fieldMappings as any[]) || [];

        // Si no hay mapping, usamos un formato estándar por defecto
        if (fieldMappings.length === 0) {
            return this.generateDefaultExcel(count);
        }

        // 3. Obtener el correlativo base (opcional, si se usa CONSECUTIVE)
        // Para Excel, si no hay conexión ERP real, empezamos en B00000001 o similar
        let currentConsecutiveNum = 1;

        // 4. Preparar los datos basados en el mapping
        const rows = count.countItems.map((item, index) => {
            const row: Record<string, any> = {};

            fieldMappings.forEach(fm => {
                const targetCol = fm.targetField || fm.target;
                const sourceType = fm.transformation || fm.sourceType || 'SYSTEM_FIELD';
                const sourceKey = fm.sourceField || fm.source;

                if (!targetCol) return;

                let value: any = null;

                if (sourceType === 'CONSTANT') {
                    value = sourceKey;
                } else if (sourceType === 'AUTO_GENERATE') {
                    if (sourceKey === 'NOW') value = new Date().toISOString();
                    else if (sourceKey === 'USER') value = 'system';
                    else if (sourceKey === 'CONSECUTIVE') {
                        value = `B${String(currentConsecutiveNum + index).padStart(8, '0')}`;
                    }
                } else {
                    // SYSTEM_FIELD
                    switch (sourceKey) {
                        case 'itemCode': value = item.itemCode; break;
                        case 'itemName': value = item.itemName; break;
                        case 'countedQty': value = Number(item.countedQty || 0); break;
                        case 'systemQty': value = Number(item.systemQty); break;
                        case 'variance': value = Number(item.countedQty || 0) - Number(item.systemQty); break;
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

        // 4. Generar el buffer Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Resultados Conteo');

        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    private generateDefaultExcel(count: any): Buffer {
        const rows = count.countItems.map((item: any) => ({
            'Código': item.itemCode,
            'Descripción': item.itemName,
            'Ubicación': item.locationId, // Podríamos incluir el código si hiciéramos join
            'Sistema': Number(item.systemQty),
            'Contado': Number(item.countedQty || 0),
            'Varianza': Number(item.countedQty || 0) - Number(item.systemQty),
            'Estado': item.status,
            'Notas': item.notes || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }
}
