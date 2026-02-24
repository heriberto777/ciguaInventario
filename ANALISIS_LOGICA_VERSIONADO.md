# 🔍 ANÁLISIS DE LA LÓGICA DE VERSIONADO

## ✅ LO QUE ESTÁ BIEN DEFINIDO

1. **Concepto claro**: Crear recontas (V2, V3...) para items con varianza
2. **Flujo lógico**: V1 → Detectar varianza → V2 → Recontar → V3...
3. **BD bien estructurada**: InventoryCount, InventoryCount_Item, VarianceReport
4. **Endpoints documentados**: POST /new-version, GET /variance-items, etc.

---

## ⚠️ PROBLEMAS Y FALTANTES IDENTIFICADOS

### **PROBLEMA 1: No hay implementación de endpoints de versionado**

**¿Qué falta?**
- ❌ POST `/inventory-counts/{countId}/new-version` - NO EXISTE
- ❌ GET `/inventory-counts/{countId}/variance-items` - NO EXISTE
- ❌ GET `/inventory-counts/{countId}/version-history` - NO EXISTE
- ❌ POST `/inventory-counts/{countId}/submit-count` - NO EXISTE

**¿Dónde está el código?**
```
apps/backend/src/modules/inventory-counts/
├─ controller.ts → SÍ tiene rutas básicas
├─ service.ts → NO tiene lógica de versionado
└─ repository.ts → NO tiene métodos para versiones
```

**¿Qué necesita ser implementado?**

```typescript
// Backend: service.ts
async createNewVersion(countId, companyId) {
  1. Obtener conteo actual
  2. Validar status = ACTIVE/ON_HOLD
  3. Obtener items con varianza (from VarianceReport)
  4. Crear nuevos InventoryCount_Item con version++
  5. Actualizar InventoryCount (totalVersions++, currentVersion++)
  6. Retornar nuevos items para recontar
}

async getItemsWithVariance(countId, version) {
  1. Buscar en VarianceReport donde version=X
  2. Retornar items con sus datos anteriores
}

async getVersionHistory(countId) {
  1. Retornar timeline: V1 → V2 → V3...
  2. Mostrar: totalItems, itemsWithVariance por versión
}
```

---

### **PROBLEMA 2: Frontend no tiene UI para versionado**

**¿Qué falta?**
- ❌ Botón "Crear Versión (Auditoría)"
- ❌ Vista de historial de versiones
- ❌ Vista de items con varianza para recontar
- ❌ Indicador de versión actual

**¿Dónde debería estar?**
- `InventoryCountPage.tsx` → Necesita nuevo state: `currentVersion`, `totalVersions`
- `InventoryCountsTable.tsx` → Necesita indicar `version` del item
- Falta componente: `VersionHistoryPanel.tsx`
- Falta componente: `CreateVersionButton.tsx`

**¿Qué necesita en UI?**
```
┌─ Sección Superior ────────────────────────────┐
│ Conteo #1 (CNT-001)                           │
│                                               │
│ 📊 Versiones: V1 [COMPLETED] ✅              │
│              V2 [IN_PROGRESS] 🔄              │
│              + Crear Versión (si hay var.)    │
└───────────────────────────────────────────────┘

┌─ Tabla de Items ──────────────────────────────┐
│ Código | Nombre | Sist. | Conteo | Var. | V# │
│ ITEM-1 | ...    | 100   | 100    | 0    | 1  │
│ ITEM-2 | ...    | 100   | 95     | -5 ⚠️| 1  │ ← Item con varianza
│ ITEM-2 | ...    | 100   | 98     | -2   | 2  │ ← Reconado en V2
└───────────────────────────────────────────────┘
```

---

### **PROBLEMA 3: Falta lógica de "Finalizar Conteo" con detección de varianza**

**¿Qué falta?**
- ❌ No hay endpoint POST `/inventory-counts/{countId}/complete` o similar
- ❌ No se crea automáticamente VarianceReport cuando se completa conteo
- ❌ No se actualiza status a COMPLETED

**Flujo que falta:**
```
Usuario hace clic "Finalizar Conteo"
    ↓
Backend:
1. Obtener todos los items
2. Para cada item: calcular variance = countedQty - systemQty
3. Si |variance| > 0.01:
   - Crear VarianceReport
   - Status = "PENDING"
4. Actualizar InventoryCount.status = "COMPLETED"
5. Retornar resumen de varianzas
```

---

### **PROBLEMA 4: Status del conteo tiene valores inconsistentes**

**Según LOGICA_VERSIONADO.md:**
- Status: `DRAFT`, `ACTIVE`, `ON_HOLD`, `COMPLETED`

**Pero en el código:**
- InventoryCount.status solo tiene: `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`
- ❌ NO EXISTE: `ACTIVE`, `ON_HOLD`

**¿Qué necesita cambiar?**
```prisma
// schema.prisma - Actualizar enum
model InventoryCount {
  ...
  status String @default("DRAFT")  // DRAFT, ACTIVE, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED
  ...
}
```

---

### **PROBLEMA 5: Tabla VarianceReport nunca se usa en código**

**¿Qué está en schema.prisma?**
```
✓ Tabla VarianceReport existe
✓ Tiene campos correctos
```

**¿Dónde se crea?**
```
❌ repository.ts → NO crea VarianceReport
❌ service.ts → NO crea VarianceReport
❌ controller.ts → NO crea VarianceReport
```

**¿Cuándo debería crearse?**
1. Cuando se completa un conteo (finalizar)
2. Cuando se finaliza una versión (después de recontar)

---

### **PROBLEMA 6: Flujo de "Editar Cantidades" está incompleto**

**Actualmente:**
- ✓ Usuario ingresa `countedQty` en tabla
- ✓ Se guarda con debounce
- ❌ NO se detectan varianzas en tiempo real
- ❌ NO se muestra varianza mientras edita

**¿Qué falta?**
```typescript
// Mostrar varianza en tiempo real
const getVariance = (item) => {
  return item.countedQty - item.systemQty;
}

// En tabla:
<td className="text-red-500">
  Varianza: {getVariance(item).toFixed(1)}
</td>
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### **FASE 1: Backend - Endpoints de Versionado** (CRÍTICO)
```
1. Implementar POST /inventory-counts/{countId}/new-version
2. Implementar GET /inventory-counts/{countId}/version-history
3. Implementar GET /inventory-counts/{countId}/variance-items?version=X
4. Implementar POST /inventory-counts/{countId}/complete (finalizar)
5. Actualizar status enum (ACTIVE, ON_HOLD)
```

### **FASE 2: Backend - Lógica de Varianza** (CRÍTICO)
```
1. Crear VarianceReport cuando se completa conteo
2. Calcular variance = countedQty - systemQty
3. Guardar diferencia y porcentaje en VarianceReport
4. Actualizar status de conteo a COMPLETED
```

### **FASE 3: Frontend - UI de Versionado** (IMPORTANTE)
```
1. Agregar indicador de versión (V1, V2, V3...)
2. Crear botón "Crear Versión (Auditoría)"
3. Crear panel de historial de versiones
4. Mostrar varianza en tiempo real en tabla
5. Mostrar items con varianza resaltados
```

### **FASE 4: Frontend - Botón "Finalizar Conteo"** (IMPORTANTE)
```
1. POST /inventory-counts/{countId}/complete
2. Mostrar resumen de varianzas detectadas
3. Cambiar vista a "Ver Historial de Versiones"
```

---

## 📋 CHECKLIST DE VALIDACIÓN

- [ ] Endpoints de versionado implementados
- [ ] VarianceReport se crea al finalizar conteo
- [ ] Status puede ser ACTIVE, ON_HOLD
- [ ] Frontend muestra versiones
- [ ] Botón "Crear Versión" funciona
- [ ] Recontas cargan solo items con varianza
- [ ] Historial de versiones visible
- [ ] Varianza se calcula y se muestra

---

## 🔧 PRÓXIMOS PASOS SUGERIDOS

1. **INMEDIATO**: Implementar `/new-version` endpoint (es el core del versionado)
2. **LUEGO**: Crear componente visual de versiones en frontend
3. **LUEGO**: Implementar lógica de "Finalizar Conteo" con VarianceReport
4. **FINALMENTE**: Pulir UI/UX (historial, indicadores, etc.)

