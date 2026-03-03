import { FastifyInstance } from 'fastify';
import { AppConfigService } from './service';
import { AppConfigController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function appConfigRoutes(fastify: FastifyInstance) {
    const service = new AppConfigService(fastify.prisma);
    const controller = new AppConfigController(service);

    const auth = { preHandler: [tenantGuard] };

    // Obtener configuración privada (requiere auth)
    fastify.get('/settings/app-config', auth, (req, rep) => controller.getAppConfig(req, rep));

    // Actualizar configuración
    fastify.patch('/settings/app-config', auth, (req: any, rep) => controller.updateAppConfig(req, rep));

    // Obtener configuración pública (para login/móvil)
    fastify.get('/public/app-config/:companyName', (req: any, rep) => controller.getPublicConfig(req, rep));
}
