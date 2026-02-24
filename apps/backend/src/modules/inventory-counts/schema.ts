import { z } from 'zod';

export const createInventoryCountSchema = z.object({
  warehouseId: z.string().min(1),
  description: z.string().optional(),
  mappingId: z.string().optional(), // Mapping para cargar artículos automáticamente
});

export const prepareCountItemsSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().optional(), // Si es específico
});

export const addCountItemSchema = z.object({
  locationId: z.string().min(1),
  itemCode: z.string().min(1),
  countedQty: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

export const updateCountItemSchema = addCountItemSchema.partial();

export const completeCountSchema = z.object({
  approvedBy: z.string().optional(),
});

export type CreateInventoryCountDTO = z.infer<typeof createInventoryCountSchema>;
export type PrepareCountItemsDTO = z.infer<typeof prepareCountItemsSchema>;
export type AddCountItemDTO = z.infer<typeof addCountItemSchema>;
export type UpdateCountItemDTO = z.infer<typeof updateCountItemSchema>;
export type CompleteCountDTO = z.infer<typeof completeCountSchema>;
