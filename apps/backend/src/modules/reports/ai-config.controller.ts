import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

export class AIConfigController {
    constructor(private fastify: FastifyInstance) { }

    private get prisma() {
        return this.fastify.prisma;
    }

    async getConfig(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };

        try {
            const config = await this.prisma.aIConfig.findFirst({
                where: { companyId, isActive: true }
            });
            return { success: true, data: config };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async createOrUpdateConfig(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const body = request.body as any;

        try {
            const config = await this.prisma.aIConfig.upsert({
                where: {
                    companyId_provider: {
                        companyId,
                        provider: body.provider || 'OPENAI'
                    }
                },
                update: {
                    apiKey: body.apiKey,
                    modelName: body.modelName,
                    baseUrl: body.baseUrl,
                    systemPrompt: body.systemPrompt,
                    isActive: body.isActive ?? true,
                },
                create: {
                    companyId,
                    provider: body.provider || 'OPENAI',
                    apiKey: body.apiKey,
                    modelName: body.modelName,
                    baseUrl: body.baseUrl,
                    systemPrompt: body.systemPrompt,
                    isActive: true
                }
            });

            return { success: true, data: config };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }
}
