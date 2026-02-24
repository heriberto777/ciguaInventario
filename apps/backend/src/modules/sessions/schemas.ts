import { z } from 'zod';

export const CreateSessionSchema = z.object({
  userId: z.string(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const SessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  companyId: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  isActive: z.boolean(),
  lastActivityAt: z.date(),
  createdAt: z.date(),
});

export const ListSessionsQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  userId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const ListSessionsResponseSchema = z.object({
  data: z.array(SessionResponseSchema),
  pagination: z.object({
    skip: z.number(),
    take: z.number(),
    total: z.number(),
  }),
});

export const SessionsStatsSchema = z.object({
  activeSessions: z.number(),
  totalSessions: z.number(),
  activeUsers: z.number(),
  sessionsLastHour: z.number(),
});

export type CreateSession = z.infer<typeof CreateSessionSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;
export type SessionsStats = z.infer<typeof SessionsStatsSchema>;
