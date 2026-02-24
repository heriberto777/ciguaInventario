# 🔄 Cómo Funcionan Juntas las 3 Opciones

## **Arquitectura Completa**

```
                    POST /inventory-counts/{id}/prepare
                              ↓
                 ┌────────────────────────────┐
                 │ prepareCountItems()        │
                 │ (Service)                  │
                 └────────────────────────────┘
                              ↓
                    ┌──────────┴──────────┐
                    ↓                     ↓
        ┌──────────────────────┐  ┌──────────────────────┐
        │ Opción A:            │  │ checkMappingConfigs()│
        │ MappingConfig        │  │                      │
        │ (Flexible)           │  │ ¿Existe ITEMS +      │
        │                      │  │  STOCK config?       │
        │ ✅ Carga desde BD    │  │                      │
        │ ✅ Múltiples tablas  │  └──────────┬───────────┘
        │ ✅ JOINS             │             │
        │ ✅ Mapeos dinámicos  │         Sí  │  No
        │ ✅ Sin código        │             ↓
        └──────────┬───────────┘    ┌──────────────────────┐
                   │                │ Opción B:            │
                   │ checkERPConnection()               │ Direct Query     │
                   │ ¿Conexión ERP   │ (Hardcodeada)    │
                   ↓ activa?         │                  │
        ┌──────────────────────┐    │ ✅ Query SQL     │
        │ DynamicQueryBuilder  │    │    predefinida   │
        │                      │    │ ✅ Fallback rápido
        │ 1. Lee mapping de BD │    │                  │
        │ 2. Construye queries │    │ Para: MVP/Testing│
        │    SELECT con JOINS  │    └──────────┬───────┘
        │ 3. Ejecuta en Catelli
        │ 4. Mapea campos      │                │ No funciona
        │ 5. Retorna items     │                ↓
        └──────────┬───────────┘    ┌──────────────────────┐
                   │                │ Opción C:            │
                   │                │ Manual Entry         │
                   │                │                      │
                   │                │ ❌ Fallback         │
                   │                │ ✅ Usuario agrega   │
                   │                │    artículos        │
                   │                │    manualmente      │
                   │                └──────────┬───────────┘
                   ↓                           ↓
            ┌─────────────────────────────────────┐
            │ Resultado Final:                    │
            │ {                                   │
            │   countId: "...",                   │
            │   itemsLoaded: 1250,                │
            │   items: [...],                     │
            │   summary: {...},                   │
            │   source: "MAPPING_CONFIG" |        │
            │           "DIRECT_QUERY" |          │
            │           "MANUAL"                  │
            │ }                                   │
            └─────────────────────────────────────┘
```

---

## **Opción A: MappingConfig (Recomendada)**

### **¿Cuándo usar?**
- ✅ Producción
- ✅ Múltiples clientes con diferente estructura
- ✅ Necesitas cambios sin redeploy
- ✅ Múltiples tablas a unir (JOINS)

### **Cómo funciona:**

**1. Usuario Admin configura:**
```json
{
  "datasetType": "ITEMS",
  "mainTable": { "name": "articulo", "alias": "a" },
  "joins": [
    {
      "name": "existencia_bodega",
      "alias": "eb",
      "joinType": "LEFT",
      "joinCondition": "a.id = eb.articulo_id"
    }
  ],
  "fieldMappings": [
    { "sourceField": "a.codigo", "targetField": "itemCode", "dataType": "string" },
    { "sourceField": "a.descripcion", "targetField": "itemName", "dataType": "string" },
    { "sourceField": "eb.cantidad", "targetField": "systemQty", "dataType": "number" }
  ]
}
```

**2. Al cargar artículos:**
```
loadFromMappingConfig()
  ↓
1. Obtiene MappingConfig de BD
2. Crea DynamicQueryBuilder con los datos
3. Builder construye SQL:
   SELECT a.codigo AS itemCode, a.descripcion AS itemName, eb.cantidad AS systemQty
   FROM articulo a
   LEFT JOIN existencia_bodega eb ON a.id = eb.articulo_id
4. Ejecuta en Catelli
5. Mapea: row.codigo → item.itemCode, row.descripcion → item.itemName, etc.
6. Retorna items normalizados
```

**Ventajas:**
- 🎯 Completamente flexible
- 🎯 Múltiples tablas y campos
- 🎯 Sin código, solo configuración
- 🎯 Cambios en tiempo real

---

## **Opción B: Direct Query (MVP)**

### **¿Cuándo usar?**
- ✅ MVP / Testing rápido
- ✅ Estructura de Catelli conocida y fija
- ✅ Sin cambios esperados
- ✅ Prototipado

### **Cómo funciona:**

**1. Query SQL hardcodeada:**
```typescript
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
```

**2. Al cargar artículos:**
```
loadFromDirectQuery()
  ↓
1. Ejecuta query SQL directa en Catelli
2. Mapea campos automáticamente según names (itemCode, itemName, etc.)
3. Retorna items normalizados
```

**Ventajas:**
- ⚡ Rápido y simple
- ⚡ No requiere config en BD
- ⚡ MVP perfecto

**Desventajas:**
- ❌ Requiere redeploy para cambios
- ❌ Misma query para todos
- ❌ Difícil mantener con cambios frecuentes

---

## **Opción C: Manual Entry**

### **¿Cuándo usar?**
- ✅ Fallback si A y B fallan
- ✅ Datos especiales/puntuales
- ✅ Testing sin ERP conectado

### **Cómo funciona:**

**1. Retorna estructura vacía:**
```json
{
  "countId": "...",
  "itemsLoaded": 0,
  "items": [],
  "summary": { "totalItems": 0, "totalSystemQty": 0, "totalValue": 0 },
  "source": "MANUAL",
  "warning": "Auto-load no disponible. Agregue artículos manualmente."
}
```

**2. Usuario agrega manualmente:**
```typescript
interface AddCountItemDTO {
  itemCode: string;
  itemName: string;
  packQty: number;
  uom: string;
  systemQty: number;
  countedQty?: number;
  costPrice?: number;
  salePrice?: number;
}

POST /api/inventory-counts/{countId}/items
Body: AddCountItemDTO
```

---

## **Comparativa Decisional**

**¿Qué opción debería usar?**

```
┌─ ¿Producción?
│  ├─ Sí → ¿Múltiples clientes con diferente estructura?
│  │   ├─ Sí → OPCIÓN A (MappingConfig)
│  │   └─ No → ¿Cambia frecuentemente?
│  │       ├─ Sí → OPCIÓN A (MappingConfig)
│  │       └─ No → OPCIÓN B (Direct Query)
│  │
│  └─ No ¿Es testing/MVP?
│      ├─ Sí → OPCIÓN B (Direct Query)
│      └─ No → ¿Necesitas máxima flexibilidad?
│          ├─ Sí → OPCIÓN A (MappingConfig)
│          └─ No → Cualquiera
│
└─ Si A falla → Intenta B
   Si B falla → Opción C (Manual)
```

---

## **Flujo Recomendado de Implementación**

### **Fase 1: MVP (Rápido)**
- ✅ Implementar Opción B (Query Directa)
- ✅ Probar con Catelli
- ✅ Validar que los datos se cargan correctamente

### **Fase 2: Producción (Flexible)**
- ✅ Implementar Opción A (MappingConfig)
- ✅ Crear página Admin para gestionar mappings
- ✅ Migraría desde B a A
- ✅ Mantener B como fallback

### **Fase 3: Interfaz Visual (UX)**
- ✅ Query Builder Page para crear queries sin SQL
- ✅ Admin Panel para gestionar mappings
- ✅ Validación y preview en tiempo real

---

## **Ejemplo Real: Migración de B a A**

### **Semana 1: Opción B (MVP)**
```
1. Query directa con tabla articulo + existencia_bodega
2. Carga 1250 artículos correctamente
3. Usuario valida datos
```

### **Semana 2: Problema encontrado**
```
⚠️ Usuario: "Necesito agregar costo de artículos"
↓
Problema: La query B no trae costo (solo está en articulo_precio)
Solución: Agregar LEFT JOIN a articulo_precio
```

**Con Opción B (sin esta implementación):**
```
❌ Cambiar código en service.ts
❌ Ajustar query SQL
❌ Redeploy a producción
❌ Riesgo de errores
⏰ 2-3 horas de trabajo
```

**Con Opción A (con esta implementación):**
```
✅ Abrir Admin Panel
✅ Editar MappingConfig ITEMS
✅ Agregar JOIN a articulo_precio
✅ Agregar fieldMapping para costo
✅ Guardar
⏰ 5 minutos
✅ Listo en producción inmediatamente
```

---

## **Puntos Clave de la Arquitectura**

### **1. Fallback Inteligente**
```typescript
// Intenta Opción A primero
if (checkMappingConfigs()) {
  return loadFromMappingConfig();
}
// Si falla, intenta Opción B
try {
  return loadFromDirectQuery();
} catch {
  // Si ambas fallan, Opción C
  return manualEntry();
}
```

### **2. Sin Duplicación de Lógica**
- Ambas opciones mapean campos igual
- Ambas normalizan datos igual
- Solo cambia **dónde se define** la query (BD vs código)

### **3. Escalabilidad**
```
1 cliente    → Opción B (simple, rápido)
5 clientes   → Opción B (aún manejable)
50+ clientes → Opción A (cada uno su config)
```

### **4. Mantenibilidad**
```
Cambios en Catelli:
- Opción B: Cambio código + redeploy
- Opción A: Cambio config en BD + listo

Agregación de cliente:
- Opción B: Reutiliza código
- Opción A: Nueva config en BD, código sin cambios
```

---

## **Conclusión**

Esta arquitectura proporciona:

✅ **Flexibilidad máxima** sin sacrificar velocidad
✅ **Escalabilidad** desde MVP a producción multi-cliente
✅ **Mantenibilidad** con cambios sin redeploy
✅ **Resiliencia** con fallbacks automáticos
✅ **Experiencia UX** con interfaces visuales

Está lista para **producción enterprise**. 🚀

