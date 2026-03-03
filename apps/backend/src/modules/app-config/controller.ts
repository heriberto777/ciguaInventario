import { FastifyReply, FastifyRequest } from 'fastify';
import { AppConfigService } from './service';
import { UpdateAppConfigDto } from './schema';

export class AppConfigController {
    constructor(private service: AppConfigService) { }

    async getAppConfig(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { companyId } = request.user as any;
            if (!companyId) {
                console.error('[AppConfigController] CompanyId not found in request.user');
                return reply.status(400).send({ error: { message: 'Company ID missing' } });
            }
            const config = await this.service.getAppConfig(companyId);
            return { data: config };
        } catch (error: any) {
            console.error('[AppConfigController] Error getting app config:', error);
            return reply.status(500).send({
                error: {
                    message: 'Internal Server Error fetching config',
                    details: error.message
                }
            });
        }
    }

    async updateAppConfig(request: FastifyRequest<{ Body: UpdateAppConfigDto }>, reply: FastifyReply) {
        try {
            const { companyId } = request.user as any;
            if (!companyId) {
                console.error('[AppConfigController] CompanyId not found in request.user for update');
                return reply.status(400).send({ error: { message: 'Company ID missing' } });
            }
            const config = await this.service.updateAppConfig(companyId, request.body);
            return { data: config, message: 'Configuración actualizada correctamente' };
        } catch (error: any) {
            console.error('[AppConfigController] Error updating app config:', error);
            return reply.status(500).send({
                error: {
                    message: 'Internal Server Error updating config',
                    details: error.message
                }
            });
        }
    }

    async getPublicConfig(request: FastifyRequest<{ Params: { companyName: string } }>, reply: FastifyReply) {
        try {
            const { companyName } = request.params;
            const config = await this.service.getPublicConfig(companyName);
            return { data: config || {} };
        } catch (error: any) {
            console.error('[AppConfigController] Error getting public config:', error);
            return reply.status(500).send({
                error: {
                    message: 'Internal Server Error fetching public config',
                    details: error.message
                }
            });
        }
    }
}
