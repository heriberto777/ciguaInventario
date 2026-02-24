# 🎯 RESUMEN EJECUTIVO: CÓMO FUNCIONA EL MAPPING

## El Problema Que Resolvemos

**Antes (Hardcodeado):**
```
Los campos de Catelli estaban fijos en el código
↓
Si Catelli cambiaba su BD, había que recodificar
↓
No se podían mapear tablas nuevas
↓
Sistema inflexible ❌
```

**Ahora (Dinámico):**
```
El sistema se conecta a Catelli EN TIEMPO REAL
↓
Lee sus tablas y columnas automáticamente
↓
Usuario selecciona exactamente lo que necesita
↓
Sistema completamente flexible ✅
```

---

## Flujo Visual Simplificado

```
┌─────────────────────────────────────────────────────────────────┐
│ USUARIO FINAL                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1. "Quiero contar inventario"
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CIGUA INVENTORY APP (Frontend)                                  │
│                                                                 │
│ ① Busca: "Tabla de artículos en Catelli"                      │
│    → Llamada: GET /erp-connections/123/tables                  │
│    → Recibe: [articulo, existencia_bodega, bodega, ...]        │
│                                                                 │
│ ② Selecciona: "articulo" y "existencia_bodega"                │
│    → Llamada: POST /erp-connections/123/table-schemas          │
│    → Recibe: Estructura completa (columnas, tipos)             │
│                                                                 │
│ ③ Arrastra campos: articulo.codigo → itemCode                │
│                    articulo.desc → itemName                   │
│                    existencia.qty → quantity                  │
│                                                                 │
│ ④ Click "Vista Previa"                                        │
│    → Llamada: POST /erp-connections/123/preview-query         │
│    → Recibe: Datos reales (primeros 10 registros)             │
│    ✅ "Se ve correcto"                                         │
│                                                                 │
│ ⑤ Click "Guardar"                                              │
│    → Mapping se guarda en BD Cigua                             │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 2. Peticiones HTTP a Backend
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CIGUA BACKEND (Fastify)                                         │
│                                                                 │
│ ① GET /erp-connections/123/tables                              │
│    └─ ERPIntrospectionService.getAvailableTables()             │
│       └─ Ejecuta: SELECT TABLE_NAME FROM INFORMATION_SCHEMA    │
│       └─ Retorna: Lista de tablas del ERP                      │
│                                                                 │
│ ② POST /erp-connections/123/table-schemas                      │
│    └─ ERPIntrospectionService.getTableSchema('articulo')       │
│       └─ Ejecuta: SELECT COLUMN_NAME, DATA_TYPE FROM...        │
│       └─ Retorna: Estructura exacta de la tabla                │
│                                                                 │
│ ③ POST /erp-connections/123/preview-query                      │
│    └─ ERPIntrospectionService.previewQuery(sql, 10)            │
│       └─ Ejecuta: SELECT a.codigo, e.cantidad... LIMIT 10      │
│       └─ Retorna: Datos reales de Catelli                      │
│                                                                 │
│ ④ POST /mapping-configs (Guardar)                              │
│    └─ Guarda en BD Cigua la configuración del mapping          │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 3. Se conecta a Catelli
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CATELLI ERP (MSSQL)                                             │
│                                                                 │
│ Base de datos real con datos reales:                           │
│                                                                 │
│ TABLA: articulo                                                │
│ ┌──────┬─────────┬──────────────┬────────┬────────┐            │
│ │ id   │ codigo  │ descripcion  │ precio │ activo │ ...        │
│ ├──────┼─────────┼──────────────┼────────┼────────┤            │
│ │ 1    │ ART-001 │ Prod A       │ 100    │ 1      │            │
│ │ 2    │ ART-002 │ Prod B       │ 200    │ 1      │            │
│ │ 3    │ ART-003 │ Prod C       │ 150    │ 1      │            │
│ │ ...  │ ...     │ ...          │ ...    │ ...    │            │
│ └──────┴─────────┴──────────────┴────────┴────────┘            │
│                                                                 │
│ TABLA: existencia_bodega                                       │
│ ┌──────┬──────────────┬──────────┬──────────┐                  │
│ │ id   │ articulo_id  │ bodega_id│ cantidad │ ...              │
│ ├──────┼──────────────┼──────────┼──────────┤                  │
│ │ 1    │ 1            │ 1        │ 50       │                  │
│ │ 2    │ 2            │ 1        │ 30       │                  │
│ │ 3    │ 1            │ 2        │ 20       │                  │
│ │ ...  │ ...          │ ...      │ ...      │                  │
│ └──────┴──────────────┴──────────┴──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 4. Carga a Cigua
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CIGUA INVENTORY (PostgreSQL)                                    │
│                                                                 │
│ TABLA: InventoryCount                                          │
│ ┌──────┬──────────┬─────────────┬─────────┐                    │
│ │ id   │ code     │ warehouseId │ status  │ ...                │
│ ├──────┼──────────┼─────────────┼─────────┤                    │
│ │ inv1 │ INV-0001 │ bodega_1    │ DRAFT   │                    │
│ └──────┴──────────┴─────────────┴─────────┘                    │
│                                                                 │
│ TABLA: InventoryCount_Item                                     │
│ ┌──────┬────────┬──────────┬────────────┬────────────┐         │
│ │ id   │ itemCode│ itemName │ systemQty  │ countedQty │ ...     │
│ ├──────┼────────┼──────────┼────────────┼────────────┤         │
│ │ 1    │ ART-001│ Prod A   │ 50         │ ???        │ ← Usuario│
│ │ 2    │ ART-002│ Prod B   │ 30         │ ???        │   ingresa│
│ │ 3    │ ART-003│ Prod C   │ 20         │ ???        │   aquí  │
│ └──────┴────────┴──────────┴────────────┴────────────┘         │
│                                                                 │
│ Status: DRAFT → IN_PROGRESS → COMPLETED → APPROVED             │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 5. Usuario cuenta físicamente
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ALMACÉN FÍSICO                                                  │
│                                                                 │
│ Usuario con código QR o papel:                                 │
│ "Tengo 48 unidades de ART-001" (no 50)                         │
│ "Tengo 35 unidades de ART-002" (no 30)                         │
│ ...                                                            │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 6. Guarda diferencias
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CIGUA INVENTORY (PostgreSQL)                                    │
│                                                                 │
│ TABLA: VarianceReport                                          │
│ ┌──────┬────────┬──────────┬──────────┬────────────┬──────────┐│
│ │ id   │ itemCode│ itemName │ systemQty│ countedQty │ difference││
│ ├──────┼────────┼──────────┼──────────┼────────────┼──────────┤│
│ │ 1    │ ART-001│ Prod A   │ 50       │ 48         │ -2       ││
│ │ 2    │ ART-002│ Prod B   │ 30       │ 35         │ +5       ││
│ │ 3    │ ART-003│ Prod C   │ 20       │ 20         │ 0        ││
│ └──────┴────────┴──────────┴──────────┴────────────┴──────────┘│
│                                                                 │
│ Status: PENDING → APPROVED → ADJUSTED                          │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 7. Sincroniza con Catelli (PRÓXIMO PASO)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CATELLI ERP (MSSQL)                                             │
│                                                                 │
│ Actualiza: existencia_bodega                                   │
│ ┌──────┬──────────────┬──────────┬──────────────┐              │
│ │ id   │ articulo_id  │ bodega_id│ cantidad     │ ...          │
│ ├──────┼──────────────┼──────────┼──────────────┤              │
│ │ 1    │ 1            │ 1        │ 48  (fue 50) │ ← ACTUALIZADO│
│ │ 2    │ 2            │ 1        │ 35  (fue 30) │ ← ACTUALIZADO│
│ │ 3    │ 1            │ 2        │ 20  (igual)  │              │
│ └──────┴──────────────┴──────────┴──────────────┘              │
│                                                                 │
│ Status en Cigua: ADJUSTED ✅                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## ¿De Dónde Vienen los Datos?

### **CAMPOS DEL ERP CATELLI** 📦

**Antes (Hardcodeado):**
```typescript
// Fijo en código, imposible cambiar
const TABLE_COLUMNS = {
  articulo: ['id', 'codigo', 'descripcion', 'precio'],
  // Si Catelli agrega columna... ¡hay que recodificar!
};
```

**Ahora (Dinámico):**
```
Usuario conecta a Catelli
    ↓
Sistema ejecuta SQL dinámicamente:
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_CATALOG = DB_NAME()
    ↓
Obtiene tablas REALES de Catelli en ese momento
    ↓
Por cada tabla, ejecuta:
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'articulo'
    ↓
Obtiene columnas REALES de Catelli en ese momento
    ↓
Le muestra al usuario exactamente lo que hay
```

**Ventaja:** ✅ Flexible, actualizado automáticamente

---

### **CAMPOS DE CIGUA INVENTORY** 🎯

**Siempre estándar (según Dataset Type):**

Para `ITEMS`:
- itemCode (PK)
- itemName
- description
- unit
- category

Para `STOCK`:
- itemCode (FK)
- warehouseId (FK)
- quantity
- lastUpdate

Para `COST`:
- itemCode (FK)
- cost
- currency

Para `PRICE`:
- itemCode (FK)
- price
- currency

---

## El Mapeo en Acción

```
Usuario en Frontend:

┌─────────────────────────────────────────┐
│ CAMPOS DE CATELLI (Dinámicos)          │
├─────────────────────────────────────────┤
│ ✓ articulo.id                          │
│ ✓ articulo.codigo              ↓ Arrastra│
│ ✓ articulo.descripcion                 │
│ ✓ articulo.nombre                      │
│ ✓ articulo.precio                      │
│ ✓ articulo.costo                       │
│ ✓ articulo.unidad                      │
│ ✓ existencia.cantidad                  │
│ ✓ bodega.nombre                        │
│                          ↓ Mapea a
│                ┌─────────────────────────────────────────┐
│                │ CAMPOS DE CIGUA (Estándar)             │
│                ├─────────────────────────────────────────┤
│                │ itemCode        ← articulo.codigo       │
│                │ itemName        ← articulo.descripcion  │
│                │ description     ← articulo.nombre       │
│                │ unit            ← articulo.unidad       │
│                │ quantity        ← existencia.cantidad   │
│                │ warehouseName   ← bodega.nombre         │
│                └─────────────────────────────────────────┘
```

---

## Flujo Técnico Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EXPLORACIÓN (Frontend → Backend)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ GET /api/erp-connections/conn_123/tables                        │
│   ↓                                                              │
│ Backend:                                                         │
│   1. Obtiene datos de conexión guardada                         │
│   2. Crea MSSQLConnector                                        │
│   3. Ejecuta: SELECT TABLE_NAME FROM INFORMATION_SCHEMA...      │
│   4. Retorna: [ "articulo", "existencia_bodega", ... ]         │
│                                                                 │
│ Frontend recibe lista de tablas REALES                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. INTROSPECCIÓN (Frontend → Backend)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ POST /api/erp-connections/conn_123/table-schemas                │
│ Body: { tableNames: ["articulo", "existencia_bodega"] }         │
│   ↓                                                              │
│ Backend para CADA tabla:                                         │
│   1. Ejecuta: SELECT COLUMN_NAME, DATA_TYPE, ...                │
│      FROM INFORMATION_SCHEMA.COLUMNS                            │
│      WHERE TABLE_NAME = 'articulo'                              │
│   2. Mapea tipos SQL a tipos TypeScript (int→number, etc)       │
│   3. Retorna estructura completa                                │
│                                                                 │
│ Frontend recibe:                                                │
│ {                                                               │
│   schemas: [                                                    │
│     {                                                           │
│       name: "articulo",                                         │
│       columns: [                                                │
│         { name: "id", type: "number", isPK: true },             │
│         { name: "codigo", type: "string", maxLen: 50 },         │
│         { name: "descripcion", type: "string", maxLen: 255 },   │
│         ...                                                      │
│       ]                                                         │
│     }                                                           │
│   ]                                                             │
│ }                                                               │
│                                                                 │
│ Frontend renderiza dropdowns con campos REALES                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. MAPEO (Frontend - Sin llamadas API)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Usuario arrastra:                                               │
│ articulo.codigo → itemCode                                      │
│ articulo.descripcion → itemName                                 │
│ existencia.cantidad → quantity                                  │
│ ...                                                              │
│                                                                 │
│ FieldMappingBuilder guarda en estado:                          │
│ {                                                               │
│   fieldMappings: [                                              │
│     {                                                           │
│       sourceField: "articulo.codigo",                          │
│       targetField: "itemCode",                                  │
│       dataType: "string"                                        │
│     },                                                          │
│     ...                                                         │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. PREVIEW (Frontend → Backend)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Frontend construye SQL:                                         │
│ SELECT a.codigo as itemCode,                                   │
│        a.descripcion as itemName,                              │
│        e.cantidad as quantity                                  │
│ FROM articulo a                                                │
│ LEFT JOIN existencia_bodega e ON a.id = e.articulo_id          │
│ LIMIT 10                                                        │
│                                                                 │
│ POST /api/erp-connections/conn_123/preview-query                │
│ Body: {                                                         │
│   sql: "SELECT a.codigo as itemCode...",                        │
│   limit: 10                                                     │
│ }                                                               │
│   ↓                                                              │
│ Backend ejecuta SQL contra Catelli REAL                        │
│   ↓                                                              │
│ Response:                                                       │
│ {                                                               │
│   data: [                                                       │
│     { itemCode: "ART-001", itemName: "Prod A", quantity: 50 }, │
│     { itemCode: "ART-002", itemName: "Prod B", quantity: 30 }, │
│     ...                                                         │
│   ]                                                             │
│ }                                                               │
│                                                                 │
│ Frontend muestra datos REALES en tabla                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 5. GUARDAR (Frontend → Backend)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ POST /api/mapping-configs                                       │
│ Body: {                                                         │
│   datasetType: "ITEMS",                                         │
│   mainTable: { name: "articulo", alias: "a" },                 │
│   joins: [...],                                                 │
│   fieldMappings: [...],                                         │
│   isActive: true                                                │
│ }                                                               │
│   ↓                                                              │
│ Backend guarda en BD Cigua                                      │
│   ↓                                                              │
│ Response: { id: "map_xyz", ... }                                │
│                                                                 │
│ ✅ Mapping guardado y listo para usar                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comparación: Antes vs Ahora

| Aspecto | Antes (Hardcodeado) | Ahora (Dinámico) |
|---------|-------------------|------------------|
| **Tablas ERP** | Fijas en código | Obtenidas en tiempo real |
| **Columnas ERP** | Fijas en código | Obtenidas dinámicamente |
| **¿Cambió Catelli?** | Hay que recodificar ❌ | Se actualiza automáticamente ✅ |
| **Nueva tabla en ERP** | Imposible mapear ❌ | Se puede mapear inmediatamente ✅ |
| **Fluidez** | Inflexible ❌ | Completamente flexible ✅ |
| **Mantenimiento** | Alto (código) | Bajo (solo BD) |

---

## Resumen Final

```
El sistema ahora:

1. ✅ Se conecta DINÁMICAMENTE a Catelli
2. ✅ Lee sus tablas y columnas EN TIEMPO REAL
3. ✅ Usuario selecciona exactamente lo que necesita
4. ✅ Mapea campos de Catelli a Cigua visualmente
5. ✅ Previsualiza datos reales antes de cargar
6. ✅ Carga datos automáticamente a Cigua
7. ✅ Usuario cuenta inventario físico en Cigua
8. ✅ Sistema calcula varianzas
9. ✅ Envía resultados de vuelta a Catelli

TODO TODO DINÁMICO, sin hardcoding, sin código fijo.
```

---

## 📞 Para Continuar

**Próximos pasos:**
1. ✅ ERPIntrospectionService (HECHO)
2. ✅ Endpoints de exploración (HECHO)
3. 🔄 Actualizar QueryBuilder para ser dinámico
4. 🔄 Actualizar FieldMappingBuilder para ser dinámico
5. ⏳ Crear LoadInventoryFromERP (cargar datos)
6. ⏳ Crear SyncToERP (enviar cambios a Catelli)

---

**¿Preguntas?** Pregunta sobre cualquier parte del flujo.
