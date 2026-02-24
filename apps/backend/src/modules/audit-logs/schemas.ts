import { z } from 'zod';

export const ListAuditLogsQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  userId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AuditLogResponseSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  oldValue: z.any().nullable(),
  newValue: z.any().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
});

export const ListAuditLogsResponseSchema = z.object({
  data: z.array(AuditLogResponseSchema),
  pagination: z.object({
    skip: z.number(),
    take: z.number(),
    total: z.number(),
  }),
});

export const AuditLogsStatsSchema = z.object({
  totalLogs: z.number(),
  actions: z.record(z.number()),
  resourceTypes: z.record(z.number()),
  topUsers: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    count: z.number(),
  })),
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;
export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;
export type ListAuditLogsResponse = z.infer<typeof ListAuditLogsResponseSchema>;
export type AuditLogsStats = z.infer<typeof AuditLogsStatsSchema>;
