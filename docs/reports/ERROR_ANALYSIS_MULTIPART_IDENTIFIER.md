# Análisis de Error: Multi-part Identifier en QueryBuilder

## 🔴 Error Reportado

```
QueryBuilder.tsx:227 POST http://localhost:3000/api/erp-connections/cmlvwaldq0005xujhld14k1dh/preview-query 500

Query execution failed: The multi-part identifier "catelli.ARTICULO_PRECIO.VERSION" could not be bound.
```

### Stack Trace Completo
```
AppError: Query execution failed: The multi-part identifier "catelli.ARTICULO_PRECIO.VERSION" could not be bound.
  at MSSQLConnector.executeQuery (mssql-connector.ts:115:13)
  at ERPIntrospectionService.previewQuery (erp-introspection.ts:208:23)
  at ERPConnectionsController.previewQuery (controller.ts:239:18)
```

## 🔍 Análisis del Problema

### Raíz del Problema
El error ocurre cuando MSSQL intenta resolver una referencia completamente calificada a una columna que viene desde una tabla con alias.

### Flujo Problemático

1. **QueryBuilder.tsx** genera lista de campos disponibles:
   ```typescript
   getAvailableFieldStrings() -> "catelli.ARTICULO_PRECIO.VERSION"
   ```

2. **Usuario selecciona filtro** con este campo en el FilterBuilder

3. **Query se genera** en `generatePreviewSQL()`:
   ```sql
   SELECT *
   FROM catelli.ARTICULO_PRECIO ap
   WHERE catelli.ARTICULO_PRECIO.VERSION = 'valor'  ❌ INCORRECTO
   ```

4. **MSSQL falla** porque:
   - La tabla tiene un alias: `ap`
   - No puede resolver `catelli.ARTICULO_PRECIO.VERSION` con el alias definido
   - MSSQL espera: `ap.VERSION`

### Estructura SQL Correcta vs Incorrecta

#### ❌ INCORRECTO (lo que se generaba)
```sql
SELECT catelli.ARTICULO_PRECIO.VERSION, catelli.ARTICULO_PRECIO.CODIGO
FROM catelli.ARTICULO_PRECIO ap
WHERE catelli.ARTICULO_PRECIO.VERSION = 'A001'
ORDER BY catelli.ARTICULO_PRECIO.CODIGO ASC
```

#### ✅ CORRECTO (lo que debería generar)
```sql
SELECT ap.VERSION, ap.CODIGO
FROM catelli.ARTICULO_PRECIO ap
WHERE ap.VERSION = 'A001'
ORDER BY ap.CODIGO ASC
```

## ✅ Solución Implementada

### Cambios en QueryBuilder.tsx

#### 1. Nueva Función: `resolveFieldReference()`
```typescript
const resolveFieldReference = (fieldName: string): string => {
  // Convierte "catelli.ARTICULO_PRECIO.VERSION" → "ap.VERSION"
  // Maneja formatos:
  // - Schema.Table.Column (3 partes)
  // - Table.Column (2 partes)
  // Busca el alias de la tabla en:
  // - query.mainTable
  // - query.joins[]
}
```

#### 2. Nueva Función: `resolveJoinCondition()`
```typescript
const resolveJoinCondition = (condition: string): string => {
  // Procesa condiciones de JOIN
  // Reemplaza todas las referencias completamente calificadas
  // Regex: /(\w+\.\w+\.\w+)/g
}
```

#### 3. Modificaciones en `generatePreviewSQL()`
```typescript
// ANTES: Usaba nombres directamente
sql = `SELECT ${query.selectedColumns.join(', ')}`

// DESPUÉS: Resuelve referencias
const processedColumns = query.selectedColumns.map(col => resolveFieldReference(col)).join(', ')
sql = `SELECT ${processedColumns}`

// JOINS: Resuelve condiciones
const resolvedCondition = resolveJoinCondition(join.joinCondition)
sql += `\n${join.joinType} JOIN ${join.name} ${join.alias} ON ${resolvedCondition}`

// FILTERS: Resuelve campos
const resolvedField = resolveFieldReference(f.field)
sql += `${resolvedField} ${f.operator} '${f.value}'`

// ORDER BY: Resuelve campos
const resolvedField = resolveFieldReference(o.field)
sql += `${resolvedField} ${o.direction}`
```

## 📝 Ejemplo de Transformación

### Input
```
User selects:
- Table: catelli.ARTICULO_PRECIO (alias: ap)
- Columns: catelli.ARTICULO_PRECIO.VERSION, catelli.ARTICULO_PRECIO.CODIGO
- Filter: catelli.ARTICULO_PRECIO.VERSION = 'A001'
- OrderBy: catelli.ARTICULO_PRECIO.CODIGO ASC
```

### Processing
```
resolveFieldReference("catelli.ARTICULO_PRECIO.VERSION")
  → Parts: ["catelli", "ARTICULO_PRECIO", "VERSION"]
  → fullTableName: "catelli.ARTICULO_PRECIO"
  → Found in mainTable with alias: "ap"
  → Returns: "ap.VERSION"
```

### Output (Correct SQL)
```sql
SELECT ap.VERSION, ap.CODIGO
FROM catelli.ARTICULO_PRECIO ap
WHERE ap.VERSION = 'A001'
ORDER BY ap.CODIGO ASC
```

## 🧪 Casos Cubiertos

| Caso | Input | Output |
|------|-------|--------|
| Schema.Table.Column | `catelli.ARTICULO_PRECIO.VERSION` | `ap.VERSION` |
| Table.Column | `ARTICULO_PRECIO.VERSION` | `ap.VERSION` |
| Single Column | `VERSION` | `VERSION` (sin cambios) |
| En Joins | `catelli.T1.ID = catelli.T2.T1_ID` | `t1.ID = t2.T1_ID` |
| En Filters | WHERE field condition | WHERE resolved_field condition |
| En OrderBy | ORDER BY field ASC | ORDER BY resolved_field ASC |

## 🔧 Archivos Modificados

### d:\proyectos\app\ciguaInv\apps\web\src\components\QueryBuilder.tsx

**Línea 188**: Agregó función `resolveFieldReference()`
**Línea 227**: Agregó función `resolveJoinCondition()`
**Línea 244**: Modificó `generatePreviewSQL()` para procesar referencias

### Cambios Relacionados
- ✅ Procesa columnas seleccionadas
- ✅ Procesa condiciones de JOIN
- ✅ Procesa campos en WHERE
- ✅ Procesa campos en ORDER BY

## 📊 Validación

✅ **Compilación**: Sin errores
✅ **Tipo TypeScript**: Correcto
✅ **Lógica**: Cubre todos los casos

## 🚀 Próximos Pasos

1. **Prueba con diferentes tipos de queries**:
   - Queries simples (sin JOIN)
   - Queries con múltiples JOINs
   - Queries con múltiples filtros
   - Queries con ORDER BY complejo

2. **Validación en Backend**:
   - Verificar que MSSQL acepta las queries generadas
   - Validar que las columnas resueltas existan
   - Probar con diferentes esquemas

3. **UI Feedback**:
   - Mostrar la query resuelta al usuario
   - Advertencia si hay campos no resolvibles
   - Logging mejorado

## 📌 Notas Importantes

- La solución mantiene compatibilidad hacia atrás
- Si no se puede resolver un campo, se retorna tal cual
- El regex para procesar JOIN conditions es: `/(\w+\.\w+\.\w+)/g`
- Las funciones son case-insensitive para nombres de tabla pero preservan el case original

