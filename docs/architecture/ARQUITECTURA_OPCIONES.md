# 📋 Arquitectura de Carga de Artículos - Guía Técnica

## **Resumen de las 3 Opciones**

El sistema implementa una arquitectura flexible con 3 opciones de carga de artículos desde ERP (Catelli), priorizadas automáticamente:

```
┌─────────────────────────────────────────┐
│ 1. ¿Existe MappingConfig?               │
│    ↓ Sí                 ↓ No            │
│   [Opción A]        Continuar           │
│                                         │
│ 2. ¿Existe Query Directa Catelli?       │
│    ↓ Sí                 ↓ No            │
│   [Opción B]        Continuar           │
│                                         │
│ 3. Sin auto-load                        │
│    ↓                                    │
│   [Manual Entry]                        │
│   (Usuario elige: entrada manual)       │
└─────────────────────────────────────────┘
```

---

## **OPCIÓN A: MappingConfig (FLEXIBLE & RECOMENDADA)**

### **¿Qué es?**
Configuración almacenada en BD que permite:
- Especificar qué query ejecutar
- Mapear campos de la BD Catelli a nuestro formato
- Filtros dinámicos
- **SIN cambios de código**

### **¿Dónde está?**
- **Modelo Prisma:** `PrismaSchema > MappingConfig`
- **Lógica:** `/apps/backend/src/modules/inventory-counts/service.ts` línea 71-84 (`loadFromMappingConfig()`)
- **Estado:** 🔴 **En desarrollo** (necesita implementación)

### **¿Cómo funciona?**

**Flujo:**
```
1. BD → Obtener MappingConfig para companyId
2. Extraer: sourceQuery, fieldMappings, filters
3. MSSQL Connector → Ejecutar sourceQuery con parámetros
4. Mapear campos de resultado a nuestro formato
5. Guardar en tabla InventoryCount_Item
```

**Estructura en BD:**
```typescript
// Tabla: mapping_config
{
  id: string;
  companyId: string;
  datasetType: 'ITEMS' | 'STOCK' | 'PRICES'; // Tipo de dato

  // Definición de la query
  sourceQuery: string; // SQL a ejecutar
  sourceTables: JSON;  // Tablas Catelli: {main: "articulo", joins: [...]}

  // Mapeo de campos
  fieldMappings: JSON; // {itemCode: "codigo", itemName: "descripcion", ...}

  // Filtros opcionales
  filters?: JSON;      // {estado: "ACTIVO", ...}

  // Control
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Ejemplo de MappingConfig en BD:**
```json
{
  "datasetType": "ITEMS",
  "sourceQuery": "SELECT codigo, descripcion, cantidad_empaque, unidad_empaque, unidad_base FROM articulo WHERE estado = 'ACTIVO'",
  "sourceTables": {
    "main": "articulo"
  },
  "fieldMappings": {
    "itemCode": "codigo",
    "itemName": "descripcion",
    "packQty": "cantidad_empaque",
    "uom": "unidad_empaque",
    "baseUom": "unidad_base"
  },
  "filters": {
    "estado": "ACTIVO"
  }
}
```

### **Implementación de Opción A (TODO)**

Necesita:
1. Crear método en Repository: `getMappingConfigs(companyId)`
2. En `loadFromMappingConfig()`:
   ```typescript
   // 1. Obtener MappingConfig de BD
   const itemsMapping = await this.repository.getMappingConfig(companyId, 'ITEMS');
   const stockMapping = await this.repository.getMappingConfig(companyId, 'STOCK');

   // 2. Obtener ERPConnection
   const erpConnection = await this.repository.getERPConnection(companyId);

   // 3. Ejecutar queries con mappings
   const itemsData = await connector.executeMappingQuery(itemsMapping);
   const stockData = await connector.executeMappingQuery(stockMapping);

   // 4. Mapear campos
   const normalized = itemsData.map(item => ({
     itemCode: item[itemsMapping.fieldMappings.itemCode],
     itemName: item[itemsMapping.fieldMappings.itemName],
     ...
   }));
   ```

---

## **OPCIÓN B: Query Directa (RÁPIDA & MVP)**

### **¿Qué es?**
Query SQL **hardcodeada** directamente en el código para MVP rápido.

### **¿Dónde está?**
- **Lógica:** `/apps/backend/src/modules/inventory-counts/service.ts` línea 96-185
- **Query SQL:** Líneas 125-140 (dentro de `loadFromDirectQuery()`)
- **Estado:** ✅ **IMPLEMENTADA**

### **¿Dónde está la Query?**

```typescript
// Archivo: apps/backend/src/modules/inventory-counts/service.ts
// Método: loadFromDirectQuery()
// Líneas: ~125-140

private async loadFromDirectQuery(...) {
  const query = `
    SELECT
      a.codigo AS itemCode,
      a.descripcion AS itemName,
      CAST(a.cantidad_empaque AS DECIMAL(10,2)) AS packQty,
      a.unidad_empaque AS uom,
      COALESCE(a.unidad_base, 'PZ') AS baseUom,
      COALESCE(CAST(eb.cantidad AS DECIMAL(18,4)), 0) AS systemQty,
      CAST(COALESCE(ap.costo, 0) AS DECIMAL(18,4)) AS costPrice,
      CAST(COALESCE(ap.precio_venta, 0) AS DECIMAL(18,4)) AS salePrice
    FROM articulo a
    LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id AND eb.bodega_id = @bodegaId
    LEFT JOIN articulo_precio ap ON a.id = ap.articulo_id
    WHERE a.estado = 'ACTIVO' AND a.codigo IS NOT NULL
    ORDER BY a.codigo
  `;

  const items = await connector.executeQuery(query, { bodegaId: warehouseId });
  // ...
}
```

### **Tablas de Catelli usadas:**
- `articulo` - Catálogo de artículos
- `existencia_bodega` - Stock por almacén
- `articulo_precio` - Precios

### **Campos mapeados:**
| Campo Catelli | Campo Nuestro | Tipo | Descripción |
|---|---|---|---|
| codigo | itemCode | string | Código único del artículo |
| descripcion | itemName | string | Nombre del artículo |
| cantidad_empaque | packQty | number | Cantidad en empaque |
| unidad_empaque | uom | string | Unidad de medida de empaque |
| unidad_base | baseUom | string | Unidad base |
| existencia_bodega.cantidad | systemQty | number | Stock en almacén |
| articulo_precio.costo | costPrice | number | Costo unitario |
| articulo_precio.precio_venta | salePrice | number | Precio de venta |

### **Cómo cambiar la Query en Opción B:**

1. **Abrir:** `apps/backend/src/modules/inventory-counts/service.ts`
2. **Ir a:** Método `loadFromDirectQuery()` (~línea 126)
3. **Modificar:** La query SQL en la variable `query`
4. **Guardar:** El servidor recargará automáticamente

**Ejemplo: Agregar filtro de estado de precio:**
```typescript
// Antes:
WHERE a.estado = 'ACTIVO' AND a.codigo IS NOT NULL

// Después:
WHERE a.estado = 'ACTIVO'
  AND a.codigo IS NOT NULL
  AND ap.estado = 'ACTIVO'  // ← Agregar esta línea
```

---

## **OPCIÓN C: Entrada Manual**

### **¿Qué es?**
Si Opción A y B fallan, retorna array vacío permitiendo al usuario agregar artículos manualmente por UI.

### **Ubicación en código:**
- `/apps/backend/src/modules/inventory-counts/service.ts` línea 59-66
- Endpoint retorna: `{items: [], source: 'MANUAL', warning: "..."}`

### **Frontend:**
- Muestra tabla vacía
- Usuario puede agregar cada artículo manualmente
- Válido para pequeñas pruebas o casos especiales

---

## **DECISIÓN RECOMENDADA**

### **Para MVP (AHORA):**
✅ **Usar Opción B (Query Directa)**
- Ya implementada
- Configurable solo en código
- Suficiente para pruebas iniciales

**Pasos:**
1. Configurar variables de entorno (CATELLI_HOST, CATELLI_USER, etc.)
2. Ajustar la query SQL según tus tablas reales en Catelli
3. Probar

### **Para Producción (DESPUÉS):**
✅ **Migrar a Opción A (MappingConfig)**
- Flexible sin cambios de código
- Cada cliente puede tener su propia query
- Mantenible a largo plazo

**Pasos:**
1. Crear tabla `MappingConfig` en Prisma
2. Implementar `loadFromMappingConfig()` completo
3. Guardar queries en BD en lugar de código
4. Usuarios finales pueden cambiar sin contactar IT

---

## **Resumen de Ubicaciones Clave**

| Componente | Ubicación | Estado |
|---|---|---|
| **Opción A** | `service.ts:71-84` | 🔴 En desarrollo |
| **Opción B - Lógica** | `service.ts:96-185` | ✅ Implementada |
| **Opción B - Query** | `service.ts:125-140` | ✅ Hardcodeada |
| **Opción C** | `service.ts:59-66` | ✅ Fallback |
| **Conector MSSQL** | `mssql-connector.ts` | ✅ Completo |
| **Factory Patrón** | `erp-connector-factory.ts` | ✅ Completo |

---

## **Próximos Pasos**

1. **Configura Catelli** (Opción B):
   ```env
   CATELLI_HOST=tu_servidor
   CATELLI_PORT=1433
   CATELLI_DATABASE=Catelli
   CATELLI_USER=tu_usuario
   CATELLI_PASSWORD=tu_contraseña
   ```

2. **Ajusta la Query** según tus tablas reales

3. **Prueba el flujo:**
   - Crea conteo
   - Haz POST a `/prepare`
   - Verifica artículos cargados

4. **Cuando necesites flexibilidad:**
   - Implementa Opción A (MappingConfig)
   - Almacena queries en BD
   - Permite configuración sin código

