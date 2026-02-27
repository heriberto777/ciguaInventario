import { FastifyInstance } from 'fastify';
import { ReportsController } from './controller';
import { AIConfigController } from './ai-config.controller';
import { tenantGuard } from '../../guards/tenant';

export async function reportsRoutes(fastify: FastifyInstance) {
    const reportsController = new ReportsController(fastify);
    const aiConfigController = new AIConfigController(fastify);

    fastify.addHook('preHandler', tenantGuard);

    // Report and AI Chat routes
    fastify.get('/:countId/physical-inventory', reportsController.getPhysicalInventoryReport.bind(reportsController));
    fastify.get('/:countId/variance-summary', reportsController.getVarianceSummary.bind(reportsController));
    fastify.post('/analyze-ai', { preHandler: [tenantGuard] }, (req, res) => reportsController.analyzeWithAI(req, res));
    fastify.post('/chat-ai', { preHandler: [tenantGuard] }, (req, res) => reportsController.chatAI(req, res));
    fastify.get('/chat-history', { preHandler: [tenantGuard] }, (req) => reportsController.getChatHistory(req));

    // Config routes
    fastify.get('/ai-config', aiConfigController.getConfig.bind(aiConfigController));
    fastify.post('/ai-config', aiConfigController.createOrUpdateConfig.bind(aiConfigController));
}
