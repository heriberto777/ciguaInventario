# 📚 EJEMPLO PRÁCTICO: Cómo Usar el Nuevo Mapping

## Escenario: Cargar Artículos con Stock de Catelli

### 🎯 Objetivo
Obtener ARTICULOS con EXISTENCIA_BODEGA para hacer conteo de inventario.

Necesitamos:
- ✅ **código del artículo** (itemCode)
- ✅ **nombre del artículo** (itemName)
- ✅ **cantidad en bodega** (quantity)
- ✅ **costo unitario** (cost)

Además, filtramos por:
- ✅ **estado = ACTIVO** (solo artículos activos)
- ✅ **cantidad > 0** (solo items con stock)

---

## PASO 1: Seleccionar Tablas y JOINs

### Usuario Abre SimpleMappingBuilder

```
Conexión: Catelli
Dataset Type: ITEMS
```

### Paso 1 - Interfaz

```
📊 Tabla Principal
[ARTICULO ▼]  ← Usuario selecciona ARTICULO

🔗 JOINs (Opcional)
[+ Agregar JOIN]

JOIN 1:
├─ Tabla: [EXISTENCIA_BODEGA ▼]
├─ Alias: eb
├─ Tipo: [LEFT ▼]
├─ Condición: ARTICULO.id = eb.articulo_id
└─ [x] Eliminar

[← Anterior] [Siguiente →]
```

### Backend Calls

```
1. GET /erp-connections/catelli_001/available-tables
   Response: {
     tables: [
       {name: "ARTICULO", columnCount: 15},
       {name: "EXISTENCIA_BODEGA", columnCount: 8},
       {name: "ARTICULO_PRECIO", columnCount: 6},
       ...
     ]
   }

2. POST /erp-connections/catelli_001/table-schemas
   Body: {tableNames: ["ARTICULO", "EXISTENCIA_BODEGA"]}
   Response: {
     schemas: [
       {name: "ARTICULO", columns: [{name: "id", type: "INT", ...}, ...]},
       {name: "EXISTENCIA_BODEGA", columns: [...]}
     ]
   }
```

### SQL Generado (Preview)

```sql
SELECT *
FROM ARTICULO
LEFT JOIN EXISTENCIA_BODEGA eb
  ON ARTICULO.id = eb.articulo_id
```

---

## PASO 2: Agregar Filtros

### Usuario Continúa

```
🔍 Filtros (WHERE clause)
[+ Agregar Filtro]

Filtro 1:
AND [ARTICULO.estado ▼] [= ▼] [ACTIVO]
[x] Eliminar

Filtro 2:
AND [EXISTENCIA_BODEGA.cantidad ▼] [> ▼] [0]
[x] Eliminar

[← Anterior] [Siguiente →]
```

### SQL Generado (Preview)

```sql
WHERE
  ARTICULO.estado = 'ACTIVO'
  AND EXISTENCIA_BODEGA.cantidad > 0
```

---

## PASO 3: Seleccionar Columnas

### Usuario Elige Qué Traer

```
✓ Columnas Seleccionadas

De ARTICULO:
☑ id
☑ codigo
☑ descripcion
☐ nombre
☑ precio_base
☑ costo
☐ categoria_id
☐ activo

De EXISTENCIA_BODEGA:
☑ cantidad
☐ cantidad_comprometida
☐ fecha_actualizacion

Seleccionadas: 6 columnas

[← Anterior] [Siguiente →]
```

### SQL Generado (Preview)

```sql
SELECT
  ARTICULO.id,
  ARTICULO.codigo,
  ARTICULO.descripcion,
  ARTICULO.precio_base,
  ARTICULO.costo,
  EXISTENCIA_BODEGA.cantidad
FROM ...
```

---

## PASO 4: Mapear Campos

### Usuario Arrastra Campos

```
📦 Campos ERP          │  🎯 Campos Locales
   Catelli            │  Cigua
                      │
ARTICULO.codigo ────→ │ itemCode *
ARTICULO.descripcion →│ itemName *
ARTICULO.costo ───→  │ cost
EXISTENCIA_BODEGA.   │ quantity
  cantidad           │
                      │
                      │ price (sin mapear)
                      │ description (sin mapear)
                      │ category (sin mapear)
```

### Estado del Mapping

```
✓ Mappings Creados (4)

✓ ARTICULO.codigo → itemCode (string)
✓ ARTICULO.descripcion → itemName (string)
✓ ARTICULO.costo → cost (number)
✓ EXISTENCIA_BODEGA.cantidad → quantity (number)

Campos requeridos sin mapear: NINGUNO ✓

[← Anterior] [✓ Guardar Mapping]
```

---

## 🎬 Resultado Final

### MappingConfig Guardado

```json
{
  "id": "mapping_items_catelli_001",
  "connectionId": "catelli_001",
  "datasetType": "ITEMS",

  "mainTable": "ARTICULO",
  "joins": [
    {
      "table": "EXISTENCIA_BODEGA",
      "alias": "eb",
      "joinType": "LEFT",
      "joinCondition": "ARTICULO.id = eb.articulo_id"
    }
  ],

  "filters": [
    {
      "field": "ARTICULO.estado",
      "operator": "=",
      "value": "ACTIVO",
      "logicalOperator": "AND"
    },
    {
      "field": "EXISTENCIA_BODEGA.cantidad",
      "operator": ">",
      "value": "0",
      "logicalOperator": "AND"
    }
  ],

  "selectedColumns": [
    "ARTICULO.id",
    "ARTICULO.codigo",
    "ARTICULO.descripcion",
    "ARTICULO.precio_base",
    "ARTICULO.costo",
    "EXISTENCIA_BODEGA.cantidad"
  ],

  "fieldMappings": [
    {
      "source": "ARTICULO.codigo",
      "target": "itemCode",
      "dataType": "string"
    },
    {
      "source": "ARTICULO.descripcion",
      "target": "itemName",
      "dataType": "string"
    },
    {
      "source": "ARTICULO.costo",
      "target": "cost",
      "dataType": "number"
    },
    {
      "source": "EXISTENCIA_BODEGA.cantidad",
      "target": "quantity",
      "dataType": "number"
    }
  ],

  "isActive": true,
  "createdAt": "2026-02-21T10:30:00Z"
}
```

### SQL Generado Automáticamente

```sql
SELECT
  ARTICULO.id,
  ARTICULO.codigo,
  ARTICULO.descripcion,
  ARTICULO.precio_base,
  ARTICULO.costo,
  eb.cantidad
FROM ARTICULO
LEFT JOIN EXISTENCIA_BODEGA eb
  ON ARTICULO.id = eb.articulo_id
WHERE
  ARTICULO.estado = 'ACTIVO'
  AND eb.cantidad > 0
```

### Transformación de Datos

Backend ejecuta SQL y transforma resultado:

```
Catelli (ERP)              →  Cigua (Local)
id │ codigo │ descripcion │ costo │ cantidad
──────────────────────────────────────────────
1  │ ART-001│ Producto A  │ 100   │ 50
2  │ ART-002│ Producto B  │ 150   │ 25
3  │ ART-003│ Producto C  │ 75    │ 100

    ↓ (usando fieldMappings)

itemCode │ itemName   │ cost │ quantity
─────────────────────────────────────────
ART-001  │ Producto A │ 100  │ 50
ART-002  │ Producto B │ 150  │ 25
ART-003  │ Producto C │ 75   │ 100

Guardado en InventoryCount_Item
```

---

## 💾 Fase 2: Cargar Inventario Usando Este Mapping

Una vez guardado el mapping, en Fase 2:

```typescript
// Pseudo-código
const cargarInventarioDesdeERP = async (countId, mappingId) => {
  // 1. Obtener el mapping
  const mapping = await getMapping(mappingId);

  // 2. Construir SQL dinámicamente
  const sql = buildSQL(mapping);

  // 3. Ejecutar en Catelli
  const data = await executeInCatelli(sql);

  // 4. Transformar según fieldMappings
  const transformado = data.map(row => ({
    itemCode: row[mapping.fieldMappings[0].source],
    itemName: row[mapping.fieldMappings[1].source],
    cost: row[mapping.fieldMappings[2].source],
    quantity: row[mapping.fieldMappings[3].source]
  }));

  // 5. Guardar en InventoryCount
  for (const item of transformado) {
    await createCountItem(countId, item);
  }

  return { countId, itemsLoaded: transformado.length };
};
```

---

## ✨ Beneficios de Este Flujo

1. **Transparencia**: Usuario ve exactamente qué SQL se generará
2. **Flexibilidad**: Soporta cualquier combinación de tablas, filtros, columnas
3. **Reutilizable**: El mapping se guarda y se puede usar múltiples veces
4. **Dinámico**: No hay código hardcodeado, todo viene del ERP
5. **Auditable**: Queda registro de cómo se configuró cada mapping

---

## 🎯 Resumen del Ejemplo

**Usuario final declara:**
> "Necesito obtener ARTICULO unida con EXISTENCIA_BODEGA, filtrando por estado ACTIVO y cantidad > 0. Quiero código, nombre, costo y cantidad."

**Sistema responde:**
> SimpleMappingBuilder genera automáticamente:
> - La consulta SQL correcta
> - El mapeo de campos
> - Las reglas de transformación
> - Lo guarda para usar después

**Resultado:**
> Datos de Catelli transformados al formato local, listos para conteo.

