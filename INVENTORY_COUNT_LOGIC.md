# Lógica de Conteo de Inventario - Análisis y Rediseño

## 1. ESTADO ACTUAL (PROBLEMA)

### Flujo Actual (Incorrecto)
```
Usuario abre Conteo
    ↓
Usuario busca artículo manualmente
    ↓
Usuario ingresa cantidad contada
    ↓
Se crea InventoryCount_Item (sin systQty)
    ↓
NO hay comparación automática
```

**Problemas:**
- ❌ Sin acceso a artículos del ERP
- ❌ Sin existencias del sistema (systemQty)
- ❌ Sin UDM correcto (unidad de medida)
- ❌ No hay relación con Catelli (precio, empaque, conversiones)
- ❌ Varianza manual (no automática)

---

## 2. ESTADO DESEADO (SOLUCIÓN)

### Flujo Correcto
```
Usuario selecciona Almacén
    ↓
Sistema carga artículos automáticamente (Catelli.articulo vía mapping)
    ↓
Para cada artículo, obtiene:
    - itemCode (SKU)
    - itemName (descripción)
    - systemQty (de Catelli.existencia_bodega)
    - uom (de Catelli.articulo.columna_empaque)
    - costPrice (de articulo_precio)
    ↓
Usuario ve lista de artículos CON existencias del sistema
    ↓
Usuario ingresa SOLO la cantidad contada
    ↓
Sistema calcula automáticamente:
    - countedQty (ingresado por usuario)
    - variance = countedQty - systemQty
    - variancePercent = (variance / systemQty) * 100
    ↓
Se crea InventoryCount_Item con datos COMPLETOS
    ↓
Se genera VarianceReport automáticamente
```

---

## 3. TABLAS CATELLI NECESARIAS

### Conexión a Catelli
```sql
-- En Catelli (ERP source)
SELECT
  a.codigo AS itemCode,
  a.descripcion AS itemName,
  a.cantidad_empaque AS packQty,          -- Define UDM
  a.unidad_empaque AS uom,                -- Unidad (Cajas, Pz, etc)
  eb.cantidad AS systemQty,               -- Existencia actual
  ap.costo AS costPrice,
  ap.precio_venta AS salePrice
FROM catelli.articulo a
LEFT JOIN catelli.existencia_bodega eb
  ON a.id = eb.articulo_id AND eb.bodega_id = ?
LEFT JOIN catelli.articulo_precio ap
  ON a.id = ap.articulo_id
WHERE a.estado = 'ACTIVO'
```

---

## 4. ESTRUCTURA DE DATOS MEJORADA

### Modelo Prisma: InventoryCount_Item (Mejorado)

```prisma
model InventoryCount_Item {
  id        String   @id @default(cuid())
  countId   String
  count     InventoryCount @relation(fields: [countId], references: [id], onDelete: Cascade)

  locationId String
  location   Warehouse_Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  // Datos del artículo (desde Catelli)
  itemCode  String
  itemName  String

  // Unidad de Medida (del empaque)
  packQty   Decimal  @default(1)     // Ej: 12 (docena)
  uom       String                   // Ej: "Cajas", "Pz", "KG", "LT"
  baseUom   String   @default("PZ")  // Unidad base para conversión

  // Cantidades
  systemQty Decimal                  // Cantidad en sistema (Catelli)
  countedQty Decimal                 // Cantidad contada (usuario)
  variance  Decimal   @computed       // = countedQty - systemQty
  variancePercent Float @computed    // = (variance / systemQty) * 100

  // Precios (para auditoría)
  costPrice Decimal?
  salePrice Decimal?

  // Auditoría
  notes     String?
  countedBy String?
  countedAt DateTime @default(now())

  variance_report VarianceReport?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([countId, locationId, itemCode])
  @@index([countId])
  @@index([locationId])
}
```

---

## 5. ENDPOINT NECESARIO

### 1. GET /api/inventory-counts/{id}/prepare
**Propósito:** Cargar artículos automáticamente desde Catelli

```typescript
Request:
{
  countId: string,
  warehouseId: string,
  locationId?: string  // opcional, si no especifica todas las ubicaciones
}

Response:
{
  items: [
    {
      itemCode: "ART001",
      itemName: "Producto A",
      packQty: 12,
      uom: "Cajas",
      baseUom: "PZ",
      systemQty: 120,  // 10 cajas * 12 unidades
      costPrice: 50.00,
      salePrice: 75.00
    },
    ...
  ],
  summary: {
    totalItems: 150,
    totalQty: 5000,
    totalValue: 375000.00
  }
}
```

### 2. POST /api/inventory-counts/{id}/items (Mejorado)
**Propósito:** Agregar cantidad contada (ya existe el artículo)

```typescript
Request:
{
  locationId: string,
  itemCode: string,
  countedQty: number,
  notes?: string
}

Response:
{
  id: string,
  itemCode: "ART001",
  itemName: "Producto A",
  systemQty: 120,
  countedQty: 118,
  variance: -2,
  variancePercent: -1.67,
  status: "OK"  // OK, WARNING (5-10%), ALERT (>10%)
}
```

---

## 6. LÓGICA DE UDM (Unidad de Medida)

### Caso 1: Artículo con empaque
```
articulo.cantidad_empaque = 12 (docena)
articulo.unidad_empaque = "Cajas"

systemQty en Catelli = 120 unidades
Mostrar al usuario = "10 Cajas" (120 / 12)

Usuario cuenta = 10 cajas
Convertir a unidades = 10 * 12 = 120 unidades
Guardar: countedQty = 120
```

### Caso 2: Artículo sin empaque (unidades)
```
articulo.cantidad_empaque = 1
articulo.unidad_empaque = "Pz"

systemQty en Catelli = 500 unidades
Mostrar al usuario = "500 Pz"

Usuario cuenta = 495 pz
Guardar: countedQty = 495
```

### Caso 3: Artículos por peso/volumen
```
articulo.unidad_empaque = "KG"
cantidad_empaque = 5 (cada empaque tiene 5kg)

systemQty = 1000 KG
Mostrar = "200 empaques (1000 KG)"

Usuario cuenta = 198 empaques
Convertir = 198 * 5 = 990 KG
Guardar: countedQty = 990
```

---

## 7. FLUJO DE INTEGRACIÓN CON MAPPING

### Step 1: Usar MappingConfig para obtener datos de Catelli

```typescript
// En InventoryCountService.prepareCountItems()

const mappingConfig = await this.getMappingConfig(companyId, 'ITEMS');

// Construir query dinámicamente usando field mappings
const query = this.buildMappedQuery(mappingConfig);

// Ejecutar contra Catelli (vía ERPConnection)
const items = await this.erpConnector.executeQuery(
  erpConnectionId,
  query,
  { warehouseId, locationId }
);

// Normalizar a InventoryCount_Item
const normalizedItems = items.map(item => ({
  itemCode: item[mappingConfig.fields.itemCode],
  itemName: item[mappingConfig.fields.itemName],
  systemQty: item[mappingConfig.fields.systemQty],
  packQty: item[mappingConfig.fields.packQty],
  uom: item[mappingConfig.fields.uom],
  costPrice: item[mappingConfig.fields.costPrice],
}));
```

---

## 8. CÁLCULO AUTOMÁTICO DE VARIANZA

### Cuando se completa el conteo:

```typescript
async completeCount(countId: string) {
  // 1. Obtener todos los items del conteo
  const items = await this.getCountItems(countId);

  // 2. Para cada item, calcular varianza
  for (const item of items) {
    const variance = item.countedQty - item.systemQty;
    const variancePercent = (variance / item.systemQty) * 100;

    // 3. Crear VarianceReport automáticamente
    await this.createVarianceReport({
      countItemId: item.id,
      variance,
      variancePercent,
      status: this.determineStatus(variancePercent),
      // status: 'OK' si < 2%, 'WARNING' si 2-5%, 'ALERT' si > 5%
    });

    // 4. Actualizar InventoryAdjustment si es necesario
    if (variance !== 0) {
      await this.createAdjustment({
        warehouseId: item.count.warehouseId,
        locationId: item.locationId,
        itemCode: item.itemCode,
        adjustmentQty: variance,
        reason: 'PHYSICAL_COUNT',
        countId,
      });
    }
  }
}
```

---

## 9. FRONTEND NECESARIO

### Nuevo flujo en InventoryCountPage:

```
1. Seleccionar Almacén ✓ (ya existe)
2. Click "Iniciar Conteo"
   ↓
3. Sistema carga artículos automáticamente (GET /prepare)
   ↓
4. Mostrar tabla:
   | Código | Nombre | Sistema | UDM | Contado | Varianza |
   |--------|--------|---------|-----|---------|----------|
   | ART001 | Prod A | 10 Cajas| --- | [input] | Auto    |

5. Usuario ingresa cantidad en "Contado"
   ↓
6. Sistema calcula automáticamente "Varianza"
   ↓
7. Click "Completar Conteo"
   ↓
8. Sistema crea VarianceReport y InventoryAdjustment automáticamente
   ↓
9. Mostrar Resumen de Varianzas
```

---

## 10. PLAN DE IMPLEMENTACIÓN

### Fase 1: Backend
- [ ] Crear endpoint GET `/inventory-counts/{id}/prepare`
- [ ] Implementar `InventoryCountService.prepareCountItems()`
- [ ] Integrar con MappingConfig y ERPConnector
- [ ] Mejorar modelo InventoryCount_Item con campos faltantes
- [ ] Implementar cálculo automático de varianzas

### Fase 2: Frontend
- [ ] Actualizar InventoryCountPage para cargar artículos automáticamente
- [ ] Mostrar tabla con artículos + cantidades del sistema
- [ ] Input solo para cantidad contada
- [ ] Cálculo automático de varianza en tiempo real
- [ ] Completar conteo con una sola acción

### Fase 3: Varianzas
- [ ] Crear VarianceReport automáticamente al completar
- [ ] Generar InventoryAdjustment automáticamente
- [ ] Mostrar resumen de varianzas por rango

---

## 11. QUERIES SQL EJEMPLO

```sql
-- Para Catelli (mappable)
SELECT
  a.codigo,
  a.descripcion,
  a.cantidad_empaque,
  a.unidad_empaque,
  COALESCE(eb.cantidad, 0) as stock_actual,
  ap.costo,
  ap.precio_venta
FROM catelli.articulo a
LEFT JOIN catelli.existencia_bodega eb
  ON a.id = eb.articulo_id
  AND eb.bodega_id = $1
LEFT JOIN catelli.articulo_precio ap
  ON a.id = ap.articulo_id
WHERE a.estado = 'A'
  AND (a.categoria_id IS NULL OR a.categoria_id IN ('...'))
ORDER BY a.codigo;
```

---

## RESUMEN

**Lo que cambió:**
1. Artículos se cargan AUTOMÁTICAMENTE desde Catelli
2. Cantidades del sistema se obtienen automáticamente
3. UDM se resuelve desde cantidad_empaque de Catelli
4. Usuario SOLO ingresa cantidad contada
5. Varianzas se calculan AUTOMÁTICAMENTE
6. Todo está integrado con MappingConfig

**Beneficios:**
✅ Conteo más rápido y preciso
✅ Menos errores manuales
✅ Auditoría completa (quién, cuándo, qué)
✅ Varianzas automáticas
✅ Integración con ERP real
✅ UDM flexible según artículo
