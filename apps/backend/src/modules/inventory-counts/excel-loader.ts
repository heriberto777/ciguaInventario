/**
 * excel-loader.ts
 * Parsea un Buffer de archivo Excel (.xlsx / .xls) y lo convierte en
 * un array de CountItem listo para insertarse en un conteo físico.
 *
 * Regla de la plantilla:
 *  - Columnas OBLIGATORIAS: itemCode, itemName
 *  - Columnas OPCIONALES:   systemQty, uom, packQty, category, subcategory, brand, costPrice, salePrice
 *  - Los nombres de columna son insensibles a mayúsculas/minúsculas y aceptan alias en español.
 */

import * as XLSX from 'xlsx';

// ─── Alias de columna (normalizado a minúsculas sin espacios) ────────────────
const COLUMN_ALIASES: Record<string, string> = {
    // itemCode
    itemcode: 'itemCode',
    codigo: 'itemCode',
    code: 'itemCode',
    item_code: 'itemCode',
    codarticulo: 'itemCode',
    articulo: 'itemCode',
    sku: 'itemCode',

    // itemName
    itemname: 'itemName',
    nombre: 'itemName',
    name: 'itemName',
    item_name: 'itemName',
    descripcion: 'itemName',
    description: 'itemName',

    // systemQty
    systemqty: 'systemQty',
    system_qty: 'systemQty',
    cantidad: 'systemQty',
    qty: 'systemQty',
    stock: 'systemQty',
    existencia: 'systemQty',
    existencias: 'systemQty',

    // uom
    uom: 'uom',
    unidad: 'uom',
    unit: 'uom',
    um: 'uom',
    unidad_medida: 'uom',

    // packQty
    packqty: 'packQty',
    pack_qty: 'packQty',
    pack: 'packQty',
    caja: 'packQty',

    // category
    category: 'category',
    categoria: 'category',

    // subcategory
    subcategory: 'subcategory',
    subcategoria: 'subcategory',

    // brand
    brand: 'brand',
    marca: 'brand',

    // costPrice
    costprice: 'costPrice',
    cost_price: 'costPrice',
    costo: 'costPrice',
    precio_costo: 'costPrice',

    // salePrice
    saleprice: 'salePrice',
    sale_price: 'salePrice',
    precio: 'salePrice',
    precio_venta: 'salePrice',

    // barCodeInv
    barcodeinv: 'barCodeInv',
    bar_code_inv: 'barCodeInv',
    codigobarra: 'barCodeInv',
    codbarra: 'barCodeInv',
    barra_inv: 'barCodeInv',

    // barCodeVt
    barcodevt: 'barCodeVt',
    bar_code_vt: 'barCodeVt',
    codigoventa: 'barCodeVt',
    barra_vt: 'barCodeVt',
};

const REQUIRED_COLUMNS = ['itemCode', 'itemName'];

// ─── Tipos de salida ─────────────────────────────────────────────────────────
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

export interface ExcelValidationError {
    type: 'NO_FILE' | 'INVALID_FORMAT' | 'MISSING_COLUMNS' | 'NO_DATA_ROWS';
    message: string;
    missingColumns?: string[];
}

// ─── Función principal ───────────────────────────────────────────────────────

/**
 * Genera el buffer de la plantilla Excel vacía para descargar en el cliente.
 */
export function generateTemplateBuffer(): Buffer {
    const wb = XLSX.utils.book_new();

    const headers = [
        'itemCode', 'itemName', 'systemQty', 'uom', 'packQty',
        'costPrice', 'salePrice', 'barCodeInv', 'barCodeVt',
        'category', 'subcategory', 'brand',
    ];

    const exampleRows = [
        ['ART-001', 'Arroz Premium 1KG', 50, 'KG', 1, 45.50, 60.00, '7461234567890', '', 'Alimentos', 'Granos', 'La Granja'],
        ['ART-002', 'Aceite de Oliva 1L', 24, 'LT', 12, 120.00, 185.00, '7469876543210', '7460000000001', 'Alimentos', 'Aceites', 'Del Monte'],
    ];

    const wsData = [headers, ...exampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ancho de columnas
    ws['!cols'] = [14, 30, 12, 8, 10, 10, 10, 18, 18, 16, 16, 16].map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Parsea el buffer del archivo Excel subido por el usuario.
 * @returns ExcelParseResult con items y errores por fila
 * @throws ExcelValidationError si el archivo no es válido a nivel estructural
 */
export function parseExcelBuffer(buffer: Buffer): ExcelParseResult {
    let workbook: XLSX.WorkBook;

    try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
        const err: ExcelValidationError = {
            type: 'INVALID_FORMAT',
            message: 'El archivo no es un Excel válido (.xlsx o .xls)',
        };
        throw err;
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        const err: ExcelValidationError = {
            type: 'INVALID_FORMAT',
            message: 'El archivo Excel está vacío (sin pestañas)',
        };
        throw err;
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false, // Todo como string para normalizar
    });

    if (rawRows.length === 0) {
        const err: ExcelValidationError = {
            type: 'NO_DATA_ROWS',
            message: 'El Excel no contiene filas de datos (solo encabezados o vacío)',
        };
        throw err;
    }

    // ── Normalizar claves de columna ──────────────────────────────────────────
    // Mapeamos cada clave del primer row a su canonical name
    const firstRow = rawRows[0];
    const keyMap: Record<string, string> = {}; // original key → canonical name

    for (const originalKey of Object.keys(firstRow)) {
        const normalized = originalKey.toLowerCase().replace(/[\s_-]+/g, '').trim();
        const canonical = COLUMN_ALIASES[normalized];
        if (canonical) {
            keyMap[originalKey] = canonical;
        }
    }

    // ── Verificar columnas requeridas ─────────────────────────────────────────
    const foundCanonicals = new Set(Object.values(keyMap));
    const missingColumns = REQUIRED_COLUMNS.filter(col => !foundCanonicals.has(col));

    if (missingColumns.length > 0) {
        const err: ExcelValidationError = {
            type: 'MISSING_COLUMNS',
            message: `Columnas requeridas faltantes: ${missingColumns.join(', ')}. ` +
                `Descarga la plantilla para ver el formato correcto.`,
            missingColumns,
        };
        throw err;
    }

    // ── Parsear filas ─────────────────────────────────────────────────────────
    const items: ExcelCountItem[] = [];
    const rowErrors: Array<{ row: number; error: string }> = [];

    rawRows.forEach((rawRow, index) => {
        const rowNum = index + 2; // +2 porque fila 1 son encabezados y index es 0-based

        // Normalizar la fila usando el keyMap
        const row: Record<string, unknown> = {};
        for (const [origKey, value] of Object.entries(rawRow)) {
            const canonical = keyMap[origKey];
            if (canonical) row[canonical] = value;
        }

        const itemCode = String(row['itemCode'] ?? '').trim();
        const itemName = String(row['itemName'] ?? '').trim();

        if (!itemCode) {
            rowErrors.push({ row: rowNum, error: 'itemCode (código) está vacío' });
            return;
        }
        if (!itemName) {
            rowErrors.push({ row: rowNum, error: 'itemName (nombre) está vacío' });
            return;
        }

        const systemQtyRaw = String(row['systemQty'] ?? '0').replace(',', '.');
        const systemQty = parseFloat(systemQtyRaw);

        const packQtyRaw = String(row['packQty'] ?? '1').replace(',', '.');
        const packQty = Math.max(1, parseInt(packQtyRaw, 10) || 1);

        const uom = String(row['uom'] ?? 'UND').trim() || 'UND';

        const costPriceRaw = row['costPrice'] != null && String(row['costPrice']).trim() !== ''
            ? parseFloat(String(row['costPrice']).replace(',', '.'))
            : undefined;
        const salePriceRaw = row['salePrice'] != null && String(row['salePrice']).trim() !== ''
            ? parseFloat(String(row['salePrice']).replace(',', '.'))
            : undefined;

        items.push({
            itemCode,
            itemName,
            systemQty: isNaN(systemQty) ? 0 : systemQty,
            uom,
            packQty,
            category: row['category'] ? String(row['category']).trim() || undefined : undefined,
            subcategory: row['subcategory'] ? String(row['subcategory']).trim() || undefined : undefined,
            brand: row['brand'] ? String(row['brand']).trim() || undefined : undefined,
            costPrice: costPriceRaw !== undefined && !isNaN(costPriceRaw) ? costPriceRaw : undefined,
            salePrice: salePriceRaw !== undefined && !isNaN(salePriceRaw) ? salePriceRaw : undefined,
            barCodeInv: row['barCodeInv'] ? String(row['barCodeInv']).trim() || undefined : undefined,
            barCodeVt: row['barCodeVt'] ? String(row['barCodeVt']).trim() || undefined : undefined,
        });
    });

    return { items, rowErrors };
}
