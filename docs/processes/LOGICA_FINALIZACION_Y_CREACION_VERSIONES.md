# 🔀 LÓGICA DE VERSIONES: FINALIZACION Y CREACIÓN

## 1️⃣ CUANDO FINALIZAS UN CONTEO (Caso 1)

### Escenario 1A: Finalizas V1 SIN varianza
```
V1 Items:
├─ Item A: version=1, countedQty=100 (varianza: 0) ✓
├─ Item B: version=1, countedQty=50  (varianza: 0) ✓
└─ Item C: version=1, countedQty=80  (varianza: 0) ✓

Usuario hace clic "✓ Finalizar"

RESULTADO:
└─ Status cambia: IN_PROGRESS/ACTIVE → COMPLETED
└─ Items: Quedan IGUAL con version=1
   ├─ Item A: version=1, countedQty=100
   ├─ Item B: version=1, countedQty=50
   └─ Item C: version=1, countedQty=80

🎯 CONCLUSIÓN:
- Se finaliza el conteo
- No hay más versiones (totalVersions = 1)
- Status = COMPLETED
- Items quedan con version=1 (no cambia)
```

### Escenario 1B: Finalizas V1 CON varianza
```
V1 Items:
├─ Item A: version=1, countedQty=95  (varianza: -5) ⚠️
├─ Item B: version=1, countedQty=50  (varianza: 0) ✓
└─ Item C: version=1, countedQty=85  (varianza: +5) ⚠️

Usuario hace clic "✓ Finalizar"

RESULTADO:
└─ Status cambia: ACTIVE → COMPLETED
└─ Items: Quedan IGUAL (no se modifica nada aún)
   ├─ Item A: version=1, countedQty=95
   ├─ Item B: version=1, countedQty=50
   └─ Item C: version=1, countedQty=85

🎯 CONCLUSIÓN:
- Se finaliza V1
- Items mantienen version=1
- Aparece botón "Crear Versión (Auditoría)" (porque hay varianza)
- DESDE AQUÍ el usuario puede elegir:
  ✓ Crear V2 para recontar, O
  ✓ Cerrar el conteo definitivamente
```

### Escenario 1C: Finalizas V2 (después de recontar)
```
ANTES (Después de recontar V2):
├─ Item A (V1): version=1, countedQty=95  (varianza: -5)
├─ Item B (V1): version=1, countedQty=50  (sin varianza)
├─ Item C (V1): version=1, countedQty=85  (varianza: +5)
│
└─ Item A (V2): version=2, countedQty=100 (varianza: 0) ✓
└─ Item C (V2): version=2, countedQty=80  (varianza: 0) ✓

Usuario hace clic "✓ Finalizar" en V2

RESULTADO:
└─ currentVersion = 2 → COMPLETED
└─ Items: Quedan igual
   ├─ Item A (V1): version=1, countedQty=95  (histórico)
   ├─ Item B (V1): version=1, countedQty=50  (histórico)
   ├─ Item C (V1): version=1, countedQty=85  (histórico)
   ├─ Item A (V2): version=2, countedQty=100 (actual)
   └─ Item C (V2): version=2, countedQty=80  (actual)

🎯 CONCLUSIÓN:
- V2 se finaliza
- Todos los items quedan con sus respectivas versiones
- VarianceReport muestra que A y C fueron resueltos en V2
- Histórico completo guardado
- Si hay aún varianza en V2 → Opción crear V3
- Si no hay varianza → Fin
```

---

## 2️⃣ CUANDO CREAS UNA NUEVA VERSIÓN (Caso 2)

### ¿Qué pasa exactamente?

```
ANTES DE CREAR V2:
┌─────────────────────────────────────────┐
│ InventoryCount: status=COMPLETED        │
│ ├─ currentVersion: 1                    │
│ └─ totalVersions: 1                     │
│                                         │
│ InventoryCount_Item:                    │
│ ├─ Item A: version=1, countedQty=95     │
│ ├─ Item B: version=1, countedQty=50     │
│ └─ Item C: version=1, countedQty=85     │
│                                         │
│ VarianceReport:                         │
│ ├─ Item A: version=1, diff=-5, status=PENDING
│ └─ Item C: version=1, diff=+5, status=PENDING
└─────────────────────────────────────────┘

Usuario hace clic "Crear Versión"
    ↓
Sistema ejecuta createNewVersion(countId, companyId)
```

### Paso a paso de `createNewVersion()`:

**PASO 1: Detectar items con varianza**
```typescript
// Buscar items de V1 que tengan VarianceReport
const varianceItems = await getVarianceItems(
  countId='123',
  companyId='company-1',
  previousVersion=1
);

// Retorna:
{
  items: [
    { id: 'item-A', itemCode: 'PROD-A', countedQty: 95, variance: -5 },
    { id: 'item-C', itemCode: 'PROD-C', countedQty: 85, variance: +5 }
  ]
}

// ❌ Item B NO aparece (no tiene varianza)
```

**PASO 2: CREAR NUEVOS REGISTROS CON version=2**
```typescript
const newVersion = 2;

for each item in varianceItems {
  // Obtener el registro ORIGINAL con version=1
  const originalItem = await findUnique({
    countId_locationId_itemCode_version: {
      countId: '123',
      locationId: 'loc-1',
      itemCode: 'PROD-A',
      version: 1  // ← DEL SISTEMA ANTERIOR
    }
  });

  // ✅ CREAR UN NUEVO REGISTRO CON version=2
  await create({
    countId: '123',
    locationId: 'loc-1',
    itemCode: 'PROD-A',
    itemName: 'Producto A',
    systemQty: 100,
    countedQty: null,        // ← LIMPIAMOS PARA RECONTAR
    version: 2,              // ← NUEVA VERSION
    packQty: 1,
    uom: 'Cajas',
    costPrice: 50,
    salePrice: 100
  });
}
```

**PASO 3: Actualizar metadatos del conteo**
```typescript
await updateInventoryCount(
  where: { id: '123' },
  data: {
    totalVersions: 2,         // Ahora hay 2 versiones
    currentVersion: 2,        // La actual es 2
    status: 'IN_PROGRESS'     // Estado temporal mientras recontas
  }
);
```

### RESULTADO DESPUÉS DE CREAR V2:

```
DESPUÉS DE CREAR V2:
┌─────────────────────────────────────────┐
│ InventoryCount: status=IN_PROGRESS      │
│ ├─ currentVersion: 2                    │
│ └─ totalVersions: 2                     │
│                                         │
│ InventoryCount_Item:                    │
│ ├─ Item A (V1): version=1, countedQty=95   (HISTÓRICO)
│ ├─ Item B (V1): version=1, countedQty=50   (HISTÓRICO)
│ ├─ Item C (V1): version=1, countedQty=85   (HISTÓRICO)
│ │
│ ├─ Item A (V2): version=2, countedQty=NULL (NUEVO para recontar)
│ └─ Item C (V2): version=2, countedQty=NULL (NUEVO para recontar)
│
│ VarianceReport: (SIN CAMBIOS)
│ ├─ Item A: version=1, diff=-5, status=PENDING
│ └─ Item C: version=1, diff=+5, status=PENDING
└─────────────────────────────────────────┘

🎯 IMPORTANTE:
- Se CREAN nuevos registros, no se actualizan
- V1 items quedan históricos (version=1)
- V2 items son limpios para recontar (version=2, countedQty=null)
- Item B nunca se copia porque no tiene varianza
- Cuando el frontend pide items, debe especificar ?version=2
```

---

## 🔄 FLUJO COMPLETO: V1 → V2 → V3

```
═══════════════════════════════════════════════════════════════

PASO 1: CREAR CONTEO (V1)
┌────────────────────────────────────────┐
│ DB State:                              │
│ ├─ Item A: v=1, countedQty=null        │
│ ├─ Item B: v=1, countedQty=null        │
│ └─ Item C: v=1, countedQty=null        │
│ currentVersion=1, totalVersions=1      │
│ Status: DRAFT                          │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

PASO 2: DIGITAR Y GUARDAR EN V1
┌────────────────────────────────────────┐
│ DB State:                              │
│ ├─ Item A: v=1, countedQty=95 (var=-5)│
│ ├─ Item B: v=1, countedQty=50 (var=0) │
│ └─ Item C: v=1, countedQty=85 (var=+5)│
│ Status: ACTIVE                         │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

PASO 3: FINALIZAR V1
┌────────────────────────────────────────┐
│ DB State: (SIN CAMBIOS)                │
│ ├─ Item A: v=1, countedQty=95          │
│ ├─ Item B: v=1, countedQty=50          │
│ └─ Item C: v=1, countedQty=85          │
│ Status: COMPLETED                      │
│ Botón disponible: "Crear Versión"      │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

PASO 4: CLIC "CREAR VERSIÓN" → CREA V2
┌────────────────────────────────────────┐
│ DB State: (SE AGREGAN nuevos items)    │
│ V1 Items (histórico):                  │
│ ├─ Item A: v=1, countedQty=95 ←────────┐
│ ├─ Item B: v=1, countedQty=50          │ No se copian
│ └─ Item C: v=1, countedQty=85 ←────────┤ (no tienen varianza)
│                                        │
│ V2 Items (nuevos para recontar):       │
│ ├─ Item A: v=2, countedQty=null ←─────┘ COPIA LIMPIA
│ └─ Item C: v=2, countedQty=null ←────── COPIA LIMPIA
│                                        │ Item B NO aparece
│ currentVersion=2, totalVersions=2      │
│ Status: IN_PROGRESS                    │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

PASO 5: FRONTEND SOLICITA ITEMS PARA MOSTRAR
┌────────────────────────────────────────┐
│ GET /inventory-counts/123/items?v=2    │
│ Retorna SOLO:                          │
│ ├─ Item A: v=2, countedQty=null        │
│ └─ Item C: v=2, countedQty=null        │
│ (Item B no se retorna porque v=1)      │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

PASO 6: USUARIO RECONTAS EN V2
┌────────────────────────────────────────┐
│ DB State:                              │
│ V1 Items (histórico, sin cambios):     │
│ ├─ Item A: v=1, countedQty=95          │
│ ├─ Item B: v=1, countedQty=50          │
│ └─ Item C: v=1, countedQty=85          │
│                                        │
│ V2 Items (recontas en progreso):       │
│ ├─ Item A: v=2, countedQty=100 ✓       │
│ └─ Item C: v=2, countedQty=80  ✓       │
│ Status: IN_PROGRESS                    │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

PASO 7: FINALIZAR V2
┌────────────────────────────────────────┐
│ DB State: (SIN CAMBIOS)                │
│ Todos los items se quedan igual        │
│ currentVersion=2                       │
│ Status: COMPLETED                      │
│                                        │
│ Análisis: A y C sin varianza en V2 ✓   │
│ Decisión: Cerrar o crear V3            │
└────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

OPCIONAL - PASO 8: CREAR V3 (si aún hay varianza)
┌────────────────────────────────────────┐
│ DB State: (SE AGREGAN nuevos items V3) │
│ V1 Items (histórico):                  │
│ ├─ Item A: v=1, countedQty=95          │
│ ├─ Item B: v=1, countedQty=50          │
│ └─ Item C: v=1, countedQty=85          │
│                                        │
│ V2 Items (histórico):                  │
│ ├─ Item A: v=2, countedQty=100 ✓       │
│ └─ Item C: v=2, countedQty=80  ✓       │
│                                        │
│ V3 Items (nuevos si necesario):        │
│ └─ (Dependerá si V2 sigue teniendo var)│
│                                        │
│ currentVersion=3, totalVersions=3      │
│ Status: IN_PROGRESS                    │
└────────────────────────────────────────┘
```

---

## 📊 VISTA DE BASE DE DATOS FINAL

```sql
-- Después de todo el proceso V1→V2→Fin:

SELECT * FROM InventoryCount_Item
WHERE countId='123'
ORDER BY version, itemCode;

RESULTADO:
┌────────────────────────────────────────────────┐
│ id      │ itemCode │ version │ countedQty      │
├─────────┼──────────┼─────────┼─────────────────┤
│ item-A1 │ PROD-A   │   1     │ 95              │ ← V1
│ item-B1 │ PROD-B   │   1     │ 50              │ ← V1
│ item-C1 │ PROD-C   │   1     │ 85              │ ← V1
│ item-A2 │ PROD-A   │   2     │ 100             │ ← V2 recontan
│ item-C2 │ PROD-C   │   2     │ 80              │ ← V2 recontan
└────────────────────────────────────────────────┘

NOTAS:
- 5 registros total (3 de V1 + 2 de V2)
- Cada versión es independiente
- Item B solo en V1 (sin varianza)
- A y C aparecen en V1 y V2 (con sus valores)
- Histórico completo preservado
```

---

## ✅ RESPUESTA A TUS PREGUNTAS

### **P1: ¿Qué pasa con los items cuando terminamos?**

**Respuesta:**
- ✅ Items quedan en la BD con su `version` asignado
- ✅ No se modifican, solo cambia el status del conteo
- ✅ Se mantiene el histórico (V1 items + V2 items)
- ✅ Se crean registros nuevos para cada versión (no se actualizan)

### **P2: Cuando le doy clic a "nueva versión", ¿qué actualiza?**

**Respuesta:**
- ✅ **NO actualiza** registros existentes
- ✅ **CREA nuevos registros** con `version=newVersion`
- ✅ Toma items que tienen VarianceReport
- ✅ Asigna `countedQty=null` (limpio para recontar)
- ✅ Copia solo datos necesarios (sin duplicar todo)
- ✅ Items sin varianza NO se copian

---

## 🎯 ESQUEMA FINAL

```
REGLA 1: Un conteo puede tener múltiples versiones
         └─ Cada versión tiene su conjunto de items

REGLA 2: Cada item tiene un campo "version"
         └─ Identifica a qué versión pertenece

REGLA 3: Cuando creas V2, se CREAN registros nuevos
         └─ No se actualizan los de V1

REGLA 4: El histórico siempre se preserva
         └─ Puedes ver V1, V2, V3... en cualquier momento

REGLA 5: La BD NO se "limpia", solo crece
         └─ Un conteo con V1→V2→V3 tiene N registros
```

