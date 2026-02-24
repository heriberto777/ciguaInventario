# 🔧 Guía Completa: Nuevo Interfaz de Mapping

Ahora tienes **DOS formas** completamente diferentes de crear mappings:

## **1️⃣ Modo Visual (RECOMENDADO) 🔨**

### Acceso
```
http://localhost:5173/admin/mapping-config
Click: "+ Nuevo Mapping"
Tab: "Constructor Visual"
```

### Pantalla 1: Seleccionar Tabla Principal
Haz click en la tabla de Catelli que quieres usar como base:
- 📦 **Artículos** (articulo) - Para lista de items
- 🏭 **Existencias por Bodega** (existencia_bodega) - Para stock
- 💰 **Precios de Artículos** (articulo_precio) - Para costos/precios
- 🏢 **Bodegas** (bodega) - Para información de depósitos
- 📂 **Categorías** (categoria_articulo) - Para clasificación

**Resultado:** Se define `mainTable` automáticamente

### Pantalla 2: Seleccionar Columnas
Marca con ✓ las columnas que quieres traer de esa tabla:
- codigo
- descripcion
- nombre
- unidad
- precio_base
- costo
- etc.

**Resultado:** Se define `selectedColumns` automáticamente

### Pantalla 3: Agregar JOINs (Opcional)
¿Necesitas información de otra tabla? Agrega un JOIN.

**Ejemplo:** Si usas `articulo` como tabla principal, pero quieres `cantidad` de `existencia_bodega`:

```
Tabla: existencia_bodega
Alias: eb
Tipo: LEFT JOIN
Condición: a.id = eb.articulo_id
```

**Resultado:** Se define `joins` automáticamente

### Pantalla 4: Agregar Filtros (Opcional)
¿Solo quieres ciertos items? Agrega un WHERE.

**Ejemplo:** Solo artículos activos:
```
Campo: a.estado
Operador: =
Valor: ACTIVO
```

**Resultado:** Se define `filters` automáticamente

### Pantalla 5: Guardar
Haz click en "Vista Previa" para ver el SQL que se va a generar, luego "Guardar Mapping".

## **2️⃣ Mapeador de Campos Visual 🔀**

### Después de definir la query, aparece el mapeador:

**Lado Izquierdo:** Columnas disponibles de Catelli
```
articulo.codigo (varchar)
articulo.descripcion (varchar)
existencia_bodega.cantidad (decimal)
...
```

**Lado Derecho:** Campos estándar de nuestra app
```
✓ Código Item (articulo.codigo)
- Nombre Item (sin mapear)
□ Descripción
□ Unidad
...
```

### Cómo mapear:
1. Arrastra un campo de Catelli (izquierda)
2. Suéltalo sobre un campo nuestro (derecha)
3. Selecciona el tipo de dato: Texto, Número, Fecha, Booleano
4. (Opcional) Agrega transformación: `UPPER({})`, `CAST({} AS INT)`

**Resultado:** Se define `fieldMappings` automáticamente

## **3️⃣ Modo Manual (Para Expertos) ✏️**

Si prefieres escribir JSON directamente:

### Opción A: Query Personalizada (SQL Directo)
```json
{
  "datasetType": "ITEMS",
  "customQuery": "SELECT a.codigo AS codigo, a.descripcion AS descripcion FROM articulo a WHERE a.estado = 'ACTIVO'",
  "fieldMappings": [
    {"sourceField": "codigo", "targetField": "itemCode", "dataType": "string"},
    {"sourceField": "descripcion", "targetField": "itemName", "dataType": "string"}
  ]
}
```

✅ Ventaja: Máximo control
❌ Desventaja: Requiere conocer SQL

### Opción B: Constructor Manual (Tablas + Joins + Filtros)
```json
{
  "datasetType": "ITEMS",
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
    {"field": "a.estado", "operator": "=", "value": "ACTIVO"}
  ],
  "fieldMappings": [
    {"sourceField": "a.codigo", "targetField": "itemCode", "dataType": "string"},
    {"sourceField": "a.descripcion", "targetField": "itemName", "dataType": "string"},
    {"sourceField": "eb.cantidad", "targetField": "systemQty", "dataType": "number"}
  ],
  "limit": 1000
}
```

## Diferencia Clave: Mapeo vs Query

### ❌ ANTES (Solo tablas, sin mapeo)
```
Tabla: articulo
Alias: a
Campos: (vacío - no sabías mapear)
```

### ✅ AHORA (Columnas + Mapeo de campos)
```
Tabla: articulo (alias: a)
Columnas: a.codigo, a.descripcion, a.precio
↓ MAPEO ↓
a.codigo → itemCode (string)
a.descripcion → itemName (string)
a.precio → price (number)
```

## Flujo Completo de Ejemplo

### Objetivo: Cargar items con cantidades en stock

**Paso 1: Selecciona Tabla**
```
Tabla principal: articulo (📦)
```

**Paso 2: Selecciona Columnas**
```
✓ codigo
✓ descripcion
✓ precio_base
```

**Paso 3: Agregar JOIN**
```
JOIN existencia_bodega eb ON a.id = eb.articulo_id
```

**Paso 4: Agregar Filtro**
```
WHERE a.estado = 'ACTIVO'
```

**Paso 5: SQL Generado Automáticamente**
```sql
SELECT
  a.codigo,
  a.descripcion,
  a.precio_base,
  eb.cantidad
FROM articulo a
LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id
WHERE a.estado = 'ACTIVO'
LIMIT 1000
```

**Paso 6: Mapear Campos**
```
a.codigo → itemCode (string)
a.descripcion → itemName (string)
a.precio_base → price (number)
eb.cantidad → systemQty (number)
```

**Resultado Final en BD:**
```json
{
  "datasetType": "ITEMS",
  "mainTable": {"name": "articulo", "alias": "a"},
  "joins": [{"name": "existencia_bodega", "alias": "eb", "joinType": "LEFT", "joinCondition": "a.id = eb.articulo_id"}],
  "filters": [{"field": "a.estado", "operator": "=", "value": "ACTIVO"}],
  "fieldMappings": [
    {"sourceField": "a.codigo", "targetField": "itemCode", "dataType": "string"},
    {"sourceField": "a.descripcion", "targetField": "itemName", "dataType": "string"},
    {"sourceField": "a.precio_base", "targetField": "price", "dataType": "number"},
    {"sourceField": "eb.cantidad", "targetField": "systemQty", "dataType": "number"}
  ],
  "limit": 1000
}
```

## Columnas Disponibles por Tabla

### articulo
- codigo
- descripcion
- nombre
- unidad
- precio_base
- costo
- activo
- categoria_id

### existencia_bodega
- articulo_id
- bodega_id
- cantidad
- cantidad_comprometida
- fecha_actualizacion

### articulo_precio
- articulo_id
- lista_precio_id
- precio
- moneda

### bodega
- id
- nombre
- codigo
- ubicacion

### categoria_articulo
- id
- nombre
- descripcion

## Campos Estándar por Dataset Type

### ITEMS
- itemCode (requerido) ← articulo.codigo
- itemName (requerido) ← articulo.descripcion
- description ← articulo.descripcion
- unit ← articulo.unidad
- category ← categoria_articulo.nombre

### STOCK
- itemCode (requerido) ← articulo.codigo
- warehouseId (requerido) ← bodega_existencia.bodega_id
- quantity (requerido) ← existencia_bodega.cantidad
- lastUpdate ← existencia_bodega.fecha_actualizacion

### COST
- itemCode (requerido) ← articulo.codigo
- cost (requerido) ← articulo.costo
- currency ← moneda (default: USD)

### PRICE
- itemCode (requerido) ← articulo.codigo
- price (requerido) ← articulo_precio.precio
- currency ← articulo_precio.moneda

## Transformaciones Disponibles

Puedes aplicar transformaciones SQL automáticamente:

```
Transformación        | Resultado SQL        | Ejemplo
---------------------|-------------------|-----------
UPPER({})             | UPPER(a.codigo)   | "ABC"
LOWER({})             | LOWER(a.codigo)   | "abc"
CAST({} AS INT)       | CAST(cantidad AS INT) | 100
CAST({} AS DECIMAL)   | CAST(precio AS DECIMAL) | 99.99
SUBSTRING({}, 0, 3)   | SUBSTRING(codigo, 0, 3) | "ABC"
TRIM({})              | TRIM(descripcion) | "Producto"
```

## Validación

Al guardar, el sistema valida:
- ✅ datasetType es requerido (ITEMS, STOCK, COST, PRICE)
- ✅ mainTable.name es requerido
- ✅ fieldMappings no puede estar vacío
- ✅ Mínimo 1 campo mapeado
- ✅ JOINs tienen condición válida
- ✅ Filtros tienen campo, operador y valor

## Próximos Pasos

1. Abre http://localhost:5173/admin/mapping-config
2. Haz click en "+ Nuevo Mapping"
3. Usa el "Constructor Visual" (más fácil)
4. Sigue los 5 pasos
5. Haz click en "Guardar Mapping"
6. En tu formulario de cuento de inventario, haz click en "Cargar Artículos"
7. Los items se cargarán automáticamente desde Catelli

¡Eso es todo! No necesitas código SQL ni terminal.
