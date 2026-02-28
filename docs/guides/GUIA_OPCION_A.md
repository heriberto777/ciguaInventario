# 🎯 GUÍA: Opción A (MappingConfig) - Carga Flexible sin Código

## **¿Qué es la Opción A?**

Sistema flexible que permite:
- ✅ Crear queries personalizadas SIN cambios de código
- ✅ Mapear campos dinámicamente desde cualquier tabla de Catelli
- ✅ Cada empresa puede tener su propia configuración
- ✅ Cambios en tiempo real sin redeploy

**Ventaja vs Opción B:** Opción B tiene hardcodeada la query, Opción A la tienes en BD.

---

## **Cómo funciona**

### **Arquitectura**

```
┌─────────────────┐
│  Usuario Admin  │
│  (Web UI)       │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ POST /mapping-configs│  ← Crear/editar mapping
└────────┬─────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ BD: MappingConfig   │  ← Se guarda en BD
    │ - sourceQuery       │
    │ - fieldMappings     │
    │ - filters           │
    └─────────────────────┘
         │
         ▼
    Al hacer POST /prepare:
    ├─ Lee MappingConfig de BD
    ├─ Ejecuta sourceQuery
    ├─ Mapea campos con fieldMappings
    ├─ Retorna datos normalizados
    └─ Guarda en tabla InventoryCount_Item
```

---

## **Guía Paso a Paso**

### **PASO 1: Obtener estructura de tus tablas Catelli**

**¿Qué necesitas saber?**

Tienes que describir a Catelli qué tablas y campos tienes. Ejemplo:

```sql
-- En Catelli, ejecuta:
SELECT
  c.TABLE_NAME,
  c.COLUMN_NAME,
  c.DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME IN ('articulo', 'existencia_bodega', 'articulo_precio')
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
```

**Resultado esperado:**
```
articulo:
  - codigo (varchar)
  - descripcion (varchar)
  - cantidad_empaque (decimal)
  - unidad_empaque (varchar)
  - unidad_base (varchar)
  - estado (varchar)

existencia_bodega:
  - articulo_id (int)
  - bodega_id (int)
  - cantidad (decimal)

articulo_precio:
  - articulo_id (int)
  - costo (decimal)
  - precio_venta (decimal)
  - estado (varchar)
```

---

### **PASO 2: Crear MappingConfig vía API**

**Endpoint:** `POST /api/mapping-configs`

**Headers requeridos:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body - Ejemplo ITEMS:**
```json
{
  "datasetType": "ITEMS",
  "sourceTables": ["articulo"],
  "sourceQuery": "SELECT codigo, descripcion, cantidad_empaque, unidad_empaque, unidad_base FROM articulo WHERE estado = 'ACTIVO'",
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

**Respuesta:**
```json
{
  "data": {
    "id": "cml...",
    "companyId": "cm...",
    "datasetType": "ITEMS",
    "sourceQuery": "SELECT ...",
    "fieldMappings": {...},
    "isActive": true,
    "createdAt": "2026-02-21T..."
  }
}
```

---

### **PASO 3: Crear MappingConfig para STOCK**

**Body - STOCK:**
```json
{
  "datasetType": "STOCK",
  "sourceTables": ["existencia_bodega"],
  "sourceQuery": "SELECT articulo_id, bodega_id, cantidad FROM existencia_bodega WHERE bodega_id = @bodegaId",
  "fieldMappings": {
    "itemCode": "articulo_id",
    "systemQty": "cantidad"
  }
}
```

---

### **PASO 4: Crear MappingConfig para PRICES (opcional)**

**Body - PRICES:**
```json
{
  "datasetType": "PRICES",
  "sourceTables": ["articulo_precio"],
  "sourceQuery": "SELECT articulo_id, costo, precio_venta FROM articulo_precio WHERE estado = 'ACTIVO'",
  "fieldMappings": {
    "itemCode": "articulo_id",
    "costPrice": "costo",
    "salePrice": "precio_venta"
  }
}
```

---

## **API Endpoints de MappingConfig**

### **1. Crear Mapping**
```
POST /api/mapping-configs
Body: { datasetType, sourceTables, sourceQuery, fieldMappings, filters }
Response: { data: MappingConfig }
```

### **2. Listar todos los Mappings**
```
GET /api/mapping-configs
Response: { data: [MappingConfig...], total: 3 }
```

### **3. Obtener Mapping por tipo**
```
GET /api/mapping-configs/type/ITEMS
Response: { data: MappingConfig }
```

### **4. Actualizar Mapping**
```
PATCH /api/mapping-configs/{id}
Body: { sourceQuery?, fieldMappings?, filters?, isActive? }
Response: { data: MappingConfig }
```

### **5. Eliminar Mapping**
```
DELETE /api/mapping-configs/{id}
Response: { success: true }
```

### **6. Activar/Desactivar Mapping**
```
POST /api/mapping-configs/{id}/toggle
Body: { isActive: true }
Response: { data: MappingConfig }
```

---

## **Flujo de Carga con Opción A**

Una vez configurado MappingConfig, cuando haces:

```
POST /api/inventory-counts/{countId}/prepare
```

El sistema automáticamente:

1. ✅ Busca MappingConfig ITEMS y STOCK activos
2. ✅ Si existen → Ejecuta Opción A
3. ✅ Lee sourceQuery de BD
4. ✅ Mapea campos dinámicamente
5. ✅ Retorna artículos cargados

**Respuesta:**
```json
{
  "countId": "cmlvytuu...",
  "itemsLoaded": 1250,
  "items": [
    {
      "itemCode": "001-A",
      "itemName": "Producto A",
      "systemQty": 100,
      "costPrice": 50,
      "salePrice": 75,
      ...
    }
  ],
  "summary": {
    "totalItems": 1250,
    "totalSystemQty": 45890,
    "totalValue": 2294500
  },
  "source": "MAPPING_CONFIG"
}
```

---

## **Cambiar Query sin redeploy**

**Ejemplo: Agregar nuevo filtro**

1. **Obtén el mapping actual:**
   ```
   GET /api/mapping-configs/type/ITEMS
   ```

2. **Actualiza la query:**
   ```
   PATCH /api/mapping-configs/{id}
   Body: {
     "sourceQuery": "SELECT ... FROM articulo WHERE estado = 'ACTIVO' AND tipo IN ('PRODUCTO', 'SERVICIO')"
   }
   ```

3. **Listo** - Próximo `/prepare` usará la nueva query

---

## **Comparativa: Opción A vs Opción B**

| Aspecto | Opción A (MappingConfig) | Opción B (Direct Query) |
|---------|--------------------------|------------------------|
| **Queries** | En BD, configurables | Hardcodeadas en código |
| **Cambios** | Sin redeploy | Requiere redeploy |
| **Flexible** | Muy flexible | Rígida |
| **Multi-cliente** | Cada uno su config | Misma query para todos |
| **Complejidad** | Media | Baja |
| **Recomendado** | ✅ Producción | MVP/Testing |

---

## **Troubleshooting**

### **Error: "MappingConfig incompleto"**
→ Necesitas configurar ITEMS Y STOCK

### **Error: "No active ERP connection configured"**
→ Configura ERPConnection en `/api/erp-connections`

### **Items no cargan**
→ Verifica la sourceQuery en Catelli manualmente:
```sql
-- Copia la query desde MappingConfig y ejecútala en Catelli
SELECT codigo, descripcion, cantidad_empaque FROM articulo WHERE estado = 'ACTIVO'
```

---

## **Próximos Pasos**

1. ✅ Obtén estructura de tus tablas Catelli
2. ✅ Crea MappingConfig vía API
3. ✅ Prueba POST /prepare
4. ✅ Si funciona → Deletea el fallback a Opción B
5. ✅ Considera UI para admin crear mappings

---

## **API Testing (cURL)**

### **Crear ITEMS Mapping:**
```bash
curl -X POST http://localhost:3000/api/mapping-configs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetType": "ITEMS",
    "sourceTables": ["articulo"],
    "sourceQuery": "SELECT codigo, descripcion, cantidad_empaque, unidad_empaque, unidad_base FROM articulo WHERE estado = 'ACTIVO'",
    "fieldMappings": {
      "itemCode": "codigo",
      "itemName": "descripcion",
      "packQty": "cantidad_empaque",
      "uom": "unidad_empaque",
      "baseUom": "unidad_base"
    }
  }'
```

### **Listar Mappings:**
```bash
curl -X GET http://localhost:3000/api/mapping-configs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## **Conclusión**

**Opción A permite:**
- Máxima flexibilidad sin código
- Configuraciones específicas por empresa
- Cambios en tiempo real
- Escalable y mantenible

**¿Listo para implementar?**

1. Obtén datos de Catelli
2. Usa API de MappingConfig para guardar config
3. Haz POST /prepare
4. ¡Disfruta la carga automática!
