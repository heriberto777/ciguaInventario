# QueryExplorerPage - Fase 1.5 Completada

## Descripción

Se ha creado **QueryExplorerPage** - una nueva funcionalidad que permite explorar datos del ERP sin necesidad de crear mappings.

## Localización

```
apps/web/src/pages/QueryExplorerPage.tsx
```

## Ruta

```
http://localhost:3000/inventory/query-explorer
```

## Funcionalidades

### 1. Seleccionar ERP Connection
- Carga dinámicamente todas las conexiones ERP disponibles
- Sin hardcoding

### 2. Seleccionar Tabla Principal
- Una vez seleccionada la conexión, carga las tablas disponibles
- Muestra nombre de tabla y cantidad de columnas

### 3. Seleccionar Columnas
- Muestra lista de columnas disponibles con tipos de dato
- Permite marcar/desmarcar columnas
- Permite establecer límite de filas (default 100)

### 4. Ejecutar Query
- Genera SQL automáticamente basado en la selección
- Muestra el SQL generado
- Ejecuta query contra el ERP
- Muestra resultados en tabla interactive
- Scroll horizontal para muchas columnas
- Truncado a 50 filas para performance (muestra total)

### 5. Guardar como Mapping (Opcional)
- Permite guardar la query como un Mapping reutilizable
- Requiere:
  - Nombre del mapping
  - Seleccionar warehouse destino
- Una vez guardado, puede ser usado en "Load Inventory from ERP"

## Flujo de Uso

```
1. Seleccionar Conexión ERP
   ↓
2. Seleccionar Tabla
   ↓
3. Seleccionar Columnas
   ↓
4. Click "Ejecutar Query"
   ↓
5. Ver Resultados
   ↓
6. (Opcional) Guardar como Mapping
```

## Ventajas

✅ **Exploración Rápida** - Probar queries sin guardar
✅ **Sin Mappings Previos** - No necesita mapping configurado
✅ **Reutilizable** - Opcionalmente guardar como mapping
✅ **Dinámico** - Todo desde API, sin hardcoding
✅ **Visual** - Query builder visual
✅ **Datos en Vivo** - Muestra datos reales del ERP

## Caso de Uso

Ideal para:
- Explorar estructura de datos del ERP
- Probar queries antes de guardarlas como mapping
- Debugging y troubleshooting
- Entender relaciones entre tablas
- Testing rápido

## Integración

Se integra con:
- `LoadInventoryFromERPPage` - Los mappings guardados aquí pueden ser usados allí
- `/erp-connections/{id}/tables` - Obtener tablas disponibles
- `/erp-connections/{id}/table-schemas` - Obtener estructura de columnas
- `/erp-connections/{id}/preview-query` - Ejecutar query y obtener datos
- `/mapping-configs` - Guardar como mapping

## Próximo Paso

Después de explorar datos aquí, se puede:
1. Guardar como Mapping
2. Usar ese mapping en "Load Inventory from ERP"
3. Realizar Conteo Físico
4. Sincronizar al ERP

---

**Estado:** ✅ Completado
**Compilación:** ✅ Sin errores
**Testing:** Pendiente (ver PLAN_TESTING_COMPLETO.md TEST 0.5)
