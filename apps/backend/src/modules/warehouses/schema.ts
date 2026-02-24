import { z } from 'zod';

export const createWarehouseSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  address: z.string().optional(),
  city: z.string().optional(),
  manager: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const createLocationSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  capacity: z.number().optional(),
  isActive: z.boolean().default(true),
});

export const updateLocationSchema = createLocationSchema.partial();

export type CreateWarehouseDTO = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseDTO = z.infer<typeof updateWarehouseSchema>;
export type CreateLocationDTO = z.infer<typeof createLocationSchema>;
export type UpdateLocationDTO = z.infer<typeof updateLocationSchema>;
