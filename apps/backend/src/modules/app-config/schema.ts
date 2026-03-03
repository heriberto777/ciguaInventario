import { z } from 'zod';

export const updateAppConfigSchema = z.object({
    appTitle: z.string().min(1).max(50).optional(),
    logoUrl: z.string().optional().nullable(),
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    faviconUrl: z.string().optional().nullable(),
    loginMessage: z.string().max(200).optional().nullable(),
    footerText: z.string().max(100).optional().nullable(),
});

export type UpdateAppConfigDto = z.infer<typeof updateAppConfigSchema>;
