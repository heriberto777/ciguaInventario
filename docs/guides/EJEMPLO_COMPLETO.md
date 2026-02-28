# 🎬 Ejemplo Completo: Flujo End-to-End

**Demostración paso-a-paso del sistema de carga automática**

---

## 🎯 Escenario

**Usuario:** Juan (Encargado de conteo de inventario)
**Empresa:** Cigua S.A.
**Almacén:** Bodega Central
**Objetivo:** Realizar conteo de inventario con validación automática de varianzas

---

## 📍 Paso 1: Juan Inicia Sesión

```bash
POST /api/auth/login
{
  "email": "juan@cigua.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_001",
    "email": "juan@cigua.com",
    "companyId": "cigua_001"
  }
}
```

---

## 📋 Paso 2: Juan Abre Página de Conteos

**URL:** `http://localhost:5173/admin/inventory-counts`

**Frontend muestra:**
```
┌─────────────────────────────────────────┐
│ 📊 CONTEOS DE INVENTARIO                │
├─────────────────────────────────────────┤
│                                         │
│ ✖️ Conteos Activos: 0                   │
│ ✅ Completados: 3                       │
│ 🕐 Última carga: 15 feb                 │
│                                         │
│ [+ NUEVO CONTEO] [Buscar...]            │
│                                         │
│ (Lista vacía)                           │
│                                         │
└─────────────────────────────────────────┘
```

---

## ➕ Paso 3: Juan Crea Nuevo Conteo

**Click:** `[+ NUEVO CONTEO]`

**Frontend muestra modal:**
```
┌──────────────────────────────────────┐
│ 📝 CREAR CONTEO DE INVENTARIO       │
├──────────────────────────────────────┤
│                                      │
│ Almacén:   [Bodega Central ▼]        │
│ Descripción: [________________]       │
│                                      │
│      [Cancelar]    [Crear]           │
│                                      │
└──────────────────────────────────────┘
```

**Juan selecciona:**
- Almacén: "Bodega Central" (ID: warehouse_001)
- Descripción: "Conteo Mensual Feb 2026"

**Click:** `[Crear]`

---

## 🔄 Backend: Crear Conteo

```typescript
POST /api/inventory-counts
{
  "companyId": "cigua_001",
  "warehouseId": "warehouse_001",
  "description": "Conteo Mensual Feb 2026"
}

// Backend
InventoryCountService.createCount()
  → Valida warehouse existe
  → Genera código: INV-2026-02-001
  → Crea en BD con status: DRAFT
  → Retorna conteo creado

Response:
{
  "id": "count_feb_001",
  "code": "INV-2026-02-001",
  "companyId": "cigua_001",
  "warehouseId": "warehouse_001",
  "status": "DRAFT",
  "createdAt": "2026-02-21T10:30:00Z",
  "countItems": []
}
```

---

## 📥 Paso 4: Juan Ve Conteo Creado

**Frontend actualiza:**
```
┌──────────────────────────────────────────────────┐
│ 📝 CONTEO: INV-2026-02-001                      │
├──────────────────────────────────────────────────┤
│ Almacén: Bodega Central                          │
│ Descripción: Conteo Mensual Feb 2026             │
│ Estado: 🔵 DRAFT                                 │
├──────────────────────────────────────────────────┤
│                                                  │
│ Step 1: SELECCIONAR ALMACÉN ✅                   │
│ Step 2: CARGAR ARTÍCULOS ⏳                      │
│ Step 3: INGRESAR CANTIDADES ⏳                   │
│ Step 4: COMPLETAR CONTEO ⏳                      │
│                                                  │
│ [Cancelar]  [Siguiente: Cargar Items]           │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🔄 Paso 5: Juan Intenta Cargar Artículos Automáticamente

**Click:** `[Siguiente: Cargar Items]`

**Frontend ejecuta:**
```typescript
POST /api/inventory-counts/count_feb_001/prepare
{
  "warehouseId": "warehouse_001"
}
```

---

## 🔄 Backend: Cargar Automáticamente

```typescript
// InventoryCountService.prepareCountItems()

console.log('📍 Loading inventory count items...');

// 1️⃣ Validar conteo existe
const count = await repository.getCountById('count_feb_001', 'cigua_001');
if (!count) throw new AppError(404, 'Count not found');

// 2️⃣ Intentar Opción A: MappingConfig
const mappings = await checkMappingConfigs('cigua_001');
if (mappings.isConfigured) {
  console.log('📍 Using Option A: MappingConfig');
  return await loadFromMappingConfig(...);
}

// 3️⃣ Fallback Opción B: Query Directa
const hasConnection = await checkERPConnection('cigua_001');
if (hasConnection) {
  console.log('📍 Using Option B: Direct Query from Catelli');

  // Conectar a Catelli
  const connector = ERPConnectorFactory.create({
    erpType: 'MSSQL',
    host: 'catelli.local',
    port: 1433,
    database: 'CiguaDB',
    username: 'sa',
    password: '***'
  });

  await connector.connect(); // ✅ Conectado a Catelli

  // Ejecutar query
  const query = `
    SELECT
      a.codigo AS itemCode,
      a.descripcion AS itemName,
      CAST(a.cantidad_empaque AS DECIMAL) AS packQty,
      a.unidad_empaque AS uom,
      COALESCE(CAST(eb.cantidad AS DECIMAL), 0) AS systemQty,
      CAST(COALESCE(ap.costo, 0) AS DECIMAL) AS costPrice,
      CAST(COALESCE(ap.precio_venta, 0) AS DECIMAL) AS salePrice
    FROM articulo a
    LEFT JOIN existencia_bodega eb
      ON a.id = eb.articulo_id AND eb.bodega_id = @bodegaId
    LEFT JOIN articulo_precio ap ON a.id = ap.articulo_id
    WHERE a.estado = 'ACTIVO'
    ORDER BY a.codigo
  `;

  const items = await connector.executeQuery(query, { bodegaId: 'warehouse_001' });
  // ✅ Retorna: 450 artículos desde Catelli

  // Normalizar
  const normalized = items.map(item => ({
    itemCode: item.itemCode.trim(),
    itemName: item.itemName.trim(),
    packQty: Number(item.packQty || 1),
    uom: item.uom,
    systemQty: Number(item.systemQty),
    countedQty: 0,  // Usuario lo ingresará
    costPrice: Number(item.costPrice || 0),
    salePrice: Number(item.salePrice || 0)
  }));

  // Guardar items en BD
  for (const item of normalized) {
    const locId = await getDefaultLocation('warehouse_001');
    await repository.createCountItem('count_feb_001', locId, item);
  }

  return {
    countId: 'count_feb_001',
    itemsLoaded: 450,
    items: normalized,
    summary: {
      totalItems: 450,
      totalSystemQty: 12500,
      totalValue: 625000
    },
    source: 'DIRECT_QUERY'
  };
}

// 4️⃣ Fallback Opción C: Manual
console.log('📍 Using Option C: Manual entry (no ERP connection)');
return {
  countId: 'count_feb_001',
  itemsLoaded: 0,
  items: [],
  summary: { totalItems: 0, totalSystemQty: 0, totalValue: 0 },
  source: 'MANUAL'
};
```

**Log del backend:**
```
📍 Using Option B: Direct Query from Catelli
✅ Connected to MSSQL: catelli.local:1433/CiguaDB
✅ Query executed: 450 items found
✅ Items saved to BD: InventoryCount_Item (450 rows)
✅ Items loaded successfully
```

---

## 📥 Paso 6: Frontend Recibe Items

```typescript
Response:
{
  "countId": "count_feb_001",
  "itemsLoaded": 450,
  "summary": {
    "totalItems": 450,
    "totalSystemQty": 12500,
    "totalValue": 625000.00
  },
  "source": "DIRECT_QUERY",
  "items": [
    {
      "itemCode": "ART001",
      "itemName": "Producto A - Cajas",
      "packQty": 12,
      "uom": "Cajas",
      "baseUom": "Pz",
      "systemQty": 100,
      "countedQty": 0,
      "costPrice": 50.00,
      "salePrice": 75.00
    },
    {
      "itemCode": "ART002",
      "itemName": "Producto B - Piezas",
      "packQty": 1,
      "uom": "Piezas",
      "baseUom": "Pz",
      "systemQty": 250,
      "countedQty": 0,
      "costPrice": 10.00,
      "salePrice": 15.00
    },
    ...  // 448 más
  ]
}
```

---

## 🎬 Paso 7: Frontend Muestra Tabla

**Frontend actualiza:**
```
┌────────────────────────────────────────────────────────────────────┐
│ 📋 CONTEO: INV-2026-02-001 - Bodega Central                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 📊 RESUMEN                                                         │
│ ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│ │ 450         │  │ 12,500           │  │ $625,000.00      │       │
│ │ Artículos   │  │ Unidades (Stock) │  │ Valor Total      │       │
│ └─────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                    │
│ 📋 ARTÍCULOS PARA CONTAR                                           │
│ ┌──────┬──────────────────┬─────┬──────┬────────┬────────┬──────┬──┐
│ │Código│ Descripción      │ UDM │Sist  │Contado │Varianza│ %    │⚙│
├──────┼──────────────────┼─────┼──────┼────────┼────────┼──────┼──┤
│ART001│Producto A-Cajas  │Cajas│ 100  │ [___]  │  0     │  0%  │✕│
│ART002│Producto B-Piezas │Pz   │ 250  │ [___]  │  0     │  0%  │✕│
│ART003│Producto C-KG     │ KG  │ 500  │ [___]  │  0     │  0%  │✕│
│ ...  │ ...              │     │      │        │        │      │  │
│      │ (445 más)        │     │      │        │        │      │  │
└──────┴──────────────────┴─────┴──────┴────────┴────────┴──────┴──┘
  (Scroll para más)

[Cancelar Conteo]  [Completar Conteo]
```

**Estado:** ⏳ Esperando que Juan ingrese cantidades

---

## 🔢 Paso 8: Juan Ingresa Cantidades Contadas

**Juan comienza a ingresar:**

```
Fila 1: ART001
Click en campo "Contado"
Ingresa: 102
Tab →

Sistema automáticamente:
1. Recalcula varianza: 102 - 100 = +2
2. Calcula %: (2 / 100) * 100 = 2%
3. Color: 🟡 AMARILLO (2-5%)
4. Ejecuta: PUT /api/inventory-counts/count_feb_001/items/item001
```

**Tabla actualiza en tiempo real:**
```
│ART001│Producto A-Cajas  │Cajas│ 100  │ 102    │  +2    │  +2%  │✕│
         ↑ Amarillo (varianza pequeña)
```

**Backend crea VarianceReport automático:**
```typescript
PUT /api/inventory-counts/count_feb_001/items/item001
{
  "countedQty": 102
}

// Backend
repository.updateCountItem(item001, { countedQty: 102 })
  → variance = 102 - 100 = +2
  → variancePercent = (2 / 100) * 100 = 2%
  → Crea VarianceReport con:
     {
       countItemId: 'item001',
       itemCode: 'ART001',
       systemQty: 100,
       countedQty: 102,
       difference: +2,
       variancePercent: 2,
       status: 'PENDING'
     }
```

**Juan continúa:**
```
Fila 2: ART002
Ingresa: 248 (vs 250 = -2)
Color: 🟡 AMARILLO (-0.8%)

Fila 3: ART003
Ingresa: 480 (vs 500 = -20)
Color: 🔴 ROJO (-4%)

Fila 4: ART004
Ingresa: 150 (vs 150 = 0)
Color: 🟢 VERDE (0%)

...

(Juan continúa con 446 artículos más...)
```

**Tabla después de ingresar 50 artículos:**
```
│ART001│Producto A-Cajas  │Cajas│ 100  │ 102    │  +2    │  +2%  │✕│ 🟡
│ART002│Producto B-Piezas │Pz   │ 250  │ 248    │  -2    │  -0.8%│✕│ 🟡
│ART003│Producto C-KG     │ KG  │ 500  │ 480    │ -20    │  -4%  │✕│ 🔴
│ART004│Producto D        │ Pz  │ 150  │ 150    │   0    │   0%  │✕│ 🟢
│ART005│Producto E        │ Cajas│ 75   │ 77    │   +2   │  +2.7%│✕│ 🟡
│ ...  │ ...              │     │      │        │        │       │  │
│      │ (400 más)        │     │      │        │        │       │  │
│      │                  │     │      │        │        │       │  │
│ TOTAL│ 450 artículos    │     │12,500│12,508 │  +8    │  +0.1%│  │

RESUMEN ACUMULADO:
✅ 🟢 Verde (0%): 142 artículos
⚠️  🟡 Amarillo (2-5%): 287 artículos
❌ 🔴 Rojo (>5%): 21 artículos
```

---

## ✅ Paso 9: Juan Completa el Conteo

**Click:** `[Completar Conteo]`

```typescript
POST /api/inventory-counts/count_feb_001/complete
{
  // opcional: "approvedBy": "manager_001"
}

// Backend
InventoryCountService.completeCount('count_feb_001', 'cigua_001')
  → repository.completeCount('count_feb_001')
     {
       status: 'COMPLETED',
       completedAt: '2026-02-21T11:45:30Z',
       approvedBy: 'juan@cigua.com'
     }
  → Retorna conteo actualizado

Response:
{
  "id": "count_feb_001",
  "code": "INV-2026-02-001",
  "status": "COMPLETED",
  "completedAt": "2026-02-21T11:45:30Z",
  "summary": {
    "totalItems": 450,
    "totalSystemQty": 12500,
    "totalCountedQty": 12508,
    "totalVariance": +8,
    "totalVariancePercent": 0.064,
    "itemsWithVariance": {
      "green": 142,
      "yellow": 287,
      "red": 21
    }
  }
}
```

---

## 📊 Paso 10: Sistema Genera Reportes Automáticos

**Backend automáticamente:**

1. **VarianceReport (Ya Creados)**
   - 450 reportes (uno por artículo)
   - Estados: PENDING
   - Listos para auditoría

2. **Query: Ver Varianzas Críticas**
   ```sql
   SELECT * FROM "VarianceReport"
   WHERE countId = 'count_feb_001'
   AND ABS(variancePercent) > 5
   ORDER BY ABS(variancePercent) DESC;

   -- Retorna 21 artículos con >5% varianza
   ```

---

## 🎯 Paso 11: Juan Ve Resumen Final

**Frontend muestra:**
```
┌──────────────────────────────────────────────────────┐
│ ✅ CONTEO COMPLETADO: INV-2026-02-001               │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 📅 Completado: 21 de febrero de 2026, 11:45        │
│ 📊 Contador: Juan García                            │
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ RESUMEN FINAL                                │    │
│ ├──────────────────────────────────────────────┤    │
│ │ Artículos contados:        450               │    │
│ │ Stock Sistema:            12,500 unidades    │    │
│ │ Stock Contado:            12,508 unidades    │    │
│ │ Varianza Total:               +8 unidades    │    │
│ │ Varianza %:                  +0.064%         │    │
│ │                                              │    │
│ │ Distribución de Varianzas:                   │    │
│ │ 🟢 Sin varianza (0%):      142 artículos     │    │
│ │ 🟡 Pequeña (2-5%):         287 artículos     │    │
│ │ 🔴 Grande (>5%):            21 artículos     │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ [Descargar Reporte] [Exportar Excel] [Ver Detalles]│
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## ⏱️ Resumen de Tiempo

```
Operación              Tiempo
─────────────────────────────
Crear conteo           1 min
Cargar 450 artículos   2 min (automático)
Ingresar cantidades    45 min (450 artículos / 6 por min)
Completar conteo       1 min
─────────────────────────────
TOTAL                  49 minutos

Comparación:
❌ Manual (antes):     120+ minutos (2+ horas)
✅ Automático (ahora):  49 minutos
🎯 Mejora:             59% más rápido
```

---

## 📈 Impacto Operacional

```
ANTES (Manual 100%):
├─ Buscar manualmente cada artículo
├─ Ingresar cantidad manualmente
├─ Calcular varianza manualmente
└─ Crear reporte manualmente
❌ Errores: 10-15% de items
❌ Tiempo: 2+ horas por conteo

AHORA (Automático):
├─ ✅ Sistema carga 450 artículos automáticamente
├─ ✅ Usuario solo ingresa cantidades (más rápido)
├─ ✅ Sistema calcula varianzas automáticamente
├─ ✅ Sistema genera reportes automáticamente
✅ Errores: <1% (datos de Catelli)
✅ Tiempo: 50 minutos por conteo
✅ Mejora: 60% más rápido, 90% menos errores
```

---

## 🎓 Lecciones del Ejemplo

1. **3 Opciones de Carga** ✅
   - Opción A: MappingConfig (si está configurada)
   - Opción B: Query Directa (si hay conexión)
   - Opción C: Manual (siempre disponible)
   - Sistema intenta A → B → C automáticamente

2. **Fallback Automático** ✅
   - Si A falla, intenta B
   - Si B falla, intenta C
   - Usuario siempre puede operar

3. **Cálculos Automáticos** ✅
   - Varianza calculada en tiempo real
   - Colores por estado
   - VarianceReport generado automáticamente

4. **Integración Catelli** ✅
   - Stock del sistema desde Catelli
   - Precios para auditoría
   - UDM correcta
   - Sin errores de entrada

5. **Mejora 60%** ✅
   - Tiempo reducido significativamente
   - Errores reducidos al mínimo
   - Usuario más productivo

---

**¡Así funciona el sistema de carga automática de artículos! 🚀**
