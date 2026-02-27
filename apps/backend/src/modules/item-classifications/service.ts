import { PrismaClient } from '@prisma/client';
import {
    CreateClassificationDto,
    UpdateClassificationDto,
    BulkClassificationDto,
    groupNumberToType,
} from './schema';

export class ItemClassificationsService {
    constructor(private readonly prisma: PrismaClient) { }

    async findAll(companyId: string, groupType?: string) {
        return this.prisma.itemClassification.findMany({
            where: {
                companyId,
                isActive: true,
                ...(groupType ? { groupType: groupType as any } : {}),
            },
            orderBy: [{ groupNumber: 'asc' }, { code: 'asc' }],
        });
    }

    async findById(companyId: string, id: string) {
        return this.prisma.itemClassification.findFirst({
            where: { id, companyId },
        });
    }

    async create(companyId: string, dto: CreateClassificationDto) {
        return this.prisma.itemClassification.create({
            data: {
                code: dto.code,
                description: dto.description,
                groupNumber: dto.groupNumber,
                groupType: groupNumberToType(dto.groupNumber),
                companyId,
            },
        });
    }

    async update(companyId: string, id: string, dto: UpdateClassificationDto) {
        const existing = await this.findById(companyId, id);
        if (!existing) return null;

        return this.prisma.itemClassification.update({
            where: { id },
            data: {
                ...(dto.code !== undefined ? { code: dto.code } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.groupNumber !== undefined ? {
                    groupNumber: dto.groupNumber,
                    groupType: groupNumberToType(dto.groupNumber),
                } : {}),
            },
        });
    }

    async remove(companyId: string, id: string) {
        const existing = await this.findById(companyId, id);
        if (!existing) return null;
        // Soft delete
        return this.prisma.itemClassification.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Carga masiva con soporte de upsert.
     * Procesa en lotes de 100 para no saturar la conexión de BD.
     */
    async bulkImport(companyId: string, dto: BulkClassificationDto) {
        const BATCH_SIZE = 100;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: Array<{ code: string; error: string }> = [];

        for (let i = 0; i < dto.items.length; i += BATCH_SIZE) {
            const batch = dto.items.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (item) => {
                    try {
                        const groupType = groupNumberToType(item.groupNumber);
                        const existing = await this.prisma.itemClassification.findUnique({
                            where: { companyId_code: { companyId, code: item.code } },
                        });

                        if (existing) {
                            if (dto.upsert) {
                                await this.prisma.itemClassification.update({
                                    where: { id: existing.id },
                                    data: {
                                        description: item.description,
                                        groupNumber: item.groupNumber,
                                        groupType,
                                        isActive: true,
                                    },
                                });
                                updated++;
                            } else {
                                skipped++;
                            }
                        } else {
                            await this.prisma.itemClassification.create({
                                data: {
                                    code: item.code,
                                    description: item.description,
                                    groupNumber: item.groupNumber,
                                    groupType,
                                    companyId,
                                },
                            });
                            created++;
                        }
                    } catch (err: any) {
                        errors.push({ code: item.code, error: err.message });
                    }
                })
            );
        }

        return { created, updated, skipped, errors, total: dto.items.length };
    }

    /**
     * Extrae clasificaciones únicas de la tabla InventoryCount_Item
     * y las sincroniza con ItemClassification.
     */
    async syncFromItems(companyId: string) {
        // 1. Obtener valores únicos de InventoryCount_Item
        const items = await this.prisma.inventoryCount_Item.findMany({
            where: {
                count: { companyId }
            },
            select: {
                category: true,
                brand: true,
                subcategory: true,
            }
        });

        const categories = new Set<string>();
        const brands = new Set<string>();
        const subcategories = new Set<string>();

        items.forEach(item => {
            if (item.category) categories.add(item.category.trim());
            if (item.brand) brands.add(item.brand.trim());
            if (item.subcategory) subcategories.add(item.subcategory.trim());
        });

        const toSync: Array<{ code: string; description: string; groupNumber: number }> = [];

        categories.forEach(c => toSync.push({ code: c.toUpperCase(), description: c, groupNumber: 1 }));
        subcategories.forEach(s => toSync.push({ code: s.toUpperCase(), description: s, groupNumber: 2 }));
        brands.forEach(b => toSync.push({ code: b.toUpperCase(), description: b, groupNumber: 3 }));

        if (toSync.length === 0) return { created: 0, updated: 0, skipped: 0, total: 0 };

        return this.bulkImport(companyId, { items: toSync, upsert: true });
    }
}
