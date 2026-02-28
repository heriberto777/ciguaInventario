# 🎯 GUÍA RÁPIDA: ESTADOS Y BOTONES - INVENTORY COUNTS

**Fecha:** 23 de febrero de 2026
**Status:** ✅ Con Versionado Completo

---

## 📊 MATRIZ RÁPIDA DE TRANSICIONES

```
┌─────────────────────────────────────────────────────────────┐
│               FLUJO COMPLETO DE ESTADOS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CREAR CONTEO                                               │
│       ↓                                                     │
│  [DRAFT] ─────────────────────────────────────────→ [✕]   │
│     │                                                       │
│     │ Click "Procesar" o "Iniciar"                         │
│     ↓                                                       │
│  [ACTIVE] ← ─ ─ ┐                                           │
│     │           │ Click "Reanudar"                          │
│     ├─→ [✓]    │ (desde ON_HOLD)                            │
│     │           │                                           │
│     ├─→ [⏸] ───┴─→ [ON_HOLD]                               │
│     │                  │                                    │
│     └─→ [✕] ──────────→ [✕]                                │
│                                                             │
│  [COMPLETED] ← ─ ─ ─ ─ ─ ┐                                  │
│     │                    │ Click "Finalizar V{n}"           │
│     │                    │ (desde IN_PROGRESS)              │
│     ├─→ 🔄 Crear Versión ┘                                  │
│     │       ↓                                               │
│     │  [IN_PROGRESS] (V2, V3...)                            │
│     │       ├─→ [✓] ────→ [COMPLETED]                      │
│     │       ├─→ [⏸] ────→ [ON_HOLD]                        │
│     │       └─→ [✕] ────→ [CANCELLED]                      │
│     │                                                      │
│     └─→ 🚀 Enviar a ERP                                    │
│             ↓                                              │
│         [CLOSED] (Final - Solo lectura)                    │
│                                                            │
│  [CANCELLED] (Final - Solo lectura)                         │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔘 BOTONES POR ESTADO

### 1. 📄 DRAFT (Conteo recién creado)

**¿Dónde verlo?** Vista de lista, tabla de conteos
**Botones:**
- `[Procesar]` → Abre vista de proceso (pero NO cambia estado aún)
- `[Eliminar]` → Elimina el conteo (solo en DRAFT)

**¿Qué hace "Procesar"?**
```
Abre la vista de "process" donde puedes:
1. Cargar items desde ERP (si hay mapping)
2. Registrar cantidades manualmente
3. Una vez listo, hacer click en otro botón para iniciar
```

---

### 2. 🟢 ACTIVE (Conteo en progreso - registrando items)

**¿Dónde verlo?** Vista de proceso (process view)
**En Lista:** Botones "Procesar", "Finalizar", "Cancelar"
**En Proceso:** Botones en la barra superior

**Botones en Vista de Proceso:**
- `[✓ Finalizar]` → DRAFT → **COMPLETED**
  - Backend: `POST /inventory-counts/{id}/complete`
  - Calcula varianzas automáticamente

- `[⏸ Pausar]` → ACTIVE → **ON_HOLD**
  - Backend: `POST /inventory-counts/{id}/pause`
  - Pausa el conteo sin perder datos

- `[✕ Cancelar]` → ACTIVE → **CANCELLED**
  - Backend: `POST /inventory-counts/{id}/cancel`
  - Cancela definitivamente (no se puede recuperar)

**¿Cuándo aparecen?** Cuando `selectedCount.status === 'ACTIVE'`

---

### 3. ⏸ ON_HOLD (Conteo pausado)

**¿Dónde verlo?** Vista de proceso
**Botones:**
- `[▶ Reanudar]` → ON_HOLD → **ACTIVE**
  - Backend: `POST /inventory-counts/{id}/resume`
  - Continúa registrando desde donde pausó

- `[✓ Finalizar]` → ON_HOLD → **COMPLETED**
  - Backend: `POST /inventory-counts/{id}/complete`
  - Finaliza el conteo desde pausa

- `[✕ Cancelar]` → ON_HOLD → **CANCELLED**
  - Backend: `POST /inventory-counts/{id}/cancel`

**¿Cuándo aparecen?** Cuando `selectedCount.status === 'ON_HOLD'`

---

### 4. ✅ COMPLETED (Conteo finalizado - listo para recontar o enviar)

**¿Dónde verlo?** Vista de proceso
**Botones:**
- `[🔄 Crear Versión]` → COMPLETED → **IN_PROGRESS** (V2)
  - Backend: `POST /inventory-counts/{id}/new-version`
  - Crea nueva versión si hay varianza
  - Limpia countedQty para recontar
  - Copia solo items con varianza > 0.01

- `[🚀 Enviar a ERP]` → COMPLETED → **CLOSED**
  - Backend: `POST /inventory-counts/{id}/send-to-erp`
  - Envía al ERP (Catelli, SAP, etc)
  - Registra closedBy y closedAt
  - Conteo se archiva

- `[✕ Cancelar]` → COMPLETED → **CANCELLED**
  - Backend: `POST /inventory-counts/{id}/cancel`

**¿Cuándo aparecen?** Cuando `selectedCount.status === 'COMPLETED'`

**¿Cuándo usar cada botón?**
```
Si hay VARIANZA (countedQty ≠ systemQty):
  └─ Click "🔄 Crear Versión"
     └─ Va a IN_PROGRESS (V2)
     └─ Recontar items con varianza
     └─ Finalizar de nuevo
     └─ Si hay más varianza → Crear V3, V4...
     └─ Cuando esté conforme → "🚀 Enviar a ERP"

Si NO hay varianza:
  └─ Click "🚀 Enviar a ERP" directamente
     └─ Se archiva y cierra
```

---

### 5. 🔄 IN_PROGRESS (Recontar nueva versión - V2, V3, etc)

**¿Dónde verlo?** Vista de proceso
**¿Cuándo aparece?** Después de click en "🔄 Crear Versión" desde COMPLETED

**Botones:**
- `[✓ Finalizar V{n}]` → IN_PROGRESS → **COMPLETED**
  - Donde {n} = currentVersion (2, 3, 4, etc)
  - Backend: `POST /inventory-counts/{id}/complete`
  - Finaliza esta versión
  - Sistema calcula varianzas de nuevo

- `[⏸ Pausar]` → IN_PROGRESS → **ON_HOLD**
  - Backend: `POST /inventory-counts/{id}/pause`
  - Pausa el recontar

- `[✕ Cancelar]` → IN_PROGRESS → **CANCELLED**
  - Backend: `POST /inventory-counts/{id}/cancel`

**¿Cuándo aparecen?** Cuando `selectedCount.status === 'IN_PROGRESS'`

**Info mostrada:**
```
Usuario ve:
- Versión actual: V2, V3, V4... (mostrada en botón)
- Items: Solo los que tienen varianza
- countedQty: VACÍO (null) - para que reconten
```

---

### 6. 🔒 CLOSED (Conteo cerrado - archivado)

**¿Dónde verlo?** Vista de lista (solo lectura)
**Botones:** NINGUNO
**¿Qué puede hacer?** Solo visualizar (lectura)

**¿Cuándo llega aquí?**
```
Click en "🚀 Enviar a ERP" desde COMPLETED
└─ Status cambio a CLOSED
└─ Se registra quién cerró (closedBy) y cuándo (closedAt)
└─ Conteo se archiva definitivamente
```

---

### 7. ❌ CANCELLED (Conteo cancelado)

**¿Dónde verlo?** Vista de lista (solo lectura)
**Botones:** NINGUNO
**¿Qué puede hacer?** Solo visualizar (lectura)

**¿Cuándo llega aquí?**
```
Click en "✕ Cancelar" desde:
- DRAFT
- ACTIVE
- ON_HOLD
- IN_PROGRESS
- COMPLETED

└─ Conteo se cancela
└─ No se puede recuperar
```

---

## 📈 CÓMO VER CADA VISTA

### Vista de Lista (view='list')
```
GET: http://localhost:3000/inventory/counts-management

Se muestra:
- Tabla de conteos
- Columnas: Código, Almacén, Estado, Versión, Items, Fecha
- Botones por estado (Procesar, Finalizar, Cancelar, Eliminar)
- Botón "+ Nuevo Conteo"
```

### Vista de Proceso (view='process')
```
Se abre cuando:
- Click en "Procesar" o "Iniciar" desde lista
- O cuando creas nuevo conteo

Se muestra:
- Título: [CÓDIGO] - [STATUS]
- Indicador de versión
- Botones para cambiar estado
- Lista de items
- Columnas: Item, Qty Sistema, Qty Contada, UOM, etc
- Tabla para registrar cantidades
```

---

## 🔄 EJEMPLO PRÁCTICO: Flujo Completo

```
Paso 1: Usuario crea nuevo conteo
        └─ Status: DRAFT
        └─ Ver: Lista
        └─ Botón "Procesar"

Paso 2: Click "Procesar" (DRAFT)
        └─ Abre vista: process
        └─ Status: DRAFT
        └─ Carga items desde ERP (si hay mapping)

Paso 3: Click "Iniciar Conteo" (si está en DRAFT)
        └─ Status: DRAFT → ACTIVE
        └─ Endpoint: POST /inventory-counts/{id}/start

Paso 4: Usuario registra cantidades
        └─ Status: ACTIVE
        └─ Ve tabla con items
        └─ Completa columna "countedQty"

Paso 5: Click "✓ Finalizar"
        └─ Status: ACTIVE → COMPLETED
        └─ Endpoint: POST /inventory-counts/{id}/complete
        └─ Sistema calcula varianzas

Paso 6: Sistema detecta varianza en 5 items
        └─ Usuario ve botón "🔄 Crear Versión"

Paso 7: Click "🔄 Crear Versión"
        └─ Status: COMPLETED → IN_PROGRESS (V2)
        └─ Endpoint: POST /inventory-counts/{id}/new-version
        └─ Muestra solo 5 items con varianza
        └─ countedQty = null (limpio)

Paso 8: Usuario recontar los 5 items
        └─ Status: IN_PROGRESS
        └─ Registra nuevas cantidades

Paso 9: Click "✓ Finalizar V2"
        └─ Status: IN_PROGRESS → COMPLETED
        └─ Endpoint: POST /inventory-counts/{id}/complete
        └─ Sistema recalcula varianzas de V2

Paso 10: Si hay varianza nuevamente
         └─ Click "🔄 Crear Versión" nuevamente
         └─ Crea V3
         └─ Repite Pasos 8-10...

Paso 11: Cuando NO hay varianza
         └─ Click "🚀 Enviar a ERP"
         └─ Status: COMPLETED → CLOSED
         └─ Endpoint: POST /inventory-counts/{id}/send-to-erp
         └─ Conteo se archiva
```

---

## 🎯 CHECKLIST: ¿FUNCIONA TODO?

### Vista de Lista
- [ ] Ver conteos en tabla
- [ ] Ver estado (DRAFT, ACTIVE, COMPLETED, etc)
- [ ] Click "Procesar" abre vista process
- [ ] Botones acordes al estado
- [ ] Click eliminar en DRAFT funciona

### Vista de Proceso - DRAFT
- [ ] Muestra estado DRAFT
- [ ] Permite cargar items
- [ ] ¿Hay botón para iniciar? (verificar)

### Vista de Proceso - ACTIVE
- [ ] Botón "✓ Finalizar" → COMPLETED
- [ ] Botón "⏸ Pausar" → ON_HOLD
- [ ] Botón "✕ Cancelar" → CANCELLED
- [ ] Tabla de items visible
- [ ] Puede registrar cantidades

### Vista de Proceso - ON_HOLD
- [ ] Botón "▶ Reanudar" → ACTIVE
- [ ] Botón "✓ Finalizar" → COMPLETED
- [ ] Botón "✕ Cancelar" → CANCELLED

### Vista de Proceso - COMPLETED
- [ ] Botón "🔄 Crear Versión" funciona
- [ ] Crea versión V2 en IN_PROGRESS
- [ ] Items mostrados son solo con varianza
- [ ] countedQty está limpio (null)

### Vista de Proceso - IN_PROGRESS
- [ ] Botón "✓ Finalizar V{n}" (mostrar versión)
- [ ] Botón "⏸ Pausar" → ON_HOLD
- [ ] Botón "✕ Cancelar" → CANCELLED
- [ ] Tabla de items del versionado

### Vista de Proceso - CLOSED
- [ ] Sin botones (solo lectura)
- [ ] Mostrar "Conteo archivado"

---

## 💾 CÓDIGO BACKEND - CAMBIOS NECESARIOS

### ✅ YA HECHO
```typescript
// Service métodos que deben retornar conteo actualizado:
- completeInventoryCount() ✅
- pauseInventoryCount() ✅
- resumeInventoryCount() ✅
- createNewVersion() ✅
- sendToERP() ✅

// Endpoints:
- POST /inventory-counts/{id}/complete ✅
- POST /inventory-counts/{id}/pause ✅
- POST /inventory-counts/{id}/resume ✅
- POST /inventory-counts/{id}/new-version ✅
- POST /inventory-counts/{id}/send-to-erp ✅
```

### ⚠️ VERIFICAR
- [ ] ¿Retorna conteo actualizado EN TODOS los casos?
- [ ] ¿Los items están filtrados por currentVersion?
- [ ] ¿La varianza se calcula correctamente?

---

## 💾 CÓDIGO FRONTEND - CAMBIOS HECHOS

### ✅ MUTATIONS
```typescript
- startCountMutation ✅
- completeCountMutation ✅
- pauseMutation ✅
- resumeMutation ✅
- createVersionMutation ✅
- sendToERPMutation ✅
- cancelCountMutation ✅
```

### ✅ BOTONES
```typescript
DRAFT:         Procesar, Eliminar ✅
ACTIVE:        Finalizar, Pausar, Cancelar ✅
ON_HOLD:       Reanudar, Finalizar, Cancelar ✅
COMPLETED:     Crear Versión, Enviar a ERP ✅
IN_PROGRESS:   Finalizar V{n}, Pausar, Cancelar ✅
CLOSED:        Ninguno ✅
CANCELLED:     Ninguno ✅
```

---

## 📝 NOTAS IMPORTANTES

1. **Varianza se calcula automáticamente**
   ```
   Cuando finalizas conteo → Sistema calcula:
   varianza = countedQty - systemQty

   Si |varianza| > 0.01 → Es "con varianza"
   Si |varianza| ≤ 0.01 → Se considera "sin varianza"
   ```

2. **Versionado es infinito**
   ```
   Puedes crear V2, V3, V4... tantas veces como quieras
   Hasta que NO haya más varianza
   ```

3. **Cada versión preserva histórico**
   ```
   V1 items quedan en BD (no se eliminan)
   V2 items son nuevos registros
   Cuando consultas GET, ve solo V_actual
   ```

4. **Botones contextuales**
   ```
   Los botones cambian dinámicamente según status
   No verás botones que no apliquen al estado actual
   ```

---

## 🚀 PRÓXIMO PASO

¿Necesitas que verifique/arregle algo específico?

1. ¿El botón para pasar de DRAFT a ACTIVE está visible?
2. ¿El botón "Crear Versión" funciona correctamente?
3. ¿Los items filtrados por versión se muestran bien?
4. ¿Hay algún error en la compilación?
