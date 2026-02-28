# 🏗️ NUEVA ARQUITECTURA: Mapping Simplificado y Lógico

## 🎯 Principio

El usuario piensa así:
> "Necesito ARTICULO + EXISTENCIA_BODEGA + ARTICULO_PRECIO. Luego filtro por estado ACTIVO. Luego selecciono código, descripción, precio. Luego mapeo código→itemCode, descripción→itemName, etc."

Exacto. Eso es lo que vamos a implementar.

---

## 📋 FLUJO NUEVO (Paso a Paso)

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Seleccionar Tablas y JOINs                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tabla Principal: [ARTICULO ▼]                              │
│                                                             │
│ JOINs (Opcional):                                           │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [+] Agregar JOIN                                     │   │
│ │                                                      │   │
│ │ JOIN 1: EXISTENCIA_BODEGA                            │   │
│ │ ├─ Tabla: EXISTENCIA_BODEGA ▼                        │   │
│ │ ├─ Tipo: LEFT ▼                                      │   │
│ │ ├─ Condición: ARTICULO.id = EXISTENCIA_BODEGA.art_id│   │
│ │ └─ [x]                                               │   │
│ │                                                      │   │
│ │ JOIN 2: ARTICULO_PRECIO                              │   │
│ │ ├─ Tabla: ARTICULO_PRECIO ▼                          │   │
│ │ ├─ Tipo: LEFT ▼                                      │   │
│ │ ├─ Condición: ARTICULO.id = ARTICULO_PRECIO.art_id  │   │
│ │ └─ [x]                                               │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ [Siguiente]                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Agregar Filtros (Opcional)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Filtros:                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [+] Agregar Filtro                                   │   │
│ │                                                      │   │
│ │ Filtro 1:                                            │   │
│ │ ├─ Campo: ARTICULO.estado ▼                          │   │
│ │ ├─ Operador: = ▼                                     │   │
│ │ ├─ Valor: ACTIVO                                     │   │
│ │ └─ [x]                                               │   │
│ │                                                      │   │
│ │ Filtro 2:                                            │   │
│ │ ├─ Campo: EXISTENCIA_BODEGA.cantidad ▼              │   │
│ │ ├─ Operador: > ▼                                     │   │
│ │ ├─ Valor: 0                                          │   │
│ │ └─ [x]                                               │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ [Anterior] [Siguiente]                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Seleccionar Columnas ERP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ¿Qué columnas necesitas de Catelli?                        │
│                                                             │
│ De ARTICULO:                                               │
│ ☑ id                                                       │
│ ☑ codigo                                                   │
│ ☑ descripcion                                              │
│ ☑ precio_base                                              │
│ ☑ costo                                                    │
│ ☐ categoria_id                                             │
│ ☐ activo                                                   │
│ ☐ fecha_creacion                                           │
│                                                             │
│ De EXISTENCIA_BODEGA:                                      │
│ ☑ cantidad                                                 │
│ ☐ cantidad_comprometida                                    │
│ ☐ fecha_actualizacion                                      │
│                                                             │
│ De ARTICULO_PRECIO:                                        │
│ ☑ precio                                                   │
│ ☐ moneda                                                   │
│                                                             │
│ [Anterior] [Siguiente]                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASO 4: Mapear ERP → Local                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Izquierda (ERP Catelli)       Derecha (Local Cigua)        │
│                                                             │
│ ─────────────────────────────────────────────────────      │
│ ARTICULO.codigo   ──→   itemCode  *                        │
│ ARTICULO.descripcion ──→   itemName  *                     │
│ ARTICULO.precio_base ──→   price                           │
│ ARTICULO.costo    ──→   cost                               │
│ EXISTENCIA_BODEGA.cantidad ──→   quantity                  │
│ ARTICULO_PRECIO.precio ──→   salePrice                     │
│ ─────────────────────────────────────────────────────      │
│                                                             │
│ Campos locales disponibles:                                │
│ - itemCode * (requerido)                                   │
│ - itemName * (requerido)                                   │
│ - price (opcional)                                         │
│ - cost (opcional)                                          │
│ - quantity (opcional)                                      │
│ - salePrice (opcional)                                     │
│ - category (opcional)                                      │
│ - description (opcional)                                   │
│ - weight (opcional)                                        │
│ - packQty (opcional)                                       │
│                                                             │
│ [Anterior] [Guardar Mapping]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo Técnico

```
ENTRADA:
├─ Connection ID: "catelli_001"
└─ Dataset Type: "ITEMS"

PASO 1: Build Tables & JOINs
├─ Main Table: ARTICULO
├─ Joins:
│  ├─ EXISTENCIA_BODEGA (LEFT)
│  └─ ARTICULO_PRECIO (LEFT)
└─ Result: SQL FROM + JOINS definido

PASO 2: Add Filters
├─ Filter 1: ARTICULO.estado = 'ACTIVO'
├─ Filter 2: EXISTENCIA_BODEGA.cantidad > 0
└─ Result: SQL WHERE clause

PASO 3: Select Columns
├─ Seleccionar: codigo, descripcion, precio_base, costo, cantidad, precio
└─ Result: SQL SELECT clause

PASO 4: Field Mapping
├─ codigo → itemCode
├─ descripcion → itemName
├─ precio_base → price
├─ costo → cost
├─ cantidad → quantity
├─ precio → salePrice
└─ Result: Transformation rules

SALIDA: MappingConfig
{
  id: "mapping_items_001",
  connectionId: "catelli_001",
  datasetType: "ITEMS",
  mainTable: "ARTICULO",
  joins: [
    {table: "EXISTENCIA_BODEGA", type: "LEFT", condition: "..."},
    {table: "ARTICULO_PRECIO", type: "LEFT", condition: "..."}
  ],
  filters: [
    {field: "ARTICULO.estado", operator: "=", value: "ACTIVO"}
  ],
  selectedColumns: [
    "ARTICULO.codigo",
    "ARTICULO.descripcion",
    "ARTICULO.precio_base",
    "ARTICULO.costo",
    "EXISTENCIA_BODEGA.cantidad",
    "ARTICULO_PRECIO.precio"
  ],
  fieldMappings: [
    {source: "ARTICULO.codigo", target: "itemCode", type: "string"},
    {source: "ARTICULO.descripcion", target: "itemName", type: "string"},
    ...
  ]
}
```

---

## 🗂️ Componentes a Crear

### 1. `SimpleMappingBuilder.tsx`
Componente padre que orquesta los 4 pasos.

```typescript
const SimpleMappingBuilder: React.FC<Props> = ({
  connectionId,
  datasetType,
  onSave,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [config, setConfig] = useState<MappingConfig>({...});

  return (
    <div>
      {step === 1 && <TablesAndJoins config={config} onChange={setConfig} />}
      {step === 2 && <FiltersStep config={config} onChange={setConfig} />}
      {step === 3 && <SelectColumns config={config} onChange={setConfig} />}
      {step === 4 && <FieldMapping config={config} onChange={setConfig} onSave={onSave} />}

      <Navigation step={step} onNext={() => setStep(step + 1)} onPrev={() => setStep(step - 1)} />
    </div>
  );
};
```

### 2. `TablesAndJoins.tsx`
Paso 1: Seleccionar tabla principal y agregar JOINs.

### 3. `FiltersStep.tsx`
Paso 2: Agregar filtros WHERE.

### 4. `SelectColumns.tsx`
Paso 3: Seleccionar columnas a traer.

### 5. `FieldMapping.tsx`
Paso 4: Mapear campos ERP ↔ Local (drag & drop).

---

## 📊 Estructura de MappingConfig (Nueva)

```typescript
interface MappingConfig {
  id?: string;
  connectionId: string;
  datasetType: 'ITEMS' | 'STOCK' | 'PRICES' | 'COST';

  // PASO 1: Tablas
  mainTable: string;  // "ARTICULO"
  joins: Array<{
    table: string;  // "EXISTENCIA_BODEGA"
    alias: string;  // "eb"
    joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    joinCondition: string;  // "ARTICULO.id = eb.articulo_id"
  }>;

  // PASO 2: Filtros
  filters: Array<{
    field: string;  // "ARTICULO.estado"
    operator: '=' | '!=' | '>' | '<' | 'IN' | 'LIKE';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;

  // PASO 3: Columnas seleccionadas
  selectedColumns: string[];  // ["ARTICULO.codigo", "ARTICULO.descripcion", ...]

  // PASO 4: Mapeo de campos
  fieldMappings: Array<{
    source: string;  // "ARTICULO.codigo"
    target: string;  // "itemCode"
    dataType: 'string' | 'number' | 'date' | 'boolean';
    transformation?: string;  // opcional: expresiones complejas
  }>;

  // Meta
  isActive?: boolean;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## ✅ Ventajas de la Nueva Arquitectura

1. **Lógico**: Paso a paso, como el usuario piensa
2. **Simple**: Sin QueryBuilder complejo
3. **Transparente**: Usuario ve exactamente qué está haciendo
4. **Flexible**: Soporta JOINs, filtros, selección de columnas
5. **Mantenible**: Cada paso es un componente simple
6. **Escalable**: Fácil agregar más pasos o validaciones

---

## 🔧 Plan de Implementación

1. **Crear estructura base** (SimpleMappingBuilder)
2. **Paso 1**: Interfaz para tablas y JOINs
3. **Paso 2**: Interfaz para filtros
4. **Paso 3**: Interfaz para seleccionar columnas
5. **Paso 4**: Interfaz para mapear campos
6. **Testing**: Verificar que funciona end-to-end
7. **Deploy**: Reemplazar MappingConfigAdminPage

---

## 📝 Ejemplo de Uso

```typescript
// Usuario va a MappingConfigAdminPage
// Hace click en "Crear Nuevo Mapping"

// PASO 1: Selecciona tabla ARTICULO, agrega JOINs
mapping = {
  mainTable: "ARTICULO",
  joins: [
    {table: "EXISTENCIA_BODEGA", type: "LEFT", condition: "..."},
  ]
}

// PASO 2: Agrega filtro
mapping.filters = [
  {field: "ARTICULO.estado", operator: "=", value: "ACTIVO"}
]

// PASO 3: Selecciona columnas
mapping.selectedColumns = [
  "ARTICULO.codigo",
  "ARTICULO.descripcion",
  "ARTICULO.costo",
  "EXISTENCIA_BODEGA.cantidad"
]

// PASO 4: Mapea campos
mapping.fieldMappings = [
  {source: "ARTICULO.codigo", target: "itemCode", type: "string"},
  {source: "ARTICULO.descripcion", target: "itemName", type: "string"},
  {source: "ARTICULO.costo", target: "cost", type: "number"},
  {source: "EXISTENCIA_BODEGA.cantidad", target: "systemQty", type: "number"}
]

// Guarda
POST /mapping-configs
Body: mapping
Response: {id: "mapping_items_001", ...mapping}

// Listo para usar en Fase 2 (Cargar Inventario)
```

