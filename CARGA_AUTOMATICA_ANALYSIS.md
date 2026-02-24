# Análisis: Carga Automática de Artículos desde Catelli

**Fecha:** 21 de febrero de 2026
**Objetivo:** Definir estrategia para cargar automáticamente artículos + stock + UDM desde Catelli al crear un conteo de inventario

---

## 1. FLUJO ACTUAL vs DESEADO

### Actual (Manual - MVP Temporal)
```
1. Usuario selecciona almacén
2. Sistema crea conteo (vacío)
3. Usuario agrega artículos manualmente
4. Usuario ingresa cantidades
5. Sistema calcula varianzas
```

### Deseado (Automático - Integrado con Catelli)
```
1. Usuario selecciona almacén + opcionalmente ubicación
2. Sistema consulta Catelli automáticamente:
   - Artículos activos del catálogo
   - Existencias actuales por bodega
   - UDM (unidad de medida) y empaque
   - Precios (costo y venta)
3. Sistema carga todo en tabla
4. Usuario solo ingresa cantidades contadas
5. Sistema calcula varianzas en tiempo real
```

---

## 2. DATOS NECESARIOS DE CATELLI

### Tablas Catelli (ERP Source)
```sql
-- Tabla: articulo (catálogo maestro)
SELECT
  a.id,
  a.codigo,                    -- Código del artículo (SKU)
  a.descripcion,               -- Nombre/descripción
  a.cantidad_empaque,          -- Cantidad por empaque (ej: 12)
  a.unidad_empaque,            -- Unidad de empaque (ej: "CAJAS", "PIEZAS", "KG")
  a.unidad_base,               -- Unidad base (ej: "PIEZAS")
  a.estado
FROM catelli.articulo a
WHERE a.estado = 'ACTIVO'
  AND a.codigo NOT NULL

-- Tabla: existencia_bodega (stock actual)
SELECT
  eb.articulo_id,
  eb.bodega_id,
  eb.cantidad,                 -- Cantidad en existencia
  eb.cantidad_reservada
FROM catelli.existencia_bodega eb
WHERE eb.bodega_id = @bodega_id  -- Parámetro dinámico

-- Tabla: articulo_precio (costos y precios)
SELECT
  ap.articulo_id,
  ap.costo,                    -- Precio de costo
  ap.precio_venta,             -- Precio de venta
  ap.moneda
FROM catelli.articulo_precio ap

-- Tabla: bodega (warehouses)
SELECT
  b.id,
  b.nombre,
  b.codigo,
  b.estado
FROM catelli.bodega b
WHERE b.estado = 'ACTIVO'
```

---

## 3. ESTRATEGIA DE IMPLEMENTACIÓN

### Opción A: Usar MappingConfig (Arquitectura Limpia - Recomendada)

**Ventajas:**
- Flexible: mapeo configurable sin cambiar código
- Reutilizable: mismo mapping para otros procesos
- Auditable: cambios guardados en BD
- Soporta transformaciones dinámicas

**Flujo:**
```
1. Empresa configura:
   - ERPConnection (conexión Catelli)
   - MappingConfig para ITEMS (articulo)
   - MappingConfig para STOCK (existencia_bodega)
   - MappingConfig para PRICES (articulo_precio)

2. En prepareCountItems():
   a. Cargar MappingConfig para ITEMS, STOCK, PRICES
   b. Construir query dinámico con fieldMappings
   c. Ejecutar contra Catelli
   d. Combinar resultados (ITEMS + STOCK + PRICES)
   e. Normalizar y retornar

3. Ventaja: Si mappings cambian, solo editar BD (sin redeploy)
```

**Implementación:**
```typescript
// Backend: InventoryCountService.ts
async prepareCountItems(companyId, countId, warehouseId, locationId?) {
  // 1. Obtener MappingConfigs
  const itemsMapping = await getMappingConfig(companyId, 'ITEMS');
  const stockMapping = await getMappingConfig(companyId, 'STOCK');
  const pricesMapping = await getMappingConfig(companyId, 'PRICES');

  // 2. Ejecutar queries usando mappings
  const items = await executeERPQuery(itemsMapping);
  const stock = await executeERPQuery(stockMapping, { bodegaId: warehouseId });
  const prices = await executeERPQuery(pricesMapping);

  // 3. Combinar datos
  const combined = items.map(item => ({
    itemCode: item.codigo,
    itemName: item.descripcion,
    packQty: item.cantidad_empaque,
    uom: item.unidad_empaque,
    baseUom: item.unidad_base,
    systemQty: stock[item.id]?.cantidad || 0,
    costPrice: prices[item.id]?.costo,
    salePrice: prices[item.id]?.precio_venta,
  }));

  // 4. Guardar en BD
  for (const item of combined) {
    await createCountItem(countId, item);
  }

  return {
    countId,
    itemsLoaded: combined.length,
    items: combined,
    summary: { totalItems: combined.length, ... }
  };
}
```

---

### Opción B: Query Hardcodeada (Rápida - Para MVP)

**Ventajas:**
- Rápido: implementar en 30 minutos
- Simple: sin intermediarios de mapping
- Funcional: carga todo correctamente

**Desventajas:**
- Acoplado: cambios = redeploy
- No flexible: un mapping por ERP type

**Implementación:**
```typescript
async prepareCountItems(companyId, countId, warehouseId) {
  const connection = await getERPConnection(companyId, 'MSSQL');

  const query = `
    SELECT
      a.codigo as itemCode,
      a.descripcion as itemName,
      a.cantidad_empaque as packQty,
      a.unidad_empaque as uom,
      a.unidad_base as baseUom,
      COALESCE(eb.cantidad, 0) as systemQty,
      ap.costo as costPrice,
      ap.precio_venta as salePrice
    FROM articulo a
    LEFT JOIN existencia_bodega eb
      ON a.id = eb.articulo_id AND eb.bodega_id = @bodegaId
    LEFT JOIN articulo_precio ap ON a.id = ap.articulo_id
    WHERE a.estado = 'ACTIVO'
  `;

  const items = await executeQuery(connection, query, { bodegaId: warehouseId });

  // Crear items en BD
  for (const item of items) {
    await createCountItem(countId, item);
  }

  return { countId, itemsLoaded: items.length, items, ... };
}
```

---

### Opción C: Fallback Manual (Temporal - Para Testing)

**Mantener lo actual:**
- Sistema devuelve array vacío
- Usuario agrega manualmente
- Usado mientras se configura Catelli

**Ventaja:** Permite probar flujo sin ERP conectada

---

## 4. DATOS REQUERIDOS EN BD

### ERPConnection (Ya existe)
```sql
INSERT INTO "ERPConnection"
  (id, companyId, erpType, host, port, database, username, password, isActive, createdAt, updatedAt)
VALUES
  ('conn_001', 'company_001', 'MSSQL', 'catelli.local', 1433, 'CiguaDB', 'sa', '***', true, NOW(), NOW());
```

### MappingConfig (Requiere configuración)
```sql
-- Para ITEMS
INSERT INTO "MappingConfig"
  (id, companyId, erpConnectionId, datasetType, sourceTables, sourceQuery, fieldMappings, isActive, version, createdAt, updatedAt)
VALUES
  (
    'mapping_items',
    'company_001',
    'conn_001',
    'ITEMS',
    '["articulo"]',
    NULL,  -- O especificar query personalizada
    '[
      {"sourceField": "codigo", "targetField": "itemCode", "dataType": "string"},
      {"sourceField": "descripcion", "targetField": "itemName", "dataType": "string"},
      {"sourceField": "cantidad_empaque", "targetField": "packQty", "dataType": "decimal"},
      {"sourceField": "unidad_empaque", "targetField": "uom", "dataType": "string"}
    ]',
    true,
    1,
    NOW(),
    NOW()
  );

-- Para STOCK
INSERT INTO "MappingConfig"
  (id, companyId, erpConnectionId, datasetType, sourceTables, fieldMappings, filters, isActive, version, createdAt, updatedAt)
VALUES
  (
    'mapping_stock',
    'company_001',
    'conn_001',
    'STOCK',
    '["existencia_bodega"]',
    '[
      {"sourceField": "articulo_id", "targetField": "itemId", "dataType": "string"},
      {"sourceField": "cantidad", "targetField": "systemQty", "dataType": "decimal"}
    ]',
    '{"bodega_id": "parameter"}',  -- Será parámetro en runtime
    true,
    1,
    NOW(),
    NOW()
  );

-- Para PRICES
INSERT INTO "MappingConfig"
  (id, companyId, erpConnectionId, datasetType, sourceTables, fieldMappings, isActive, version, createdAt, updatedAt)
VALUES
  (
    'mapping_prices',
    'company_001',
    'conn_001',
    'PRICES',
    '["articulo_precio"]',
    '[
      {"sourceField": "articulo_id", "targetField": "itemId", "dataType": "string"},
      {"sourceField": "costo", "targetField": "costPrice", "dataType": "decimal"},
      {"sourceField": "precio_venta", "targetField": "salePrice", "dataType": "decimal"}
    ]',
    NULL,
    true,
    1,
    NOW(),
    NOW()
  );
```

---

## 5. CONEXIÓN A CATELLI (Backend)

### Crear ERPConnector para MSSQL

**Archivo:** `apps/backend/src/modules/erp-connectors/mssql-connector.ts`

```typescript
import sql from 'mssql';

export class MSSQLConnector {
  private pool: sql.ConnectionPool;

  constructor(config: { host: string; port: number; database: string; username: string; password: string }) {
    this.pool = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      authentication: { type: 'default', options: { userName: config.username, password: config.password } },
      options: { trustServerCertificate: true },
    });
  }

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    await this.pool.close();
  }

  async executeQuery(query: string, params?: Record<string, any>): Promise<any[]> {
    const request = this.pool.request();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }

    const result = await request.query(query);
    return result.recordset;
  }

  async executeMapping(mapping: MappingConfig, params?: Record<string, any>): Promise<any[]> {
    let query = mapping.sourceQuery;

    if (!query) {
      // Construir query automáticamente desde sourceTables + fieldMappings
      const tables = JSON.parse(mapping.sourceTables);
      const fields = JSON.parse(mapping.fieldMappings);
      const filters = mapping.filters ? JSON.parse(mapping.filters) : {};

      // SELECT field1 as alias1, field2 as alias2 FROM tabla WHERE conditions
      const selectClause = fields.map(f => `${f.sourceField} as ${f.targetField}`).join(', ');
      query = `SELECT ${selectClause} FROM ${tables[0]}`;

      if (Object.keys(filters).length > 0) {
        const whereClause = Object.entries(filters)
          .map(([key, val]) => {
            if (val === 'parameter') return `${key} = @${key}`;
            return `${key} = '${val}'`;
          })
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
      }
    }

    return this.executeQuery(query, params);
  }
}
```

### Factory para obtener connector

**Archivo:** `apps/backend/src/modules/erp-connectors/erp-connector-factory.ts`

```typescript
import { MSSQLConnector } from './mssql-connector';

export class ERPConnectorFactory {
  static create(erpType: string, config: any) {
    switch (erpType) {
      case 'MSSQL':
        return new MSSQLConnector(config);
      case 'SAP':
        // return new SAPConnector(config);
        throw new Error('SAP connector not implemented yet');
      default:
        throw new Error(`Unknown ERP type: ${erpType}`);
    }
  }
}
```

---

## 6. SERVICIO: InventoryCountService

### Método: prepareCountItems (Integrada con Catelli)

```typescript
async prepareCountItems(
  companyId: string,
  countId: string,
  warehouseId: string,
  locationId?: string
): Promise<{
  countId: string;
  itemsLoaded: number;
  items: CountItem[];
  summary: CountSummary;
}> {
  try {
    // 1. Validar que el conteo existe
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    // 2. Obtener conexión ERP
    const erpConnection = await this.server.prisma.erpConnection.findFirst({
      where: { companyId, isActive: true },
    });

    if (!erpConnection) {
      throw new AppError(400, 'No active ERP connection configured for this company');
    }

    // 3. Crear connector
    const connector = ERPConnectorFactory.create(erpConnection.erpType, {
      host: erpConnection.host,
      port: erpConnection.port,
      database: erpConnection.database,
      username: erpConnection.username,
      password: erpConnection.password,
    });

    await connector.connect();

    try {
      // 4. Cargar mappings
      const itemsMapping = await this.server.prisma.mappingConfig.findFirst({
        where: { companyId, datasetType: 'ITEMS', isActive: true },
      });

      const stockMapping = await this.server.prisma.mappingConfig.findFirst({
        where: { companyId, datasetType: 'STOCK', isActive: true },
      });

      const pricesMapping = await this.server.prisma.mappingConfig.findFirst({
        where: { companyId, datasetType: 'PRICES', isActive: true },
      });

      if (!itemsMapping || !stockMapping) {
        throw new AppError(400, 'Missing required mapping configurations (ITEMS, STOCK)');
      }

      // 5. Ejecutar queries
      const items = await connector.executeMapping(itemsMapping);
      const stock = await connector.executeMapping(stockMapping, { bodega_id: warehouseId });
      const prices = pricesMapping ? await connector.executeMapping(pricesMapping) : [];

      // 6. Combinar datos
      const stockMap = new Map(stock.map(s => [s.itemId, s.systemQty]));
      const pricesMap = new Map(prices.map(p => [p.itemId, { costo: p.costPrice, venta: p.salePrice }]));

      const combined: CountItem[] = items.map(item => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        packQty: item.packQty || 1,
        uom: item.uom || 'PZ',
        baseUom: 'PZ',
        systemQty: stockMap.get(item.itemId) || 0,
        countedQty: 0,
        costPrice: pricesMap.get(item.itemId)?.costo,
        salePrice: pricesMap.get(item.itemId)?.venta,
      }));

      // 7. Guardar items en BD
      for (const item of combined) {
        await this.repository.createCountItem(countId, item);
      }

      // 8. Retornar resultado
      return {
        countId,
        itemsLoaded: combined.length,
        items: combined,
        summary: {
          totalItems: combined.length,
          totalSystemQty: combined.reduce((sum, i) => sum + i.systemQty, 0),
          totalValue: combined.reduce((sum, i) => sum + ((i.costPrice || 0) * i.systemQty), 0),
        },
      };
    } finally {
      await connector.disconnect();
    }
  } catch (error) {
    throw new AppError(500, `Failed to prepare count items: ${error.message}`);
  }
}
```

---

## 7. FRONTEND: Actualizar InventoryCountPage

### Mostrar estado de carga

```typescript
// Al hacer prepareCountMutation
{prepareCountMutation.isPending && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
    <p className="text-blue-800 text-lg font-semibold">⏳ Cargando artículos desde Catelli...</p>
    <p className="text-blue-600 text-sm mt-2">Esto puede tomar unos segundos...</p>
  </div>
)}

// Si error
{prepareCountMutation.isError && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
    <p className="text-red-800 text-lg font-semibold">❌ Error al cargar artículos</p>
    <p className="text-red-600 text-sm mt-2">{prepareCountMutation.error?.message}</p>
    <Button variant="secondary" onClick={() => prepareCountMutation.mutate(...)}>
      Reintentar
    </Button>
  </div>
)}

// Si vacío (fallback manual)
{countItems.length === 0 && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
    <p className="text-yellow-800 text-sm">
      ℹ️ No se cargaron artículos automáticamente. Agrégalos manualmente o verifica la conexión a Catelli.
    </p>
  </div>
)}
```

---

## 8. PLAN DE IMPLEMENTACIÓN

### Fase 1: Infraestructura ERP (2 horas)
- [ ] Crear `mssql-connector.ts` (clase para conectar Catelli)
- [ ] Crear `erp-connector-factory.ts` (factory pattern)
- [ ] Instalar dependencia: `npm install mssql`

### Fase 2: Servicio de Carga (1.5 horas)
- [ ] Actualizar `InventoryCountService.prepareCountItems()` (con connector)
- [ ] Manejar errores de conexión
- [ ] Testing de query builder

### Fase 3: Configuración Inicial (30 min)
- [ ] Script SQL para insertar `ERPConnection` y `MappingConfigs` de Catelli
- [ ] Validar que datos llegan correctamente

### Fase 4: Frontend (1 hora)
- [ ] Actualizar mensajes de estado en `InventoryCountPage`
- [ ] Mostrar indicador de carga
- [ ] Manejar errores

### Fase 5: Testing End-to-End (1 hora)
- [ ] Crear conteo → cargar items → verificar BD
- [ ] Probar con ubicación específica (locationId)
- [ ] Validar UDM conversiones

---

## 9. VALIDACIONES Y ERRORES

```typescript
// Validaciones en prepareCountItems
if (!erpConnection) {
  throw new AppError(400, 'No active ERP connection configured');
}

if (!itemsMapping) {
  throw new AppError(400, 'Items mapping not configured');
}

if (combined.length === 0) {
  throw new AppError(400, 'No items found in Catelli for this warehouse');
}

// Manejar conexión fallida
try {
  await connector.connect();
} catch (error) {
  throw new AppError(500, `Cannot connect to Catelli: ${error.message}`);
}
```

---

## 10. ALTERNATIVA: Direct Query (Sin Mappings)

Si quieres simplificar sin mappings, usa esta query directa:

```typescript
const query = `
  SELECT
    a.codigo AS itemCode,
    a.descripcion AS itemName,
    a.cantidad_empaque AS packQty,
    a.unidad_empaque AS uom,
    COALESCE(a.unidad_base, 'PZ') AS baseUom,
    COALESCE(eb.cantidad, 0) AS systemQty,
    ap.costo AS costPrice,
    ap.precio_venta AS salePrice
  FROM articulo a
  LEFT JOIN existencia_bodega eb
    ON a.id = eb.articulo_id AND eb.bodega_id = @bodegaId
  LEFT JOIN articulo_precio ap
    ON a.id = ap.articulo_id
  WHERE a.estado = 'ACTIVO'
    AND a.codigo IS NOT NULL
  ORDER BY a.codigo
`;
```

---

## Resumen: ¿Cuál opción elegimos?

| Aspecto | Opción A (Mappings) | Opción B (Query Hardcoded) | Opción C (Manual) |
|--------|-------------------|---------------------------|-------------------|
| Tiempo Implementación | 3-4 horas | 1.5 horas | 0 horas |
| Flexibilidad | Muy alta | Media | Baja |
| Mantenibilidad | Excelente | Buena | Aceptable |
| Requerimientos | Mapeos en BD | Connection info | Solo manual |
| Recomendación | ✅ A largo plazo | ✅ MVP Rápido | Temporal |

**RECOMENDACIÓN:** Implementar **Opción B (Query Hardcoded)** primero para MVP funcional (1.5 horas), luego migrar a **Opción A (Mappings)** cuando sea más estable.
