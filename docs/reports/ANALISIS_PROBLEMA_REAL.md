# 🔍 ANÁLISIS PROFUNDO - ¿Qué REALMENTE Funciona y Qué FALTA?

## 📊 ESTADO ACTUAL DEL SISTEMA

### ✅ LO QUE EXISTE (Backend)

1. **ERPIntrospectionService** - Obtiene dinámicamente tablas y columnas de Catelli
   - ✅ `getAvailableTables()` - Lista todas las tablas (ARTICULO, EXISTENCIA_BODEGA, etc.)
   - ✅ `getTableSchema(tableName)` - Obtiene columnas, tipos, constraints
   - ✅ `getTableSchemas(tableNames)` - Batch para múltiples tablas
   - **Backend: 100% Funcional**

2. **MSSQL Connector**
   - ✅ Conecta a BD Catelli
   - ✅ Ejecuta queries dinámicas
   - ✅ Gestiona connection pooling
   - **Backend: 100% Funcional**

3. **Endpoints en Backend**
   - ✅ `POST /erp-connections/{id}/available-tables` - Retorna lista de tablas
   - ✅ `POST /erp-connections/{id}/table-schemas` - Retorna columnas de tabla(s)
   - **Backend: 100% Funcional**

### ⚠️ LO QUE EXISTE (Frontend) PERO ESTÁ INCOMPLETO

1. **QueryBuilder.tsx**
   - ✅ UI para seleccionar tabla (paso 1)
   - ✅ UI para seleccionar columnas (paso 2)
   - ✅ UI para agregar JOINs (paso 3)
   - ✅ UI para filtros (paso 4)
   - ⚠️ **PROBLEMA**: No se está llamando a `onChange` cuando el usuario selecciona tabla
   - ⚠️ **PROBLEMA**: El estado local se actualiza pero NO notifica al padre
   - ⚠️ **PROBLEMA**: El componente FieldMappingBuilder nunca recibe la tabla seleccionada

2. **FieldMappingBuilder.tsx**
   - ✅ UI para mapear campos (drag & drop)
   - ✅ Llama `useEffect` para cargar campos disponibles
   - ⚠️ **PROBLEMA**: `mainTable` viene vacío porque QueryBuilder no propaga el onChange
   - ⚠️ **PROBLEMA**: Sin tabla, el useEffect retorna sin hacer nada
   - ⚠️ **PROBLEMA**: Los campos nunca se cargan

3. **MappingConfigAdminPage.tsx**
   - ✅ UI padre que orquesta el flujo
   - ✅ Gestiona formulario con formData
   - ✅ Hace mutaciones para guardar mappings
   - ⚠️ **PROBLEMA**: El QueryBuilder no notifica cambios al padre
   - ⚠️ **PROBLEMA**: formData.mainTable nunca se actualiza
   - ⚠️ **PROBLEMA**: FieldMappingBuilder no se renderiza correctamente

---

## 🎯 EL FLUJO QUE DEBERÍA FUNCIONAR

```
1. Usuario abre MappingConfigAdminPage
   ↓
2. Selecciona conexión ERP (ej: "Catelli")
   ↓
3. En QueryBuilder, hace click en tabla (ej: "ARTICULO")
   ↓
   ❌ PROBLEMA: QueryBuilder.handleSelectTable() actualiza estado local
                pero NO llama onChange() al padre
   ↓
4. El padre (MappingConfigAdminPage) DEBERÍA recibir:
   - mainTable: "ARTICULO"
   - alias: "a"
   ↓
   ❌ PROBLEMA: formData.mainTable sigue vacío
   ↓
5. FieldMappingBuilder debería renderizarse:
   - Recibir mainTable="ARTICULO"
   - Ejecutar useEffect
   - Llamar POST /erp-connections/{id}/table-schemas
   - Obtener columnas: [id, codigo, descripcion, precio, ...]
   ↓
   ❌ PROBLEMA: mainTable vacío, useEffect retorna sin hacer nada
   ↓
6. Usuario no ve ningún campo disponible
   ↓
   ❌ PROBLEMA: "No hay campos disponibles"
```

---

## 🔴 RAÍZ DEL PROBLEMA

### El flujo está PARTIDO en 3 puntos:

1. **QueryBuilder NO propaga onChange**
   - Updatea estado local
   - NUNCA notifica al padre
   - Resultado: formData.mainTable queda vacío

2. **FieldMappingBuilder depende de mainTable**
   - Sin tabla, no carga campos
   - Sin cambio en dependencias, useEffect no se ejecuta
   - Resultado: No hace API call a /table-schemas

3. **No hay sincronización entre componentes**
   - Cada uno vive en su burbuja
   - No hay canal de comunicación
   - Resultado: Sistema muerto

---

## 🔧 LO QUE YA SE INTENTÓ ARREGLAR

- ✅ Se agregó `onChange(newQuery)` en QueryBuilder (6 funciones)
- ✅ Se agregó `mainTableAlias` prop en FieldMappingBuilder
- ✅ Se removió `setSaveSuccess` indefinido en MappingConfigAdminPage
- ❌ **PERO** El sistema AÚN NO FUNCIONA porque...

### El VERDADERO PROBLEMA:
La llamada a `onChange` en QueryBuilder puede no estar siendo RECIBIDA por el padre debido a cómo React maneja los callbacks en componentes controlados.

---

## 🎯 SOLUCIÓN PROPUESTA - OPCIÓN A: SIMPLIFICAR RADICALMENTE

En lugar de un sistema complejo con QueryBuilder + FieldMappingBuilder, propongo:

### ARQUITECTURA NUEVA (80% más simple):

```
┌─────────────────────────────────────────────────────────┐
│ MappingConfigAdminPage                                  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ PASO 1: Seleccionar Conexión y Dataset Type         ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ Connection: [Catelli ▼]  Dataset: [ITEMS ▼]     │││
│  │ └──────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ PASO 2: Seleccionar Tabla Principal                 ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ Tabla: [ARTICULO ▼]                              │││
│  │ │ (Carga automáticas al hacer click)               │││
│  │ │                                                   │││
│  │ │ Columnas disponibles en ARTICULO:                │││
│  │ │ - id                                              │││
│  │ │ - codigo                                          │││
│  │ │ - descripcion                                     │││
│  │ │ - precio                                          │││
│  │ │ - costo                                           │││
│  │ │ - ... (todas las columnas)                        │││
│  │ └──────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ PASO 3: Mapear Campos de ARTICULO                   ││
│  │ ┌─────────────────────────────────────────────────┐││
│  │ │ Lado Izquierdo        │      Lado Derecho       │││
│  │ │ (Campos Catelli)      │  (Campos Cigua)         │││
│  │ │                       │                         │││
│  │ │ - id ────────────────→ itemCode (string)        │││
│  │ │ - codigo              │  [opcional]             │││
│  │ │ - descripcion ────────→ itemName (string)       │││
│  │ │ - precio ─────────────→ price (number)          │││
│  │ │ - costo ──────────────→ cost (number)           │││
│  │ │ - ... (arrastra)      │  [disponible]           │││
│  │ └─────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ PASO 4: Agregar más Tablas (Opcional)              ││
│  │ [ + Agregar tabla adicional ]                       ││
│  │   (existencia_bodega, articulo_precio, etc.)        ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [ Guardar Mapping ]  [ Preview ]  [ Cancelar ]       ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### VENTAJAS:
1. **Más simple**: 1 componente en lugar de 3
2. **Más clara**: El flujo es lineal, sin confusiones
3. **Funciona**: Se sincroniza correctamente porque todo está en 1 lugar
4. **Mantenible**: Fácil de debuggear y extender

---

## 🎯 SOLUCIÓN PROPUESTA - OPCIÓN B: ARREGLAR LO EXISTENTE (SI QUIERES MANTENERLO)

### Paso 1: Verificar que onChange se está llamando

Agregar logging:

```typescript
// QueryBuilder.tsx - handleSelectTable
const handleSelectTable = (tableName: string) => {
  const newQuery = {
    ...query,
    mainTable: { name: tableName, alias: 'a' },
    selectedColumns: [],
    joins: [],
    filters: [],
  };
  setQuery(newQuery);
  console.log('DEBUG: QueryBuilder onChange called with:', newQuery); // ← AGREGAR
  onChange(newQuery); // ← Verificar que se ejecuta
  setStep(2);
};
```

### Paso 2: Verificar que el padre recibe el cambio

```typescript
// MappingConfigAdminPage.tsx - Línea 354
onChange={(query) => {
  console.log('DEBUG: MappingConfigAdminPage received query:', query); // ← AGREGAR
  updateField('mainTable', query.mainTable);
  updateField('joins', query.joins);
  updateField('filters', query.filters);
  updateField('orderBy', query.orderBy);
  updateField('limit', query.limit);
}}
```

### Paso 3: Verificar que FieldMappingBuilder recibe la tabla

```typescript
// FieldMappingBuilder.tsx - Dentro del useEffect
useEffect(() => {
  console.log('DEBUG: FieldMappingBuilder useEffect, mainTable =', mainTable); // ← AGREGAR
  if (!mainTable || !connectionId) {
    console.log('DEBUG: Exiting early - mainTable or connectionId missing');
    return;
  }
  // ... resto del código
}, [mainTable, joins, connectionId]);
```

### Paso 4: Si sigue sin funcionar, hacer un pequeño cambio en MappingConfigAdminPage:

```typescript
// Usar un estado local para forzar re-render
const [tableSelected, setTableSelected] = useState<{name: string, alias: string} | null>(null);

// Cuando se selecciona tabla:
onChange={(query) => {
  setTableSelected(query.mainTable); // ← Agregado
  updateField('mainTable', query.mainTable);
  // ...
}}

// Pasar al FieldMappingBuilder:
<FieldMappingBuilder
  mainTable={tableSelected?.name || formData.mainTable.name}  // ← Usar state local
  mainTableAlias={tableSelected?.alias || formData.mainTable.alias}
  // ...
/>
```

---

## 📋 DATOS QUE NECESITA EL SISTEMA

### TABLAS CATELLI (Lo que el usuario mencionó que FALTA):

```sql
-- Para ITEMS (artículos básicos):
SELECT
  codigo AS itemCode,
  descripcion AS itemName,
  [unidad de medida],  -- ← PESO_BRUTO o CANTIDAD_EMPAQUE
  precio AS price,
  costo AS cost
FROM articulo

-- Para STOCK (existencias por bodega):
SELECT
  articulo.codigo,
  articulo.descripcion,
  existencia_bodega.bodega_id,
  existencia_bodega.cantidad AS systemQty,
  bodega.nombre AS warehouseName
FROM articulo
JOIN existencia_bodega ON articulo.id = existencia_bodega.articulo_id
JOIN bodega ON existencia_bodega.bodega_id = bodega.id
```

### LO QUE EL USUARIO DIJO QUE NECESITA:

1. **PESO_BRUTO** (cantidad de unidades por empaque)
   - Viene de: `articulo.cantidad_empaque` o `articulo.unidad_empaque`
   - Campo que define la UDM (Unidad De Medida)

2. **COSTO**
   - Viene de: `articulo.costo` o `articulo_precio.costo`
   - Se mapea a: `cost` en Cigua

3. **EXISTENCIA** (cantidad en bodega)
   - Viene de: `existencia_bodega.cantidad`
   - Se mapea a: `systemQty` en Cigua

4. **ARTICULO_ID**
   - Viene de: `articulo.id`
   - Se mapea a: `itemCode` en Cigua

---

## ✅ RECOMENDACIÓN FINAL

Vamos por **OPCIÓN A (Simplificar)** porque:
1. El código actual es muy complejo y difícil de debuggear
2. El usuario está frustrado porque no ve progreso
3. Simplificar = funciona rápido = se ve progreso
4. Una vez simple y funcional, se puede expandir después

**Tiempo estimado:**
- Opción A: 2-3 horas (componente nuevo simple)
- Opción B: 4-5 horas (debuggear y arreglar complejidad existente)

---

## 🎬 PRÓXIMOS PASOS

1. **Decisión**: ¿Simplificamos o arreglamos lo existente?
2. **Implementación**: Según la decisión
3. **Testing**: Verificar que funciona de punta a punta
4. **Deployment**: Pasar a Fase 2 (Cargar Inventario)

