import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

export class AIConfigController {
    constructor(private fastify: FastifyInstance) { }

    private get prisma() {
        return this.fastify.prisma;
    }

    async getConfigs(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };

        try {
            const configs = await this.prisma.aIConfig.findMany({
                where: { companyId },
                orderBy: { updatedAt: 'desc' }
            });
            return { success: true, data: configs };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async saveConfig(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const body = request.body as any;

        try {
            if (body.isActive) {
                // Remove active from others
                await this.prisma.aIConfig.updateMany({
                    where: { companyId },
                    data: { isActive: false }
                });
            }

            if (body.id) {
                const config = await this.prisma.aIConfig.update({
                    where: { id: body.id, companyId },
                    data: {
                        name: body.name,
                        provider: body.provider,
                        apiKey: body.apiKey,
                        modelName: body.modelName,
                        baseUrl: body.baseUrl,
                        systemPrompt: body.systemPrompt,
                        isActive: body.isActive || false
                    }
                });
                return { success: true, data: config };
            } else {
                const config = await this.prisma.aIConfig.create({
                    data: {
                        companyId,
                        name: body.name || 'Nueva Configuración',
                        provider: body.provider || 'OPENAI',
                        apiKey: body.apiKey,
                        modelName: body.modelName,
                        baseUrl: body.baseUrl,
                        systemPrompt: body.systemPrompt,
                        isActive: body.isActive || false
                    }
                });
                return { success: true, data: config };
            }
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async deleteConfig(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { id } = request.params as { id: string };

        try {
            await this.prisma.aIConfig.delete({
                where: { id, companyId }
            });
            return { success: true, message: 'Configuración eliminada' };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    // --- PROMPT TEMPLATES MANAGEMENT ---

    async getPrompts(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        try {
            const prompts = await this.prisma.aIPromptTemplate.findMany({
                where: { companyId },
                orderBy: { updatedAt: 'desc' }
            });
            return { success: true, data: prompts };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async savePrompt(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const body = request.body as any;

        try {
            if (body.isDefault) {
                // Remove default from others with same topic
                await this.prisma.aIPromptTemplate.updateMany({
                    where: { companyId, topic: body.topic },
                    data: { isDefault: false }
                });
            }

            if (body.id) {
                const prompt = await this.prisma.aIPromptTemplate.update({
                    where: { id: body.id, companyId },
                    data: {
                        name: body.name,
                        topic: body.topic,
                        content: body.content,
                        isDefault: body.isDefault
                    }
                });
                return { success: true, data: prompt };
            } else {
                const prompt = await this.prisma.aIPromptTemplate.create({
                    data: {
                        companyId,
                        name: body.name,
                        topic: body.topic,
                        content: body.content,
                        isDefault: body.isDefault || false
                    }
                });
                return { success: true, data: prompt };
            }
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async deletePrompt(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { id } = request.params as { id: string };

        try {
            await this.prisma.aIPromptTemplate.delete({
                where: { id, companyId }
            });
            return { success: true, message: 'Prompt eliminado' };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }
}
