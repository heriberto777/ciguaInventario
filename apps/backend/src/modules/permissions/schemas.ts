import { z } from 'zod';

export const CreatePermissionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().min(1).max(50),
});

export const UpdatePermissionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category: z.string().min(1).max(50).optional(),
});

export const PermissionResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ListPermissionsQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
});

export const ListPermissionsResponseSchema = z.object({
  data: z.array(PermissionResponseSchema),
  pagination: z.object({
    skip: z.number(),
    take: z.number(),
    total: z.number(),
  }),
});

export type CreatePermission = z.infer<typeof CreatePermissionSchema>;
export type UpdatePermission = z.infer<typeof UpdatePermissionSchema>;
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;
export type ListPermissionsQuery = z.infer<typeof ListPermissionsQuerySchema>;
export type ListPermissionsResponse = z.infer<typeof ListPermissionsResponseSchema>;
