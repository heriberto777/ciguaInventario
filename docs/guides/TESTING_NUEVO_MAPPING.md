# 🧪 Guía de Testing: Nuevo SimpleMappingBuilder

## ✅ Pre-Requisitos

- [ ] Proyecto compila sin errores (`npm run build`)
- [ ] Backend está corriendo (`npm run dev` en api/)
- [ ] Frontend está corriendo (`npm run dev` en web/)
- [ ] Tienes una conexión ERP creada (ej: Catelli)

---

## 🚀 Test 1: Abrir Mapping Admin

### Pasos:
1. Abre navegador: `http://localhost:3000`
2. Navega a **Settings** (rueda de engranaje, usualmente arriba derecha)
3. En el sidebar, selecciona **Mappings**
4. Deberías ver una lista (probablemente vacía si es nueva)

### ✅ Esperado:
- [ ] Página carga sin errores
- [ ] Botón "+ Nuevo Mapping" es visible
- [ ] Si hay mappings antiguos, se muestran en una lista

### ❌ Problemas Comunes:
| Error | Solución |
|-------|----------|
| "Cannot find SimpleMappingBuilder" | Verifica que la carpeta existe: `src/components/SimpleMappingBuilder/` |
| "Module not found" | `npm install` y reinicia servidor dev |
| White page | Abre Console (F12) y busca errores TypeScript |

---

## 🚀 Test 2: Crear Nuevo Mapping

### Pasos:
1. Clic en **"+ Nuevo Mapping"**
2. Deberías ver la página de edición con SimpleMappingBuilder

### ✅ Esperado - Pantalla inicial:
```
═══════════════════════════════════════
Crear Mapping - ITEMS
═══════════════════════════════════════

📊 Tabla Principal          [← Anterior] [Siguiente →]
├─ Conexión: Catelli
├─ Dataset: ITEMS
└─ Progress: 25%

[Selecciona tabla...]
```

- [ ] Se muestra el paso 1 de 4
- [ ] Dropdown de tabla está vacío (esperando selección)
- [ ] Botones "Anterior" y "Siguiente" visibles

### ❌ Problemas:
- Si no muestra SimpleMappingBuilder → Error en import/syntax
- Si error de API → Verifica que `/erp-connections/{id}/available-tables` existe en backend

---

## 🚀 Test 3: PASO 1 - Seleccionar Tabla y JOINs

### Pasos:
1. En el dropdown "Tabla Principal", deberías ver lista de tablas
2. Selecciona **ARTICULO**
3. Deberías ver "Preview SQL" mostrando: `SELECT * FROM ARTICULO`

### ✅ Esperado:
- [ ] Dropdown se carga con tablas del ERP
- [ ] Al seleccionar tabla, muestra en preview
- [ ] Botón "+ Agregar JOIN" aparece
- [ ] Botón "Siguiente" queda habilitado

### Prueba JOINs (Opcional):
1. Clic "+ Agregar JOIN"
2. Completa:
   - Tabla: `EXISTENCIA_BODEGA`
   - Alias: `eb`
   - Tipo: `LEFT`
   - Condición: `ARTICULO.id = eb.articulo_id`
3. Preview debe mostrar:
```sql
SELECT * FROM ARTICULO
LEFT JOIN EXISTENCIA_BODEGA eb ON ARTICULO.id = eb.articulo_id
```

### ✅ Esperado JOINs:
- [ ] Puedo agregar múltiples JOINs
- [ ] Cada JOIN muestra parámetros correctos
- [ ] Puedo eliminar JOINs con botón [x]
- [ ] SQL preview actualiza en tiempo real

---

## 🚀 Test 4: PASO 2 - Agregar Filtros

### Pasos:
1. Clic "Siguiente" (desde Paso 1)
2. Deberías estar en "Agregar Filtros"

### ✅ Esperado:
```
🔍 Filtros (WHERE clause)       [← Anterior] [Siguiente →]
├─ Progress: 50%
├─ [+ Agregar Filtro]
└─ Preview WHERE clause...
```

### Prueba Filtros:
1. Clic "+ Agregar Filtro"
2. Completa:
   - Campo: `ARTICULO.estado` (debería ser dropdown con columnas)
   - Operador: `=`
   - Valor: `ACTIVO`
3. Opcional: Agrega segundo filtro con AND

### ✅ Esperado:
- [ ] Dropdown de campos se carga con columnas de tabla
- [ ] Operadores disponibles (=, !=, >, <, >=, <=, IN, LIKE, BETWEEN)
- [ ] Preview muestra: `WHERE ARTICULO.estado = 'ACTIVO'`
- [ ] Puedo usar AND/OR entre filtros
- [ ] Puedo eliminar filtros

---

## 🚀 Test 5: PASO 3 - Seleccionar Columnas

### Pasos:
1. Clic "Siguiente" (desde Paso 2)
2. Deberías estar en "Seleccionar Columnas"

### ✅ Esperado:
```
✓ Columnas Seleccionadas       [← Anterior] [Siguiente →]
├─ Progress: 75%
├─ De ARTICULO:
│  ☑ id
│  ☑ codigo
│  ☑ descripcion
│  ☐ nombre
│  └─ ...
└─ Seleccionadas: 0 de 15
```

### Prueba:
1. Selecciona 3-5 columnas (ej: id, codigo, descripcion, costo, cantidad)
2. Observa "Seleccionadas: X de Y"
3. Deberías ver "Select All" por tabla
4. Preview actualiza: `SELECT id, codigo, descripcion, costo, cantidad FROM ...`

### ✅ Esperado:
- [ ] Checkboxes cargados con columnas reales
- [ ] "Select All" selecciona/deselecciona todas de tabla
- [ ] Counter actualiza
- [ ] SQL preview actualiza
- [ ] ⭐ PRIMARIAS están marcadas (badge)

---

## 🚀 Test 6: PASO 4 - Mapear Campos

### Pasos:
1. Clic "Siguiente" (desde Paso 3)
2. Deberías estar en "Mapear Campos"

### ✅ Esperado:
```
┌──────────────────────────────────────────────────────┐
│ 📦 Campos ERP          │  🎯 Campos Locales         │
│ Catelli               │  Cigua                     │
├──────────────────────────────────────────────────────┤
│ ARTICULO.codigo ────→ │ itemCode *                 │
│ ARTICULO.descripcion  │ itemName *                 │
│ ARTICULO.costo       │ cost                       │
│ EXISTENCIA_BODEGA.   │ quantity *                 │
│   cantidad           │                            │
│                      │ price (sin mapear)         │
│                      │ description (sin mapear)   │
└──────────────────────────────────────────────────────┘
```

### Prueba Drag & Drop:
1. Arrastra `ARTICULO.codigo` al campo `itemCode`
2. Deberías verlo conectado (línea visual)
3. Repeat para otros campos

**O Dropdown**:
1. Si drag & drop no funciona, intenta el dropdown
2. Click en campo target → dropdown de source fields

### ✅ Esperado:
- [ ] Puedo mapear campos (drag & drop O dropdown)
- [ ] Campos requeridos (*) están marcados
- [ ] Validación avisa si campos requeridos no están mapeados
- [ ] Puedo eliminar mapeos
- [ ] Resumen muestra los 4 mapeos creados
- [ ] Data types se detectan automáticamente (string, number, date)

---

## 🚀 Test 7: Guardar Mapping

### Pasos:
1. Todos los campos requeridos mapeados
2. Clic **"✓ Guardar Mapping"** (botón en Paso 4)

### ✅ Esperado:
- [ ] Botón desaparecido mientras carga
- [ ] Loading spinner visible
- [ ] Después de 2-3 segundos: "✅ Mapping guardado"
- [ ] Vuelves a página de lista
- [ ] Tu mapping nuevo aparece en la lista

### JSON Esperado (en BD):
```json
{
  "id": "uuid-aqui",
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
      "value": "ACTIVO"
    }
  ],
  "selectedColumns": ["id", "codigo", "descripcion", "costo", "cantidad"],
  "fieldMappings": [
    {"source": "ARTICULO.codigo", "target": "itemCode", "dataType": "string"},
    {"source": "ARTICULO.descripcion", "target": "itemName", "dataType": "string"},
    {"source": "ARTICULO.costo", "target": "cost", "dataType": "number"},
    {"source": "EXISTENCIA_BODEGA.cantidad", "target": "quantity", "dataType": "number"}
  ],
  "isActive": true
}
```

---

## 🚀 Test 8: Editar Mapping Guardado

### Pasos:
1. En lista de mappings, clic **"Editar"** en uno de los creados
2. Deberías ver el Paso 1 con los datos precargados

### ✅ Esperado:
- [ ] Paso 1 muestra la tabla seleccionada
- [ ] Paso 1 muestra los JOINs agregados
- [ ] Paso 2 muestra los filtros
- [ ] Paso 3 muestra columnas seleccionadas
- [ ] Paso 4 muestra mappings existentes
- [ ] Puedo modificar cualquier paso
- [ ] "Guardar" actualiza el mapping existente (no crea nuevo)

---

## 🚀 Test 9: Eliminar Mapping

### Pasos:
1. En lista, clic **"Eliminar"** en un mapping
2. ¿Aparece confirmación?

### ✅ Esperado:
- [ ] Mapping se elimina de la lista
- [ ] Si recargas página, sigue desaparecido
- [ ] Sin error en console

---

## 🚀 Test 10: Validación de Errores

### Prueba 1: Sin conexión seleccionada
1. Abre nuevo mapping
2. Intenta clic "Siguiente" sin seleccionar tabla
3. ¿Muestra error o está deshabilitado?

### ✅ Esperado:
- [ ] Botón "Siguiente" deshabilitado hasta que selecciones tabla
- [ ] O muestra error visible

### Prueba 2: Sin columnas seleccionadas
1. Ve a Paso 3
2. Intenta "Siguiente" sin seleccionar ninguna columna
3. ¿Muestra aviso?

### ✅ Esperado:
- [ ] Aviso: "⚠️ Debes seleccionar al menos 1 columna"
- [ ] Botón deshabilitado

### Prueba 3: Sin campos requeridos mapeados
1. Ve a Paso 4
2. Intenta guardar sin mapear `itemCode` o `itemName`
3. ¿Muestra error?

### ✅ Esperado:
- [ ] Aviso rojo: "⚠️ Campos requeridos sin mapear: itemCode, itemName"
- [ ] Botón "Guardar" deshabilitado

---

## 📊 Resumen de Tests

| Test | Función | ✅/❌ |
|------|---------|--------|
| 1 | Abrir Mapping Admin | |
| 2 | Crear nuevo mapping | |
| 3 | Paso 1: Tabla y JOINs | |
| 4 | Paso 2: Filtros | |
| 5 | Paso 3: Columnas | |
| 6 | Paso 4: Mapeo | |
| 7 | Guardar mapping | |
| 8 | Editar mapping | |
| 9 | Eliminar mapping | |
| 10 | Validación de errores | |

---

## 🐛 Si Algo Falla

### Paso 1: Abre Console (F12)
```
Errors? → Comparte el error exacto
Warnings? → Puede ser ignorado si funciona
Network tab? → ¿Qué requests se envían?
```

### Paso 2: Revisa Backend
```
¿Está levantado?  → npm run dev en api/
¿API endpoints existen?
  GET /erp-connections/{id}/available-tables
  POST /erp-connections/{id}/table-schemas
  POST /mapping-configs
  PATCH /mapping-configs/{id}
¿Base de datos conectada?
```

### Paso 3: Reconstruye
```powershell
# Limpiar todo
rm -r node_modules package-lock.json
npm install

# Reconstruir
npm run build

# Reiniciar servidor
npm run dev
```

---

## ✅ Si TODO Funciona

**¡Felicidades!** 🎉

La migración está completa y funcional. Próximos pasos:

1. **Integración Fase 2**: Usar mapping para cargar inventario
2. **Testing real**: Crear mappings reales con datos de Catelli
3. **Limpiar código viejo**: Eliminar QueryBuilder y FieldMappingBuilder si no se usan

---

## 📞 Notas

- Si SimpleMappingBuilder no se ve, probablemente es un error de import
- Si API falla, revisa que los endpoints existen en backend
- Si SQL es incorrecto, verifica el preview en cada paso
- Si validación no funciona, revisa console para mensajes de error

**Buena suerte con los tests!** 🚀

