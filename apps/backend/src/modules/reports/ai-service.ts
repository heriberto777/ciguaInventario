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
TABLAS Y CAMPOS DISPONIBLES (Snapshot Detallado):
- InventoryCount: { id, code, sequenceNumber, status, currentVersion, warehouseId, startedAt, completedAt }
  Relaciones: warehouse, countItems (items del conteo), variances (reportes de varianza)
- InventoryCount_Item: { id, countId, itemCode, itemName, category, brand, subcategory, systemQty, countedQty, lot, version, status, hasVariance, costPrice, salePrice }
  Relaciones: count (conteo padre), location (ubicación física)
- VarianceReport: { id, countId, countItemId, itemCode, itemName, systemQty, countedQty, difference, variancePercent, status, reason, resolution }
  Relaciones: count, countItem
- ItemClassification: { code, description, groupType (BRAND|CATEGORY|SUBCATEGORY) }
- Warehouse: { id, code, name }
- Warehouse_Location: { id, warehouseId, code, description }

USO DE JOINS (include): Usa "include" para traer relaciones. 
Ejemplo: [QUERY: {"model": "InventoryCount", "operation": "findUnique", "args": {"where": {"id": "ID"}, "include": {"countItems": true, "warehouse": true}}}]

NOTA: Las consultas son vía Prisma. No inventes campos. Si no estás seguro, consulta primero el modelo con un 'take: 1'.
`;
    }

    /**
     * Ejecuta una consulta controlada a la base de datos
     */
    async executeSafeQuery(companyId: string, queryConfig: any) {
        const { model, operation, args = {} } = queryConfig;

        // Mapa de modelos PascalCase a camelCase de Prisma
        const modelMap: Record<string, string> = {
            'InventoryCount': 'inventoryCount',
            'InventoryCount_Item': 'inventoryCount_Item',
            'Warehouse': 'warehouse',
            'Warehouse_Location': 'warehouse_Location',
            'ItemClassification': 'itemClassification',
            'User': 'user',
            'VarianceReport': 'varianceReport',
            'InventoryAdjustment': 'inventoryAdjustment',
            'InventorySyncHistory': 'inventorySyncHistory'
        };

        const prismaModel = modelMap[model] || model;

        if (!this.prisma[prismaModel as keyof typeof this.prisma]) {
            throw new Error(`Modelo no reconocido o no permitido: ${model}`);
        }

        if (!args.where) args.where = {};

        // Limpiamos intentos manuales de la IA para evitar errores de "Unknown argument"
        delete args.where.companyId;

        // SEGURIDAD: Forzar aislamiento por empresa
        if (prismaModel === 'inventoryCount_Item') {
            args.where.count = { companyId };
        } else if (prismaModel === 'warehouse_Location') {
            args.where.warehouse = { companyId };
        } else {
            args.where.companyId = companyId;
        }

        // Limitar resultados a 100 para análisis profundo
        if (!args.take || args.take > 100) args.take = 100;
        try {
            // @ts-ignore - Acceso dinámico a prisma
            const result = await (this.prisma[prismaModel] as any)[operation](args);
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

INSTRUCCIÓN TÉCNICA FINAL (CRITICAL): Si el SNAPSHOT inicial no tiene los datos suficientes para una auditoría real (ej: no ves los ítems contados o quieres buscar un nombre), DEBES generar una consulta [QUERY]. 
- NO pidas permiso al usuario para consultar. 
- Genera el bloque [QUERY] inmediatamente como parte de tu flujo de pensamiento inicial.

GENERACIÓN DE GRÁFICOS: Si el usuario pide estadísticas visuales, DEBES añadir al final de tu respuesta un bloque:
\`\`\`json-chart
        { "type": "bar" | "line" | "pie", "title": "Título", "data": [{ "name": "Etiqueta", "value": 123 }] }
\`\`\`

Responde siempre en español."`;

        try {
            // --- PASO 1: Preparación del Contexto ---
            const initialSnapshot = await this.getHistoricalDataForAI(companyId);
            const snapshotMsg = `SNAPSHOT INICIAL (Usa estos IDs):\n${JSON.stringify(initialSnapshot, null, 2)}`;

            let currentHistory = this.formatMessagesForAI([
                ...previousMessages,
                { role: 'user', content: `${snapshotMsg}\n\nPREGUNTA DEL USUARIO: ${question}` }
            ]);

            let lastAIResponse = "";
            let iteration = 0;
            const MAX_ITERATIONS = 3;

            // --- PASO 2: Bucle de "Pensamiento y Consulta" ---
            while (iteration < MAX_ITERATIONS) {
                iteration++;
                const currentPrompt = currentHistory.pop()?.content || question;

                lastAIResponse = await this.callAIProvider(config, systemPrompt, currentHistory, currentPrompt);

                // Verificar si la IA pide más datos via [QUERY]
                const queryMatch = lastAIResponse.match(/\[QUERY:\s*(\{[\s\S]*?\})\]/);

                if (queryMatch) {
                    try {
                        const queryConfig = JSON.parse(queryMatch[1]);
                        const queryResult = await this.executeSafeQuery(companyId, queryConfig);

                        // Retroalimentamos a la IA con los resultados reales
                        currentHistory = this.formatMessagesForAI([
                            ...currentHistory,
                            { role: 'user', content: currentPrompt },
                            { role: 'assistant', content: lastAIResponse },
                            { role: 'user', content: `RESULTADO DE LA CONSULTA (Paso ${iteration}): ${JSON.stringify(queryResult)}. \n\nINSTRUCCIÓN: Si ya tienes datos suficientes, da tu respuesta final. Si necesitas cruzar más datos, genera otro [QUERY]. No pidas permiso.` }
                        ]);
                        // El ciclo continúa para permitir a la IA procesar los resultados
                    } catch (e: any) {
                        const errorMsg = e.message;
                        lastAIResponse += `\n\n[Error en ejecución de consulta: ${errorMsg}]`;
                        break; // Salimos del bucle si hay error técnico
                    }
                } else {
                    // Si no hay más [QUERY], la respuesta es la definitiva
                    break;
                }
            }

            if (userId) await this.saveChatMessage(companyId, userId, 'assistant', lastAIResponse);
            return { analysis: lastAIResponse, mode: 'live', provider: config.provider };
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

    /**
     * Realiza una auditoría profunda sobre un set específico de conteos
     */
    async performDeepAudit(companyId: string, auditIds: string[], userId: string) {
        // 1. Obtener detalles de los conteos y sus varianzas
        const counts = await this.prisma.inventoryCount.findMany({
            where: { id: { in: auditIds }, companyId },
            include: {
                warehouse: { select: { name: true } },
                countItems: {
                    where: { NOT: { countedQty: null }, hasVariance: true },
                    select: {
                        itemCode: true,
                        itemName: true,
                        brand: true,
                        category: true,
                        systemQty: true,
                        countedQty: true,
                        costPrice: true
                    },
                    take: 200 // Limitar para no saturar tokens
                }
            }
        });

        if (counts.length === 0) throw new Error("No se encontraron conteos para auditar.");

        // 2. Preparar el contexto de auditoría resumido para evitar límites de tokens (TPM)
        const auditContext = counts.map(c => {
            // Agrupar varianzas por marca para reducir volumen de datos
            const brandSummary: Record<string, { loss: number; items: number }> = {};
            const criticalItems = c.countItems
                .map(i => ({
                    code: i.itemCode,
                    name: i.itemName.substring(0, 30), // Truncar nombres largos
                    diff: (i.countedQty?.toNumber() || 0) - (i.systemQty?.toNumber() || 0),
                    valor: ((i.countedQty?.toNumber() || 0) - (i.systemQty?.toNumber() || 0)) * (i.costPrice?.toNumber() || 0),
                    brand: i.brand || 'N/A'
                }))
                .sort((a, b) => a.valor - b.valor); // De mayor merma a menor

            c.countItems.forEach(i => {
                const b = i.brand || 'N/A';
                if (!brandSummary[b]) brandSummary[b] = { loss: 0, items: 0 };
                const valor = ((i.countedQty?.toNumber() || 0) - (i.systemQty?.toNumber() || 0)) * (i.costPrice?.toNumber() || 0);
                if (valor < 0) {
                    brandSummary[b].loss += Math.abs(valor);
                    brandSummary[b].items += 1;
                }
            });

            return {
                conteo: c.sequenceNumber,
                almacen: c.warehouse.name,
                fecha: c.completedAt || c.updatedAt,
                resumen_por_marca: brandSummary,
                top_10_anomalias: criticalItems.slice(0, 10) // Solo enviamos las 10 peores mermas
            };
        });

        const prompt = `AUDITORÍA ESTRATÉGICA DE BLOQUE.\nAnaliza los siguientes ${counts.length} conteos. Los datos han sido resumidos para eficiencia.\nDetecta:\n1. Qué marcas están generando mayor pérdida acumulada.\n2. Si hay patrones recurrentes en las top anomalías.\n3. Recomendaciones de control de inventario.\n\nDATOS RESUMIDOS:\n${JSON.stringify(auditContext, null, 2)}`;
        // 3. Ejecutar análisis
        return this.analyzeWithAI(companyId, prompt, [], userId);
    }
}
