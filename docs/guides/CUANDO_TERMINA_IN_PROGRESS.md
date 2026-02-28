# 🔄 ¿CUÁNDO TERMINA EL ESTADO `IN_PROGRESS`?

## 📌 Respuesta Corta
**`IN_PROGRESS` termina INMEDIATAMENTE cuando haces clic en el botón "✓ Finalizar"**

El flujo es:
```
DRAFT
  ↓
ACTIVE (cuando inicias el conteo)
  ↓ (digitas cantidades, se guarda con debounce)
  ↓
COMPLETED (cuando haces clic "✓ Finalizar")
  ↓ (opcionalmente)
CLOSED (cuando cierras el conteo definitivamente)
```

**NOTA:** `IN_PROGRESS` **NO ES UN ESTADO FINAL** en tu lógica actual. Es un estado **temporal** que se usa solo internamente en versioning.

---

## 🎬 DIAGRAMA DE ESTADOS

```
┌──────────────────────────────────────────────────────────┐
│                 CICLO DE VIDA DE UN CONTEO               │
└──────────────────────────────────────────────────────────┘

┌────────┐
│ DRAFT  │  (El conteo se acaba de crear)
└───┬────┘
    │ Usuario hace clic "Comenzar"
    ↓
┌──────────┐
│  ACTIVE  │  (Usuario está digitando cantidades)
└───┬──────┘
    │
    ├─→ Usuario hace clic "Pausar" → ON_HOLD
    │
    ├─→ Usuario hace clic "Cancelar" → CANCELLED
    │
    └─→ Usuario hace clic "✓ Finalizar" → COMPLETED
                                             ↓
                                     ┌──────────────┐
                                     │  COMPLETED   │
                                     └──────┬───────┘
                                            │
                                    ┌───────┴──────────┐
                                    │                  │
                        Si hay varianza    Si NO hay varianza
                        (crear V2)         (fin de conteo)
                                    │                  │
                                    ↓                  ↓
                              IN_PROGRESS          CLOSED
                              (temporal)
                                    ↓
                        (Recontar items V2)
                                    ↓
                              COMPLETED
                                    │
                        ¿Aún hay varianza en V2?
                                    │
                    ┌───────────────┴───────────────┐
                    │ SÍ (crear V3)  │ NO (terminar)│
                    ↓                ↓
              IN_PROGRESS          CLOSED
              (temporal)
```

---

## 🔍 DETALLES IMPORTANTES

### **¿Por qué aparece `IN_PROGRESS` en la lógica?**

En el archivo `version-service.ts` línea 264:

```typescript
// Cuando creas una NUEVA VERSIÓN:
await this.fastify.prisma.inventoryCount.update({
  where: { id: countId },
  data: {
    totalVersions: newVersion,
    status: 'IN_PROGRESS',  // ← Aquí se pone IN_PROGRESS
  },
});
```

**Esto significa:**
- Cuando creas V2 (para recontar items con varianza)
- El estado cambia temporalmente a `IN_PROGRESS`
- Mientras el usuario recuenta los items de V2
- Luego, cuando finaliza V2 → vuelve a `COMPLETED`

### **El flujo completo con versioning:**

```
V1 (Conteo inicial)
┌─────────────────────────────────────┐
│ 1. DRAFT (recién creado)            │
│ 2. ACTIVE (usuario digita)          │
│ 3. COMPLETED (usuario hace click)   │
│    - Sistema detecta varianza       │
│    - Items A, B, C tienen varianza  │
└─────────────────────────────────────┘
              ↓
   Usuario hace clic: "Crear Versión"
              ↓
┌─────────────────────────────────────┐
│ V2 (Reconta)                        │
│ 1. IN_PROGRESS (solo para V2+)      │ ← Está aquí
│ 2. ACTIVE (mientras recontas)       │
│ 3. COMPLETED (finalizas V2)         │
│    - Si resolvió varianza → CLOSED  │
│    - Si aún hay varianza → crear V3 │
└─────────────────────────────────────┘
```

---

## 📊 TABLA DE TRANSICIONES DE ESTADO

| Estado Actual | Acción | Estado Siguiente | Nota |
|---|---|---|---|
| DRAFT | Usuario hace clic "Comenzar" | ACTIVE | Transición normal |
| ACTIVE | Usuario digita cantidades | ACTIVE | Se mantiene (se guarda con debounce) |
| ACTIVE | Usuario hace clic "Pausar" | ON_HOLD | Pausa temporal |
| ACTIVE | Usuario hace clic "Cancelar" | CANCELLED | Cancela el conteo |
| ACTIVE | Usuario hace clic "✓ Finalizar" | COMPLETED | Finaliza V1 |
| ON_HOLD | Usuario hace clic "Reanudar" | ACTIVE | Vuelve a digitación |
| COMPLETED | Usuario hace clic "Crear Versión" | IN_PROGRESS | **Solo para V2+** |
| IN_PROGRESS | Usuario recontas y hace clic "✓ Finalizar" | COMPLETED | Finaliza V2 (o V3, V4...) |
| COMPLETED | Usuario hace clic "Cerrar" (opcional) | CLOSED | Cierre definitivo |

---

## ⚠️ CASO ESPECIAL: `IN_PROGRESS` vs `ACTIVE`

```
Parece confuso porque tienes ACTIVE e IN_PROGRESS...

EN REALIDAD:

ACTIVE = Estado normal mientras el usuario digita/recontas
         (puede ser V1, V2, V3, etc.)

IN_PROGRESS = Estado TEMPORAL que indica:
              "Se creó una nueva versión,
               ahora estamos reconando items con varianza"

Entonces:
- V1: DRAFT → ACTIVE → COMPLETED
- V2: IN_PROGRESS → ACTIVE → COMPLETED
- V3: IN_PROGRESS → ACTIVE → COMPLETED
```

---

## 🔌 ENDPOINT QUE TERMINA `IN_PROGRESS`

Cuando haces clic "✓ Finalizar" en V2/V3:

```
POST /inventory-counts/{countId}/complete

Esto llama al servicio:
  service.completeCount()
    ↓
  repository.completeCount()
    ↓
  UPDATE inventoryCount
    SET status = 'COMPLETED'
    WHERE id = countId
```

**Código en `physical-count.service.ts` línea 250:**

```typescript
const updatedCount = await this.fastify.prisma.inventoryCount.update({
  where: { id: countId },
  data: {
    status: 'COMPLETED',    // ← Sale de IN_PROGRESS aquí
    completedBy: approvedBy,
    completedAt: new Date(),
  },
});
```

---

## ✅ RESUMEN

**¿Cuándo termina `IN_PROGRESS`?**

1. ✅ Cuando **creas una nueva versión** (V2/V3/etc):
   - Status cambia a `IN_PROGRESS`

2. ✅ Cuando **recontas los items** en esa versión:
   - Haces cambios en los items
   - Se guardan con debounce

3. ✅ Cuando **haces clic "✓ Finalizar"**:
   - Status cambia de `IN_PROGRESS` → `COMPLETED`
   - `IN_PROGRESS` desaparece

4. ⏸️ Si aún hay varianza en V2/V3:
   - Puedes crear otra versión (V3/V4/etc)
   - Status vuelve a ser `IN_PROGRESS`
   - Ciclo se repite

**Es decir: `IN_PROGRESS` es temporal mientras recontas. Apenas finalizas → `COMPLETED`**

---

## 🎯 TU APLICACIÓN ACTUAL

Según vi en el código, tu sistema usa:

```
InventoryCount.status puede ser:
  - DRAFT
  - ACTIVE
  - ON_HOLD
  - COMPLETED
  - CANCELLED
  - CLOSED
  - IN_PROGRESS (solo cuando creas nueva versión)
```

El flujo más común es:
```
1. Crear conteo (DRAFT)
2. Comenzar (ACTIVE)
3. Digitar cantidades
4. Finalizar (COMPLETED)
   ├─ Si sin varianza → Cerrar (CLOSED)
   └─ Si hay varianza → Crear versión (IN_PROGRESS)
5. Recontar items (IN_PROGRESS → ACTIVE)
6. Finalizar V2 (COMPLETED)
7. Repetir 4-6 si es necesario
```

---

## ❓ PREGUNTAS QUE RESPONDE

**P: ¿Qué es ese estado `IN_PROGRESS` que vi en la BD?**
A: Es un estado temporal que aparece cuando creas una versión para recontar. Solo existe mientras estés reconando.

**P: ¿Por qué hay `ACTIVE` e `IN_PROGRESS` si parecen lo mismo?**
A: `ACTIVE` = conteo normal. `IN_PROGRESS` = recontar de items con varianza.

**P: ¿Cuándo puedo crear una nueva versión?**
A: Solo si el conteo actual está en `ACTIVE` o `ON_HOLD` Y tiene items con varianza.

**P: ¿Puedo estar indefinidamente en `IN_PROGRESS`?**
A: No. Solo mientras recontas. Cuando finalizas → `COMPLETED`.

**P: ¿Qué pasa si creo V2, V3, V4 muchas veces?**
A: Cada una es otro ciclo. V1→COMPLETED, crea V2 (IN_PROGRESS), V2→COMPLETED, crea V3 (IN_PROGRESS), etc.

