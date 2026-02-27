import { z } from 'zod';

export const createInventoryCountSchema = z.object({
  warehouseId: z.string().min(1),
  description: z.string().optional(),
  mappingId: z.string().optional(),
});

export const prepareCountItemsSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().optional(),
});

export const addCountItemSchema = z.object({
  locationId: z.string().min(1),
  itemCode: z.string().min(1),
  itemName: z.string().min(1),
  uom: z.string().default('PZ'),
  baseUom: z.string().default('PZ'),
  systemQty: z.coerce.number().nonnegative().default(0),
  countedQty: z.coerce.number().nonnegative().optional(),
  packQty: z.coerce.number().positive().default(1),
  costPrice: z.coerce.number().nonnegative().optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  barCodeInv: z.string().optional(),
  barCodeVt: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCountItemSchema = z.object({
  itemCode: z.string().optional(),
  itemName: z.string().optional(),
  uom: z.string().optional(),
  systemQty: z.coerce.number().nonnegative().optional(),
  countedQty: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const completeCountSchema = z.object({
  approvedBy: z.string().optional(),
});

export type CreateInventoryCountDTO = z.infer<typeof createInventoryCountSchema>;
export type PrepareCountItemsDTO = z.infer<typeof prepareCountItemsSchema>;
export type AddCountItemDTO = z.infer<typeof addCountItemSchema>;
export type UpdateCountItemDTO = z.infer<typeof updateCountItemSchema>;
export type CompleteCountDTO = z.infer<typeof completeCountSchema>;
