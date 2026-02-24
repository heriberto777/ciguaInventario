import { z } from 'zod';

export const GetMappingConfigRequestSchema = z.object({
  mappingId: z.string().cuid(),
});

export const ListMappingConfigsQuerySchema = z.object({
  datasetType: z.string().optional(),
  erpConnectionId: z.string().cuid().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const CreateMappingConfigRequestSchema = z.object({
  erpConnectionId: z.string().cuid(),
  datasetType: z.enum(['ITEMS', 'STOCK', 'COST', 'PRICE', 'DESTINATION']),
  sourceTables: z.array(z.string()).min(1),
  sourceQuery: z.string().optional(),
  fieldMappings: z.array(
    z.object({
      sourceField: z.string().min(1),
      targetField: z.string().min(1),
      dataType: z.enum(['STRING', 'INT', 'DECIMAL', 'DATE', 'BOOLEAN']),
      transformation: z.string().optional(),
    })
  ).min(1),
  filters: z.record(z.string(), z.any()).optional(),
});

export const TestMappingRequestSchema = z.object({
  mappingId: z.string().cuid(),
  limitRows: z.number().min(1).max(1000).default(10),
});

export const MappingConfigResponseSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  erpConnectionId: z.string(),
  datasetType: z.string(),
  sourceTables: z.array(z.string()),
  sourceQuery: z.string().nullable(),
  fieldMappings: z.array(
    z.object({
      sourceField: z.string(),
      targetField: z.string(),
      dataType: z.string(),
      transformation: z.string().optional(),
    })
  ),
  filters: z.record(z.any()).optional(),
  version: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PreviewDataResponseSchema = z.object({
  mappingId: z.string(),
  datasetType: z.string(),
  rowCount: z.number(),
  data: z.array(z.record(z.any())),
  executionTimeMs: z.number(),
});

export type GetMappingConfigRequest = z.infer<typeof GetMappingConfigRequestSchema>;
export type ListMappingConfigsQuery = z.infer<typeof ListMappingConfigsQuerySchema>;
export type CreateMappingConfigRequest = z.infer<typeof CreateMappingConfigRequestSchema>;
export type TestMappingRequest = z.infer<typeof TestMappingRequestSchema>;
export type MappingConfigResponse = z.infer<typeof MappingConfigResponseSchema>;
export type PreviewDataResponse = z.infer<typeof PreviewDataResponseSchema>;
