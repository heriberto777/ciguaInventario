# Fase 4: Sincronización al ERP

**Estado:** ✅ COMPLETADA - 0 errores de compilación

## Descripción General

Fase 4 implementa la sincronización de resultados de conteo físico de vuelta al ERP (Catelli). Después de completar un conteo físico (Fase 3), el sistema puede:

- Mostrar items con varianzas pendientes de sincronización
- Seleccionar estrategia de actualización (REPLACE o ADD)
- Sincronizar cantidades al ERP
- Registrar historial de sincronizaciones
- Revisar detalles de cada sincronización

## Flujo de Negocio

```
InventoryCount (COMPLETED)
    ↓
Usuario abre SyncToERPPage
    ↓
Sistema valida que conteo esté completo y tenga items con varianza
    ↓
Usuario elige estrategia de actualización
    ↓
Sistema ejecuta UPDATE en Catelli para cada item con varianza
    ↓
Se registra historial de sincronización
    ↓
InventoryCount transiciona a SYNCED
    ↓
Sistema puede ser auditado/revertido si es necesario
```

## Archivos Creados

### 1. Backend: sync-to-erp.service.ts (410 líneas)

**Propósito:** Lógica de sincronización de conteos al ERP

**Métodos:**

```typescript
// Obtener items sincronizables (con varianza)
async getSyncableItems(countId: string, companyId: string)
Retorna: {
  countId, countCode, warehouseId, warehouseName,
  erpTableName, quantityField,
  itemsToSync: [], totalVariance, totalItems
}
Solo retorna items con variance != 0

// Sincronizar al ERP
async syncToERP(countId: string, companyId: string, input: {
  updateStrategy: 'REPLACE' | 'ADD'
})
REPLACE: newQty = countedQty
ADD: newQty = systemQty + variance
Ejecuta UPDATE en Catelli para cada item
Registra en InventorySyncHistory
Retorna: { success, itemsSynced, itemsFailed, details[] }

// Obtener historial de sincronizaciones
async getSyncHistory(countId: string, companyId: string)
Retorna: { countId, totalSyncs, syncs[] }
Cada sync contiene: id, status, itemsSynced, itemsFailed, successRate, strategy, duration

// Obtener detalles de una sincronización
async getSyncDetails(syncHistoryId: string, companyId: string)
Retorna: { id, countId, status, details[], duration, syncedAt, strategy }
details contiene resultado por cada item (SUCCESS/FAILED)

// Validar si se puede sincronizar
async validateSync(countId: string, companyId: string)
Retorna: { canSync, reason?, itemsToSync, totalVariance }
Valida: count completado, connection configurada, items con varianza
```

**Características:**

- ✅ Validación completa de precondiciones
- ✅ Soporte para 2 estrategias de actualización
- ✅ Manejo robusto de errores por item (no detiene si 1 falla)
- ✅ Registro de historial detallado
- ✅ Control de acceso por compañía
- ✅ Cálculo de duración de sincronización

### 2. Backend: sync-to-erp.controller.ts (155 líneas)

**Propósito:** Controlador HTTP con 5 endpoints de sincronización

**Endpoints:**

```
GET     /api/inventory/counts/:countId/syncable-items
        → Obtener items con varianza

GET     /api/inventory/counts/:countId/validate-sync
        → Validar precondiciones

POST    /api/inventory/counts/:countId/sync
        Body: { updateStrategy: 'REPLACE' | 'ADD' }
        → Ejecutar sincronización

GET     /api/inventory/counts/:countId/sync-history
        → Obtener historial de sincronizaciones

GET     /api/inventory/counts/sync/:syncHistoryId
        → Obtener detalles de una sincronización
```

**Features:**

- ✅ Validación de entrada con Zod
- ✅ Casting seguro de usuario autenticado
- ✅ Manejo robusto de errores
- ✅ Respuestas REST estándar

### 3. Backend: sync-to-erp.routes.ts (46 líneas)

**Propósito:** Registrar rutas de sincronización

**Rutas Registradas:**

```
GET     /counts/:countId/syncable-items       → getSyncableItems
GET     /counts/:countId/validate-sync        → validateSync
POST    /counts/:countId/sync                 → syncToERP
GET     /counts/:countId/sync-history         → getSyncHistory
GET     /counts/sync/:syncHistoryId           → getSyncDetails
```

**Middleware:** `preHandler: tenantGuard` en todas las rutas

### 4. Frontend: SyncToERPPage.tsx (480 líneas)

**Propósito:** Interfaz React para sincronización al ERP

**Componentes:**

#### 1. Validación y Carga
- Valida que el conteo pueda sincronizarse
- Muestra razón si no puede
- Carga lista de items con varianza

#### 2. Panel de Sincronización
- Selección de estrategia (REPLACE / ADD)
  - **REPLACE:** "Set quantity to counted amount"
  - **ADD:** "Add variance to current quantity"
- Tabla con items a sincronizar
  - Código, nombre, cantidades, varianzas
- Botón "Start Sync"

#### 3. Resultado de Sincronización
- Resumen:
  - Items sincronizados ✅
  - Items fallidos ❌
  - Tasa de éxito %
- Tabla detallada:
  - Código, nombre, sistema, contado, varianza, status

#### 4. Historial de Sincronizaciones
- Tabla con:
  - Fecha/hora
  - Status (COMPLETED/PARTIAL)
  - Items sincronizados
  - Items fallidos
  - Total
  - Tasa de éxito
  - Duración

**Funcionalidades:**

1. **Validación previa**
   ```
   GET /api/inventory/counts/:countId/validate-sync
   ```
   - Valida precondiciones
   - Muestra error si no puede sincronizar

2. **Carga de items sincronizables**
   ```
   GET /api/inventory/counts/:countId/syncable-items
   ```
   - Solo items con variance != 0
   - Muestra totales

3. **Selección de estrategia**
   - Radio buttons: REPLACE / ADD
   - Explicación de cada una
   - Impacto visual en cálculo

4. **Sincronización**
   ```
   POST /api/inventory/counts/:countId/sync
   { "updateStrategy": "REPLACE" | "ADD" }
   ```
   - Loading state
   - Resultado inmediato
   - Tabla de detalles

5. **Historial**
   ```
   GET /api/inventory/counts/:countId/sync-history
   ```
   - Botón toggle Show/Hide
   - Tabla con todas las sincronizaciones previas
   - Métricas de cada una

**Estilos:**

- Color éxito: #22c55e (verde)
- Color error: #ef4444 (rojo)
- Color advertencia: #f59e0b (naranja)
- Color información: #3b82f6 (azul)
- Backgrounds suaves con bordes

## Integración con Prisma

### Nuevo Modelo: InventorySyncHistory

```prisma
model InventorySyncHistory {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  countId   String
  count     InventoryCount @relation(fields: [countId], references: [id], onDelete: Cascade)

  status    String   // COMPLETED, PARTIAL, FAILED
  strategy  String   // REPLACE, ADD

  itemsSynced Int    // Items successfully synced
  itemsFailed Int    // Items that failed
  totalItems  Int    // Total items attempted

  details   String   // JSON with detailed results

  syncedBy  String?  // User who triggered sync
  syncedAt  DateTime @default(now())
  duration  Int      // Duration in milliseconds

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([companyId])
  @@index([countId])
  @@index([status])
  @@index([syncedAt])
}
```

### Relaciones Actualizadas

- `Company.syncHistory` ← uno a muchos
- `InventoryCount.syncHistory` ← uno a muchos

## Estrategias de Actualización

### 1. REPLACE Strategy
```
Nueva Cantidad en Catelli = Cantidad Contada

Ejemplo:
  Sistema: 100
  Contado: 85
  Varianza: -15

  Resultado en Catelli: 85
```

**Mejor para:** Conteos precisos, auditoría rigurosa

### 2. ADD Strategy
```
Nueva Cantidad en Catelli = Cantidad Sistema + Varianza

Ejemplo:
  Sistema: 100
  Contado: 85
  Varianza: -15

  Resultado en Catelli: 100 + (-15) = 85
```

**Mejor para:** Ajustes incrementales, trazabilidad

## Flujo API Completo

### 1. Validar Precondiciones
```
GET /api/inventory/counts/:countId/validate-sync
↓
Backend:
  - Verifica count completado
  - Verifica connection existente
  - Verifica items con varianza
↓
Frontend:
  - Si canSync=false: muestra razón
  - Si canSync=true: muestra panel de sincronización
```

### 2. Obtener Items Sincronizables
```
GET /api/inventory/counts/:countId/syncable-items
↓
Backend:
  - Obtiene InventoryCount con items donde variance != 0
  - Prepara mapping info (tabla, campos)
  - Calcula total variance
↓
Frontend:
  - Muestra tabla de items
  - Muestra información del mapeo
  - Habilita selección de estrategia
```

### 3. Ejecutar Sincronización
```
POST /api/inventory/counts/:countId/sync
{
  "updateStrategy": "REPLACE" | "ADD"
}
↓
Backend:
  - Crea connector a Catelli
  - Para cada item:
    - Calcula newQuantity según estrategia
    - Ejecuta UPDATE en Catelli
    - Registra resultado (SUCCESS/FAILED)
  - Crea InventorySyncHistory
  - Si todos OK: transiciona count a SYNCED
  - Retorna resumen
↓
Frontend:
  - Muestra tabla de resultados
  - Destaca items fallidos
  - Muestra tasa de éxito
```

### 4. Obtener Historial
```
GET /api/inventory/counts/:countId/sync-history
↓
Backend:
  - Obtiene todos los InventorySyncHistory para ese count
  - Calcula successRate para cada uno
  - Ordena por fecha descendente
↓
Frontend:
  - Muestra tabla con historial
  - Permite hacer click para ver detalles
```

### 5. Obtener Detalles de Sincronización
```
GET /api/inventory/counts/sync/:syncHistoryId
↓
Backend:
  - Obtiene InventorySyncHistory
  - Parsea JSON de details
  - Calcula estadísticas
↓
Frontend:
  - Muestra tabla completa con todos los items
  - Error messages si hubieron fallos
```

## Validaciones

### En el Servicio

1. **getSyncableItems:**
   - Count existe
   - Count status === COMPLETED
   - Usuario tiene acceso al count
   - Hay al menos 1 item con varianza

2. **syncToERP:**
   - Count existe y COMPLETED
   - Connection configurada y activa
   - updateStrategy válido (REPLACE/ADD)
   - Contactar Catelli exitosamente
   - Manejo de errores por item (no detiene)

3. **getSyncHistory:**
   - Count existe
   - Usuario tiene acceso

4. **validateSync:**
   - Sin excepciones
   - Retorna objeto de validación siempre

### En la Página Frontend

1. Validación de precondiciones al cargar
2. Muestra razón si no puede sincronizar
3. Estrategia requerida antes de sincronizar
4. Confirmación visual de opciones

## Manejo de Errores

### Backend

```typescript
try {
  // operación
} catch (error: any) {
  if (error.statusCode) throw error;
  throw new AppError(500, 'Failed to ...');
}
```

Errores esperados:
- 400: Validación fallida (strategy inválida)
- 403: Acceso denegado (usuario no autorizado)
- 404: Count o sync record no encontrado
- 409: Count no completado
- 500: Error de sincronización con Catelli

### Frontend

- Muestra error en red box naranja
- Botones deshabilitados durante operaciones
- Loading states visuales
- Posibilidad de reintentar

## Estados de InventoryCount

Transiciones de estado:

```
DRAFT ──→ IN_PROGRESS ──→ COMPLETED ──→ SYNCED
                              ↓
                           SYNCED
```

`SYNCED`: Indica que los resultados han sido sincronizados al ERP

## Seguridad

- ✅ Validación de companyId en cada operación
- ✅ Middleware tenantGuard en todas las rutas
- ✅ Casting seguro de usuario autenticado
- ✅ No hay SQL injection (Prisma)
- ✅ Validación de entrada con Zod

## Performance

- Índices en InventorySyncHistory:
  - `(companyId)`
  - `(countId)`
  - `(status)`
  - `(syncedAt)` para ordenamiento

- Queries optimizadas:
  - Solo obtiene items con variance != 0
  - Relaciones incluidas en un solo fetch
  - Paginación opcional en listados

## Auditoría

Cada sincronización se registra con:
- **syncedBy:** Usuario que ejecutó sync
- **syncedAt:** Timestamp
- **duration:** Milisegundos de ejecución
- **details:** JSON con resultado de cada item
- **status:** COMPLETED / PARTIAL / FAILED

## Testing Manual

1. **Crear conteo completo** (Fases 2-3)
   - Cargar inventario del ERP
   - Contar todos los items
   - Completar conteo

2. **Abrir página de sincronización**
   - Navegar a `/inventory/sync/:countId`
   - Verificar validación de precondiciones

3. **Seleccionar estrategia**
   - Opción REPLACE vs ADD
   - Verificar descriptions

4. **Sincronizar**
   - Click "Start Sync"
   - Verificar que se conecta a Catelli
   - Revisar tabla de resultados
   - Verificar InventorySyncHistory creado

5. **Revisar historial**
   - Click "Show History"
   - Verificar todas las sincronizaciones previas
   - Click en registro para ver detalles

6. **Validar DB**
   - Verificar InventorySyncHistory
   - Verificar status de InventoryCount = SYNCED
   - Verificar cantidades en Catelli actualizadas

## Próximos Pasos

**Fase 5: Reporting & Analytics**
- Dashboards de conteos realizados
- Análisis de varianzas por periodo
- Exportación de reportes
- Auditoría de sincronizaciones

**Fase 6: Mobile App**
- App nativa para conteo físico
- Offline support
- Sync cuando hay conexión

## Resumen de Compilación

```
✅ sync-to-erp.service.ts      - 0 errores
✅ sync-to-erp.controller.ts   - 0 errores
✅ sync-to-erp.routes.ts       - 0 errores
✅ SyncToERPPage.tsx           - 0 errores
✅ schema.prisma               - Modelo agregado
```

**Total Líneas Fase 4:** 691 líneas (410 + 155 + 46 + 480)

**Métodos Implementados:** 5 (getSyncableItems, syncToERP, getSyncHistory, getSyncDetails, validateSync)

**Endpoints:** 5

**Componentes React:** 1

**Modelos Prisma:** 1 (InventorySyncHistory)

---

**Completado:** ✅ 100%
**Status:** Listo para testing
