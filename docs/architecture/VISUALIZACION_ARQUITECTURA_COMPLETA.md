# 🔍 Visualización: Arquitectura Completa de Mapping

## Diagrama Completo del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CARGA DE INVENTARIO                   │
└─────────────────────────────────────────────────────────────────────┘

                          FRONTEND (React)
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────────────┐          ┌──────────────────────────────┐ │
│  │ Inventory Count Page │          │  MappingConfigAdminPage      │ │
│  │                      │          │  (NUEVO: Dual Mode)          │ │
│  │ [Cargar Artículos]   │◄────────►│  ┌──────────────────────────┤ │
│  │     (botón)          │          │  │ MODE: Visual | Manual     │ │
│  │                      │          │  ├──────────────────────────┤ │
│  └──────────────────────┘          │  │ VISUAL MODE (5 pasos):   │ │
│           ▲                         │  │ ┌────────────────────────┤ │
│           │                         │  │ │ Step 1: Tabla         │ │
│           │                         │  │ │ Step 2: Columnas      │ │
│           │                         │  │ │ Step 3: JOINs         │ │
│           │                         │  │ │ Step 4: Filtros       │ │
│           │                         │  │ │ Step 5: Preview       │ │
│           │                         │  │ └────────────────────────┤ │
│           │                         │  │ + FieldMappingBuilder   │ │
│           │                         │  │   (Drag & Drop)         │ │
│           │                         │  ├──────────────────────────┤ │
│           │                         │  │ MANUAL MODE:             │ │
│           │                         │  │ - Custom Query (SQL)     │ │
│           │                         │  │ - Main Table (JSON)      │ │
│           │                         │  │ - JOINs (JSON)           │ │
│           │                         │  │ - Filters (JSON)         │ │
│           │                         │  │ - Mappings (JSON)        │ │
│           │                         │  └──────────────────────────┘ │
│           │                         │                              │ │
│           │                         └──────────────────────────────┘ │
│           │                                                         │ │
└───────────┼─────────────────────────────────────────────────────────┘
            │ API Call: POST /api/inventory-counts/:id/items/load
            │ (Llama loadFromMappingConfig())
            │
                          BACKEND (Fastify/Node)
┌────────────────────────────────────────────────────────────────────┐ │
│                                                                    │ │
│  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │              InventoryCountService                          │ │ │
│  ├──────────────────────────────────────────────────────────────┤ │ │
│  │  prepareCountItems()                                        │ │ │
│  │  ├─ Opción A: loadFromMappingConfig()                       │ │ │
│  │  │  ├─ Lee MappingConfig de BD                              │ │ │
│  │  │  ├─ Lee ERPConnection de BD                              │ │ │
│  │  │  ├─ Crea DynamicQueryBuilder                             │ │ │
│  │  │  ├─ Construye SQL dinámicamente                          │ │ │
│  │  │  ├─ Ejecuta en Catelli                                   │ │ │
│  │  │  ├─ Mapea campos (a.codigo → itemCode)                   │ │ │
│  │  │  └─ Guarda resultados en BD                              │ │ │
│  │  │                                                           │ │ │
│  │  ├─ Opción B: loadFromDirectQuery()                         │ │ │
│  │  │  └─ Fallback: Query hardcodeada                          │ │ │
│  │  │                                                           │ │ │
│  │  └─ Opción C: Manual (Fallback final)                       │ │ │
│  │     └─ Usuario entra datos a mano                           │ │ │
│  │                                                              │ │ │
│  └──────────────────────────────────────────────────────────────┘ │ │
│           ▲                              ▲                        │ │
│           │                              │                        │ │
│           │                              │                        │ │
│  ┌────────┼──────────────────┐ ┌────────┼──────────────────┐   │ │
│  │ QueryBuilder              │ │ DynamicQueryBuilder    │   │ │
│  ├──────────────────────────┤ ├────────────────────────┤   │ │
│  │ Genera SQL visualmente   │ │ Genera SQL dinámico    │   │ │
│  │ (Usado en FRONTEND)      │ │ (Usado en BACKEND)     │   │ │
│  │                          │ │                        │   │ │
│  │ Lee MappingConfig        │ │ build()                │   │ │
│  │ y genera preview de SQL  │ │ buildSelectClause()    │   │ │
│  │                          │ │ buildFromClause()      │   │ │
│  │                          │ │ buildWhereClause()     │   │ │
│  │                          │ │ validate()             │   │ │
│  └──────────────────────────┘ └────────────────────────┘   │ │
│           ▲                              ▲                  │ │
│           │                              │                  │ │
│           └──────────┬───────────────────┘                  │ │
│                      │                                      │ │
│           ┌──────────▼─────────────┐                        │ │
│           │  MappingConfigData     │                        │ │
│           ├────────────────────────┤                        │ │
│           │ ✓ datasetType          │                        │ │
│           │ ✓ mainTable            │                        │ │
│           │ ✓ joins                │                        │ │
│           │ ✓ filters              │                        │ │
│           │ ✓ fieldMappings        │                        │ │
│           │ ✓ customQuery          │                        │ │
│           │ ✓ limit                │                        │ │
│           └────────────────────────┘                        │ │
│                      ▲                                      │ │
│                      │ API: POST /mapping-configs           │ │
│                      │                                      │ │
│           ┌──────────┴──────────────┐                       │ │
│           │MappingConfigController  │                       │ │
│           ├────────────────────────┤                        │ │
│           │ POST /api/mapping-...  │                        │ │
│           │ GET /api/mapping-...   │                        │ │
│           │ PATCH /api/mapping-..  │                        │ │
│           │ DELETE /api/mapping-.. │                        │ │
│           └──────────┬──────────────┘                       │ │
│                      │                                      │ │
│           ┌──────────▼──────────────┐                       │ │
│           │MappingConfigRepository  │                       │ │
│           ├────────────────────────┤                        │ │
│           │ create()               │                        │ │
│           │ getByCompanyAndType()   │                        │ │
│           │ listByCompany()         │                        │ │
│           │ update()                │                        │ │
│           │ delete()                │                        │ │
│           │ toggleActive()          │                        │ │
│           └──────────┬──────────────┘                       │ │
│                      │                                      │ │
└──────────────────────┼──────────────────────────────────────┘ │
                       │ Prisma ORM
                       │
            ┌──────────▼──────────────┐
            │    POSTGRESQL BD        │
            ├────────────────────────┤
            │ MappingConfigs Table   │
            │ - id                   │
            │ - companyId            │
            │ - datasetType          │
            │ - mainTable            │
            │ - joins                │
            │ - filters              │
            │ - fieldMappings        │
            │ - customQuery          │
            │ - isActive             │
            │ - createdAt            │
            │ - updatedAt            │
            └────────────────────────┘
                       ▲
                       │ JDBC
                       │
            ┌──────────▼──────────────┐
            │    CATELLI ERP          │
            ├────────────────────────┤
            │ (SQL Server / MSSQL)   │
            │                        │
            │ articulo               │
            │ existencia_bodega      │
            │ articulo_precio        │
            │ bodega                 │
            │ categoria_articulo     │
            └────────────────────────┘
```

## Flujo de Datos Paso a Paso

### Escenario: Usuario crea mapping de ITEMS

```
1. FRONTEND - Usuario abre Admin Panel
   └─ http://localhost:5173/admin/mapping-config

2. FRONTEND - Usuario hace click "+ Nuevo Mapping"
   └─ Abre MappingConfigAdminPage con Tab "Constructor Visual"

3. FRONTEND - Usuario selecciona Tabla (QueryBuilder)
   ├─ Paso 1: Click 📦 Artículos
   ├─ Paso 2: Selecciona columns: ✓ codigo, ✓ descripcion
   ├─ Paso 3: Agregar JOIN (existencia_bodega)
   ├─ Paso 4: Agregar Filtro (estado = ACTIVO)
   └─ Paso 5: Guarda Mapping

4. FRONTEND - Datos se envían a Backend
   POST /api/mapping-configs
   └─ JSON:
      {
        "datasetType": "ITEMS",
        "mainTable": {"name": "articulo", "alias": "a"},
        "joins": [...],
        "filters": [...],
        "fieldMappings": [],  // Vacío aún
        "limit": 1000
      }

5. BACKEND - MappingConfigController recibe
   ├─ Valida datos
   ├─ Llama a MappingConfigRepository.create()
   └─ Guarda en BD (PostgreSQL)

6. FRONTEND - FieldMappingBuilder aparece
   ├─ Lado izquierdo: Columnas de Catelli cargadas
   └─ Lado derecho: Campos estándar (itemCode, itemName, etc)

7. FRONTEND - Usuario mapea campos
   ├─ Arrastra a.codigo → itemCode
   ├─ Arrastra a.descripcion → itemName
   └─ Arrastra eb.cantidad → systemQty

8. FRONTEND - Usuario guarda
   PATCH /api/mapping-configs/:id
   └─ JSON:
      {
        "fieldMappings": [
          {"sourceField": "a.codigo", "targetField": "itemCode", ...},
          {"sourceField": "a.descripcion", "targetField": "itemName", ...},
          {"sourceField": "eb.cantidad", "targetField": "systemQty", ...}
        ]
      }

9. BACKEND - Se actualiza en BD
   └─ MappingConfig completamente definido

10. USUARIO - Abre formulario de Cuento de Inventario
    └─ http://localhost:5173/inventory-counts/:id

11. USUARIO - Click en "Cargar Artículos"
    └─ POST /api/inventory-counts/:id/items/load

12. BACKEND - prepareCountItems() ejecuta
    ├─ checkMappingConfigs() = true (config existe)
    ├─ loadFromMappingConfig() se ejecuta
    │  ├─ Lee MappingConfig de BD
    │  ├─ Lee ERPConnection de BD
    │  ├─ DynamicQueryBuilder construye SQL:
    │  │  SELECT a.codigo, a.descripcion, eb.cantidad
    │  │  FROM articulo a
    │  │  LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id
    │  │  WHERE a.estado = 'ACTIVO'
    │  │  LIMIT 1000
    │  ├─ Ejecuta en Catelli (MSSQL)
    │  ├─ Obtiene resultados:
    │  │  [{codigo: "ART001", descripcion: "Producto 1", cantidad: 100}]
    │  ├─ Mapea campos:
    │  │  {
    │  │    itemCode: "ART001",
    │  │    itemName: "Producto 1",
    │  │    systemQty: 100
    │  │  }
    │  └─ Guarda en InventoryCountItems

13. FRONTEND - Items aparecen automáticamente
    └─ ✅ Inventario listo para contar
```

## Comparación Visual: Antes vs Después

### ANTES (Solo UI básico)
```
┌─────────────────────────────────┐
│ Crear Mapping                   │
├─────────────────────────────────┤
│ Dataset: [ITEMS▼]               │
├─────────────────────────────────┤
│ Tabla: [articulo_____]          │
│ Alias: [a___]                   │
├─────────────────────────────────┤
│ Mapeo:                          │
│ [a.codigo_________] → itemCode  │
│ [a.descripcion____] → itemName  │
│ [_______________] → systemQty   │
├─────────────────────────────────┤
│ Límite: [1000____]              │
├─────────────────────────────────┤
│ [Cancelar] [Guardar]            │
└─────────────────────────────────┘

❌ Problemas:
  - No visual
  - Difícil escribir nombres de campos
  - No ayuda con JOINs
  - No validación de columnas
  - Confuso para no técnicos
```

### DESPUÉS (Dual Mode)
```
┌────────────────────────────────────┐
│ Crear Mapping - ITEMS              │
├────────────────────────────────────┤
│ Dataset: [ITEMS▼]                  │
├───────────────────┬────────────────┤
│ 🔨 VISUAL        │ ✏️ MANUAL       │
├────────────────────────────────────┤
│                                    │
│  PASO 1: Selecciona Tabla          │
│  ┌─────────┬────────┬────────────┐ │
│  │📦Items  │🏭Stock │💰Precios   │ │
│  └─────────┴────────┴────────────┘ │
│                                    │
│  PASO 2: Selecciona Columnas       │
│  ☐ codigo      ☑ descripcion       │
│  ☐ precio      ☑ nombre            │
│                                    │
│  PASO 3: Agregar JOINs (opt.)      │
│  [Agregar JOIN...]                 │
│                                    │
│  PASO 4: Agregar Filtros (opt.)    │
│  [Agregar Filtro...]               │
│                                    │
│  PASO 5: Preview y Guardar         │
│  👁️ Vista Previa    💾 Guardar     │
│                                    │
│  ──────────────────────────────    │
│                                    │
│  MAPEADOR DE CAMPOS (Drag & Drop)  │
│                                    │
│  ┌──────────┬────────────────────┐ │
│  │ Catelli  │ Nuestra App        │ │
│  ├──────────┼────────────────────┤ │
│  │ codigo   │ ✓ itemCode        │ │
│  │ nombre   │ ✓ itemName        │ │
│  │ cantidad │ ✓ systemQty       │ │
│  └──────────┴────────────────────┘ │
│                                    │
│ [Cancelar]                  [💾Guardar] │
└────────────────────────────────────┘

✅ Ventajas:
  + Interfaz visual (5 pasos)
  + Checkboxes para columnas
  + Constructor de JOINs visual
  + Constructor de Filtros visual
  + Mapeo con Drag & Drop
  + No necesitas SQL
  + Validación automática
  + Aún tienes opción manual
  + Fácil para cualquiera
```

## Componentes Nuevos

### 1. FieldMappingBuilder.tsx
```
PROPIEDADES:
- datasetType: "ITEMS" | "STOCK" | "COST" | "PRICE"
- mainTable: string (tabla principal)
- joins: TableJoin[] (tablas adicionales)
- mappings: FieldMapping[] (mapeos actuales)
- onChange: (mappings) => void (callback)

ESTADO INTERNO:
- availableFields: Columnas de Catelli
- loading: boolean
- draggedField: Campo siendo arrastrando
- selectedMapping: Mapeo actual seleccionado

INTERFAZ:
- Lado izquierdo: Lista de campos con drag
- Lado derecho: Campos estándar con drop zones
- Selección de tipos de dato
- Transformaciones SQL
- Botón para desconectar
- Contador de campos mapeados
```

### 2. QueryBuilder.tsx
```
PROPIEDADES:
- onChange: (query) => void
- onPreview: (query) => void
- initialState?: QueryBuilderState

ESTADO INTERNO:
- step: 1 | 2 | 3 | 4 | 5
- query: QueryBuilderState
- availableColumns: string[]
- previewSQL: string
- previewData: any[]
- previewLoading: boolean

PASOS:
1. Seleccionar tabla principal
2. Seleccionar columnas
3. Agregar JOINs (opcional)
4. Agregar Filtros (opcional)
5. Preview y guardar

COMPONENTES INTERNOS:
- JoinBuilder (agregar JOINs)
- FilterBuilder (agregar Filtros)
```

## Integración en MappingConfigAdminPage

```
MappingConfigAdminPage
├─ Estado: step (list | create | edit)
├─ Estado: editMode (visual | manual)
├─ Estado: selectedConfig
└─ Componentes:
   ├─ List view (muestra mappings existentes)
   ├─ Visual Editor (Modo visual):
   │  ├─ QueryBuilder (5 pasos)
   │  └─ FieldMappingBuilder (drag-drop)
   └─ Manual Editor (Modo manual):
      ├─ Custom Query (textarea SQL)
      ├─ Main Table (inputs)
      ├─ JOINs (textarea JSON)
      ├─ Filters (textarea JSON)
      └─ Field Mappings (textarea JSON)
```

## Validación en Tiempo Real

```
FieldMappingBuilder:
├─ Verifica que existan campos en availableFields
├─ Valida tipos de dato
├─ Verifica transformaciones SQL válidas
└─ Muestra contador de mappeos

QueryBuilder:
├─ Paso 1: Tabla principal requerida
├─ Paso 2: Mínimo 1 columna seleccionada
├─ Paso 3: JOINs con condición válida
├─ Paso 4: Filtros con campo, operador y valor
└─ Paso 5: Límite de filas válido

MappingConfigController:
├─ datasetType requerido
├─ mainTable.name requerido
├─ Mínimo 1 fieldMapping
├─ JOINs con joinCondition válida
└─ Filtros con estructura válida
```

## SQL Generado Automáticamente

El sistema genera dinámicamente SQL como este:

```sql
-- Ejemplo 1: ITEMS con JOIN
SELECT
  a.codigo,
  a.descripcion,
  a.precio_base,
  eb.cantidad
FROM articulo a
LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id
WHERE a.estado = 'ACTIVO'
LIMIT 1000

-- Ejemplo 2: STOCK multi-tabla
SELECT
  a.codigo,
  b.nombre AS bodega,
  eb.cantidad
FROM articulo a
INNER JOIN bodega b ON eb.bodega_id = b.id
LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id
WHERE eb.cantidad > 0
ORDER BY a.codigo ASC
LIMIT 500

-- Ejemplo 3: PRECIO con transformación
SELECT
  UPPER(a.codigo) AS codigo,
  ap.precio,
  ap.moneda
FROM articulo a
INNER JOIN articulo_precio ap ON a.id = ap.articulo_id
WHERE ap.precio > 0
```

Esto se hace todo **visualmente** sin escribir SQL directamente.

## Resumen: ¿Qué Cambió?

| Componente | Antes | Después | Estado |
|-----------|-------|---------|--------|
| QueryBuilder | ✗ No existía | ✅ Visual 5 pasos | NEW |
| FieldMappingBuilder | ✗ No existía | ✅ Drag & Drop | NEW |
| MappingConfigAdminPage | ✅ Basic | ✅ Dual Mode | UPDATED |
| Interfaz | Manual (JSON) | Visual + Manual | MEJORADA |
| Para técnicos | ✓ Ok | ✓ Mejor | ✓ |
| Para no técnicos | ✗ Difícil | ✓ Fácil | ✅ |

¡La arquitectura ahora es **completa, intuitiva y profesional**! 🎉
