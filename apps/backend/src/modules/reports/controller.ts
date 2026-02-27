import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { ReportsService } from './service';
import { AIInsightsService } from './ai-service';

export class ReportsController {
    private reportsService: ReportsService;
    private aiService: AIInsightsService;

    constructor(private fastify: FastifyInstance) {
        this.reportsService = new ReportsService(fastify);
        this.aiService = new AIInsightsService(fastify);
    }
    async getPhysicalInventoryReport(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { countId } = request.params as { countId: string };
        const { onlyVariances, brand } = request.query as { onlyVariances?: string, brand?: string };

        try {
            const data = await this.reportsService.getPhysicalInventoryReport({
                countId,
                companyId,
                onlyVariances: onlyVariances === 'true',
                brand
            });
            return { success: true, data };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async getVarianceSummary(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { countId } = request.params as { countId: string };

        try {
            const data = await this.reportsService.getVarianceSummary({ countId, companyId });
            return { success: true, data };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async analyzeWithAI(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { question } = request.body as { question: string };

        try {
            const result = await this.aiService.analyzeWithAI(companyId, question);
            return {
                success: true,
                data: {
                    answer: result.analysis,
                    mode: result.mode
                }
            };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async chatAI(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as any;
        if (!user || (!user.userId && !user.id)) {
            request.log.error({ user }, 'User not identified in chatAI');
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'User not identified' } });
        }

        const userId = user.userId || user.id;
        const companyId = user.companyId;
        const { message, context } = request.body as { message: string, context?: any };

        try {
            const result = await this.aiService.analyzeWithAI(
                companyId,
                message,
                context?.previousMessages || [],
                userId
            );
            return {
                success: true,
                analysis: result.analysis,
                mode: result.mode
            };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async getChatHistory(request: FastifyRequest) {
        const { companyId, userId } = request.user as any;
        try {
            const history = await this.aiService.getChatHistory(companyId, userId);
            return { success: true, data: history };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
