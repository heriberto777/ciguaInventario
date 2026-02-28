# 📱 ARQUITECTURA MÓVIL - CONTEO FÍSICO DE INVENTARIO

## 🔄 FLUJO COMPLETO DE VERSIONES

### FASE 1: PREPARACIÓN (Web)
```
1. Seleccionar Warehouse + Location + Mapping
2. Cargar items desde ERP → InventoryCount (DRAFT)
3. Items se sincronizan a la app móvil
```

### FASE 2: CONTEO V1 (Mobile)
```
1. App descarga: InventoryCount + CountItems (systemQty)
2. Usuario ingresa countedQty por cada item
3. App calcula varianza = countedQty - systemQty
4. Envía: { countId, locationId, items[], version: 1 }
5. Backend crea InventoryCount_Item + VarianceReport
```

### FASE 3: VALIDACIÓN (Web)
```
1. Mostrar VarianceReports
2. Usuario revisa varianzas
3. Dos opciones:
   a) APROBAR → Sincronizar al ERP
   b) RECONTAR → Crear Version 2
```

### FASE 4: RECONTAR V2 (Mobile)
```
1. App descarga Version 2 (solo items con varianza)
2. Usuario recontra SOLO esos items
3. Envía: { countId, locationId, items[], version: 2 }
4. Backend actualiza InventoryCount_Item con V2
5. Nueva VarianceReport para V2
```

### FASE 5: VALIDACIÓN V2 → APROBACIÓN → ERP
```
1. Mostrar VarianceReports V2
2. Si OK: Sincronizar al ERP
3. Si NO: Crear V3 (y así sucesivamente)
```

---

## 📊 MODELO DE DATOS - VERSIONES

### InventoryCount
```
id: String
companyId: String
warehouseId: String
locationId: String (NEW)
code: String
status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "APPROVED"
currentVersion: Int (default: 1)  // Versión activa
totalVersions: Int                // Total de versiones creadas
createdAt: DateTime
updatedAt: DateTime
```

### InventoryCount_Item
```
id: String
countId: String
locationId: String
itemCode: String
itemName: String
uom: String

systemQty: Decimal           // Del ERP
countedQty_V1: Decimal       // Conteo V1
countedQty_V2: Decimal       // Conteo V2 (opcional)
countedQty_V3: Decimal       // Conteo V3 (opcional)

currentVersion: Int          // Última versión para este item
status: "PENDING" | "APPROVED" | "VARIANCE"

countedAt_V1: DateTime
countedAt_V2: DateTime
```

### VarianceReport
```
id: String
countId: String
version: Int                 // 1, 2, 3...
itemId: String

systemQty: Decimal
countedQty: Decimal
variance: Decimal
variancePercent: Decimal

status: "PENDING" | "APPROVED" | "REJECTED"
approvedAt: DateTime
approvedBy: String
notes: String
```

---

## 📱 ENDPOINTS MÓVIL NECESARIOS

### 1. DESCARGAR CONTEO + ITEMS
```
GET /api/inventory-counts/{countId}
Response:
{
  id: String
  code: String
  warehouseId: String
  locationId: String
  currentVersion: Int
  items: [
    {
      id: String
      itemCode: String
      itemName: String
      uom: String
      systemQty: Decimal
      countedQty_V{N}: Decimal (opcional)
      status: String
    }
  ]
}
```

### 2. DESCARGAR SOLO ITEMS CON VARIANZA (Para V2+)
```
GET /api/inventory-counts/{countId}/variance-items
Query: ?version=2
Response:
{
  version: Int
  items: [
    {
      id: String
      itemCode: String
      itemName: String
      systemQty: Decimal
      countedQty_Previous: Decimal  // De V1
      variance_V1: Decimal
      variancePercent_V1: Decimal
    }
  ]
}
```

### 3. GUARDAR CONTEO VERSIÓN N
```
POST /api/inventory-counts/{countId}/submit-count
Body:
{
  version: Int              // 1, 2, 3...
  locationId: String
  items: [
    {
      itemCode: String
      countedQty: Decimal
      uom: String
    }
  ]
}
Response:
{
  success: Boolean
  version: Int
  itemsProcessed: Int
  variancesDetected: Int
}
```

### 4. VERIFICAR ESTADO ACTUAL
```
GET /api/inventory-counts/{countId}/status
Response:
{
  id: String
  code: String
  status: String
  currentVersion: Int
  totalVersions: Int
  lastUpdated: DateTime
  itemsTotal: Int
  itemsWithVariance: Int
  varianceReports: [
    {
      version: Int
      itemsWithVariance: Int
      avgVariancePercent: Decimal
      status: String
    }
  ]
}
```

---

## 🎯 FLUJO VERSIONES - EJEMPLO PRÁCTICO

### INICIO
- InventoryCount creado, currentVersion = 1
- 100 items cargados del ERP
- App móvil descarga: 100 items con systemQty

### V1 - PRIMER CONTEO
- Usuario cuenta todos los 100 items
- Envía: countedQty para cada item
- Backend calcula: variance = countedQty - systemQty
- Resultado: 85 items OK, 15 con varianza

### REVISIÓN V1
- Web muestra 15 items con varianza
- Usuario revisa y decide RECONTAR
- Sistema: currentVersion → 2

### V2 - RECONTAR SOLO VARIANZAS
- App descarga SOLO los 15 items con varianza
- Muestra: systemQty + countedQty_V1 + varianza_V1
- Usuario recontra los 15
- Envía: countedQty_V2 para esos 15 items
- Backend actualiza: countedQty_V2, calcula nueva varianza

### REVISIÓN V2
- Web muestra 15 items V2
- Si OK: Aprobar (sincronizar al ERP)
- Si NO: Crear V3 (recontar nuevamente)

---

## 📋 TABLA COMPARATIVA - VERSIONES

| Versión | Items | Acción | Resultado |
|---------|-------|--------|-----------|
| V1 | 100 | Conteo completo | 85 OK, 15 varianza |
| V2 | 15 | Recontar varianzas | 12 OK, 3 varianza |
| V3 | 3 | Recontar críticos | 3 OK ✅ |
| APROBADO | 100 | Sincronizar ERP | ✅ Completo |

---

## 🔐 VALIDACIONES CRÍTICAS

### En Backend (al recibir V2+)
```
✓ Verificar que version > currentVersion
✓ Solo permitir items que tuvieron varianza en V-1
✓ No permitir recuento de items que ya fueron OK
✓ Validar que locationId es el correcto
✓ Validar que no hay duplicados en payload
```

### En App Móvil
```
✓ Mostrar claramente: "Versión 2 - Recontar 15 items"
✓ Resaltar items con varianza previa
✓ Mostrar: systemQty vs countedQty_V1 vs varianza
✓ Evitar que usuario intente contar items que no están en V2
✓ Sincronización offline → online
```

---

## 🚀 IMPLEMENTACIÓN RECOMENDADA

### FASE 1: Backend (Esta semana)
- [ ] Agregar `currentVersion` a InventoryCount
- [ ] Agregar `countedQty_V{N}` a InventoryCount_Item
- [ ] Crear endpoint GET variance-items
- [ ] Crear endpoint POST submit-count con lógica de versiones
- [ ] Validar versiones en backend

### FASE 2: Web (Próxima semana)
- [ ] Mostrar currentVersion en UI
- [ ] Mostrar botón "Recontar" (crea V2)
- [ ] Mostrar historial de versiones
- [ ] Mostrar solo items con varianza cuando se crea nueva versión

### FASE 3: Mobile (Próximas 2 semanas)
- [ ] Descargar InventoryCount con items
- [ ] Descargar variance-items para V2+
- [ ] Interfaz de conteo (numpad, validación)
- [ ] Sincronización offline
- [ ] Enviar conteo (POST submit-count)
- [ ] Mostrar estado actual (versión, progreso)

---

## 💾 MIGRACIÓN DE BD

```sql
-- InventoryCount
ALTER TABLE InventoryCount ADD COLUMN currentVersion INT DEFAULT 1;
ALTER TABLE InventoryCount ADD COLUMN totalVersions INT DEFAULT 1;
ALTER TABLE InventoryCount ADD COLUMN locationId STRING;

-- InventoryCount_Item
ALTER TABLE InventoryCount_Item ADD COLUMN countedQty_V1 DECIMAL;
ALTER TABLE InventoryCount_Item ADD COLUMN countedQty_V2 DECIMAL;
ALTER TABLE InventoryCount_Item ADD COLUMN countedQty_V3 DECIMAL;
ALTER TABLE InventoryCount_Item ADD COLUMN currentVersion INT DEFAULT 1;
ALTER TABLE InventoryCount_Item ADD COLUMN status STRING DEFAULT 'PENDING';

-- VarianceReport (actualizar)
ALTER TABLE VarianceReport ADD COLUMN version INT DEFAULT 1;
```

---

## 🎓 VENTAJAS DE ESTE MODELO

✅ **Rastreabilidad**: Cada versión está documentada
✅ **Flexibilidad**: Recontar solo lo necesario
✅ **Eficiencia**: No perder tiempo en items que ya fueron OK
✅ **Auditoría**: Historial completo de cambios
✅ **Escalabilidad**: Soporta N recontos
✅ **Offline-first**: La app móvil puede trabajar sin conexión

