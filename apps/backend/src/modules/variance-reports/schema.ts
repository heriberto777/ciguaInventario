import { z } from 'zod';

export const approveVarianceSchema = z.object({
  resolution: z.string().min(1),
  approvedBy: z.string().optional(),
});

export const rejectVarianceSchema = z.object({
  reason: z.string().min(1),
});

export const varianceFilterSchema = z.object({
  countId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ADJUSTED']).optional(),
  minVariance: z.coerce.number().optional(),
  maxVariance: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
});

export type ApproveVarianceDTO = z.infer<typeof approveVarianceSchema>;
export type RejectVarianceDTO = z.infer<typeof rejectVarianceSchema>;
export type VarianceFilterDTO = z.infer<typeof varianceFilterSchema>;
