import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    companyId: z.string(),
  }),
});

export const MappingConfigSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  erpType: z.enum(['MSSQL', 'SAP', 'ORACLE']),
  datasetType: z.enum(['ITEMS', 'STOCK', 'COST', 'PRICE', 'DESTINATION']),
  sourceTables: z.array(z.string()),
  sourceQuery: z.string().optional(),
  fieldMappings: z.array(
    z.object({
      sourceField: z.string(),
      targetField: z.string(),
      dataType: z.string(),
      transformation: z.string().optional(),
    })
  ),
  filters: z.record(z.string(), z.any()).optional(),
  version: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TestMappingRequestSchema = z.object({
  erpConnectionId: z.string(),
  mappingId: z.string(),
  limitRows: z.number().min(1).max(1000).default(10),
});

export const PreviewDataSchema = z.object({
  mappingId: z.string(),
  rowCount: z.number(),
  data: z.array(z.record(z.any())),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type MappingConfig = z.infer<typeof MappingConfigSchema>;
export type TestMappingRequest = z.infer<typeof TestMappingRequestSchema>;
export type PreviewData = z.infer<typeof PreviewDataSchema>;
