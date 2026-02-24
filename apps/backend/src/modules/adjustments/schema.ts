import { z } from 'zod';

export const adjustmentItemSchema = z.object({
  itemCode: z.string().min(1),
  quantity: z.coerce.number(),
  reason: z.string().optional(),
});

export const createAdjustmentSchema = z.object({
  warehouseId: z.string().min(1),
  type: z.enum(['VARIANCE_CORRECTION', 'PHYSICAL_LOSS', 'GAIN', 'TRANSFER']),
  description: z.string().optional(),
  items: z.array(adjustmentItemSchema),
});

export const approveAdjustmentSchema = z.object({
  approvedBy: z.string().optional(),
});

export type AdjustmentItemDTO = z.infer<typeof adjustmentItemSchema>;
export type CreateAdjustmentDTO = z.infer<typeof createAdjustmentSchema>;
export type ApproveAdjustmentDTO = z.infer<typeof approveAdjustmentSchema>;
