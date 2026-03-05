import { FastifyInstance } from 'fastify';
import { AppError } from '../../utils/errors';
import { ERPConnectorFactory } from '../erp-connections';
import { ERPIntrospectionService } from '../erp-connections/erp-introspection';
import { LoadInventoryFromERPService } from '../inventory/load-from-erp.service';
import { InventoryCountRepository } from './repository';

export class ReservedInvoicesService {
    private repository: InventoryCountRepository;

    constructor(private fastify: FastifyInstance) {
        this.repository = new InventoryCountRepository(fastify);
    }

    /**
     * Reserva los ítems de una factura específica para un conteo físico.
     * Utiliza el Mapping Builder (datasetType: 'PENDING_INVOICES').
     */
    async reserveInvoice(params: {
        countId: string;
        invoiceNumber: string;
        companyId: string;
    }) {
        const { countId, invoiceNumber, companyId } = params;

        this.fastify.log.info(`📑 [reserveInvoice] Starting for count: ${countId}, invoice: ${invoiceNumber}`);

        // 1. Validar que el conteo existe
        const count = await this.repository.getCountById(countId, companyId);
        if (!count) {
            throw new AppError(404, `Inventory count ${countId} not found`);
        }

        // 2. Obtener la configuración de mapeo para facturas pendientes
        const mapping = await this.fastify.prisma.mappingConfig.findFirst({
            where: {
                companyId,
                datasetType: 'PENDING_INVOICES',
                isActive: true
            }
        });

        if (!mapping) {
            throw new AppError(400, 'ERP Mapping for PENDING_INVOICES not found. Please configure it in Admin.');
        }

        // 3. Obtener conexión ERP
        const erpConnection = await this.fastify.prisma.eRPConnection.findFirst({
            where: { id: mapping.erpConnectionId, companyId, isActive: true },
        });

        if (!erpConnection) {
            throw new AppError(404, 'ERP Connection associated with mapping not found');
        }

        // 4. Preparar conector
        const connector = ERPConnectorFactory.create({
            erpType: erpConnection.erpType,
            host: erpConnection.host,
            port: erpConnection.port,
            database: erpConnection.database,
            username: erpConnection.username,
            password: erpConnection.password,
        });

        await connector.connect();

        try {
            const loadService = new LoadInventoryFromERPService(this.fastify);

            // 5. Inyectar filtro dinámico de número de factura en el mapping
            // Buscamos cuál es el nombre del campo en el ERP para el número de factura
            const fieldMappings = (mapping.fieldMappings as any) || [];
            const invoiceFieldMapping = Array.isArray(fieldMappings)
                ? fieldMappings.find((m: any) => m.target === 'invoiceNumber')
                : null;
            const erpInvoiceField = invoiceFieldMapping ? invoiceFieldMapping.source : 'invoiceNumber';

            // Clonar para no mutar el objeto original de la BD
            const customMapping = JSON.parse(JSON.stringify(mapping));

            // Si filters es string (JSON de la BD), parsearlo antes de inyectar
            if (typeof customMapping.filters === 'string') {
                try {
                    customMapping.filters = JSON.parse(customMapping.filters);
                } catch (e: any) {
                    this.fastify.log.error(`❌ [reserveInvoice] Error parsing filters JSON: ${e.message}`);
                    customMapping.filters = null;
                }
            }

            const invoiceFilter = {
                field: erpInvoiceField,
                operator: '=',
                value: invoiceNumber
            };

            // Asegurar que existe la estructura de filtros y añadir el filtro de factura
            // El mapping puede venir como array (viejo formato) o como objeto (SimpleMappingBuilder)
            if (!customMapping.filters) {
                customMapping.filters = [invoiceFilter]; // Array plano si no hay nada
            } else if (Array.isArray(customMapping.filters)) {
                // Determinar si es formato posicional [[joins], [filters], table, [columns]]
                // o si es un array plano de filtros [{field...}, {field...}]
                const isPositional = customMapping.filters.some((el: any) => Array.isArray(el) && el.length > 0 && (el[0].table || el[0].field));

                if (isPositional) {
                    // Buscar el sub-array de filtros (el que tiene objetos con 'field')
                    let filterIdx = customMapping.filters.findIndex((el: any) => Array.isArray(el) && el.length > 0 && el[0].field);
                    if (filterIdx === -1) {
                        // Si no hay filtros aún, lo metemos en la posición 1 (convención del builder)
                        // Pero primero aseguramos que haya al menos 2 elementos
                        while (customMapping.filters.length < 2) customMapping.filters.push([]);
                        if (!Array.isArray(customMapping.filters[1])) customMapping.filters[1] = [];
                        filterIdx = 1;
                    }
                    customMapping.filters[filterIdx].push(invoiceFilter);
                } else {
                    // Array plano de filtros
                    customMapping.filters.push(invoiceFilter);
                }
            } else if (typeof customMapping.filters === 'object') {
                // Formato objeto: { filters: [], joins: [], ... }
                if (!customMapping.filters.filters) {
                    customMapping.filters.filters = [];
                }
                if (Array.isArray(customMapping.filters.filters)) {
                    customMapping.filters.filters.push(invoiceFilter);
                }
            }

            // 6. Construir y ejecutar Query
            const { sql } = loadService.buildQueryFromMapping(customMapping);
            this.fastify.log.info(`📑 [reserveInvoice] SQL: ${sql}`);

            const introspection = new ERPIntrospectionService(connector);
            const erpData = await introspection.previewQuery(sql, 1000); // Límite razonable por factura

            if (erpData.length === 0) {
                throw new AppError(404, `No data found in ERP for invoice ${invoiceNumber}`);
            }

            // 7. Transformar datos
            const items = loadService.transformData(erpData, customMapping);

            // 8. Persistir en la base de datos local
            return await this.fastify.prisma.$transaction(async (tx: any) => {
                // Crear el registro de la factura
                const reservedInvoice = await tx.countReservedInvoice.upsert({
                    where: {
                        countId_invoiceNumber: {
                            countId,
                            invoiceNumber
                        }
                    },
                    create: {
                        countId,
                        invoiceNumber,
                        clientName: items[0]?.clientName || erpData[0]?.clientName || erpData[0]?.CLIENTE || 'ERP Client',
                    },
                    update: {
                        updatedAt: new Date()
                    }
                });

                // Limpiar ítems anteriores si re-procesamos la misma factura
                await tx.countReservedItem.deleteMany({
                    where: { invoiceId: reservedInvoice.id }
                });

                // Crear ítems reservados
                const reservedItems = await tx.countReservedItem.createMany({
                    data: items.map(item => ({
                        invoiceId: reservedInvoice.id,
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        itemProv: item.itemProv,
                        reservedQty: item.systemQty, // En este dataset, systemQty representa lo facturado
                        uom: item.uom
                    }))
                });

                return {
                    invoice: reservedInvoice,
                    itemsCount: reservedItems.count
                };
            });

        } finally {
            await connector.disconnect();
        }
    }

    /**
     * Lista todas las facturas reservadas para un conteo
     */
    async getReservedInvoices(countId: string) {
        return (this.fastify.prisma as any).countReservedInvoice.findMany({
            where: { countId },
            include: {
                items: true
            }
        });
    }

    /**
     * Elimina una reserva de factura
     */
    async removeInvoiceReservation(countId: string, invoiceId: string) {
        return (this.fastify.prisma as any).countReservedInvoice.delete({
            where: { id: invoiceId, countId }
        });
    }
}
