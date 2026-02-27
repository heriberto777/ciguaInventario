import { z } from 'zod';

// Mapeo numérico → enum
export const GROUP_NUMBER_MAP: Record<number, 'CATEGORY' | 'SUBCATEGORY' | 'BRAND' | 'OTHER'> = {
    1: 'CATEGORY',
    2: 'SUBCATEGORY',
    3: 'BRAND',
};

export function groupNumberToType(n: number | string): 'CATEGORY' | 'SUBCATEGORY' | 'BRAND' | 'OTHER' {
    const num = typeof n === 'string' ? parseInt(n, 10) : n;
    return GROUP_NUMBER_MAP[num] ?? 'OTHER';
}

export const createClassificationSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase(),
    description: z.string().min(1).max(200).trim(),
    groupNumber: z.number().int().min(1),
});

export const updateClassificationSchema = createClassificationSchema.partial();

export const bulkClassificationSchema = z.object({
    items: z.array(createClassificationSchema).min(1).max(1000),
    /**
     * Si true (default): hace upsert — actualiza los existentes.
     * Si false: omite duplicados (solo inserta nuevos).
     */
    upsert: z.boolean().optional().default(true),
});

export type CreateClassificationDto = z.infer<typeof createClassificationSchema>;
export type UpdateClassificationDto = z.infer<typeof updateClassificationSchema>;
export type BulkClassificationDto = z.infer<typeof bulkClassificationSchema>;
