import { z } from 'zod';

// Request schemas
export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).min(1, 'At least one permission required'),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const AssignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1, 'At least one permission required'),
});

// Response schemas
export const PermissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
});

export const RoleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  companyId: z.string().uuid(),
  isActive: z.boolean(),
  permissionCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RoleDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  companyId: z.string().uuid(),
  isActive: z.boolean(),
  permissions: z.array(PermissionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ListRolesQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const ListRolesResponseSchema = z.object({
  data: z.array(RoleResponseSchema),
  total: z.number().int(),
  skip: z.number().int(),
  take: z.number().int(),
});

// Type exports
export type CreateRoleRequest = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleRequest = z.infer<typeof UpdateRoleSchema>;
export type AssignPermissionsRequest = z.infer<typeof AssignPermissionsSchema>;
export type RoleResponse = z.infer<typeof RoleResponseSchema>;
export type RoleDetail = z.infer<typeof RoleDetailSchema>;
export type ListRolesQuery = z.infer<typeof ListRolesQuerySchema>;
export type ListRolesResponse = z.infer<typeof ListRolesResponseSchema>;
