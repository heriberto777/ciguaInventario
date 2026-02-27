import { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';

export class AIInsightsService {
    constructor(private fastify: FastifyInstance) { }

    private get prisma() {
        return this.fastify.prisma;
    }
    /**
     * Obtiene un resumen ejecutivo para situar a la IA (Dashboard Snapshot)
     */
    async getHistoricalDataForAI(companyId: string) {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const [lastCompleted, currentWork, lastMonthCounts, topClassifications] = await Promise.all([
            // Últimos 5 completados generales
            this.prisma.inventoryCount.findMany({
                where: { companyId, status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
                take: 5,
                select: { id: true, sequenceNumber: true, completedAt: true, status: true }
            }),
            // Trabajo actual
            this.prisma.inventoryCount.findMany({
                where: { companyId, status: { in: ['ACTIVE', 'SUBMITTED', 'ON_HOLD', 'PAUSED'] } },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, sequenceNumber: true, status: true, updatedAt: true }
            }),
            // Conteos del MES PASADO (para comparativos)
            this.prisma.inventoryCount.findMany({
                where: {
                    companyId,
                    status: 'COMPLETED',
                    completedAt: { gte: startOfLastMonth, lte: endOfLastMonth }
                },
                take: 5,
                select: { id: true, sequenceNumber: true, completedAt: true }
            }),
            // Ejemplo de clasificaciones para contexto inicial
            this.prisma.itemClassification.findMany({
                where: { companyId, groupType: { in: ['BRAND', 'CATEGORY'] } },
                take: 10,
                select: { code: true, description: true, groupType: true }
            })
        ]);

        return {
            today: now.toISOString(),
            current_counts_ids: currentWork.map(c => ({ id: c.id, code: c.sequenceNumber, status: c.status })),
            past_counts_ids: lastCompleted.map(c => ({ id: c.id, code: c.sequenceNumber, date: c.completedAt })),
            last_month_counts: lastMonthCounts.map(c => ({ id: c.id, code: c.sequenceNumber, date: c.completedAt })),
            classifications_sample: topClassifications,
            instruction: "Si el usuario pregunta por un nombre (ej: 'Fabuloso') pero no ves el código, busca en 'ItemClassification' filtrando por 'description' (contains)."
        };
    }

    /**
     * Obtiene el historial de chat para un usuario
     */
    async getChatHistory(companyId: string, userId: string) {
        return this.prisma.aIChatMessage.findMany({
            where: { companyId, userId },
            orderBy: { createdAt: 'asc' },
            take: 50
        });
    }

    /**
     * Guarda un mensaje en el historial
     */
    async saveChatMessage(companyId: string, userId: string, role: string, content: string) {
        return this.prisma.aIChatMessage.create({
            data: {
                companyId,
                userId,
                role,
                content
            }
        });
    }

    /**
     * Retorna el contexto del esquema de Prisma para que la IA sepa qué consultar
     */
    private getDatabaseSchemaContext() {
        return `
TABLAS (Relaciones):
- InventoryCount: { id, code, sequenceNumber, status, currentVersion, warehouseId, createdAt }
- InventoryCount_Item: { id, countId, itemCode, itemName, category, brand, systemQty, countedQty, hasVariance, costPrice, salePrice, version }
- VarianceReport: { id, countId, itemCode, itemName, systemQty, countedQty, difference, variancePercent, status, reason }
- ItemClassification: { code, description, groupType }
- Warehouse: { id, code, name }

NOTA: Si no tienes el dato en el SNAPSHOT, genera una consulta así:
[QUERY: {"model": "InventoryCount_Item", "operation": "findMany", "args": {"where": {"countId": "ID_DEL_CONTEO"}}}]

BÚSQUEDA POR NOMBRE: Si el usuario dice 'Fabuloso', busca primero el código de marca:
[QUERY: {"model": "ItemClassification", "operation": "findMany", "args": {"where": {"description": {"contains": "Fabuloso", "mode": "insensitive"}, "groupType": "BRAND"}}}]
`;
    }

    /**
     * Ejecuta una consulta controlada a la base de datos
     */
    async executeSafeQuery(companyId: string, queryConfig: any) {
        const { model, operation, args = {} } = queryConfig;

        // Validar modelos permitidos para evitar acceso a seguridad/config
        const allowedModels = [
            'InventoryCount', 'InventoryCount_Item', 'Warehouse',
            'Warehouse_Location', 'ItemClassification', 'User', 'VarianceReport'
        ];

        if (!allowedModels.includes(model)) {
            throw new Error(`Modelo no permitido para consultas de IA: ${model}`);
        }

        if (!args.where) args.where = {};

        // Limpiamos intentos manuales de la IA para evitar errores de "Unknown argument"
        delete args.where.companyId;

        // SEGURIDAD: Forzar aislamiento por empresa
        if (model === 'InventoryCount_Item') {
            args.where.count = { companyId };
        } else if (model === 'Warehouse_Location') {
            args.where.warehouse = { companyId };
        } else {
            args.where.companyId = companyId;
        }

        // Limitar resultados a 50
        if (!args.take || args.take > 50) args.take = 50;

        try {
            // @ts-ignore - Acceso dinámico a prisma
            const result = await (this.prisma[model] as any)[operation](args);
            return result;
        } catch (error: any) {
            return { error: `Error en consulta: ${error.message}` };
        }
    }

    /**
     * Normaliza el historial de mensajes para cumplir con la alternancia estricta de roles (user/model)
     * requerida por Gemini y Claude. Fusiona mensajes consecutivos del mismo rol.
     */
    private formatMessagesForAI(messages: any[]) {
        if (messages.length === 0) return [];
        const result: any[] = [];

        for (const msg of messages) {
            const lastMsg = result[result.length - 1];
            if (lastMsg && lastMsg.role === msg.role) {
                lastMsg.content += `\n\n${msg.content}`;
            } else {
                result.push({ role: msg.role, content: msg.content });
            }
        }
        return result;
    }

    /**
     * Genera el análisis utilizando el proveedor configurado (Con soporte a Consultas Dinámicas)
     */
    async analyzeWithAI(companyId: string, question: string, previousMessages: any[] = [], userId?: string) {
        if (userId) await this.saveChatMessage(companyId, userId, 'user', question);

        const config = await this.prisma.aIConfig.findFirst({ where: { companyId, isActive: true } });
        if (!config || !config.apiKey) {
            const historicalData = await this.getHistoricalDataForAI(companyId);
            const activeCode = historicalData.current_counts_ids[0]?.code || 'ninguno';
            return {
                analysis: `[MODO SIMULACIÓN]\n\nHe detectado que el conteo más reciente es ${activeCode}. Sin una API Key activa, mi capacidad de análisis profundo está limitada. Por favor, configura tu proveedor en Ajustes para habilitar consultas en tiempo real.`,
                mode: 'simulation'
            };
        }

        const systemPrompt = `
"Actúa como un Auditor de Inventarios Profesional Cigua AI.
${this.getDatabaseSchemaContext()}

DIRECTIVA PRINCIPAL (Tus Reglas de Negocio):
${config.systemPrompt || "Analiza los datos de inventario y responde las dudas del usuario con precisión técnica."}

GENERACIÓN DE GRÁFICOS: Si el usuario pide estadísticas visuales, DEBES añadir al final de tu respuesta un bloque:
\`\`\`json-chart
{ "type": "bar" | "line" | "pie", "title": "Título", "data": [{ "name": "Etiqueta", "value": 123 }] }
\`\`\`

INSTRUCCIÓN TÉCNICA FINAL: Si el SNAPSHOT inicial no tiene los datos para cumplir con tu DIRECTIVA (ej: no ves los ítems contados o quieres buscar un nombre en Clasificaciones), DEBES generar una consulta [QUERY]. Responde siempre en español."`;

        try {
            // --- PASO 1: Consulta Inicial con Snapshot ---
            const initialSnapshot = await this.getHistoricalDataForAI(companyId);
            const snapshotMsg = `SNAPSHOT INICIAL (Usa estos IDs):\n${JSON.stringify(initialSnapshot, null, 2)}`;

            // Construimos un historial normalizado que incluya el snapshot como primer mensaje
            const initialHistory = this.formatMessagesForAI([
                ...previousMessages,
                { role: 'user', content: `${snapshotMsg}\n\nPREGUNTA DEL USUARIO: ${question}` }
            ]);

            // Extraemos el último mensaje para usarlo como 'userPrompt' y el resto como 'history'
            const currentPrompt = initialHistory.pop()?.content || question;

            let aiResponse = await this.callAIProvider(config, systemPrompt, initialHistory, currentPrompt);

            // --- PASO 2: Verificar si la IA pide más datos ---
            if (aiResponse.includes('[QUERY:')) {
                const queryMatch = aiResponse.match(/\[QUERY:\s*(\{.*?\})\]/);
                if (queryMatch) {
                    try {
                        const queryConfig = JSON.parse(queryMatch[1]);
                        const queryResult = await this.executeSafeQuery(companyId, queryConfig);

                        // --- PASO 3: Respuesta Final con Datos Reales ---
                        // Volvemos a normalizar el historial para la segunda pasada
                        const finalHistory = this.formatMessagesForAI([
                            ...initialHistory,
                            { role: 'user', content: currentPrompt },
                            { role: 'assistant', content: aiResponse }
                        ]);

                        const followUpPrompt = `RESULTADO DE LA CONSULTA: ${JSON.stringify(queryResult)}.

INSTRUCCIÓN: Los datos anteriores son REALES obtenidos de la base de datos.
1. No repitas el bloque [QUERY]. Responde como si ya tuvieras los datos de antemano.
2. Responde al usuario de forma humana y detallada (ej: usa una tabla si hay muchos ítems).
3. Si el resultado es una lista de ítems, menciónalos detallando sus discrepancias si las tienen.`;

                        const finalResponse = await this.callAIProvider(config, systemPrompt, finalHistory, followUpPrompt);
                        aiResponse = finalResponse;
                    } catch (e: any) {
                        const errorMsg = e.response?.data?.error?.message || e.message;
                        aiResponse += `\n\n[Error en análisis de consulta: ${errorMsg}]`;
                    }
                }
            }

            if (userId) await this.saveChatMessage(companyId, userId, 'assistant', aiResponse);
            return { analysis: aiResponse, mode: 'live', provider: config.provider };
        } catch (error: any) {
            this.fastify.log.error(error);
            const errorMsg = error.response?.data?.error?.message || error.message;
            throw new Error(`Error en motor de IA: ${errorMsg}`);
        }
    }

    /**
     * Abstracción para llamar a los diferentes proveedores con reintento ante 429
     */
    private async callAIProvider(config: any, systemPrompt: string, history: any[], userPrompt: string, retries = 2): Promise<string> {
        const executeCall = async () => {
            if (config.provider === 'OPENAI') {
                const res = await axios.post(config.baseUrl || 'https://api.openai.com/v1/chat/completions', {
                    model: config.modelName || 'gpt-4',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...history.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userPrompt }
                    ]
                }, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
                return res.data.choices[0].message.content;
            }

            if (config.provider === 'GEMINI') {
                const model = config.modelName || 'gemini-1.5-flash';
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

                const contents = history.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

                contents.push({
                    role: 'user',
                    parts: [{ text: userPrompt }]
                });

                const res = await axios.post(url, {
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents,
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                    }
                });

                if (!res.data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error(`Respuesta vacía de Gemini: ${JSON.stringify(res.data)}`);
                }

                return res.data.candidates[0].content.parts[0].text;
            }

            if (config.provider === 'CLAUDE') {
                const res = await axios.post('https://api.anthropic.com/v1/messages', {
                    model: config.modelName || 'claude-3-5-sonnet-20240620',
                    max_tokens: 2048,
                    system: systemPrompt,
                    messages: [
                        ...history.map(m => ({
                            role: m.role === 'assistant' ? 'assistant' : 'user',
                            content: m.content
                        })),
                        { role: 'user', content: userPrompt }
                    ]
                }, {
                    headers: {
                        'x-api-key': config.apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    }
                });
                return res.data.content[0].text;
            }
            return `Proveedor ${config.provider} no soportado.`;
        };

        try {
            return await executeCall();
        } catch (error: any) {
            if (error.response?.status === 429 && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.callAIProvider(config, systemPrompt, history, userPrompt, retries - 1);
            }
            throw error;
        }
    }

    /**
     * Mantenemos el método antiguo por si se necesita snapshot rápido
     */
    async generateAnalysisPrompt(companyId: string, question: string) {
        const historicalData = await this.getHistoricalDataForAI(companyId);
        return `DATOS:\n${JSON.stringify(historicalData, null, 2)}\nPREGUNTA: "${question}"`;
    }
}
