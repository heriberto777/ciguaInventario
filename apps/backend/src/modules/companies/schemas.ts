import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const CompanyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  isActive: z.boolean(),
  userCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CompanyDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  isActive: z.boolean(),
  userCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ListCompaniesQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const ListCompaniesResponseSchema = z.object({
  data: z.array(CompanyResponseSchema),
  pagination: z.object({
    skip: z.number(),
    take: z.number(),
    total: z.number(),
  }),
});

export type CreateCompany = z.infer<typeof CreateCompanySchema>;
export type UpdateCompany = z.infer<typeof UpdateCompanySchema>;
export type CompanyResponse = z.infer<typeof CompanyResponseSchema>;
export type ListCompaniesQuery = z.infer<typeof ListCompaniesQuerySchema>;
export type ListCompaniesResponse = z.infer<typeof ListCompaniesResponseSchema>;
