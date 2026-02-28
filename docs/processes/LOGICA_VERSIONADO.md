# 📊 LÓGICA DE VERSIONADO - Sistema de Conteos de Inventario

## 🎯 Resumen General

El sistema de **versionado** permite hacer **recontas** (auditorías) de items que tengan **varianza** (diferencia entre stock del sistema vs. lo que se contó). Es útil cuando hay discrepancias y necesitas verificar si fue error de conteo o realmente hay pérdida/ganancia.

---

## 🔄 FLUJO COMPLETO DEL VERSIONADO

### **ESTADO INICIAL: CONTEO V1**
```
┌─────────────────────────────────────┐
│  1. Crear Conteo                    │
│  ├─ Status: DRAFT                   │
│  ├─ currentVersion: 1               │
│  ├─ totalVersions: 1                │
│  └─ countItems: [item1, item2, ...] │
└─────────────────────────────────────┘
          ↓
    Usuario digita cantidades
    (countedQty se guarda en DB)
          ↓
┌─────────────────────────────────────┐
│  2. Finalizar Conteo                │
│  ├─ Status: COMPLETED               │
│  ├─ Sistema calcula:                │
│  │  - variance = countedQty - systemQty
│  │  - Ejemplo:                       │
│  │    • systemQty = 100              │
│  │    • countedQty = 95              │
│  │    • variance = -5 (FALTA)        │
│  └─ Se crean VarianceReports        │
└─────────────────────────────────────┘
```

---

## ⚠️ DETECCIÓN DE VARIANZA

Cuando el usuario finaliza un conteo:
1. **Sistema calcula** para cada item: `variance = countedQty - systemQty`
2. **Si hay varianza** (diferencia > 0.01):
   - Se crea un registro en tabla `VarianceReport`
   - Status inicia en `PENDING` (pendiente revisión)
3. **Items sin varianza**: No se reportan (se asume conteo correcto)

### Ejemplo de Items:
```
Item A (Correctamente contado):
  systemQty = 50
  countedQty = 50
  variance = 0 ❌ NO crea VarianceReport

Item B (Falta stock):
  systemQty = 100
  countedQty = 95
  variance = -5 ✅ CREA VarianceReport

Item C (Sobra stock):
  systemQty = 80
  countedQty = 85
  variance = +5 ✅ CREA VarianceReport
```

---

## 🆕 CREAR NUEVA VERSIÓN (RECONTAR)

### **Condiciones para crear nueva versión:**
- ✅ Status = `ACTIVE` o `ON_HOLD` (NO `DRAFT` ni `COMPLETED`)
- ✅ Debe haber items con varianza del conteo anterior
- ❌ Si NO hay items con varianza → Error: "No items with variance to recount"

### **¿Qué pasa cuando creas nueva versión?**

```
ANTES (V1 - Completado)
┌──────────────────────────────────────────┐
│ Item A: systemQty=50, countedQty=50      │
│ Item B: systemQty=100, countedQty=95     │ ⚠️ VARIANZA: -5
│ Item C: systemQty=80, countedQty=85      │ ⚠️ VARIANZA: +5
└──────────────────────────────────────────┘
          ↓
   Usuario hace clic: "Crear Versión (Auditoría)"
          ↓
DESPUÉS (V2 - Nueva Reconta)
┌──────────────────────────────────────────┐
│ SOLO items con varianza:                 │
│ Item B: (requiere recontar)              │
│ Item C: (requiere recontar)              │
│                                          │
│ Status actualizado:                      │
│ ├─ totalVersions: 2 (ahora hay V2)      │
│ ├─ Status: IN_PROGRESS                  │
│ └─ currentVersion: 2                     │
└──────────────────────────────────────────┘
```

### **Datos que se pasan a V2:**
```javascript
{
  countId: "count-123",
  newVersion: 2,
  itemsToRecount: 2,  // Solo los 2 con varianza
  items: [
    {
      id: "item-B",
      itemCode: "PROD-B",
      itemName: "Producto B",
      systemQty: 100,
      previousCountedQty: 95,  // Lo que contó en V1
      varianceReport: {
        difference: -5,
        variancePercent: -5%
      }
    },
    {
      id: "item-C",
      itemCode: "PROD-C",
      itemName: "Producto C",
      systemQty: 80,
      previousCountedQty: 85,  // Lo que contó en V1
      varianceReport: {
        difference: +5,
        variancePercent: +6.25%
      }
    }
  ]
}
```

---

## 📝 RECONTAR EN V2

Usuario recuenta solo los items con varianza:

```
RECONTAR EN V2
┌──────────────────────────────────────────┐
│ Item B (RECOUNT):                        │
│ ├─ Sistema: 100                          │
│ ├─ V1 contó: 95                          │
│ ├─ V2 contando: ?                        │
│ └─ Nuevo countedQty: 98                  │
│                                          │
│ Item C (RECOUNT):                        │
│ ├─ Sistema: 80                           │
│ ├─ V1 contó: 85                          │
│ ├─ V2 contando: ?                        │
│ └─ Nuevo countedQty: 80                  │
└──────────────────────────────────────────┘
          ↓
    Usuario guarda (debounce)
          ↓
┌──────────────────────────────────────────┐
│ ANÁLISIS V2:                             │
│ Item B: countedQty=98, systemQty=100     │
│   → variance = -2 (mejora vs V1: -5)     │
│                                          │
│ Item C: countedQty=80, systemQty=80      │
│   → variance = 0 (resuelto!)             │
└──────────────────────────────────────────┘
```

---

## 🗂️ ESTRUCTURA DE DATOS EN BD

### Tabla: `InventoryCount`
```javascript
{
  id: "count-123",
  code: "CNT-001",
  sequenceNumber: 1,
  status: "ACTIVE",           // DRAFT, ACTIVE, ON_HOLD, COMPLETED
  currentVersion: 1,          // Versión actual (1, 2, 3...)
  totalVersions: 1,           // Total versiones creadas
  countItems: [...]           // Items del conteo
}
```

### Tabla: `InventoryCount_Item`
```javascript
{
  id: "item-123",
  countId: "count-123",
  itemCode: "PROD-A",
  itemName: "Producto A",
  systemQty: 100,
  countedQty: 95,            // El campo consolidado actual
  version: 1,                // Versión en la que se creó el item
  // (históricamente había countedQty_V1, countedQty_V2, etc)
}
```

### Tabla: `VarianceReport` (Para auditoría)
```javascript
{
  id: "var-report-123",
  countId: "count-123",
  countItemId: "item-123",
  version: 1,                // En qué versión se detectó
  itemCode: "PROD-A",
  systemQty: 100,
  countedQty: 95,            // Lo que se contó
  difference: -5,            // variance
  variancePercent: -5,       // % de diferencia
  status: "PENDING"          // PENDING, APPROVED, REJECTED
}
```

---

## 📊 HISTORIAL DE VERSIONES

### Vista: `GET /inventory-counts/{countId}/version-history`

```javascript
{
  countId: "count-123",
  code: "CNT-001",
  currentVersion: 2,
  totalVersions: 2,
  versions: [
    {
      version: 1,
      totalItems: 100,
      itemsWithVariance: 15,    // 15 items tuvieron varianza
      approvedItems: 0,         // Aún se están reconando
      status: "COMPLETED"
    },
    {
      version: 2,
      totalItems: 15,           // Solo 15 (los con varianza)
      itemsWithVariance: 3,     // De esos 15, solo 3 aún tienen varianza
      approvedItems: 0,
      status: "IN_PROGRESS"     // Aún se está reconando
    }
  ]
}
```

---

## 🎬 CASOS DE USO

### **Caso 1: Conteo Perfecto (Sin Varianza)**
```
1. Crear conteo V1
2. Digitar cantidades
3. Finalizar → No hay varianza
4. Conteo finalizado (estado COMPLETED)
5. NO se puede crear V2 (no hay items con varianza)
```

### **Caso 2: Conteo con Varianza → Recontar (Auditoría)**
```
1. Crear conteo V1
2. Digitar cantidades
3. Finalizar → Se detectan 5 items con varianza
4. Usuario hace clic "Crear Versión (Auditoría)"
5. Sistema crea V2 con esos 5 items
6. Usuario recuenta solo esos 5 items
7. Finalizar V2
8. Si sigue habiendo varianza → Opción crear V3
9. Continuar hasta resolver varianzas
```

### **Caso 3: Varianza Resuelta en Reconta**
```
V1:
- Item A: sistema=100, contado=95 (varianza: -5)

V2 (Reconta):
- Item A: contado=100 (varianza: 0 ✓ resuelto!)

Resultado: Item A aprobado, no necesita V3
```

---

## 🔌 ENDPOINTS DEL API

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/inventory-counts/{countId}/items` | Obtener todos los items con datos de versión |
| GET | `/inventory-counts/{countId}/variance-items?version=1` | Obtener items con varianza de una versión |
| POST | `/inventory-counts/{countId}/submit-count` | Registrar conteo para una versión específica |
| **POST** | **`/inventory-counts/{countId}/new-version`** | **CREAR nueva versión para recontar** |
| GET | `/inventory-counts/{countId}/version-history` | Ver historial de todas las versiones |

---

## 🎨 UI/UX EN FRONTEND

### **Botón "Crear Versión (Auditoría)"**
- Aparece solo si:
  - Status = `ACTIVE` o `ON_HOLD`
  - Existe varianza para recontar
- Al hacer clic:
  - Obtiene items con varianza
  - Carga V2 automáticamente
  - Usuario puede recontar los items

### **Indicadores de Versión**
```
┌─────────────────────────────────┐
│ Conteo #1 - CNT-001             │
│ Status: COMPLETED               │
│                                 │
│ Versiones:                      │
│ └─ V1: 100 items, 5 con var.   │
│ └─ V2: 5 items, 1 con var.     │
│ └─ V3: 1 item, 0 con var. ✓    │
└─────────────────────────────────┘
```

---

## ✅ RESUMEN EN UNA ORACIÓN

El versionado permite crear **recontas parciales** de items que tuvieron discrepancias en el conteo anterior, auditando hasta resolver todas las varianzas.

---

## 🤔 PREGUNTAS FRECUENTES

**P: ¿Cuántas versiones puedo crear?**
A: Ilimitadas. Puedes seguir creando V1 → V2 → V3 → V4... hasta resolver todas las varianzas.

**P: ¿Qué pasa si en V2 sigo teniendo varianza?**
A: Puedes crear V3 y recontar solo los items que aún tienen varianza.

**P: ¿Se pierden los datos de V1?**
A: No, quedan registrados en `VarianceReport` para auditoría. Puedes consultar con `/version-history`.

**P: ¿Puedo editar items en versiones pasadas?**
A: No directamente. Las versiones son históricas. Solo puedes crear nuevas versiones para recontar.

**P: ¿En qué momento aparece el botón "Crear Versión"?**
A: Solo cuando el conteo está en estado `ACTIVE` o `ON_HOLD` y hay items con varianza.

