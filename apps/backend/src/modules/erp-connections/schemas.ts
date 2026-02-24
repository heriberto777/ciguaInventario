import { z } from 'zod';

export const CreateERPConnectionSchema = z.object({
  erpType: z.enum(['MSSQL', 'SAP', 'ORACLE']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export const UpdateERPConnectionSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export const TestConnectionSchema = z.object({
  erpType: z.enum(['MSSQL', 'SAP', 'ORACLE']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export const ERPConnectionResponseSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  erpType: z.string(),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ListERPConnectionsQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  erpType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const ListERPConnectionsResponseSchema = z.object({
  data: z.array(ERPConnectionResponseSchema),
  pagination: z.object({
    skip: z.number(),
    take: z.number(),
    total: z.number(),
  }),
});

export type CreateERPConnection = z.infer<typeof CreateERPConnectionSchema>;
export type UpdateERPConnection = z.infer<typeof UpdateERPConnectionSchema>;
export type TestConnection = z.infer<typeof TestConnectionSchema>;
export type ERPConnectionResponse = z.infer<typeof ERPConnectionResponseSchema>;
export type ListERPConnectionsQuery = z.infer<typeof ListERPConnectionsQuerySchema>;
export type ListERPConnectionsResponse = z.infer<typeof ListERPConnectionsResponseSchema>;
