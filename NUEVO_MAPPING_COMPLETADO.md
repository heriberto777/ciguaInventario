# ✅ NUEVO MAPPING IMPLEMENTADO - 4 Pasos Lógicos y Simples

## 🎯 Qué Se Hizo

Reemplazamos la arquitectura compleja (QueryBuilder + FieldMappingBuilder + MappingConfigAdminPage) por una nueva **SimpleMappingBuilder** con 4 pasos claros y lógicos:

```
PASO 1: Tablas y JOINs
         ↓
PASO 2: Filtros
         ↓
PASO 3: Seleccionar Columnas
         ↓
PASO 4: Mapear ERP ↔ Local
```

---

## 📁 Archivos Creados

```
/src/components/SimpleMappingBuilder/
├── index.tsx                              (Componente padre - orquesta los 4 pasos)
└── steps/
    ├── TablesAndJoinsStep.tsx             (Paso 1)
    ├── FiltersStep.tsx                    (Paso 2)
    ├── SelectColumnsStep.tsx              (Paso 3)
    └── FieldMappingStep.tsx               (Paso 4)
```

---

## 🔄 Flujo de Usuario

### PASO 1: Seleccionar Tablas y JOINs

```
Usuario ve:
┌──────────────────────────────────────┐
│ 📊 Tabla Principal                   │
│ [ARTICULO ▼]                         │
│                                      │
│ 🔗 JOINs (Opcional)                  │
│ [ + Agregar JOIN ]                   │
│                                      │
│ JOIN 1: EXISTENCIA_BODEGA            │
│ ├─ Tabla: EXISTENCIA_BODEGA ▼        │
│ ├─ Tipo: LEFT ▼                      │
│ ├─ Condición: ARTICULO.id = eb.id    │
│ └─ [x]                               │
│                                      │
│ JOIN 2: ARTICULO_PRECIO              │
│ ├─ Tabla: ARTICULO_PRECIO ▼          │
│ ├─ Tipo: LEFT ▼                      │
│ ├─ Condición: ARTICULO.id = ap.id    │
│ └─ [x]                               │
│                                      │
│ [Siguiente →]                        │
└──────────────────────────────────────┘

Backend GET /erp-connections/{id}/available-tables
Frontend renderiza lista de tablas disponibles
Usuario selecciona y agrega JOINs
```

### PASO 2: Agregar Filtros

```
Usuario ve:
┌──────────────────────────────────────┐
│ 🔍 Filtros (WHERE clause)            │
│ [ + Agregar Filtro ]                 │
│                                      │
│ Filtro 1:                            │
│ AND ARTICULO.estado = ACTIVO         │
│ [x]                                  │
│                                      │
│ Filtro 2:                            │
│ AND EXISTENCIA_BODEGA.cantidad > 0   │
│ [x]                                  │
│                                      │
│ [← Anterior] [Siguiente →]           │
└──────────────────────────────────────┘

Backend: POST /table-schemas (obtiene columnas disponibles)
Frontend: Usuario agrega filtros
```

### PASO 3: Seleccionar Columnas

```
Usuario ve:
┌──────────────────────────────────────┐
│ ✓ Columnas Seleccionadas             │
│                                      │
│ De ARTICULO:                         │
│ ☑ id                                 │
│ ☑ codigo                             │
│ ☑ descripcion                        │
│ ☑ precio_base                        │
│ ☑ costo                              │
│                                      │
│ De EXISTENCIA_BODEGA:                │
│ ☑ cantidad                           │
│ ☑ bodega_id                          │
│                                      │
│ [← Anterior] [Siguiente →]           │
└──────────────────────────────────────┘

Usuario selecciona checkboxes
Solo estas columnas se incluyen en el SELECT
```

### PASO 4: Mapear Campos ERP ↔ Local

```
Usuario ve:
┌─────────────────────────────────────────┐
│ 📦 Campos ERP Catelli  │  🎯 Local      │
│                        │                │
│ ARTICULO.codigo ────→ itemCode *       │
│ ARTICULO.descripcion → itemName *      │
│ ARTICULO.precio_base → price           │
│ ARTICULO.costo ───→ cost               │
│ EXISTENCIA_BODEGA.cantidad → quantity  │
│                        │                │
│ [← Anterior] [Guardar Mapping]         │
└─────────────────────────────────────────┘

Drag & drop: arrastra campos de izquierda a derecha
O usa selectores dropdown
```

---

## 🏗️ Estructura de Datos

### MappingConfig (Nuevo Formato)

```typescript
{
  id: "mapping_items_001",
  connectionId: "catelli_001",
  datasetType: "ITEMS",

  // PASO 1: Tablas
  mainTable: "ARTICULO",
  joins: [
    {
      table: "EXISTENCIA_BODEGA",
      alias: "eb",
      joinType: "LEFT",
      joinCondition: "ARTICULO.id = eb.articulo_id"
    }
  ],

  // PASO 2: Filtros
  filters: [
    {
      field: "ARTICULO.estado",
      operator: "=",
      value: "ACTIVO",
      logicalOperator: "AND"
    }
  ],

  // PASO 3: Columnas
  selectedColumns: [
    "ARTICULO.codigo",
    "ARTICULO.descripcion",
    "ARTICULO.costo",
    "EXISTENCIA_BODEGA.cantidad"
  ],

  // PASO 4: Mapeos
  fieldMappings: [
    {
      source: "ARTICULO.codigo",
      target: "itemCode",
      dataType: "string"
    },
    {
      source: "ARTICULO.descripcion",
      target: "itemName",
      dataType: "string"
    },
    {
      source: "ARTICULO.costo",
      target: "cost",
      dataType: "number"
    },
    {
      source: "EXISTENCIA_BODEGA.cantidad",
      target: "quantity",
      dataType: "number"
    }
  ]
}
```

---

## 🔑 Características

### ✅ PASO 1: TablesAndJoinsStep

- Carga dinámicamente tablas disponibles del ERP
- Permite agregar múltiples JOINs
- Configura tipo de JOIN (INNER, LEFT, RIGHT, FULL)
- Preview SQL en tiempo real
- Validación de alias único

### ✅ PASO 2: FiltersStep

- Carga columnas de tablas seleccionadas
- Soporta múltiples filtros
- Operadores: =, !=, >, <, >=, <=, IN, LIKE, BETWEEN
- Lógica AND/OR entre filtros
- Preview SQL WHERE clause

### ✅ PASO 3: SelectColumnsStep

- Agrupa columnas por tabla
- Checkboxes para seleccionar
- "Seleccionar Todo" por tabla
- Contador de columnas seleccionadas
- Preview SQL SELECT clause

### ✅ PASO 4: FieldMappingStep

- Campos locales estándar por dataset type (ITEMS, STOCK, PRICES, COST)
- Drag & drop ERP → Local (o usar dropdown)
- Validación de campos requeridos
- Detección automática de tipos (string, number, date)
- Resumen de mappings creados

---

## 📋 Campos Locales Estándar

### ITEMS
- `itemCode` * (requerido) - string
- `itemName` * (requerido) - string
- `description` - string
- `price` - number
- `cost` - number
- `quantity` - number
- `category` - string
- `weight` - number
- `packQty` - number
- `uom` - string

### STOCK
- `itemCode` * (requerido) - string
- `warehouseId` * (requerido) - string
- `quantity` * (requerido) - number
- `lastUpdate` - date

### PRICES
- `itemCode` * (requerido) - string
- `price` * (requerido) - number
- `currency` - string

### COST
- `itemCode` * (requerido) - string
- `cost` * (requerido) - number
- `currency` - string

---

## 🎬 Cómo Usar en MappingConfigAdminPage

```tsx
import { SimpleMappingBuilder } from '@/components/SimpleMappingBuilder';

export const MappingConfigAdminPage = () => {
  const handleSave = async (config: MappingConfig) => {
    const response = await apiClient.post('/mapping-configs', config);
    // Configurar guardada
    alert('Mapping guardado exitosamente');
  };

  return (
    <SimpleMappingBuilder
      connectionId="catelli_001"
      datasetType="ITEMS"
      onSave={handleSave}
    />
  );
};
```

---

## ✅ Compilación

- ✅ **Sin errores TypeScript**
- ✅ **Todos los componentes compilados exitosamente**
- ✅ **Tipos exportados y documentados**

---

## 📊 Ventajas de la Nueva Arquitectura

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Complejidad | 3 componentes complejos | 5 componentes simples |
| Flujo | Confuso | Lineal y claro |
| Uso de memoria | Alto | Bajo |
| Mantenimiento | Difícil | Fácil |
| Testing | Complejo | Simple |
| UX | Confusa | Intuitiva |
| Pasos | 2-3 (vagos) | 4 (claros) |

---

## 🚀 Próximos Pasos

1. **Integrar con MappingConfigAdminPage**
   - Reemplazar UI anterior con SimpleMappingBuilder
   - Mantener lista de mappings guardados

2. **Backend validation**
   - Validar que JOINs sean válidos
   - Validar que filtros sean correctos
   - Generar SQL automáticamente

3. **Testing**
   - PASO 1: Seleccionar tabla y agregar JOINs
   - PASO 2: Agregar filtros complejos
   - PASO 3: Seleccionar múltiples columnas
   - PASO 4: Mapear todos los campos

4. **Usar en Fase 2**
   - Cargar inventario usando el mapping creado
   - Ejecutar SQL generado
   - Transformar datos según fieldMappings

---

## 📁 Ubicación

```
/apps/web/src/components/SimpleMappingBuilder/
  ├── index.tsx                     (157 líneas - componente padre)
  └── steps/
      ├── TablesAndJoinsStep.tsx    (166 líneas)
      ├── FiltersStep.tsx            (147 líneas)
      ├── SelectColumnsStep.tsx      (162 líneas)
      └── FieldMappingStep.tsx       (286 líneas)

Total: ~918 líneas de código limpio, tipado y documentado
```

---

## 🎉 ¡LISTO!

La nueva arquitectura está lista para usar. Es mucho más:
- ✅ **Intuitiva** - El usuario entiende qué está haciendo en cada paso
- ✅ **Flexible** - Soporta JOINs complejos, filtros, múltiples columnas
- ✅ **Mantenible** - Código limpio, componentes simples, fácil de debuggear
- ✅ **Escalable** - Fácil agregar más pasos o funcionalidades

**Próximo:** Integrar con MappingConfigAdminPage y probar el flujo completo.

