import { PrismaClient } from '@prisma/client';
import { UpdateAppConfigDto } from './schema';

export class AppConfigService {
    constructor(private prisma: PrismaClient) { }

    async getAppConfig(companyId: string) {
        if (!companyId) {
            throw new Error('Company ID is required to fetch configuration');
        }

        // Diagnóstico: si appConfig no existe, logueamos qué modelos SI existen
        if (!(this.prisma as any).appConfig) {
            console.error('[AppConfigService] prisma.appConfig is undefined! Available models:',
                Object.keys(this.prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'))
            );
            throw new Error('Prisma configuration error: appConfig model not found in client. Please run prisma generate.');
        }

        // Primero intentar buscar
        let config = await (this.prisma as any).appConfig.findUnique({
            where: { companyId }
        });

        if (!config) {
            // Verificar si la compañía existe antes de crear
            const companyExists = await this.prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!companyExists) {
                // Si la compañía no existe, devolvemos una configuración por defecto volátil
                // o lanzamos un error más descriptivo. 
                // Para evitar el 500, devolvemos un objeto por defecto sin persistir.
                return {
                    id: 'temp',
                    companyId: companyId,
                    appTitle: 'Cigua Inventario',
                    logoUrl: null,
                    primaryColor: '#3b82f6',
                    secondaryColor: '#1e293b',
                    updatedAt: new Date(),
                } as any;
            }

            // Crear uno por defecto si la compañía sí existe
            try {
                config = await (this.prisma as any).appConfig.create({
                    data: { companyId }
                });
            } catch (createError) {
                console.error('[AppConfigService] Error creating default config:', createError);
                // Fallback a findUnique por si otro proceso lo creó justo ahora (race condition)
                config = await (this.prisma as any).appConfig.findUnique({
                    where: { companyId }
                });

                if (!config) throw createError;
            }
        }

        return config;
    }

    async updateAppConfig(companyId: string, data: UpdateAppConfigDto) {
        try {
            // Diagnóstico: si appConfig no existe, logueamos qué modelos SI existen
            if (!(this.prisma as any).appConfig) {
                console.error('[AppConfigService] prisma.appConfig is undefined in updateAppConfig!');
                throw new Error('Prisma configuration error: appConfig model not found in client.');
            }

            // Verificar que la compañía existe
            const companyExists = await this.prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!companyExists) {
                throw new Error(`Company with ID ${companyId} not found`);
            }

            return await (this.prisma as any).appConfig.upsert({
                where: { companyId },
                update: data,
                create: { ...data, companyId }
            });
        } catch (error: any) {
            console.error('[AppConfigService] Error in updateAppConfig:', error);
            throw error;
        }
    }

    async getPublicConfig(companyName: string) {
        try {
            // Diagnóstico: si appConfig no existe, devolver fallback de inmediato para evitar el 500
            if (!(this.prisma as any).appConfig) {
                console.warn('[AppConfigService] prisma.appConfig is undefined in getPublicConfig! Returning fallback.');
                return {
                    appTitle: 'Cigua Inventario',
                    primaryColor: '#3b82f6',
                    secondaryColor: '#1e293b'
                };
            }

            if (companyName === 'default') {
                const config = await (this.prisma as any).appConfig.findFirst({
                    orderBy: { updatedAt: 'desc' }
                });

                if (config) return config;

                // Fallback si no hay nada en la BD
                return {
                    appTitle: 'Cigua Inventario',
                    primaryColor: '#3b82f6',
                    secondaryColor: '#1e293b'
                };
            }

            const company = await this.prisma.company.findUnique({
                where: { name: companyName },
                include: { appConfig: true }
            });

            return company?.appConfig || {
                appTitle: 'Cigua Inventario',
                primaryColor: '#3b82f6',
                secondaryColor: '#1e293b'
            };
        } catch (error) {
            console.error('[AppConfigService] Error in getPublicConfig:', error);
            // Retornar fallback en lugar de dejar que crashee
            return {
                appTitle: 'Cigua Inventario',
                primaryColor: '#3b82f6',
                secondaryColor: '#1e293b'
            };
        }
    }
}
