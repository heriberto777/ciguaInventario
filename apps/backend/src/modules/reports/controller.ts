import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { ReportsService } from './service';
import { AIInsightsService } from './ai-service';
import { EmailService } from './email-service';

export class ReportsController {
    private reportsService: ReportsService;
    private aiService: AIInsightsService;
    private emailService: EmailService;

    constructor(private fastify: FastifyInstance) {
        this.reportsService = new ReportsService(fastify);
        this.aiService = new AIInsightsService(fastify);
        this.emailService = new EmailService(fastify.prisma);
    }
    async getPhysicalInventoryReport(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { countId } = request.params as { countId: string };
        const { onlyVariances, brand, category } = request.query as { onlyVariances?: string, brand?: string, category?: string };

        try {
            const data = await this.reportsService.getPhysicalInventoryReport({
                countId,
                companyId,
                onlyVariances: onlyVariances === 'true',
                brand,
                category
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

    async compareCounts(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { countIds } = request.body as { countIds: string[] };

        try {
            const data = await this.reportsService.getCrossCountReconciliation({ companyId, countIds });
            return { success: true, data };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }

    async analyzeWithAI(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { question, topic } = request.body as { question: string, topic?: string };

        try {
            const result = await this.aiService.analyzeWithAI(companyId, question, [], undefined, topic || 'CROSS_COUNT');
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
        const { message, context, topic } = request.body as { message: string, context?: any, topic?: string };

        try {
            const result = await this.aiService.analyzeWithAI(
                companyId,
                message,
                context?.previousMessages || [],
                userId,
                topic || 'GENERAL_CHAT'
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

    async getHistoricalAuditData(request: FastifyRequest) {
        const { companyId } = request.user as any;
        const { startDate, endDate, warehouseId, status } = request.query as any;

        try {
            const data = await this.reportsService.getHistoricalAuditData({
                companyId,
                startDate,
                endDate,
                warehouseId,
                status: status ? (Array.isArray(status) ? status : [status]) : undefined
            });
            return { success: true, data };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async aiAudit(request: FastifyRequest, reply: FastifyReply) {
        const user = request.user as any;
        const userId = user.userId || user.id;
        const companyId = user.companyId;
        const { auditIds, topic } = request.body as { auditIds: string[], topic?: string };

        try {
            const result = await this.aiService.performDeepAudit(companyId, auditIds, userId, topic || 'VARIANCE_AUDIT');
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

    async sendEmail(request: FastifyRequest, reply: FastifyReply) {
        const { companyId } = request.user as { companyId: string };
        const { to, subject, analysis, pdfBase64 } = request.body as { to: string, subject: string, analysis: string, pdfBase64?: string };

        try {
            await this.emailService.sendAuditReport(companyId, to, subject, analysis, pdfBase64);
            return { success: true, message: 'Correo enviado correctamente' };
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    }
}
