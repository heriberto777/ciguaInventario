# Fase 3: Interfaz de Conteo Físico

**Estado:** ✅ COMPLETADA - 0 errores de compilación

## Descripción General

Fase 3 implementa la interfaz para que los usuarios realicen el conteo físico de inventario. Después de cargar los datos del ERP (Fase 2), los usuarios pueden:

- Ver todos los items del conteo
- Ingresar la cantidad física contada
- Ver varianzas en tiempo real (diferencia entre cantidad del sistema vs cantidad contada)
- Completar el conteo solo cuando todos los items han sido contados
- Descartar conteos incompletos

## Flujo de Negocio

```
InventoryCount (DRAFT)
    ↓
Usuario abre PhysicalCountPage
    ↓
Carga items con cantidades del sistema
    ↓
Usuario ingresa cantidad contada para cada item
    ↓
Sistema calcula varianzas automáticamente
    ↓
Usuario revisa resumen de varianzas
    ↓
Si todas las cantidades están completas → Puede completar
    ↓
InventoryCount transiciona a COMPLETED
```

## Archivos Creados

### 1. Backend: physical-count.controller.ts (115 líneas)

**Propósito:** Controlador HTTP que implementa 5 endpoints para operaciones de conteo

**Métodos:**

```typescript
// Actualizar cantidad contada para un item
async updateItemCount(request: FastifyRequest, reply: FastifyReply)
PATCH /api/inventory/counts/:countId/items/:itemId
{
  "countedQty": 85,
  "notes": "Recount verified"
}
Retorna: { itemId, itemCode, itemName, systemQty, countedQty, variance, variancePercent }
Cambios: Transiciona count de DRAFT → IN_PROGRESS si es primera actualización

// Obtener todos los items del conteo
async getCountItems(request: FastifyRequest, reply: FastifyReply)
GET /api/inventory/counts/:countId/items
Retorna: { count, items[], summary }
La summary contiene:
  - totalItems: cantidad total de items
  - itemsCounted: items con countedQty > 0
  - itemsNotCounted: items sin contar
  - itemsWithVariance: items con diferencia sistema vs contado

// Completar el conteo
async completeCount(request: FastifyRequest, reply: FastifyReply)
POST /api/inventory/counts/:countId/complete
Retorna: { id, status: 'COMPLETED', completedAt, approvedBy, totalVariance }
Validación: Todos los items deben tener countedQty > 0

// Obtener resumen de varianzas
async getVarianceSummary(request: FastifyRequest, reply: FastifyReply)
GET /api/inventory/counts/:countId/variances
Retorna: { totalVariance, overages, shortages, topVariances[] }
topVariances está ordenado por magnitud de varianza (max 20 items)

// Descartar conteo
async discardCount(request: FastifyRequest, reply: FastifyReply)
DELETE /api/inventory/counts/:countId
Retorna: 204 No Content
Validación: Solo funciona si status es DRAFT o IN_PROGRESS
```

**Características:**

- ✅ Validación de entrada con Zod
- ✅ Casting seguro de usuario autenticado
- ✅ Manejo de errores con statusCode y mensaje
- ✅ Respuestas según estándares REST

### 2. Backend: physical-count.routes.ts (52 líneas)

**Propósito:** Registrar los 5 endpoints con autenticación

**Rutas Registradas:**

```
PATCH   /counts/:countId/items/:itemId      → updateItemCount
GET     /counts/:countId/items              → getCountItems
POST    /counts/:countId/complete           → completeCount
GET     /counts/:countId/variances          → getVarianceSummary
DELETE  /counts/:countId                    → discardCount
```

**Middleware Aplicado:**
- `preHandler: tenantGuard` - Valida que el usuario tenga acceso al tenant correcto

**Patrón:**
```typescript
fastify.patch(
  '/counts/:countId/items/:itemId',
  { preHandler: tenantGuard },
  (request, reply) => controller.updateItemCount(request, reply)
);
```

### 3. Frontend: PhysicalCountPage.tsx (420 líneas)

**Propósito:** Interfaz React para realizar conteo físico

**Componentes Principales:**

#### Header
- Muestra código de conteo y estado actual
- Botones: Show/Hide Variances, Complete, Discard

#### Summary Box
- Cards mostrando:
  - Total Items (gris)
  - Items Counted (verde)
  - Items Not Counted (rojo)
  - Items with Variance (naranja)

#### Variance Box (Condicional)
- Resumen de varianzas:
  - Total Variance (cantidad)
  - Total Variance %
  - Overages (exceso)
  - Shortages (faltante)
- Tabla con Top 20 varianzas ordenadas por magnitud

#### Items Table
Columnas:
- Code (código del item)
- Name (nombre del item)
- System Qty (cantidad en sistema)
- Counted Qty (cantidad contada - editable)
- Variance (diferencia)
- % (porcentaje de varianza)
- Notes (notas opcionales)
- Actions (Count/Save/Cancel buttons)

**Funcionalidades:**

1. **Carga de datos**
   ```typescript
   GET /api/inventory/counts/:countId/items
   GET /api/inventory/counts/:countId/variances
   ```

2. **Edición de item**
   - Click "Count" → Modo edición
   - Ingresa cantidad contada
   - Opcionalmente notas
   - Click "Save" → Envía PATCH

3. **Actualización en tiempo real**
   ```typescript
   PATCH /api/inventory/counts/:countId/items/:itemId
   {
     "countedQty": 85,
     "notes": "Recount verified"
   }
   ```
   - Recalcula varianzas automáticamente
   - Actualiza tabla
   - Recarga resumen de varianzas

4. **Completar conteo**
   ```typescript
   POST /api/inventory/counts/:countId/complete
   ```
   - Valida: itemsNotCounted === 0
   - Si hay items sin contar: muestra error
   - Si todo OK: transiciona a COMPLETED
   - Redirige a página de detalle del conteo

5. **Descartar conteo**
   ```typescript
   DELETE /api/inventory/counts/:countId
   ```
   - Pide confirmación
   - Solo funciona si status es DRAFT o IN_PROGRESS
   - Redirige a lista de conteos

**Estilos:**

- Color variance positiva (overage): #ef4444 (rojo)
- Color variance negativa (shortage): #3b82f6 (azul)
- Color items contados: #22c55e (verde)
- Color items sin contar: #999 (gris)
- Color items con varianza: #f59e0b (naranja)

## Flujo API Completo

### 1. Cargar página de conteo
```
GET /api/inventory/counts/:countId/items
GET /api/inventory/counts/:countId/variances
↓
Carga items y varianzas en la UI
```

### 2. Usuario ingresa cantidad
```
PATCH /api/inventory/counts/:countId/items/:itemId
{
  "countedQty": 85,
  "notes": "Optional notes"
}
↓
Backend:
  - Actualiza InventoryCountItem.countedQty
  - Calcula variance = countedQty - systemQty
  - Calcula variancePercent
  - Si es primer update: transiciona count a IN_PROGRESS
  - Registra audit log
↓
Frontend:
  - Actualiza tabla
  - Recalcula resumen
  - Muestra varianzas actualizadas
```

### 3. Usuario revisa varianzas
```
GET /api/inventory/counts/:countId/variances
↓
Backend:
  - Calcula total variance
  - Suma overages (variance > 0)
  - Suma shortages (variance < 0)
  - Retorna top 20 varianzas ordenadas por |variance|
↓
Frontend:
  - Muestra tabla de top varianzas
  - Resalta items problemáticos
```

### 4. Usuario completa conteo
```
Validación: itemsNotCounted === 0
POST /api/inventory/counts/:countId/complete
{
  // Body opcional - approvedBy viene del usuario autenticado
}
↓
Backend:
  - Valida que todos los items tengan countedQty > 0
  - Transiciona status: IN_PROGRESS → COMPLETED
  - Registra completedAt timestamp
  - Registra approvedBy userId
  - Calcula varianzas totales finales
↓
Frontend:
  - Muestra mensaje de éxito
  - Redirige a página de detalle del conteo
```

### 5. Usuario descarta conteo
```
Validación: confirm() de usuario
DELETE /api/inventory/counts/:countId
↓
Backend:
  - Valida que status sea DRAFT o IN_PROGRESS
  - Elimina InventoryCount y todos sus items
  - Registra audit log
↓
Frontend:
  - Muestra mensaje de éxito
  - Redirige a lista de conteos
```

## Integración con Fase 2

**Flujo Completo:**

1. Usuario carga inventario del ERP (Fase 2)
   → Crea InventoryCount con status DRAFT
   → Crea InventoryCountItem para cada item con systemQty
   → Guarda mappingId que se usó

2. Usuario abre página de conteo (Fase 3)
   → Ve todos los items con systemQty
   → Ingresa countedQty para cada item
   → Ve varianzas calculadas automáticamente
   → Completa conteo cuando todos los items estén contados

3. Sistema registra timestamp y usuario que completó

**Próximo Paso (Fase 4):**
- Usuario revisa varianzas
- Sistema sincroniza diferencias de vuelta al ERP
- Catelli (Grupo ERP) se actualiza con nuevas cantidades

## Validaciones

### En el Controlador

1. **updateItemCount:**
   - countedQty es número ≥ 0 (Zod)
   - notes es string opcional (Zod)
   - El item debe existir en el conteo (service)
   - El conteo no debe estar COMPLETED (service)

2. **completeCount:**
   - El conteo debe existir
   - El conteo no debe estar COMPLETED
   - Todos los items deben tener countedQty > 0

3. **discardCount:**
   - El conteo debe existir
   - El conteo debe estar DRAFT o IN_PROGRESS

### En la Página Frontend

1. Botón "Complete Count" deshabilitado si:
   - `completing === true` (enviando request)
   - `itemsNotCounted > 0` (hay items sin contar)

2. Al intentar completar sin contar todos:
   - Muestra error: "Cannot complete count. X items not counted yet."

3. Al descartar:
   - Pide confirmación con dialog
   - Si cancela: no hace nada
   - Si confirma: envía DELETE

## Manejo de Errores

### Backend

```typescript
try {
  const result = await service.updateItemCount(...);
  return reply.send(result);
} catch (error: any) {
  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.message });
  }
  return reply.status(500).send({ error: 'Failed to update item count' });
}
```

Errores esperados (del service):
- 400: Validación fallida (contedQty inválido)
- 404: Conteo o item no encontrado
- 409: Intento de actualizar count COMPLETED

### Frontend

```typescript
const [error, setError] = useState<string | null>(null);

try {
  // operación
} catch (err) {
  const message = err instanceof Error ? err.message : 'Failed';
  setError(message);
} finally {
  // limpiar loading state
}
```

## Estados de InventoryCount

Transiciones permitidas:

```
DRAFT
  ├→ IN_PROGRESS (cuando se actualiza primer item)
  ├→ COMPLETED (cuando se completa y todos items contados)
  └→ DISCARDED (cuando se descarta)

IN_PROGRESS
  ├→ COMPLETED (cuando se completa y todos items contados)
  └→ DISCARDED (cuando se descarta)

COMPLETED
  └→ (sin transiciones, estado final)
```

## Testing Manual

1. **Crear conteo** (Fase 2)
   - Cargar inventario desde ERP
   - Confirmar que InventoryCount se crea con DRAFT

2. **Abrir Fase 3**
   - Navegar a `/inventory/physical-count/:countId`
   - Verificar carga de items
   - Verificar que summary muestra totales correctos

3. **Contar items**
   - Click "Count" en un item
   - Ingresar cantidad
   - Click "Save"
   - Verificar que:
     - Item se actualiza en tabla
     - Variance se calcula correctamente
     - itemsCounted incrementa
     - Status transiciona a IN_PROGRESS (revisar DB)

4. **Revisar varianzas**
   - Click "Show Variances"
   - Verificar que top varianzas están ordenadas por magnitud
   - Verificar cálculos de overage vs shortage

5. **Completar conteo**
   - Si hay items sin contar: botón deshabilitado
   - Contar todos los items
   - Click "Complete Count"
   - Verificar:
     - Status transiciona a COMPLETED
     - completedAt se registra
     - Redirige a página de detalle

6. **Descartar conteo**
   - En nuevo conteo, sin contar
   - Click "Discard"
   - Confirmar en dialog
   - Verificar que:
     - Conteo se elimina
     - Redirige a lista

## Próximos Pasos

**Fase 4: Sincronización al ERP**

- Crear SyncToERPService
- Crear endpoints para enviar varianzas a Catelli
- Actualizar cantidades en Grupo ERP
- Registrar historial de sincronización

**Fase 4 Page Components:**
- SyncResultsPage: Revisar varianzas antes de sincronizar
- SyncHistoryPage: Historial de sincronizaciones realizadas
- SyncStatusComponent: Indicador de sincronización en progreso

## Resumen de Compilación

```
✅ physical-count.controller.ts    - 0 errores
✅ physical-count.routes.ts        - 0 errores
✅ PhysicalCountPage.tsx           - 0 errores
```

**Total Líneas Fase 3:** 587 líneas (115 + 52 + 420)

**Métodos Implementados:** 5 (updateItemCount, getCountItems, completeCount, getVarianceSummary, discardCount)

**Endpoints:** 5

**Componentes React:** 1

---

**Completado:** ✅ 100%
**Status:** Listo para Fase 4
