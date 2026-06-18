import { InventoryRepository } from '../inventory.repository';
import { AppError } from '../../../utils/errors';
import { ERPConnectorFactory } from '../../erp-connections';
import { ERPIntrospectionService } from '../../erp-connections/erp-introspection';
import { LoadInventoryFromERPService } from './load-from-erp.service';

export class ReservedInvoicesService {
    constructor(
        private repository: InventoryRepository,
        private logger?: any
    ) { }

    /**
     * Reserva los ítems de una factura específica para un conteo físico.
     */
    async reserveInvoice(params: {
        countId: string;
        invoiceNumber: string;
        companyId: string;
        reservationType?: 'IN_AISLE' | 'SEPARATED';
    }) {
        const { countId, invoiceNumber, companyId, reservationType = 'IN_AISLE' } = params;

        if (this.logger) this.logger.info(`📑 [reserveInvoice] Starting for count: ${countId}, invoice: ${invoiceNumber}`);

        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, `Inventory count ${countId} not found`);
        }

        const mapping = await this.repository.findMappingConfigByDatasetType(companyId, 'PENDING_INVOICES');
        if (!mapping) {
            throw new AppError(400, 'ERP Mapping for PENDING_INVOICES not found. Please configure it in Admin.');
        }

        const erpConnection = await this.repository.findERPConnectionById(mapping.erpConnectionId, companyId);
        if (!erpConnection) {
            throw new AppError(404, 'ERP Connection associated with mapping not found');
        }

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
            const loadService = new LoadInventoryFromERPService(this.repository, this.logger);

            const fieldMappings = (mapping.fieldMappings as any) || [];
            const invoiceFieldMapping = Array.isArray(fieldMappings)
                ? fieldMappings.find((m: any) => m.target === 'invoiceNumber')
                : null;
            const erpInvoiceField = invoiceFieldMapping ? invoiceFieldMapping.source : 'invoiceNumber';

            const customMapping = JSON.parse(JSON.stringify(mapping));
            if (typeof customMapping.filters === 'string') {
                try { customMapping.filters = JSON.parse(customMapping.filters); } catch (e) { customMapping.filters = null; }
            }

            const invoiceFilter = { field: erpInvoiceField, operator: '=', value: invoiceNumber };

            if (!customMapping.filters) {
                customMapping.filters = [invoiceFilter];
            } else if (Array.isArray(customMapping.filters)) {
                const isPositional = customMapping.filters.some((el: any) => Array.isArray(el) && el.length > 0 && (el[0].table || el[0].field));
                if (isPositional) {
                    let filterIdx = customMapping.filters.findIndex((el: any) => Array.isArray(el) && el.length > 0 && el[0].field);
                    if (filterIdx === -1) {
                        while (customMapping.filters.length < 2) customMapping.filters.push([]);
                        filterIdx = 1;
                    }
                    if (!Array.isArray(customMapping.filters[filterIdx])) customMapping.filters[filterIdx] = [];
                    customMapping.filters[filterIdx].push(invoiceFilter);
                } else {
                    customMapping.filters.push(invoiceFilter);
                }
            } else if (typeof customMapping.filters === 'object') {
                if (!customMapping.filters.filters) customMapping.filters.filters = [];
                customMapping.filters.filters.push(invoiceFilter);
            }

            const { sql } = loadService.buildQueryFromMapping(customMapping);
            if (this.logger) this.logger.info(`📑 [reserveInvoice] SQL: ${sql}`);

            const introspection = new ERPIntrospectionService(connector);
            const erpData = await introspection.previewQuery(sql, 1000);

            if (erpData.length === 0) {
                throw new AppError(404, `No data found in ERP for invoice ${invoiceNumber}`);
            }

            const items = loadService.transformData(erpData, customMapping);

            const reservedInvoice = await this.repository.upsertReservedInvoice(countId, invoiceNumber, {
                clientName: items[0]?.clientName || erpData[0]?.clientName || erpData[0]?.CLIENTE || 'ERP Client',
                type: reservationType
            });

            await this.repository.deleteReservedItemsByInvoiceId(reservedInvoice.id);

            const reservedItems = await this.repository.createReservedItems(items.map((item: any) => ({
                invoiceId: reservedInvoice.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                itemProv: item.itemProv,
                reservedQty: item.systemQty,
                uom: item.uom
            })));

            return {
                invoice: reservedInvoice,
                itemsCount: reservedItems.count
            };

        } finally {
            await connector.disconnect();
        }
    }

    async getReservedInvoices(countId: string) {
        return await this.repository.findReservedInvoices(countId);
    }

    async removeInvoiceReservation(countId: string, invoiceId: string) {
        return await this.repository.deleteReservedInvoice(invoiceId, countId);
    }

    /**
     * Reserva ítems basados en un rango de fechas de Picking List.
     */
    async reservePickingList(params: {
        countId: string;
        companyId: string;
        startDate: string;
        endDate: string;
        sellerCode?: string;
        reservationType?: 'IN_AISLE' | 'SEPARATED';
        dryRun?: boolean;
    }) {
        const { countId, companyId, startDate, endDate, sellerCode, reservationType = 'SEPARATED', dryRun = false } = params;

        if (this.logger) this.logger.info(`📦 [reservePickingList] Starting for count: ${countId}, Range: ${startDate} to ${endDate}`);

        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, `Inventory count ${countId} not found`);
        }

        const mapping = await this.repository.findMappingConfigByDatasetType(companyId, 'PICKING_LIST');
        if (!mapping) {
            throw new AppError(400, 'ERP Mapping for PICKING_LIST not found. Please configure it in Admin.');
        }

        const erpConnection = await this.repository.findERPConnectionById(mapping.erpConnectionId, companyId);
        if (!erpConnection) {
            throw new AppError(404, 'ERP Connection associated with mapping not found');
        }

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
            const loadService = new LoadInventoryFromERPService(this.repository, this.logger);
            
            // Buscamos campos de fecha y vendedor en el mapeo (Mapeo de Catelli usa invoiceDate y sellerCode)
            const fieldMappings = (mapping.fieldMappings as any) || [];
            const dateField = fieldMappings.find((m: any) => 
                m.target === 'date' || 
                m.target === 'createdAt' || 
                m.target === 'invoiceDate' || 
                m.target === 'invoice_date'
            )?.source || 'date';

            const sellerField = fieldMappings.find((m: any) => 
                m.target === 'seller' || 
                m.target === 'sellerCode' || 
                m.target === 'seller_code'
            )?.source || 'seller';

            if (this.logger) {
                this.logger.info(`🔍 [reservePickingList] Mapping detected - DateField: ${dateField}, SellerField: ${sellerField}`);
            }

            // Ajuste de fecha para incluir todo el día final (problema de horas en SQL)
            const endPlusOne = new Date(endDate);
            endPlusOne.setDate(endPlusOne.getDate() + 1);
            const formattedEnd = endPlusOne.toISOString().split('T')[0];

            const filters = [
                { field: dateField, operator: '>=', value: startDate },
                { field: dateField, operator: '<', value: formattedEnd }
            ];
            if (sellerCode) {
                filters.push({ field: sellerField, operator: '=', value: sellerCode });
            }

            const customMapping = loadService.mergeFiltersIntoMapping(mapping, filters);

            const { sql } = loadService.buildQueryFromMapping(customMapping);
            const introspection = new ERPIntrospectionService(connector);
            const erpData = await introspection.previewQuery(sql, 5000);

            if (erpData.length === 0) {
                throw new AppError(404, `No data found in ERP for the selected picking list range`);
            }

            const items = loadService.transformData(erpData, customMapping);
            
            if (dryRun) {
                // Agrupamos por factura para que el frontend pueda mostrarlas en la tabla
                const uniqueInvoices = Array.from(new Set(items.map((i: any) => i.invoiceNumber)))
                    .map(invNum => {
                        const firstItem = items.find((i: any) => i.invoiceNumber === invNum);
                        return {
                            invoiceNumber: invNum,
                            clientName: firstItem?.clientName || '---',
                            alreadyReserved: false
                        };
                    });

                return {
                    preview: true,
                    invoices: uniqueInvoices.slice(0, 50), // Muestra las primeras 50 facturas
                    itemsCount: items.length,
                    sql
                };
            }

            // Consolidamos (sumamos) los items por código antes de guardar
            const consolidatedItems: any[] = [];
            const itemMap = new Map<string, any>();

            for (const item of items) {
                if (itemMap.has(item.itemCode)) {
                    const existing = itemMap.get(item.itemCode);
                    existing.systemQty += (item.systemQty || 0);
                } else {
                    itemMap.set(item.itemCode, { ...item });
                }
            }

            const itemsToSave = Array.from(itemMap.values());

            // Creamos una "factura virtual" para representar el picking list
            const description = `Picking List ${startDate} - ${endDate}${sellerCode ? ' (Vend: ' + sellerCode + ')' : ''}`;
            const reservedInvoice = await this.repository.upsertReservedInvoice(countId, `PICK-${Date.now()}`, {
                clientName: description,
                type: reservationType
            });

            await this.repository.createReservedItems(itemsToSave.map((item: any) => ({
                invoiceId: reservedInvoice.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                itemProv: item.itemProv,
                reservedQty: item.systemQty,
                uom: item.uom
            })));

            return {
                invoice: reservedInvoice,
                itemsCount: itemsToSave.length
            };
        } finally {
            await connector.disconnect();
        }
    }

    /**
     * Reserva ítems desde un listado de Excel.
     */
    async reserveFromExcel(countId: string, companyId: string, items: any[], type: 'IN_AISLE' | 'SEPARATED' = 'IN_AISLE') {
        const count = await this.repository.findCountById(countId);
        if (!count || count.companyId !== companyId) {
            throw new AppError(404, `Inventory count ${countId} not found`);
        }

        const reservedInvoice = await this.repository.upsertReservedInvoice(countId, `EXCEL-${Date.now()}`, {
            clientName: 'Reserva desde Excel',
            type
        });

        const reservedItems = await this.repository.createReservedItems(items.map((item: any) => ({
            invoiceId: reservedInvoice.id,
            itemCode: String(item.itemCode || item.code || ''),
            itemName: item.itemName || item.description || 'Excel Item',
            reservedQty: Number(item.quantity || item.qty || 0),
            uom: item.uom || 'PZ'
        })));

        return {
            invoice: reservedInvoice,
            itemsCount: reservedItems.count
        };
    }
}
