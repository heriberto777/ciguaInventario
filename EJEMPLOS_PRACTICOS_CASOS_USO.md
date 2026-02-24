# 📚 Ejemplos Prácticos: Casos de Uso Reales

## Caso 1: Mapeo Simple (Solo articulo)

### Objetivo
Cargar lista de artículos disponibles sin datos de stock.

### Configuración

#### Modo Visual (5 pasos)
```
PASO 1: Tabla
└─ Click → 📦 Artículos

PASO 2: Columnas
├─ ✓ codigo
├─ ✓ descripcion
├─ ✓ unidad
└─ ✓ precio_base

PASO 3: JOINs
└─ (Saltar - no necesario)

PASO 4: Filtros
└─ (Saltar - traer todos)

PASO 5: Preview & Guardar
└─ Haz click en "Guardar Mapping"

MAPEADOR:
├─ a.codigo → itemCode (string)
├─ a.descripcion → itemName (string)
├─ a.unidad → unit (string)
└─ a.precio_base → price (number)
```

#### Modo Manual (JSON)
```json
{
  "datasetType": "ITEMS",
  "mainTable": {
    "name": "articulo",
    "alias": "a"
  },
  "fieldMappings": [
    {
      "sourceField": "a.codigo",
      "targetField": "itemCode",
      "dataType": "string"
    },
    {
      "sourceField": "a.descripcion",
      "targetField": "itemName",
      "dataType": "string"
    },
    {
      "sourceField": "a.unidad",
      "targetField": "unit",
      "dataType": "string"
    },
    {
      "sourceField": "a.precio_base",
      "targetField": "price",
      "dataType": "number"
    }
  ],
  "limit": 5000
}
```

#### SQL Generado
```sql
SELECT
  a.codigo,
  a.descripcion,
  a.unidad,
  a.precio_base
FROM articulo a
LIMIT 5000
```

#### Resultado en la BD
```
itemCode | itemName      | unit    | price
---------|---------------|---------|----------
ART001   | Producto 1    | UNIDAD  | 99.99
ART002   | Producto 2    | CAJA    | 149.50
ART003   | Producto 3    | PIEZAS  | 45.00
```

---

## Caso 2: Mapeo Intermedio (articulo + existencia_bodega)

### Objetivo
Cargar artículos con sus cantidades en stock por bodega.

### Configuración

#### Modo Visual (5 pasos)
```
PASO 1: Tabla
└─ Click → 📦 Artículos

PASO 2: Columnas
├─ ✓ codigo
├─ ✓ descripcion
└─ ✓ precio_base

PASO 3: JOINs
├─ Click → "Agregar JOIN"
├─ Tabla: existencia_bodega
├─ Alias: eb
├─ Tipo: LEFT
├─ Condición: a.id = eb.articulo_id
└─ Click → "Agregar"

PASO 4: Filtros
└─ (Opcional: agregar si solo quieres stock > 0)
   ├─ Campo: eb.cantidad
   ├─ Operador: >
   ├─ Valor: 0
   └─ Click → "Agregar"

PASO 5: Preview & Guardar
└─ Haz click en "Guardar Mapping"

MAPEADOR:
├─ a.codigo → itemCode (string)
├─ a.descripcion → itemName (string)
├─ a.precio_base → price (number)
└─ eb.cantidad → systemQty (number)
```

#### Modo Manual (JSON)
```json
{
  "datasetType": "STOCK",
  "mainTable": {
    "name": "articulo",
    "alias": "a"
  },
  "joins": [
    {
      "name": "existencia_bodega",
      "alias": "eb",
      "joinType": "LEFT",
      "joinCondition": "a.id = eb.articulo_id"
    }
  ],
  "filters": [
    {
      "field": "eb.cantidad",
      "operator": ">",
      "value": 0
    }
  ],
  "fieldMappings": [
    {
      "sourceField": "a.codigo",
      "targetField": "itemCode",
      "dataType": "string"
    },
    {
      "sourceField": "a.descripcion",
      "targetField": "itemName",
      "dataType": "string"
    },
    {
      "sourceField": "a.precio_base",
      "targetField": "price",
      "dataType": "number"
    },
    {
      "sourceField": "eb.cantidad",
      "targetField": "systemQty",
      "dataType": "number"
    }
  ],
  "limit": 2000
}
```

#### SQL Generado
```sql
SELECT
  a.codigo,
  a.descripcion,
  a.precio_base,
  eb.cantidad
FROM articulo a
LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id
WHERE eb.cantidad > 0
LIMIT 2000
```

#### Resultado en la BD
```
itemCode | itemName      | price  | systemQty
---------|---------------|--------|----------
ART001   | Producto 1    | 99.99  | 150
ART002   | Producto 2    | 149.50 | 75
ART003   | Producto 3    | 45.00  | 0
```

---

## Caso 3: Mapeo Complejo (3 tablas con JOIN y Filtro)

### Objetivo
Cargar artículos activos con precios por lista y información de categoría.

### Configuración

#### Modo Visual (5 pasos)
```
PASO 1: Tabla
└─ Click → 📦 Artículos

PASO 2: Columnas
├─ ✓ codigo
├─ ✓ descripcion
├─ ✓ nombre
└─ ✓ estado

PASO 3: JOINs - Agregar 2 JOINs
├─ JOIN 1:
│  ├─ Tabla: articulo_precio
│  ├─ Alias: ap
│  ├─ Tipo: LEFT
│  ├─ Condición: a.id = ap.articulo_id
│  └─ Click → "Agregar"
│
└─ JOIN 2:
   ├─ Tabla: categoria_articulo
   ├─ Alias: ca
   ├─ Tipo: INNER
   ├─ Condición: a.categoria_id = ca.id
   └─ Click → "Agregar"

PASO 4: Filtros
├─ Filtro 1:
│  ├─ Campo: a.estado
│  ├─ Operador: =
│  ├─ Valor: ACTIVO
│  └─ Click → "Agregar"
│
└─ Filtro 2 (AND):
   ├─ Campo: ap.precio
   ├─ Operador: >
   ├─ Valor: 0
   └─ Click → "Agregar"

PASO 5: Preview & Guardar
└─ Haz click en "Guardar Mapping"

MAPEADOR:
├─ a.codigo → itemCode (string)
├─ a.descripcion → itemName (string)
├─ ca.nombre → category (string)
└─ ap.precio → price (number)
```

#### Modo Manual (JSON)
```json
{
  "datasetType": "ITEMS",
  "mainTable": {
    "name": "articulo",
    "alias": "a"
  },
  "joins": [
    {
      "name": "articulo_precio",
      "alias": "ap",
      "joinType": "LEFT",
      "joinCondition": "a.id = ap.articulo_id"
    },
    {
      "name": "categoria_articulo",
      "alias": "ca",
      "joinType": "INNER",
      "joinCondition": "a.categoria_id = ca.id"
    }
  ],
  "filters": [
    {
      "field": "a.estado",
      "operator": "=",
      "value": "ACTIVO",
      "logicalOperator": "AND"
    },
    {
      "field": "ap.precio",
      "operator": ">",
      "value": 0,
      "logicalOperator": "AND"
    }
  ],
  "fieldMappings": [
    {
      "sourceField": "a.codigo",
      "targetField": "itemCode",
      "dataType": "string"
    },
    {
      "sourceField": "a.descripcion",
      "targetField": "itemName",
      "dataType": "string"
    },
    {
      "sourceField": "ca.nombre",
      "targetField": "category",
      "dataType": "string"
    },
    {
      "sourceField": "ap.precio",
      "targetField": "price",
      "dataType": "number"
    }
  ],
  "limit": 3000
}
```

#### SQL Generado
```sql
SELECT
  a.codigo,
  a.descripcion,
  ca.nombre,
  ap.precio
FROM articulo a
LEFT JOIN articulo_precio ap ON a.id = ap.articulo_id
INNER JOIN categoria_articulo ca ON a.categoria_id = ca.id
WHERE a.estado = 'ACTIVO'
AND ap.precio > 0
LIMIT 3000
```

#### Resultado en la BD
```
itemCode | itemName      | category     | price
---------|---------------|--------------|----------
ART001   | Producto 1    | Electrónica  | 99.99
ART002   | Producto 2    | Ropa         | 149.50
ART005   | Producto 5    | Libros       | 45.00
```

---

## Caso 4: Mapeo con Transformaciones

### Objetivo
Cargar códigos en MAYÚSCULAS y precios redondeados.

### Configuración

#### Modo Visual (con transformaciones en FieldMappingBuilder)
```
PASO 1-5: (mismo que Caso 1)

MAPEADOR CON TRANSFORMACIONES:
├─ a.codigo → itemCode (string)
│  └─ Transformación: UPPER({})
│     Resultado: "ART001" (MAYÚSCULAS)
│
├─ a.descripcion → itemName (string)
│  └─ Transformación: (sin transformación)
│     Resultado: "Producto 1"
│
└─ a.precio_base → price (number)
   └─ Transformación: CAST({} AS DECIMAL)
      Resultado: 99.99 (redondeo a 2 decimales)
```

#### Modo Manual (JSON)
```json
{
  "datasetType": "ITEMS",
  "mainTable": {
    "name": "articulo",
    "alias": "a"
  },
  "fieldMappings": [
    {
      "sourceField": "a.codigo",
      "targetField": "itemCode",
      "dataType": "string",
      "transformation": "UPPER({})"
    },
    {
      "sourceField": "a.descripcion",
      "targetField": "itemName",
      "dataType": "string"
    },
    {
      "sourceField": "a.precio_base",
      "targetField": "price",
      "dataType": "number",
      "transformation": "CAST({} AS DECIMAL)"
    }
  ],
  "limit": 5000
}
```

#### SQL Generado
```sql
SELECT
  UPPER(a.codigo) AS codigo,
  a.descripcion,
  CAST(a.precio_base AS DECIMAL) AS precio
FROM articulo a
LIMIT 5000
```

#### Resultado en la BD
```
itemCode | itemName      | price
---------|---------------|----------
ART001   | Producto 1    | 99.99
ART002   | Producto 2    | 149.50
ART003   | Producto 3    | 45.00
```

---

## Caso 5: Mapeo Dinámico (Cantidad por Bodega Específica)

### Objetivo
Cargar solo artículos de la bodega "CENTRAL" con sus cantidades.

### Configuración

#### Modo Visual
```
PASO 1: Tabla
└─ Click → 🏭 Existencias por Bodega

PASO 2: Columnas
├─ ✓ articulo_id
├─ ✓ cantidad
└─ ✓ bodega_id

PASO 3: JOINs
├─ JOIN:
│  ├─ Tabla: articulo
│  ├─ Alias: a
│  ├─ Tipo: INNER
│  ├─ Condición: eb.articulo_id = a.id
│  └─ Click → "Agregar"
│
└─ JOIN:
   ├─ Tabla: bodega
   ├─ Alias: b
   ├─ Tipo: INNER
   ├─ Condición: eb.bodega_id = b.id
   └─ Click → "Agregar"

PASO 4: Filtros
├─ Filtro:
│  ├─ Campo: b.nombre
│  ├─ Operador: =
│  ├─ Valor: CENTRAL
│  └─ Click → "Agregar"

PASO 5: Preview & Guardar
└─ Haz click en "Guardar Mapping"

MAPEADOR:
├─ a.codigo → itemCode (string)
├─ a.descripcion → itemName (string)
├─ eb.cantidad → systemQty (number)
└─ b.nombre → warehouse (string)
```

#### Modo Manual (JSON)
```json
{
  "datasetType": "STOCK",
  "mainTable": {
    "name": "existencia_bodega",
    "alias": "eb"
  },
  "joins": [
    {
      "name": "articulo",
      "alias": "a",
      "joinType": "INNER",
      "joinCondition": "eb.articulo_id = a.id"
    },
    {
      "name": "bodega",
      "alias": "b",
      "joinType": "INNER",
      "joinCondition": "eb.bodega_id = b.id"
    }
  ],
  "filters": [
    {
      "field": "b.nombre",
      "operator": "=",
      "value": "CENTRAL"
    }
  ],
  "fieldMappings": [
    {
      "sourceField": "a.codigo",
      "targetField": "itemCode",
      "dataType": "string"
    },
    {
      "sourceField": "a.descripcion",
      "targetField": "itemName",
      "dataType": "string"
    },
    {
      "sourceField": "eb.cantidad",
      "targetField": "systemQty",
      "dataType": "number"
    },
    {
      "sourceField": "b.nombre",
      "targetField": "warehouse",
      "dataType": "string"
    }
  ],
  "limit": 1500
}
```

#### SQL Generado
```sql
SELECT
  a.codigo,
  a.descripcion,
  eb.cantidad,
  b.nombre
FROM existencia_bodega eb
INNER JOIN articulo a ON eb.articulo_id = a.id
INNER JOIN bodega b ON eb.bodega_id = b.id
WHERE b.nombre = 'CENTRAL'
LIMIT 1500
```

#### Resultado en la BD
```
itemCode | itemName      | systemQty | warehouse
---------|---------------|-----------|----------
ART001   | Producto 1    | 150       | CENTRAL
ART002   | Producto 2    | 75        | CENTRAL
ART003   | Producto 3    | 200       | CENTRAL
```

---

## Caso 6: Problema Común - Solo Activos

### Objetivo
Cargar SOLO productos que estén activos en el sistema Catelli.

### Error Común ❌
```json
{
  "datasetType": "ITEMS",
  "mainTable": {"name": "articulo", "alias": "a"},
  "fieldMappings": [...],
  "filters": [
    {
      "field": "a.activo",
      "operator": "=",
      "value": true  // ❌ INCORRECTO: envía booleano
    }
  ]
}
```

SQL Generado (fallará):
```sql
WHERE a.activo = true  -- ❌ Error: true no es válido en MSSQL
```

### Solución Correcta ✅
```json
{
  "datasetType": "ITEMS",
  "mainTable": {"name": "articulo", "alias": "a"},
  "fieldMappings": [...],
  "filters": [
    {
      "field": "a.estado",
      "operator": "=",
      "value": "ACTIVO"  // ✅ CORRECTO: string
    }
  ]
}
```

SQL Generado (funcionará):
```sql
WHERE a.estado = 'ACTIVO'  -- ✅ Correcto
```

### Alternativas Válidas
```json
// Opción 1: String
{"field": "a.estado", "operator": "=", "value": "ACTIVO"}

// Opción 2: Número
{"field": "a.estado_id", "operator": "=", "value": 1}

// Opción 3: Comparación
{"field": "a.stock_minimo", "operator": "<", "value": "a.stock_actual"}
```

---

## Caso 7: Solucionar Errores Comunes

### Error 1: "JOINs tienen condiciones inválidas"
```json
❌ "joinCondition": "a.id == eb.articulo_id"  // == es JS, SQL usa =

✅ "joinCondition": "a.id = eb.articulo_id"   // = es correcto
```

### Error 2: "Alias de tablas no coinciden"
```json
❌ "mainTable": {"name": "articulo", "alias": "art"}
   "joins": [{"joinCondition": "a.id = eb.articulo_id"}]
   // alias es "art" pero usaste "a"

✅ "mainTable": {"name": "articulo", "alias": "a"}
   "joins": [{"joinCondition": "a.id = eb.articulo_id"}]
```

### Error 3: "Campos mapeados no existen en Catelli"
```json
❌ {"sourceField": "a.codigo_articulo", ...}  // No existe

✅ {"sourceField": "a.codigo", ...}  // Correcto
```

### Error 4: "targetField debe ser estándar"
```json
❌ {"sourceField": "a.codigo", "targetField": "my_custom_field", ...}
   // targetField debe ser uno de: itemCode, itemName, description, etc

✅ {"sourceField": "a.codigo", "targetField": "itemCode", ...}
```

---

## Cheat Sheet: Comandos API Útiles

### Crear Mapping
```bash
curl -X POST http://localhost:3000/api/mapping-configs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetType": "ITEMS",
    "mainTable": {"name": "articulo", "alias": "a"},
    "fieldMappings": [{"sourceField": "a.codigo", "targetField": "itemCode", "dataType": "string"}]
  }'
```

### Listar Mappings
```bash
curl -X GET http://localhost:3000/api/mapping-configs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Obtener Mapping por Tipo
```bash
curl -X GET http://localhost:3000/api/mapping-configs/type/ITEMS \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Actualizar Mapping
```bash
curl -X PATCH http://localhost:3000/api/mapping-configs/MAPPING_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldMappings": [...]
  }'
```

### Activar/Desactivar Mapping
```bash
curl -X POST http://localhost:3000/api/mapping-configs/MAPPING_ID/toggle \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Eliminar Mapping
```bash
curl -X DELETE http://localhost:3000/api/mapping-configs/MAPPING_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Resumen de Buenas Prácticas

| Aspecto | ✅ Correcto | ❌ Incorrecto |
|---------|-----------|-------------|
| **Alias** | `a`, `eb`, `ap` | `articulo`, `existencia`, `precio` |
| **JOINs** | `a.id = eb.articulo_id` | `a.id == eb.articulo_id` o `a.id & eb.articulo_id` |
| **Filtros** | `"value": "ACTIVO"` | `"value": true` o `"value": ACTIVO` |
| **Límite** | `1000` (number) | `"1000"` (string) |
| **Operadores** | `"="`, `">"`, `"<"`, `"LIKE"` | `"=="`, `">"`, etc |
| **Dataset** | `"ITEMS"`, `"STOCK"` | `"items"`, `"Items"` |
| **targetField** | `"itemCode"` (estándar) | `"my_field"` (custom) |

¡Con estos ejemplos estás listo para cualquier configuración! 🚀
