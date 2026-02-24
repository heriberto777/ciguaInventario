# 🧪 GUÍA DE TESTING - QueryBuilder MSSQL Fix

## 📋 Resumen del Problema Solucionado

**Error Original:**
```
POST /api/erp-connections/[id]/preview-query 500
The multi-part identifier "catelli.ARTICULO_PRECIO.VERSION" could not be bound.
```

**Causa:**
- Queries generadas con referencias `Schema.Table.Column` en lugar de `Alias.Column`
- MSSQL no puede resolver identificadores completamente calificados cuando la tabla tiene alias

**Solución:**
- Agregadas funciones para convertir referencias completamente calificadas
- Ahora genera queries correctas como `ap.VERSION` en lugar de `catelli.ARTICULO_PRECIO.VERSION`

---

## 🎬 Script de Testing Completo

### Escenario 1: Query Simple con Filtro ✅

**Pasos:**
1. Abrir QueryBuilder
2. Step 1 - Seleccionar tabla:
   - Tabla: `catelli.ARTICULO_PRECIO`
   - Alias: `ap`
   - Click "Siguiente"

3. Step 2 - Seleccionar columnas:
   - ✓ VERSION
   - ✓ CODIGO
   - Click "Siguiente"

4. Step 3 - JOINs (Saltar):
   - Click "Siguiente"

5. Step 4 - Filtro:
   - Campo: `catelli.ARTICULO_PRECIO.VERSION`
   - Operador: `=`
   - Valor: `A001`
   - Click "Agregar"
   - Click "Siguiente"

6. Step 5 - Preview:
   - **Expected SQL:**
     ```sql
     SELECT ap.VERSION, ap.CODIGO
     FROM catelli.ARTICULO_PRECIO ap
     WHERE ap.VERSION = 'A001'
     ```
   - Click "Vista Previa"

**Expected Result:**
- ✅ Sin error 500
- ✅ Sin error de multi-part identifier
- ✅ Datos cargados correctamente
- ✅ Tabla de preview muestra resultados

---

### Escenario 2: Query con múltiples JOINs ✅

**Pasos:**
1. Step 1:
   - Tabla principal: `catelli.ARTICULO_PRECIO` (alias: `ap`)

2. Step 2:
   - Columnas: `ap.CODIGO`, `ap.VERSION`, `ap.PRECIO`

3. Step 3 - Agregar JOINs:
   - **Join 1:**
     - Tabla: `catelli.ARTICULO_PRECIO_DETAIL`
     - Alias: `apd`
     - Condición: `catelli.ARTICULO_PRECIO.ID = catelli.ARTICULO_PRECIO_DETAIL.ARTICULO_ID`
     - Tipo: `INNER`

   - **Join 2:**
     - Tabla: `catelli.ALMACEN`
     - Alias: `a`
     - Condición: `catelli.ARTICULO_PRECIO.ALMACEN_ID = catelli.ALMACEN.ID`
     - Tipo: `INNER`

4. Step 4 - Filtros:
   - Filtro 1: `ap.VERSION = 'A001'`
   - Filtro 2: `apd.CANTIDAD > 0` (AND)

5. Step 5 - Preview:
   - **Expected SQL:**
     ```sql
     SELECT ap.CODIGO, ap.VERSION, ap.PRECIO
     FROM catelli.ARTICULO_PRECIO ap
     INNER JOIN catelli.ARTICULO_PRECIO_DETAIL apd
       ON ap.ID = apd.ARTICULO_ID
     INNER JOIN catelli.ALMACEN a
       ON ap.ALMACEN_ID = a.ID
     WHERE ap.VERSION = 'A001'
     AND apd.CANTIDAD > 0
     ```

**Expected Result:**
- ✅ Todas las referencias resueltas correctamente
- ✅ JOINs procesados correctamente
- ✅ Múltiples filtros aplicados
- ✅ Preview ejecuta sin errores

---

### Escenario 3: Query con ORDER BY ✅

**Pasos:**
1-4. (Mismo que escenario 1)

5. Step 5 - Preview:
   - Orden: `ap.CODIGO ASC, ap.PRECIO DESC`
   - **Expected SQL:**
     ```sql
     SELECT ap.VERSION, ap.CODIGO
     FROM catelli.ARTICULO_PRECIO ap
     WHERE ap.VERSION = 'A001'
     ORDER BY ap.CODIGO ASC, ap.PRECIO DESC
     ```

**Expected Result:**
- ✅ ORDER BY procesado correctamente
- ✅ Múltiples campos en ORDER BY soportados
- ✅ Direcciones ASC/DESC preservadas

---

### Escenario 4: Casos Especiales ✅

#### Caso A: Alias de una sola letra
```sql
SELECT a.ID, a.CODIGO
FROM catelli.ARTICULO a
WHERE a.VERSION = 'A'
```
- ✅ Debe funcionar correctamente

#### Caso B: Tabla sin schema
```sql
SELECT t.CODIGO, t.VALOR
FROM TABLA t
WHERE t.STATUS = '1'
```
- ✅ Debe funcionar (aunque raro sin schema)

#### Caso C: Columna sin tabla (debería preservarse)
```sql
SELECT COUNT(*)
FROM catelli.ARTICULO ap
WHERE ap.ACTIVO = 1
```
- ✅ Funciones agregadas se preservan

---

## 🔍 Puntos de Validación

### En el UI:
```
✅ Campos muestran referencias completas (ejemplo: catelli.ARTICULO_PRECIO.VERSION)
✅ Preview SQL muestra referencias resueltas (ejemplo: ap.VERSION)
✅ No hay cambios visuales para el usuario
✅ El mismo QueryBuilder funciona sin cambios
```

### En el Backend:
```
✅ No hay errores en mssql-connector.ts
✅ MSSQL acepta la query generada
✅ No hay "multi-part identifier" errors
✅ Resultados correctos devueltos
```

### En la Consola del Navegador:
```
✅ "Generated SQL:" muestra query correcta
✅ "Sending to backend:" muestra query correcta
✅ "Preview response:" muestra datos correctamente
✅ Sin errores de JavaScript
```

---

## 📊 Checklist de Validación

| Item | Estado | Notas |
|------|--------|-------|
| QueryBuilder compila sin errores | ✅ | Sin errores de TypeScript |
| Función `resolveFieldReference()` existe | ✅ | Línea 188 |
| Función `resolveJoinCondition()` existe | ✅ | Línea 227 |
| `generatePreviewSQL()` actualizada | ✅ | Línea 244 |
| Escenario simple funciona | ⏳ | Pendiente testing |
| Escenario con JOINs funciona | ⏳ | Pendiente testing |
| Escenario con ORDER BY funciona | ⏳ | Pendiente testing |
| Casos especiales funcionan | ⏳ | Pendiente testing |
| No regresión en otros componentes | ⏳ | Pendiente testing |

---

## 🚨 Posibles Problemas y Soluciones

### Problema 1: "TypeError: resolveFieldReference is not defined"
**Causa:** La función no está siendo invocada correctamente
**Solución:** Verificar que el scope de la función sea correcto dentro del componente

### Problema 2: "References no se resuelven correctamente"
**Causa:** El regex o la lógica de búsqueda de alias está fallando
**Solución:** Revisar:
- Que `query.mainTable.name` sea exacto
- Que `query.joins` se esté poblando correctamente
- Que los alias sean únicos

### Problema 3: "Query funciona pero devuelve datos incorrectos"
**Causa:** Puede haber un problema con la transformación de JOIN condition
**Solución:**
- Verificar que `resolveJoinCondition()` esté procesando correctamente
- Usar console.log para ver la query final antes de enviar

### Problema 4: "Error: 'MSSQL' no reconoce el alias"
**Causa:** El alias no está siendo propagado correctamente
**Solución:** Verificar que el campo `alias` esté presente en `mainTable` y `joins[]`

---

## 💾 Rollback Plan

Si hay problemas graves:

**Opción 1: Revert del archivo**
```bash
git checkout HEAD -- apps/web/src/components/QueryBuilder.tsx
```

**Opción 2: Comentar las funciones nuevas**
```typescript
// const resolveFieldReference = (...) => { ... }
// const resolveJoinCondition = (...) => { ... }
// Y usar generatePreviewSQL() original
```

---

## 📝 Logs Esperados

### Cuando todo funciona bien:
```
Console (F12):
- "Generated SQL:" [Query correcta con aliases]
- "Sending to backend:" [Query correcta]
- "Preview response:" [Array de datos]

Backend logs:
- Query ejecutada exitosamente
- Datos devueltos sin errores
```

### Cuando hay problema:
```
Console:
- Error HTTP 500
- "Error previewing query: AxiosError..."
- Multi-part identifier error

Backend logs:
- "Query execution failed: The multi-part identifier..."
- Stack trace del error
```

---

## ✅ Conclusión del Testing

Una vez completados todos los escenarios:
- [ ] Escenario 1 (Simple)
- [ ] Escenario 2 (JOINs)
- [ ] Escenario 3 (ORDER BY)
- [ ] Escenario 4 (Casos especiales)

Se puede considerar que el fix está **VALIDADO** ✅

