import { z } from 'zod';

// Request/Response schemas for Users module
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().uuid('Invalid role ID'),
});

export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  roleId: z.string().uuid('Invalid role ID').optional(),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  companyId: z.string().uuid(),
  roleId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ListUsersQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const ListUsersResponseSchema = z.object({
  data: z.array(UserResponseSchema),
  total: z.number().int(),
  skip: z.number().int(),
  take: z.number().int(),
});

export const GetUserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

export const DeleteUserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

// Type exports for frontend
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
