# 🔄 FLUJO DE ESTADOS - Conteo de Inventario

## Estados disponibles

```
DRAFT       → Estado inicial al crear un conteo
ACTIVE      → Conteo en proceso de contar
IN_PROGRESS → Versión 2+ en proceso de recontar
ON_HOLD     → Conteo pausado temporalmente
COMPLETED   → Conteo finalizado, listo para enviar a ERP
CLOSED      → Conteo enviado al ERP (archivado)
CANCELLED   → Conteo cancelado (no se usa)
```

---

## Transiciones de Estados

### 1️⃣ CREAR CONTEO
```
DRAFT
└─ Endpoint: POST /inventory-counts/create
└─ Retorna: Conteo con status=DRAFT
└─ Qué hace el usuario: Carga items (automático o manual)
```

### 2️⃣ INICIAR CONTEO
```
DRAFT → ACTIVE
└─ Endpoint: POST /inventory-counts/:countId/start
└─ Retorna: Conteo con status=ACTIVE
└─ currentVersion = 1
└─ Qué hace el usuario: Comienza a registrar cantidades
```

### 3️⃣ PAUSAR CONTEO (opcional)
```
ACTIVE → ON_HOLD
└─ Endpoint: POST /inventory-counts/:countId/pause
└─ Retorna: Conteo con status=ON_HOLD
└─ Qué hace: Pausa el conteo sin perder datos
```

### 4️⃣ REANUDAR CONTEO (opcional)
```
ON_HOLD → ACTIVE
└─ Endpoint: POST /inventory-counts/:countId/resume
└─ Retorna: Conteo con status=ACTIVE
└─ Qué hace: Continúa el conteo donde se pausó
```

### 5️⃣ FINALIZAR CONTEO (Primera vez)
```
ACTIVE → COMPLETED
└─ Endpoint: POST /inventory-counts/:countId/complete
└─ Retorna: Conteo con status=COMPLETED
└─ Sistema: Detecta automáticamente items con varianza
└─ Varianza = |countedQty - systemQty| > 0.01
```

### 6️⃣ CREAR NUEVA VERSIÓN (Si hay varianza)
```
COMPLETED → IN_PROGRESS (V2)
└─ Endpoint: POST /inventory-counts/:countId/new-version
└─ Retorna: Conteo con:
   - currentVersion = 2
   - totalVersions = 2
   - countItems = Solo items con varianza (V2)
   - items.countedQty = null (limpio para recontar)
└─ V1 items quedan históricos en BD
└─ Qué hace el usuario: Recontar solo items con diferencia
```

### 7️⃣ FINALIZAR NUEVA VERSIÓN
```
IN_PROGRESS (V2) → COMPLETED
└─ Endpoint: POST /inventory-counts/:countId/complete
└─ Sistema: Detecta si hay varianza en V2
└─ Si NO hay varianza → COMPLETED (Listo para ERP)
└─ Si SÍ hay varianza → Espera que usuario cree V3
```

### 8️⃣ ENVIAR A ERP
```
COMPLETED → CLOSED
└─ Endpoint: POST /inventory-counts/:countId/send-to-erp
└─ Retorna: Conteo con status=CLOSED
└─ Auditoría: closedBy, closedAt
└─ Conteo queda archivado (no editable)
└─ Qué hace: Envía datos al ERP (Catelli, SAP, etc.)
```

---

## 🎯 FLUJO COMPLETO CON EJEMPLO

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario crea conteo de bodega Materia Prima                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  DRAFT        │
                    │ (Conteo nuevo)│
                    └───────┬───────┘
                            ↓
              POST /start (Usuario listo)
                            ↓
                    ┌───────────────┐
                    │  ACTIVE       │
                    │ currentVersion=1
                    │ totalVersions=1
                    └───────┬───────┘
                            ↓
                    [Usuario registra cantidades]
                            ↓
                POST /complete (Click "Finalizar")
                            ↓
         ┌─────────────────────────────────────┐
         │         COMPLETED (V1)              │
         │ Sistema detecta 15 items con varianza
         └─────────────────────────────────────┘
                            ↓
                ¿Hay items con varianza?
               /                            \
              SÍ                             NO
             /                                \
            ↓                                  ↓
   POST /new-version                  POST /send-to-erp
   Crear V2                           Enviar a ERP
            ↓                                  ↓
    ┌──────────────────┐          ┌──────────────────┐
    │ IN_PROGRESS (V2) │          │     CLOSED       │
    │ currentVersion=2 │          │  (Enviado a ERP) │
    │ countItems=      │          │  (Archivado)     │
    │ [15 items solo]  │          └──────────────────┘
    │ countedQty=null  │
    └────────┬─────────┘
             ↓
    [Usuario reconta items con varianza]
             ↓
    POST /complete (Finalizar V2)
             ↓
    ┌────────────────────────┐
    │ COMPLETED (V2)         │
    │ ¿Hay varianza en V2?   │
    └────────────────────────┘
             ↓
       ¿Aún hay diferencias?
        /                 \
       SÍ                  NO
      /                     \
     ↓                       ↓
Crear V3           POST /send-to-erp
(repetir)          Enviar a ERP → CLOSED
```

---

## 📋 BOTONES POR ESTADO

### ACTIVE
```
✓ Finalizar      → POST /inventory-counts/:countId/complete (V1 → COMPLETED)
⏸ Pausar        → POST /inventory-counts/:countId/pause (ACTIVE → ON_HOLD)
✕ Cancelar      → POST /inventory-counts/:countId/cancel
```

### ON_HOLD
```
▶ Reanudar       → POST /inventory-counts/:countId/resume (ON_HOLD → ACTIVE)
✓ Finalizar      → POST /inventory-counts/:countId/complete
✕ Cancelar      → POST /inventory-counts/:countId/cancel
```

### IN_PROGRESS (V2+)
```
✓ Finalizar V2   → POST /inventory-counts/:countId/complete (IN_PROGRESS → COMPLETED)
⏸ Pausar        → POST /inventory-counts/:countId/pause
✕ Cancelar      → POST /inventory-counts/:countId/cancel
```

### COMPLETED
```
🔄 Crear Versión → POST /inventory-counts/:countId/new-version (COMPLETED → IN_PROGRESS)
🚀 Enviar a ERP  → POST /inventory-counts/:countId/send-to-erp (COMPLETED → CLOSED)
```

### CLOSED
```
(Sin botones - Conteo archivado)
```

---

## 🔧 CÓMO PROCEDE EL CAMBIO DE ESTADO

### En el Frontend (InventoryCountPage.tsx)

```typescript
// Ejemplo: Usuario hace click en "✓ Finalizar"
<Button onClick={() => completeCountMutation.mutate(selectedCount.id)}>
  ✓ Finalizar V{selectedCount.currentVersion}
</Button>

// Mutation
const completeCountMutation = useMutation({
  mutationFn: async (countId: string) => {
    // 1. POST al backend
    const response = await apiClient.post(
      `/inventory-counts/${countId}/complete`,
      {}
    );
    // 2. Backend retorna conteo actualizado
    return response.data.count;  // status: COMPLETED
  },
  onSuccess: (count) => {
    // 3. Frontend actualiza estado local
    setSelectedCount(count);  // Ahora status=COMPLETED
    setCountItems(count.countItems || []);  // Items actualizados
    // 4. UI se re-renderiza → botones cambian
    // Antes: "✓ Finalizar"
    // Después: "🔄 Crear Versión" + "🚀 Enviar a ERP"
  },
});
```

### En el Backend (service.ts)

```typescript
async completeInventoryCount(countId: string, companyId: string, userId: string) {
  // 1. Validar que existe el conteo
  const count = await this.repository.getCountById(countId, companyId);
  if (!count) throw new AppError(404, 'Not found');

  // 2. Validar estado actual (debe ser ACTIVE o IN_PROGRESS)
  if (!['ACTIVE', 'IN_PROGRESS'].includes(count.status)) {
    throw new AppError(400, `Cannot complete from ${count.status} state`);
  }

  // 3. Cambiar estado a COMPLETED
  const updated = await this.fastify.prisma.inventoryCount.update({
    where: { id: countId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: userId,
    },
  });

  // 4. Retornar conteo actualizado (con items filtrados por versión)
  return await this.repository.getCountById(countId, companyId);
}
```

---

## 📊 TABLA DE TRANSICIONES PERMITIDAS

| Desde | POST /complete | POST /new-version | POST /send-to-erp | POST /pause | POST /resume | POST /cancel |
|-------|---|---|---|---|---|---|
| DRAFT | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ACTIVE | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| IN_PROGRESS | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| ON_HOLD | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| COMPLETED | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| CLOSED | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## ⚠️ PUNTOS CRÍTICOS

### ✅ Cambio de versión (V1 → V2)
```
1. POST /new-version
2. Backend:
   - Detecta items con varianza en V1
   - CREA nuevos registros en BD para V2
   - V1 items quedan históricos
   - countedQty = null (limpio)
3. Backend retorna conteo con:
   - currentVersion = 2
   - countItems = Solo items V2
4. Frontend actualiza UI
```

### ✅ Filtrado de items por versión
```
Cada versión tiene sus propios items en BD:
- V1: itemCode="ABC001", version=1, countedQty=100
- V1: itemCode="XYZ999", version=1, countedQty=50

Si hay varianza:
- Crear V2 copia SOLO items con |counted-system| > 0.01
- V2: itemCode="ABC001", version=2, countedQty=null
- V1: itemCode="XYZ999", version=1, countedQty=50 (histórico)

Cuando el usuario ve "Procesar conteo":
- currentVersion=2 → Backend filtra: WHERE version=2
- Solo ve items de V2
- V1 queda archivado
```

### ✅ Auditoría
```
Cada transición registra:
- completedAt, completedBy
- closedAt, closedBy (cuando envía a ERP)
- updatedAt, updatedBy

Permite trazabilidad completa.
```

---

## 🎓 RESUMIDO: PASO A PASO

1. **Crear** → POST /create → Status: DRAFT
2. **Iniciar** → POST /start → Status: ACTIVE (V1)
3. **Finalizar V1** → POST /complete → Status: COMPLETED
4. **¿Hay varianza?**
   - **SÍ** → POST /new-version → Status: IN_PROGRESS (V2)
   - Recontar items
   - Finalizar V2 → Status: COMPLETED
   - Repetir hasta NO hay varianza
5. **Enviar al ERP** → POST /send-to-erp → Status: CLOSED (Archivado)

