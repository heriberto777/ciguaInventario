import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string> = {
    itemcode: 'itemCode', codigo: 'itemCode', code: 'itemCode', item_code: 'itemCode',
    codarticulo: 'itemCode', articulo: 'itemCode', sku: 'itemCode',
    itemname: 'itemName', nombre: 'itemName', name: 'itemName', item_name: 'itemName',
    descripcion: 'itemName', description: 'itemName',
    systemqty: 'systemQty', system_qty: 'systemQty', cantidad: 'systemQty',
    qty: 'systemQty', stock: 'systemQty', existencia: 'systemQty', existencias: 'systemQty',
    uom: 'uom', unidad: 'uom', unit: 'uom', um: 'uom', unidad_medida: 'uom',
    packqty: 'packQty', pack_qty: 'packQty', pack: 'packQty', caja: 'packQty',
    category: 'category', categoria: 'category',
    subcategory: 'subcategory', subcategoria: 'subcategory',
    brand: 'brand', marca: 'brand',
    costprice: 'costPrice', cost_price: 'costPrice', costo: 'costPrice', precio_costo: 'costPrice',
    saleprice: 'salePrice', sale_price: 'salePrice', precio: 'salePrice', precio_venta: 'salePrice',
    barcodeinv: 'barCodeInv', bar_code_inv: 'barCodeInv', codigobarra: 'barCodeInv',
    codbarra: 'barCodeInv', barra_inv: 'barCodeInv',
    barcodevt: 'barCodeVt', bar_code_vt: 'barCodeVt', codigoventa: 'barCodeVt', barra_vt: 'barCodeVt',
};

const REQUIRED_COLUMNS = ['itemCode', 'itemName'];

export interface ExcelCountItem {
    itemCode: string;
    itemName: string;
    systemQty: number;
    uom: string;
    packQty: number;
    category?: string;
    subcategory?: string;
    brand?: string;
    costPrice?: number;
    salePrice?: number;
    barCodeInv?: string;
    barCodeVt?: string;
}

export interface ExcelParseResult {
    items: ExcelCountItem[];
    rowErrors: Array<{ row: number; error: string }>;
}

export function generateTemplateBuffer(): Buffer {
    const wb = XLSX.utils.book_new();
    const headers = [
        'itemCode', 'itemName', 'systemQty', 'uom', 'packQty',
        'costPrice', 'salePrice', 'barCodeInv', 'barCodeVt',
        'category', 'subcategory', 'brand',
    ];
    const exampleRows = [
        ['ART-001', 'Arroz Premium 1KG', 50, 'KG', 1, 45.50, 60.00, '7461234567890', '', 'Alimentos', 'Granos', 'La Granja'],
    ];
    const wsData = [headers, ...exampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [14, 30, 12, 8, 10, 10, 10, 18, 18, 16, 16, 16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function parseExcelBuffer(buffer: Buffer): ExcelParseResult {
    let workbook: XLSX.WorkBook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
        throw { type: 'INVALID_FORMAT', message: 'El archivo no es un Excel válido' };
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw { type: 'INVALID_FORMAT', message: 'El Excel está vacío' };

    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    if (rawRows.length === 0) throw { type: 'NO_DATA_ROWS', message: 'El Excel no contiene datos' };

    const keyMap: Record<string, string> = {};
    for (const originalKey of Object.keys(rawRows[0])) {
        const normalized = originalKey.toLowerCase().replace(/[\s_-]+/g, '').trim();
        const canonical = COLUMN_ALIASES[normalized];
        if (canonical) keyMap[originalKey] = canonical;
    }

    const foundCanonicals = new Set(Object.values(keyMap));
    const missingColumns = REQUIRED_COLUMNS.filter(col => !foundCanonicals.has(col));
    if (missingColumns.length > 0) {
        throw { type: 'MISSING_COLUMNS', message: `Columnas faltantes: ${missingColumns.join(', ')}` };
    }

    const items: ExcelCountItem[] = [];
    const rowErrors: Array<{ row: number; error: string }> = [];

    rawRows.forEach((rawRow, index) => {
        const rowNum = index + 2;
        const row: Record<string, unknown> = {};
        for (const [origKey, value] of Object.entries(rawRow)) {
            const canonical = keyMap[origKey];
            if (canonical) row[canonical] = value;
        }

        const itemCode = String(row['itemCode'] ?? '').trim();
        const itemName = String(row['itemName'] ?? '').trim();
        if (!itemCode || !itemName) {
            rowErrors.push({ row: rowNum, error: 'Código o Nombre vacío' });
            return;
        }

        items.push({
            itemCode, itemName,
            systemQty: parseFloat(String(row['systemQty'] || '0').replace(',', '.')),
            uom: String(row['uom'] || 'UND').trim(),
            packQty: Math.max(1, parseInt(String(row['packQty'] || '1'), 10) || 1),
            category: row['category'] ? String(row['category']).trim() : undefined,
            subcategory: row['subcategory'] ? String(row['subcategory']).trim() : undefined,
            brand: row['brand'] ? String(row['brand']).trim() : undefined,
            costPrice: row['costPrice'] ? parseFloat(String(row['costPrice']).replace(',', '.')) : undefined,
            salePrice: row['salePrice'] ? parseFloat(String(row['salePrice']).replace(',', '.')) : undefined,
            barCodeInv: row['barCodeInv'] ? String(row['barCodeInv']).trim() : undefined,
            barCodeVt: row['barCodeVt'] ? String(row['barCodeVt']).trim() : undefined,
        });
    });

    return { items, rowErrors };
}
