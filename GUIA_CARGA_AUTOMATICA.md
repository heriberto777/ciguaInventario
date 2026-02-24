# Guía de Carga Automática de Artículos - Implementación Completada

**Fecha:** 21 de febrero de 2026

---

## 📋 Estado Actual

La arquitectura flexible de carga automática está **lista para usar**. El sistema ahora intenta cargar artículos en este orden:

```
1️⃣  Opción A: MappingConfig (Flexible)
        ↓ si falla o no configurado
2️⃣  Opción B: Query Directa (MVP Rápido)
        ↓ si falla o sin conexión
3️⃣  Opción C: Manual (Fallback)
```

---

## 🚀 Uso Inmediato (Sin Configuración)

### Flujo para usuarios:

1. **Crear Conteo**
   ```
   POST /api/inventory-counts
   {
     "companyId": "xxx",
     "warehouseId": "yyy"
   }
   Response: { countId: "cmlvxpesl000b5n0wl5ntso4j", status: "DRAFT", ... }
   ```

2. **Cargar Artículos Automáticamente**
   ```
   POST /api/inventory-counts/{countId}/prepare
   {
     "warehouseId": "yyy",
     "locationId": "zzz" (opcional)
   }
   Response: {
     "countId": "...",
     "itemsLoaded": 450,
     "items": [
       {
         "itemCode": "ART001",
         "itemName": "Producto A",
         "systemQty": 100,
         "costPrice": 50.00,
         "uom": "Piezas",
         "countedQty": 0,
         ...
       }
     ],
     "summary": {
       "totalItems": 450,
       "totalSystemQty": 12500,
       "totalValue": 625000
     },
     "source": "DIRECT_QUERY"  // o "MAPPING_CONFIG" o "MANUAL"
   }
   ```

3. **Ingresar Cantidades Contadas**
   ```
   PUT /api/inventory-counts/{countId}/items/{itemId}
   {
     "countedQty": 102
   }
   // Sistema calcula automáticamente variance = 102 - 100 = +2
   ```

4. **Completar Conteo**
   ```
   POST /api/inventory-counts/{countId}/complete
   // Sistema genera VarianceReport automáticamente
   ```

---

## 🔧 Configuración de Catelli (Opción B - Predeterminada)

### Paso 1: Crear Conexión ERP

```sql
-- Insertar conexión a Catelli en BD local
INSERT INTO "ERPConnection"
  (id, companyId, erpType, host, port, database, username, password, isActive, createdAt, updatedAt)
VALUES
  (
    'conn_catelli_001',
    'cmlvcfub20000hjxt2t8246n4',  -- Tu companyId
    'MSSQL',
    'catelli.local',  -- Host de Catelli
    1433,
    'CiguaDB',  -- BD de Catelli
    'sa',  -- Usuario SQL Server
    'password123',  -- Password encriptado en producción
    true,
    NOW(),
    NOW()
  );
```

### Paso 2: Verificar Conexión

```
GET /api/erp-connections/test
Response: {
  "isConnected": true,
  "server": "catelli.local",
  "database": "CiguaDB"
}
```

---

## 🎯 Configuración Avanzada (Opción A - Mappings)

Si quieres usar **MappingConfig** (flexible, sin cambios de código):

### Paso 1: Crear Mapeos en BD

```sql
-- Mapping para ITEMS (Artículos)
INSERT INTO "MappingConfig" VALUES (
  'mapping_items_001',
  'cmlvcfub20000hjxt2t8246n4',  -- companyId
  'conn_catelli_001',  -- erpConnectionId
  'ITEMS',
  '["articulo"]',  -- sourceTables
  NULL,  -- sourceQuery (NULL = auto-generate)
  '[
    {"sourceField": "codigo", "targetField": "itemCode", "dataType": "string"},
    {"sourceField": "descripcion", "targetField": "itemName", "dataType": "string"},
    {"sourceField": "cantidad_empaque", "targetField": "packQty", "dataType": "decimal"},
    {"sourceField": "unidad_empaque", "targetField": "uom", "dataType": "string"}
  ]',
  NULL,  -- filters
  1,  -- version
  true,  -- isActive
  NOW(),
  NOW()
);

-- Mapping para STOCK (Existencias)
INSERT INTO "MappingConfig" VALUES (
  'mapping_stock_001',
  'cmlvcfub20000hjxt2t8246n4',
  'conn_catelli_001',
  'STOCK',
  '["existencia_bodega"]',
  NULL,
  '[
    {"sourceField": "articulo_id", "targetField": "itemId", "dataType": "string"},
    {"sourceField": "cantidad", "targetField": "systemQty", "dataType": "decimal"}
  ]',
  '{"bodega_id": "parameter"}',  -- Parámetro dinámico
  1,
  true,
  NOW(),
  NOW()
);

-- Mapping para PRICES (Precios)
INSERT INTO "MappingConfig" VALUES (
  'mapping_prices_001',
  'cmlvcfub20000hjxt2t8246n4',
  'conn_catelli_001',
  'PRICES',
  '["articulo_precio"]',
  NULL,
  '[
    {"sourceField": "articulo_id", "targetField": "itemId", "dataType": "string"},
    {"sourceField": "costo", "targetField": "costPrice", "dataType": "decimal"},
    {"sourceField": "precio_venta", "targetField": "salePrice", "dataType": "decimal"}
  ]',
  NULL,
  1,
  true,
  NOW(),
  NOW()
);
```

### Paso 2: Probar

```
POST /api/inventory-counts/{countId}/prepare
{ "warehouseId": "xxx" }

// Sistema automáticamente:
// 1. Detecta MappingConfig activos
// 2. Usa esos mappings
// 3. Carga artículos vía mappings
// Response: { "source": "MAPPING_CONFIG", ... }
```

---

## 📊 Flujos de Datos

### Opción B: Query Directa (Actual)

```
Frontend                Backend                    Catelli
   |                      |                           |
   |--POST /prepare-----→  |                           |
   |                      |--MSSQL Query-----------→  |
   |                      |←--Items + Stock + Prices--|
   |                      |--Create in BD----------→  |
   |←--Items JSON---------|                           |
   |
   (User enters quantities)
   |
   |--PUT /items-------→  |
   |                      |--Calc Variance---------→  |
   |                      |--Create VarianceReport→   |
   |←--Updated---------|                           |
```

### Opción A: MappingConfig (Cuando esté configurado)

```
Frontend                Backend                    Catelli
   |                      |                           |
   |--POST /prepare-----→  |                           |
   |                      |--Load MappingConfigs--→  BD_Local
   |                      |--Execute Mapping #1---→  |
   |                      |←--Items------------|-----|
   |                      |--Execute Mapping #2---→  |
   |                      |←--Stock-----------|-----|
   |                      |--Execute Mapping #3---→  |
   |                      |←--Prices---------|-----|
   |                      |--Combine + Save---→  BD_Local
   |←--Items JSON---------|                           |
```

---

## 🐛 Troubleshooting

### Problema: "No active ERP connection configured"

**Solución:**
```sql
-- Verificar que conexión existe y está activa
SELECT * FROM "ERPConnection"
WHERE companyId = 'tu_company_id'
  AND isActive = true;

-- Si no existe, crearla (ver "Paso 1: Crear Conexión ERP")
```

### Problema: "Cannot connect to Catelli"

**Solución:**
```
1. Verificar host/puerto/credenciales
2. Probar desde terminal SQL Server:
   sqlcmd -S catelli.local -U sa -P password123
3. Actualizar ERPConnection en BD
```

### Problema: "No items found in Catelli"

**Solución:**
```sql
-- Verificar que existen artículos ACTIVOS en Catelli
SELECT COUNT(*) FROM articulo WHERE estado = 'ACTIVO';

-- Verificar existencias para la bodega
SELECT * FROM existencia_bodega WHERE bodega_id = 'tu_bodega_id';
```

### Problema: Loadfrom MappingConfig falla, pero DirectQuery funciona

**Solución:**
```
1. MappingConfig es opcional
2. DirectQuery es fallback automático
3. Verificar logs para ver cuál falló
4. System automáticamente intenta siguiente opción
```

---

## 📝 Logs y Debugging

El sistema imprime en logs cuál opción está usando:

```
📍 Using Option A: MappingConfig  ← Si mappings configurados
📍 Using Option B: Direct Query from Catelli  ← Si sin mappings
📍 Using Option C: Manual entry (no ERP connection)  ← Si sin conexión

⚠️ Option A failed, trying Option B...  ← Si Opción A falla
⚠️ Option B also failed, using manual entry  ← Si todas fallan
```

---

## 📌 Próximos Pasos Recomendados

1. **MVP Funcional (Hoy)**
   - ✅ Opción B (Query Directa) lista para usar
   - ✅ Agregar artículos manualmente en UI
   - ✅ Calcular varianzas en tiempo real

2. **Fase 2 (1 semana)**
   - [ ] Configurar conexión a Catelli real
   - [ ] Probar carga automática end-to-end
   - [ ] Generar VarianceReport

3. **Fase 3 (2 semanas)**
   - [ ] Implementar MappingConfig UI
   - [ ] Permitir usuarios personalizar mappings
   - [ ] Crear InventoryAdjustment automático

4. **Fase 4 (Producción)**
   - [ ] Migrar completamente a Opción A (Mappings)
   - [ ] Deprecar Query hardcodeada
   - [ ] Auditoría y validaciones finales

---

## 🎓 Resumen Técnico

**Archivos Creados:**
- `src/modules/erp-connections/mssql-connector.ts` - Conector MSSQL
- `src/modules/erp-connections/erp-connector-factory.ts` - Factory pattern
- `src/modules/erp-connections/index.ts` - Exports

**Archivos Modificados:**
- `src/modules/inventory-counts/service.ts` - Lógica de carga flexible
- `src/modules/inventory-counts/repository.ts` - Método createCountItem (ya existía)

**Dependencias Agregadas:**
- `mssql` v9.x - Driver SQL Server

**Patrón Utilizado:**
- Strategy Pattern (3 estrategias de carga)
- Factory Pattern (creación de conectores)
- Repository Pattern (acceso a datos)

---

## ✅ Checklist de Validación

- [x] MSSQL Connector implementado
- [x] Factory Pattern para conectores
- [x] Lógica flexible 3 opciones
- [x] Opción B (Query Directa) lista
- [x] Opción A (Mappings) estructura
- [x] Fallback a manual
- [x] Error handling robusto
- [x] Logging de depuración
- [x] TypeScript compilación OK
- [x] Dependencias instaladas

**Status:** ✅ LISTO PARA TESTING
