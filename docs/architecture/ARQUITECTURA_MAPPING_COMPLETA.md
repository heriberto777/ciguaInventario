# 🏗️ ARQUITECTURA COMPLETA: MAPPING ERP CATELLI → CIGUA INVENTORY

## 📋 ÍNDICE
1. [Visión General](#visión-general)
2. [Flujo de Datos Completo](#flujo-de-datos-completo)
3. [Estructura Técnica](#estructura-técnica)
4. [Endpoints API](#endpoints-api)
5. [Componentes Frontend](#componentes-frontend)
6. [Ejemplo Práctico Paso a Paso](#ejemplo-práctico-paso-a-paso)

---

## 🎯 VISIÓN GENERAL

El sistema permite:
1. **Conectar** a ERP Catelli (MSSQL)
2. **Explorar** dinámicamente sus tablas y columnas
3. **Mapear** campos de Catelli a campos de Cigua
4. **Cargar** datos reales de Catelli a Cigua
5. **Contar** inventario físico en Cigua
6. **Enviar** resultados de conteo de vuelta a Catelli

```
┌─────────────────────┐
│  CATELLI ERP        │
│  (MSSQL)            │
│                     │
│ • articulo          │
│ • existencia_bodega │
│ • bodega            │
│ • articulo_precio   │
└──────────┬──────────┘
           │ (Lee datos dinámicamente)
           │ Introspection: Obtiene tablas/columnas
           │
           ▼
┌──────────────────────────────────────────────┐
│  CIGUA INVENTORY BACKEND                     │
│  (Fastify + Prisma)                         │
│                                              │
│  ERPIntrospectionService:                   │
│  • Obtiene tablas disponibles                │
│  • Obtiene columnas de cada tabla            │
│  • Ejecuta queries de preview                │
│                                              │
│  ERPDataLoaderService: (TODO)               │
│  • Carga datos según mapping                 │
│  • Transforma datos                          │
│  • Inserta en tablas Cigua                   │
└──────────┬──────────────────────────────────┘
           │ (API REST)
           │
           ▼
┌──────────────────────────────────────────────┐
│  CIGUA INVENTORY FRONTEND                    │
│  (React + TypeScript)                       │
│                                              │
│  QueryBuilder.tsx (dinámico):               │
│  • Lista tablas del ERP en tiempo real       │
│  • Selecciona columnas disponibles           │
│  • Construye SQL visual                      │
│                                              │
│  FieldMappingBuilder.tsx (dinámico):        │
│  • Muestra campos Catelli reales             │
│  • Mapea a campos Cigua                      │
│  • Preview de datos                          │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  CIGUA DATABASE (PostgreSQL)                 │
│                                              │
│ Tables:                                      │
│ • InventoryCount (conteos físicos)          │
│ • InventoryCount_Item (items contados)      │
│ • VarianceReport (varianzas encontradas)    │
│ • InventoryAdjustment (ajustes finales)     │
│                                              │
│ Estados:                                     │
│ DRAFT → IN_PROGRESS → COMPLETED →           │
│ APPROVED → ADJUSTED (se envía a Catelli)    │
└──────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE DATOS COMPLETO

### **FASE 1: CONFIGURACIÓN DE CONEXIÓN**

```
Usuario → Settings → ERP Connections → Crear conexión
          ↓
    Host: catelli.company.com
    Port: 1433
    Database: Catelli
    Username: sa
    Password: xxxxx
          ↓
    Backend prueba conexión
          ↓
    ✅ Conexión guardada
```

**Endpoint:**
```
POST /api/erp-connections
Body: {
  host: "catelli.company.com",
  port: 1433,
  database: "Catelli",
  username: "sa",
  password: "xxxxx"
}
Response: {
  id: "conn_123",
  isActive: true,
  ...
}
```

---

### **FASE 2: EXPLORACIÓN DINÁMICA**

```
Usuario → Settings → ERP Mapping → Nuevo Mapping
          ↓
    1. Selecciona ERP Connection (conn_123)
          ↓
    Frontend llama: GET /erp-connections/conn_123/tables
          ↓
    Backend:
    • Conecta a Catelli
    • Ejecuta: SELECT TABLE_NAME FROM INFORMATION_SCHEMA
    • Filtra tablas relevantes (articulo, existencia, bodega, etc.)
          ↓
    Response: {
      tables: [
        { name: 'articulo', label: 'Artículos', columnCount: 15 },
        { name: 'existencia_bodega', label: 'Existencias por Bodega', columnCount: 6 },
        { name: 'bodega', label: 'Bodegas', columnCount: 5 },
        ...
      ]
    }
          ↓
    Frontend muestra dropdown con tablas reales
```

**Endpoint:**
```
GET /api/erp-connections/conn_123/tables

Response: {
  tables: [
    { name: 'articulo', label: 'Artículos', columnCount: 15 },
    { name: 'existencia_bodega', label: 'Existencias por Bodega', columnCount: 6 },
    ...
  ]
}
```

---

### **FASE 3: ESTRUCTURA DE TABLA**

```
Usuario → Selecciona tabla: 'articulo'
          ↓
    Frontend llama: POST /erp-connections/conn_123/table-schemas
    Body: {
      tableNames: ['articulo', 'existencia_bodega', 'bodega']
    }
          ↓
    Backend para CADA tabla:
    • Obtiene: SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'articulo'
          ↓
    Response: {
      schemas: [
        {
          name: 'articulo',
          columns: [
            {
              name: 'id',
              type: 'number',
              isPrimaryKey: true,
              isNullable: false
            },
            {
              name: 'codigo',
              type: 'string',
              maxLength: 50,
              isNullable: false
            },
            {
              name: 'descripcion',
              type: 'string',
              maxLength: 255,
              isNullable: true
            },
            {
              name: 'precio',
              type: 'number',
              isNullable: true
            },
            {
              name: 'costo',
              type: 'number',
              isNullable: true
            },
            ...
          ]
        },
        ...
      ]
    }
          ↓
    Frontend muestra campos disponibles en dropdown izquierdo
```

**Endpoint:**
```
POST /api/erp-connections/conn_123/table-schemas

Body: {
  tableNames: ['articulo', 'existencia_bodega', 'bodega']
}

Response: {
  schemas: [
    {
      name: 'articulo',
      columns: [
        { name: 'id', type: 'number', isPrimaryKey: true },
        { name: 'codigo', type: 'string', maxLength: 50 },
        { name: 'descripcion', type: 'string', maxLength: 255 },
        ...
      ]
    }
  ]
}
```

---

### **FASE 4: MAPEO DE CAMPOS**

```
Usuario ve:
┌─────────────────────────────────────────────┐
│ Izquierda: Campos Catelli (Dinámicos)      │
├─────────────────────────────────────────────┤
│ • articulo.id                               │
│ • articulo.codigo          ← Arrastra       │
│ • articulo.descripcion                      │
│ • articulo.precio                           │
│ • existencia_bodega.cantidad                │
│ • bodega.nombre                             │
│                                             │
│                          Mapear             │
│                            ↓                │
│                    itemCode ✓               │
│                    itemName ✓               │
│                    quantity ✓               │
│                    warehouseId ✓            │
│                    cost ✓                   │
│                                             │
│ Derecha: Campos Cigua (Estándar)           │
└─────────────────────────────────────────────┘

Resultado:
{
  fieldMappings: [
    {
      sourceField: "articulo.codigo",
      targetField: "itemCode",
      dataType: "string"
    },
    {
      sourceField: "articulo.descripcion",
      targetField: "itemName",
      dataType: "string"
    },
    {
      sourceField: "existencia_bodega.cantidad",
      targetField: "quantity",
      dataType: "number"
    },
    ...
  ]
}
```

---

### **FASE 5: PREVIEW Y VALIDACIÓN**

```
Usuario → Click "Vista Previa"
          ↓
Frontend construye SQL:
SELECT
  a.codigo as itemCode,
  a.descripcion as itemName,
  a.precio as price,
  e.cantidad as quantity,
  b.nombre as warehouseName
FROM articulo a
INNER JOIN existencia_bodega e ON a.id = e.articulo_id
INNER JOIN bodega b ON e.bodega_id = b.id
LIMIT 10
          ↓
Frontend llama: POST /erp-connections/conn_123/preview-query
Body: {
  sql: "SELECT a.codigo as itemCode...",
  limit: 10
}
          ↓
Backend ejecuta query contra Catelli
          ↓
Response: {
  data: [
    {
      itemCode: "ART-001",
      itemName: "Producto A",
      price: 100.00,
      quantity: 50,
      warehouseName: "Bodega Principal"
    },
    {
      itemCode: "ART-002",
      itemName: "Producto B",
      price: 200.00,
      quantity: 30,
      warehouseName: "Bodega Secundaria"
    }
  ]
}
          ↓
Frontend muestra tabla con datos reales de Catelli
          ↓
Usuario: ✅ "Se ve bien, guardar"
```

**Endpoint:**
```
POST /api/erp-connections/conn_123/preview-query

Body: {
  sql: "SELECT a.codigo as itemCode...",
  limit: 10
}

Response: {
  data: [
    { itemCode: "ART-001", itemName: "Producto A", ... },
    { itemCode: "ART-002", itemName: "Producto B", ... }
  ]
}
```

---

### **FASE 6: GUARDAR MAPPING**

```
Mapping guardado en BD Cigua:
┌────────────────────────────────────────────────┐
│ MappingConfig:                                 │
│                                                │
│ {                                              │
│   id: "map_456",                              │
│   companyId: "company_789",                   │
│   erpConnectionId: "conn_123",                │
│   datasetType: "ITEMS",                       │
│   mainTable: {                                 │
│     name: "articulo",                         │
│     alias: "a"                                 │
│   },                                           │
│   joins: [                                     │
│     {                                          │
│       name: "existencia_bodega",              │
│       alias: "e",                             │
│       joinType: "INNER",                      │
│       joinCondition: "a.id = e.articulo_id"  │
│     },                                         │
│     {                                          │
│       name: "bodega",                         │
│       alias: "b",                             │
│       joinType: "INNER",                      │
│       joinCondition: "e.bodega_id = b.id"    │
│     }                                          │
│   ],                                           │
│   fieldMappings: [                            │
│     {                                          │
│       sourceField: "a.codigo",                │
│       targetField: "itemCode",                │
│       dataType: "string"                      │
│     },                                         │
│     ...                                        │
│   ],                                           │
│   filters: [                                   │
│     {                                          │
│       field: "a.activo",                      │
│       operator: "=",                          │
│       value: 1                                 │
│     }                                          │
│   ],                                           │
│   isActive: true                              │
│ }                                              │
│                                                │
│ Guardado en: MappingConfig table              │
└────────────────────────────────────────────────┘
```

---

### **FASE 7: CARGAR DATOS A CIGUA (TODO - Próximo paso)**

```
Usuario → Inventory → Load from ERP
          ↓
    1. Selecciona MappingConfig (map_456) - ITEMS
    2. Selecciona Warehouse (bodega_principal)
    3. Click "Cargar"
          ↓
Backend:
    1. Obtiene mapping (map_456)
    2. Obtiene conexión ERP (conn_123)
    3. Conecta a Catelli
    4. Ejecuta SQL según mapping
    5. Transforma datos según fieldMappings
    6. Inserta en InventoryCount + InventoryCount_Item
    7. Establece status = DRAFT (listo para contar)
          ↓
Frontend:
    ✅ "Se cargaron 1250 items para contar"
```

---

### **FASE 8: CONTEO FÍSICO**

```
Usuario → Inventory → Iniciar Conteo (INV-2026-02-001)
          ↓
    Muestra InventoryCount_Item con:
    • itemCode: "ART-001"
    • itemName: "Producto A"
    • systemQty: 50 (desde Catelli)
    • countedQty: ??? (usuario ingresa)
          ↓
Usuario cuenta físicamente y ingresa:
    countedQty: 48
          ↓
Sistema calcula:
    difference: 48 - 50 = -2
    variancePercent: (-2 / 50) * 100 = -4%
          ↓
Guarda en VarianceReport
```

---

### **FASE 9: APROBACIÓN Y AJUSTE**

```
Supervisor revisa varianzas:
    ART-001: -2 items (-4%)
    ART-002: +5 items (+16.6%)
    ...
          ↓
    Aprueba las que son aceptables
    Rechaza/marca para investigación las que no
          ↓
    Aprueba conteo general
          ↓
Status: APPROVED
```

---

### **FASE 10: ENVIAR A CATELLI (TODO - Próximo paso)**

```
Backend:
    1. Obtiene InventoryCount aprobado
    2. Para cada VarianceReport aprobado:
       • Obtiene itemCode, difference
       • Actualiza existencia_bodega en Catelli
       • quantity_nueva = quantity_vieja + difference
    3. Registra en Catelli log de ajuste
          ↓
Catelli:
    existencia_bodega.cantidad ACTUALIZADO

Cigua:
    Status = ADJUSTED
    InventoryAdjustment registrado
```

---

## 🏛️ ESTRUCTURA TÉCNICA

### **Backend (apps/backend)**

```
src/modules/erp-connections/
├── erp-introspection.ts (NUEVO)
│   └── ERPIntrospectionService
│       ├── getAvailableTables() → Tabla SQL
│       ├── getTableSchema() → Columnas, tipos, etc.
│       ├── previewQuery() → Datos reales
│       └── mapSQLType() → Convierte tipos
│
├── mssql-connector.ts (EXISTENTE)
│   └── MSSQLConnector
│       ├── connect()
│       ├── executeQuery()
│       └── disconnect()
│
├── controller.ts (MODIFICADO)
│   └── Nuevos endpoints:
│       ├── getAvailableTables()
│       ├── getTableSchemas()
│       └── previewQuery()
│
└── routes.ts (MODIFICADO)
    └── Nuevas rutas:
        ├── GET /erp-connections/:id/tables
        ├── POST /erp-connections/:id/table-schemas
        └── POST /erp-connections/:id/preview-query
```

---

### **Frontend (apps/web)**

```
src/
├── pages/
│   ├── MappingConfigAdminPage.tsx (EXISTENTE - usa QueryBuilder + FieldMappingBuilder)
│   │
│   ├── LoadInventoryFromERP.tsx (TODO)
│   │   └── Carga datos según mapping
│   │
│   └── InventoryCountPage.tsx (EXISTENTE - conteo físico)
│
├── components/
│   ├── QueryBuilder.tsx (MODIFICADO - ahora dinámico)
│   │   └── Obtiene tablas de /erp-connections/:id/tables
│   │
│   ├── FieldMappingBuilder.tsx (MODIFICADO - ahora dinámico)
│   │   └── Obtiene campos de /erp-connections/:id/table-schemas
│   │
│   └── QueryPreview.tsx (TODO)
│       └── Muestra preview de datos con /erp-connections/:id/preview-query
│
└── hooks/
    ├── useERPConnection.ts (NUEVO)
    │   └── Hook para conectar y obtener datos del ERP
    │
    ├── useERPTables.ts (NUEVO)
    │   └── Hook para obtener tablas dinámicamente
    │
    └── useERPTableSchema.ts (NUEVO)
        └── Hook para obtener estructura de tabla
```

---

## 🔌 ENDPOINTS API

### **1. Obtener tablas disponibles**

```http
GET /api/erp-connections/:connectionId/tables

Response:
{
  "tables": [
    {
      "name": "articulo",
      "label": "Artículos",
      "columnCount": 15
    },
    {
      "name": "existencia_bodega",
      "label": "Existencias por Bodega",
      "columnCount": 6
    },
    ...
  ]
}
```

---

### **2. Obtener esquema de tablas**

```http
POST /api/erp-connections/:connectionId/table-schemas

Body:
{
  "tableNames": ["articulo", "existencia_bodega", "bodega"]
}

Response:
{
  "schemas": [
    {
      "name": "articulo",
      "columns": [
        {
          "name": "id",
          "type": "number",
          "isPrimaryKey": true,
          "isNullable": false
        },
        {
          "name": "codigo",
          "type": "string",
          "maxLength": 50,
          "isNullable": false
        },
        {
          "name": "descripcion",
          "type": "string",
          "maxLength": 255,
          "isNullable": true
        },
        {
          "name": "precio",
          "type": "number",
          "isNullable": true
        },
        ...
      ]
    },
    ...
  ]
}
```

---

### **3. Preview de query**

```http
POST /api/erp-connections/:connectionId/preview-query

Body:
{
  "sql": "SELECT a.codigo, a.descripcion, a.precio, e.cantidad FROM articulo a INNER JOIN existencia_bodega e ON a.id = e.articulo_id LIMIT 10",
  "limit": 10
}

Response:
{
  "data": [
    {
      "codigo": "ART-001",
      "descripcion": "Producto A",
      "precio": 100.00,
      "cantidad": 50
    },
    {
      "codigo": "ART-002",
      "descripcion": "Producto B",
      "precio": 200.00,
      "cantidad": 30
    }
  ]
}
```

---

## 🎨 COMPONENTES FRONTEND

### **QueryBuilder.tsx (Dinámico)**

```tsx
const QueryBuilder = ({ onChange, onPreview, initialState }) => {
  const [connectionId, setConnectionId] = useState(null);
  const [tables, setTables] = useState<AvailableTable[]>([]);
  const [selectedTableSchema, setSelectedTableSchema] = useState<TableSchema | null>(null);

  // Cargar tablas cuando se selecciona conexión
  useEffect(() => {
    if (!connectionId) return;

    const loadTables = async () => {
      const response = await apiClient.get(
        `/erp-connections/${connectionId}/tables`
      );
      setTables(response.data.tables);
    };

    loadTables();
  }, [connectionId]);

  // Cargar estructura cuando se selecciona tabla
  const handleSelectTable = async (tableName: string) => {
    const response = await apiClient.post(
      `/erp-connections/${connectionId}/table-schemas`,
      { tableNames: [tableName] }
    );
    setSelectedTableSchema(response.data.schemas[0]);
  };

  // ... resto del componente
};
```

---

### **FieldMappingBuilder.tsx (Dinámico)**

```tsx
const FieldMappingBuilder = ({ datasetType, mainTable, joins = [], mappings, onChange }) => {
  const [connectionId, setConnectionId] = useState(null);
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);

  // Cargar campos cuando cambia la tabla o joins
  useEffect(() => {
    if (!mainTable || !connectionId) return;

    const loadFields = async () => {
      const tableNames = [mainTable, ...joins.map(j => j.name)];
      const response = await apiClient.post(
        `/erp-connections/${connectionId}/table-schemas`,
        { tableNames }
      );

      // Convertir schemas a AvailableField
      const fields = response.data.schemas.flatMap((schema: TableSchema) =>
        schema.columns.map(col => ({
          name: `${schema.name}.${col.name}`,
          table: schema.name,
          type: col.type,
        }))
      );

      setAvailableFields(fields);
    };

    loadFields();
  }, [mainTable, joins, connectionId]);

  // ... resto del componente (drag-drop, etc.)
};
```

---

## 📝 EJEMPLO PRÁCTICO PASO A PASO

### **Escenario: Cargar artículos y su stock de Catelli**

#### **Paso 1: Crear Conexión a Catelli**

```
1. Va a Settings → ERP Connections
2. Click "+ Nueva Conexión"
3. Completa:
   - Host: catelli.miempresa.com
   - Port: 1433
   - Database: Catelli
   - Username: sa
   - Password: xxxxxx
4. Click "Probar Conexión"
5. ✅ "Conexión exitosa"
6. Click "Guardar"
```

Backend: Guarda ERPConnection con ID: `conn_abc123`

---

#### **Paso 2: Crear Mapping**

```
1. Va a Settings → ERP Mapping
2. Click "+ Nuevo Mapping"
3. Selecciona Dataset Type: "ITEMS"
```

Frontend hace: `GET /api/erp-connections/conn_abc123/tables`

Backend retorna:
```json
{
  "tables": [
    { "name": "articulo", "label": "Artículos", "columnCount": 15 },
    { "name": "existencia_bodega", "label": "Existencias", "columnCount": 6 },
    { "name": "bodega", "label": "Bodegas", "columnCount": 5 },
    { "name": "articulo_precio", "label": "Precios", "columnCount": 4 }
  ]
}
```

---

#### **Paso 3: Seleccionar Tabla Principal**

```
Usuario: Selecciona "articulo"
```

Frontend hace: `POST /api/erp-connections/conn_abc123/table-schemas`
```json
{
  "tableNames": ["articulo"]
}
```

Backend retorna estructura completa de la tabla `articulo`:
```json
{
  "schemas": [{
    "name": "articulo",
    "columns": [
      { "name": "id", "type": "number", "isPrimaryKey": true },
      { "name": "codigo", "type": "string", "maxLength": 50 },
      { "name": "descripcion", "type": "string", "maxLength": 255 },
      { "name": "nombre", "type": "string", "maxLength": 100 },
      { "name": "unidad", "type": "string", "maxLength": 20 },
      { "name": "precio_base", "type": "number" },
      { "name": "costo", "type": "number" },
      { "name": "activo", "type": "boolean" },
      { "name": "categoria_id", "type": "number" },
      ...
    ]
  }]
}
```

---

#### **Paso 4: Agregar JOIN**

```
Usuario necesita stock, así que agrega JOIN:
- Tabla: existencia_bodega
- Alias: e
- Tipo: LEFT JOIN
- Condición: articulo.id = existencia_bodega.articulo_id
```

Frontend hace nuevamente:
`POST /api/erp-connections/conn_abc123/table-schemas`
```json
{
  "tableNames": ["articulo", "existencia_bodega", "bodega"]
}
```

Backend retorna estructura de las 3 tablas

---

#### **Paso 5: Mapear Campos**

En el FieldMappingBuilder, usuario ve:

**Izquierda (Catelli - Dinámico):**
- articulo.codigo
- articulo.descripcion
- articulo.nombre
- articulo.unidad
- articulo.precio_base
- existencia_bodega.cantidad
- bodega.nombre
- bodega.codigo

**Derecha (Cigua - Estándar para ITEMS):**
- itemCode
- itemName
- description
- unit
- category

Usuario mapea:
```
articulo.codigo → itemCode
articulo.descripcion → itemName
articulo.nombre → description
articulo.unidad → unit
existencia_bodega.cantidad → quantity
bodega.nombre → warehouseName
```

---

#### **Paso 6: Preview**

Usuario hace click en "Vista Previa"

Frontend construye SQL:
```sql
SELECT
  a.codigo as itemCode,
  a.descripcion as itemName,
  a.nombre as description,
  a.unidad as unit,
  e.cantidad as quantity,
  b.nombre as warehouseName
FROM articulo a
LEFT JOIN existencia_bodega e ON a.id = e.articulo_id
LEFT JOIN bodega b ON e.bodega_id = b.id
LIMIT 10
```

Frontend hace:
`POST /api/erp-connections/conn_abc123/preview-query`
```json
{
  "sql": "SELECT a.codigo as itemCode...",
  "limit": 10
}
```

Backend ejecuta contra Catelli y retorna:
```json
{
  "data": [
    {
      "itemCode": "ART-001",
      "itemName": "Paquete De Prueba",
      "description": "Desc Larga",
      "unit": "Cajas",
      "quantity": 50,
      "warehouseId": "BODPPAL"
    },
    ...
  ]
}
```

Frontend muestra tabla con datos reales ✅

---

#### **Paso 7: Guardar Mapping**

Usuario: Click "Guardar"

Backend guarda en `MappingConfig`:
```json
{
  "id": "map_xyz789",
  "companyId": "company_abc",
  "erpConnectionId": "conn_abc123",
  "datasetType": "ITEMS",
  "mainTable": {
    "name": "articulo",
    "alias": "a"
  },
  "joins": [
    {
      "name": "existencia_bodega",
      "alias": "e",
      "joinType": "LEFT",
      "joinCondition": "a.id = e.articulo_id"
    },
    {
      "name": "bodega",
      "alias": "b",
      "joinType": "LEFT",
      "joinCondition": "e.bodega_id = b.id"
    }
  ],
  "fieldMappings": [
    { "sourceField": "a.codigo", "targetField": "itemCode", "dataType": "string" },
    { "sourceField": "a.descripcion", "targetField": "itemName", "dataType": "string" },
    ...
  ],
  "isActive": true
}
```

✅ "Mapping guardado correctamente"

---

## 🚀 PRÓXIMAS FASES (TODO)

1. **LoadInventoryFromERP Service** - Cargar datos según mapping
2. **InventoryAdjustment Updates** - Enviar cambios de vuelta a Catelli
3. **Bulk Operations** - Cargar múltiples mappings simultáneamente
4. **Version Control** - Guardar histórico de cambios en mappings
5. **Data Validation** - Validar datos antes de cargar
6. **Scheduled Loads** - Cargas automáticas periódicas

---

## 📊 RESUMEN

| Componente | Responsabilidad | Estado |
|-----------|-----------------|--------|
| ERPIntrospectionService | Obtener estructura del ERP | ✅ Hecho |
| QueryBuilder (dinámico) | Construir SQL dinámicamente | 🔄 En progreso |
| FieldMappingBuilder (dinámico) | Mapear campos reales | 🔄 En progreso |
| LoadInventoryFromERP | Cargar datos a Cigua | ⏳ TODO |
| InventoryCountPage | Conteo físico | ✅ Hecho |
| VarianceReports | Análisis de diferencias | ✅ Hecho |
| Sync to ERP | Enviar resultados a Catelli | ⏳ TODO |

---

**Conclusión:** El sistema ahora obtiene dinámicamente estructura del ERP, permitiendo crear mappings flexibles basados en datos reales, sin hardcoding.
