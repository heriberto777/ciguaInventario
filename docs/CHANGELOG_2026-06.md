# Changelog — Sesión de trabajo junio 2026

Registro de todos los cambios realizados durante esta sesión de desarrollo colaborativo.

---

## [2026-06-18/19] Sesión completa de refactorización, bugfixes y Docker

### 🐳 Infraestructura Docker

**Archivos creados:**
- `apps/backend/Dockerfile` — imagen Node 20 Alpine con build de pnpm monorepo
- `apps/web/Dockerfile` — imagen multi-stage: build Vite + nginx:1.25
- `apps/web/nginx.conf` — nginx con proxy `/api` → `cigua_backend:3000`
- `.dockerignore` — excluye node_modules, dist, .env, apps/mobile, docs
- `docker-compose.yml` — reescrito: 2 servicios (backend + web), red `clinic_default` externa para usar `clinic_postgres` y `clinic_redis` ya existentes
- `.env.docker` — configuración para contenedor (JWT en strings, JWT_ACCESS_EXPIRY=15m)

**Base de datos:**
- Creada base de datos `cigua_inv` en `clinic_postgres` (contenedor ya corriendo)
- Credenciales: `postgres/postgres123`, host `clinic_postgres:5432`

**Puertos:**
- Backend: `host:3990 → container:3000`
- Frontend: `host:8285 → container:80`

**Seed ejecutado:**
```
pnpm -F @cigua-inv/backend exec tsx prisma/seed.ts
```
Crea empresa "Cigua Inversiones", 3 roles (SuperAdmin, Admin, Operator), 3 usuarios.

---

### 🔧 Correcciones críticas de backend

#### JWT expiry corregido
**Archivo:** `.env.docker`
- ANTES: `JWT_ACCESS_EXPIRY=900` (se interpretaba como 900ms, no segundos)
- DESPUÉS: `JWT_ACCESS_EXPIRY=15m` / `JWT_REFRESH_EXPIRY=7d`
- Causa: Zod define `JWT_ACCESS_EXPIRY` como `string`, el valor `"900"` lo pasaba a `ms()` que lo convertía a 900 milisegundos.

#### Migración faltante: `CountReservedInvoice.type`
**Archivo creado:** `apps/backend/prisma/migrations/20260619000001_add_type_to_reserved_invoices/migration.sql`
```sql
ALTER TABLE "CountReservedInvoice" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'SEPARATED';
```
La columna existía en el schema de Prisma pero no en la DB real.

#### `generateCountCode()` — colisiones de código
**Archivo:** `apps/backend/src/modules/inventory/services/count-state.service.ts`
- ANTES: `INV-YYYY-MM-DDHH` (solo hora, colisión en la misma hora)
- DESPUÉS: `INV-YYYY-MM-DDHHMMSS` (incluye minutos y segundos)

#### Error handler — P2002/P2022 devolvían 500
**Archivo:** `apps/backend/src/utils/errors.ts`
- `P2002` (unique constraint) → ahora devuelve **409 Conflict** con mensaje legible
- `P2022` (columna faltante) → ahora devuelve **500 SCHEMA_DRIFT** con instrucción clara

---

### 🏗️ Refactorización del módulo inventory (3 fases)

#### Fase 1 — Código muerto eliminado (archivos nunca registrados en app.ts)
Archivados en `docs/archive/dead-code-inventory-refactor/` y eliminados del source:

**Backend:**
- `physical-count.{routes,controller,service}.ts` — sistema viejo (DRAFT→IN_PROGRESS→COMPLETED)
- `sync-to-erp.{routes,controller,service}.ts` (raíz) — usaba `fastify.inventoryCountRepository` inexistente
- `load-from-erp.{routes,controller}.ts` — importaba service que no existía

**Web:**
- `SyncToERPPage.tsx` — ya redirigida, llamaba 4 endpoints del sistema viejo
- `InventoryDashboardPage.backup.tsx` — backup hardcodeado en src/

#### Fase 2 — Bugs críticos en `routes.ts`
**Archivo:** `apps/backend/src/modules/inventory/routes.ts`
- `POST /cancel` → corregido para llamar `cancelCount()` (antes llamaba `deleteCount()` → borraba físicamente)
- `POST /close` → corregido para llamar `closeCount()` (antes llamaba `pauseCount()` → estado reversible)
- Agregados `closeCount()` y `cancelCount()` al `InventoryController`

#### Fase 3 — Funcionalidad perdida restaurada
**Archivo:** `apps/backend/src/modules/inventory/services/sync-to-erp.service.ts`
- Restaurada grabación de `InventorySyncHistory` después de cada sync al ERP
- Agregados `getSyncHistory()` y `getSyncDetail()`
- Nuevas rutas: `GET /inventory-counts/:id/sync-history` y `GET /inventory-counts/sync/:syncId`

---

### 🔔 Eliminación de window.alert/confirm/prompt

**36 ocurrencias en 11 archivos** reemplazadas por modales personalizados.

**Patrón adoptado** (igual al de `ERPConnectionsPage`):
```typescript
const [notification, setNotification] = useState({...});
const showNotification = (type, title, message) => setNotification({ isOpen: true, type, title, message });
const [confirmState, setConfirmState] = useState({...});
const confirmAction = (title, message, onConfirm, isDangerous?) => setConfirmState({...});
```

**Archivos modificados:**
- `hooks/useInventoryActions.ts` — parámetro `onNotify` reemplaza 11 `alert()`
- `pages/InventoryCountProcessPage.tsx` — pasa `showNotification` al hook
- `pages/UsersPage.tsx`, `RolesPage.tsx`, `PermissionsPage.tsx`, `CompaniesPage.tsx`, `SessionsPage.tsx` — `confirm()` → `<ConfirmModal>`
- `pages/CrossCountReportPage.tsx`, `ItemClassificationsPage.tsx`, `LoadInventoryFromERPPage.tsx`, `QueryBuilderPage.tsx` — `alert()` → `<NotificationModal>`
- `components/SimpleMappingBuilder/steps/FieldMappingStep.tsx` — `prompt()` → modal inline con `<input>`

---

### 🔄 Cache invalidation del conteo

**Archivo:** `apps/web/src/hooks/useInventoryActions.ts`

**Bug:** Las mutaciones (`start`, `complete`, `finalize`, `createVersion`, `sendToERP`, `delete`) invalidaban `['inventory-counts']` (la lista) pero la página del proceso escucha `['inventory-count', id]` (el detalle). La UI no se actualizaba.

**Fix:** Cada mutación invalida ahora ambas queries:
```typescript
queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
```

---

### 🏷️ Clasificaciones en filtros de conteo

**Archivo:** `apps/web/src/hooks/useInventoryProcess.ts`

- ANTES: dropdowns de Categoría/Marca mostraban códigos (`C10`, `M05`)
- DESPUÉS: muestran nombres con código (`ORAL CARE (C10)`, `Colgate Menta (M05)`)
- Nueva query `useQuery` para `/item-classifications` con `staleTime: 5min`

---

### 📊 Columna `itemProv` en reportes

**Backend:** `apps/backend/src/modules/reports/service.ts`
- Agregado `itemProv` al objeto retornado del `reportData.map()`
- Usa `item.itemProv || inferredProvByCode.get(itemCodeNorm) || null` como fallback

**Frontend:** `apps/web/src/pages/ReportsPage.tsx`
- Interface `ReportItem` ahora incluye `itemProv?: string | null`
- Columna "Art. Prov." en tabla web, PDF y Excel entre Artículo y Descripción
- PDF: `columnStyles` ajustados (Descripción: 60mm → 45mm, nueva col: 18mm)

---

### 🗺️ Sistema de Mappings — refactorización completa

#### Tipos de mapping corregidos/agregados
- `PRICES` → renombrado a `PRICE` (consistencia con backend)
- `PICKING_LIST` — nuevo tipo agregado con campos: `invoiceNumber`, `itemCode`, `itemName`, `systemQty`, `clientName`, `sellerCode`, `itemProv`
- Types de `SimpleMappingBuilder` actualizados: incluye `PENDING_INVOICES` y `PICKING_LIST`

#### Edición de mappings restaurada
- **`mainTableAlias` persistido** en `mapping-config/repository.ts` (en el JSON `filters`)
- **Tabla principal pre-seleccionada** al editar: si el valor guardado no coincide exactamente con ninguna opción del ERP (ej: `catelli.ARTICULO` vs `ARTICULO`), se añade como opción extra `✓ catelli.ARTICULO (guardado)`
- **Edición arranca en Paso 4** (Campo Mapping) via prop `initialStep=4`
- **Navegación clickeable** entre los 4 pasos del wizard (antes era solo barra de progreso)

#### Unificación de dos módulos paralelos
- `useApi.ts` hooks (`useMappingConfigs`, `useCreateMapping`) ahora usan `/mapping-configs` (módulo nuevo)
- `InventoryCountProcessPage` actualizado de `/config/mapping` a `/mapping-configs`
- Organismos huérfanos eliminados: `organisms/MappingEditor.tsx`, `organisms/PreviewTable.tsx`, `organisms/ConnectionTestPanel.tsx`

---

### 🔧 Reserva de Picking List — múltiples fixes

#### Fix 1: FECHA/VENDEDOR detectados incorrectamente
**Archivo:** `apps/backend/src/modules/inventory/services/reserved-invoices.service.ts`

El servicio buscaba campos de fecha/vendedor en `fieldMappings` por nombre de target. Si el mapping no los tenía, usaba fallback `'date'`/`'seller'` que no son columnas válidas en el ERP.

**Fix:** Helper `findMappingField()` que:
1. Busca en `fieldMappings` por target (soporta formato `source/target` Y `sourceField/targetField`)
2. Si no encuentra, busca en `selectedColumns` por patrón regex (`FECHA|DATE`, `VENDEDOR|SELLER`)
3. Fallback a `'FECHA'`/`'VENDEDOR'` (columnas reales de Catelli)

SQL generado ANTES: `WHERE f.date >= '...' AND f.seller = '2'` ← columnas inválidas
SQL generado DESPUÉS: `WHERE f.FECHA >= '...' AND f.VENDEDOR = '2'` ← columnas correctas

#### Fix 2: Preview mostraba "1 Factura" con datos en blanco
El dryRun dependía de `transformData` para extraer `invoiceNumber` y `clientName`, pero el mapping PICKING_LIST solo tenía 3 fieldMappings (itemCode, itemName, uom). Sin mapeo explícito para `invoiceNumber`, todos los items tenían `invoiceNumber=undefined` → colapsaban en 1 resultado.

**Fix:** El dryRun ahora auto-detecta columnas del raw ERP data por patrón:
- `FACTURA/INVOICE/FOLIO` → número de factura
- `NOMBRE_CLIENTE/CLIENTE/CUSTOMER` → nombre de cliente
- `ARTICULO/ITEM_CODE/SKU` → código de artículo
- `CANTIDAD/QTY/CANT` → cantidad

Ahora el preview muestra todas las facturas reales con número y cliente correctos.

---

### 🔗 Matching de itemProv (código interno ↔ código ERP)

**Problema:** Artículo interno código `100`, mismo artículo código ERP `2898`. Las reservas de picking list usan código ERP (`2898`), los ítems del conteo usan código interno (`100`). Sin matching, la reserva nunca se aplica.

**Fix en 4 archivos** — mismo patrón de double-lookup:
```typescript
const separatedVal = separatedMap.get(code)        // lookup por código interno
    ?? (provCode ? separatedMap.get(provCode) ?? 0 : 0);  // fallback por itemProv (código ERP)
```

| Archivo | Método afectado |
|---|---|
| `count-state.service.ts` | `completeInventoryCount` — varianzas al completar |
| `version.service.ts` | `getCountItems` — stock ajustado en UI del auditor |
| `reports/service.ts` | `getPhysicalInventoryReport` + `getVarianceSummary` |
| `sync-to-erp.service.ts` | `syncToERP` — cantidad enviada al ERP |

---

### 🧹 Limpieza de código muerto adicional

Archivados en `docs/archive/dead-code-inventory-refactor/web/`:
- `organisms/MappingEditor.tsx` — componente independiente no importado por ninguna página
- `organisms/PreviewTable.tsx` — idem
- `organisms/ConnectionTestPanel.tsx` — idem

---

## [2026-06-19] Fixes de matching por itemProv — UI de reservas y flujo completo

### 🔗 Bug crítico: columna Reserva en UI no reflejaba sub-artículos

**Escenario:** Artículo `2999` en el conteo tiene `itemProv=XXX`. Factura reservada tiene artículo `2429` con `itemProv=XXX` (mismo código de proveedor). La columna "Reserva" en la pantalla del auditor mostraba `-` (cero) para `2999`.

**Causa raíz:** El sistema tenía 5 puntos donde se construye un mapa de reservas para hacer matching. Todos indexaban el mapa **solo por `itemCode`** del ítem reservado. El lookup usaba `itemCode` del ítem del conteo. Sin un código común, el match fallaba.

**Fix: doble indexación del mapa de reservas**

Al construir el mapa, ahora se indexa por `itemCode` Y por `itemProv` del ítem reservado:
```typescript
// ANTES: solo un key
targetMap.set(itemCode, qty);

// DESPUÉS: dos keys
targetMap.set(itemCode, qty);
if (item.itemProv) targetMap.set(item.itemProv, qty);  // bridge por código proveedor
```

Al buscar, si el lookup por `itemCode` del conteo falla, se intenta por `itemProv` del conteo.

**Archivos corregidos (6 en total):**

| Archivo | Método | Qué controla |
|---|---|---|
| `controller.ts` → `maskCountData` | Lookup al cargar conteo | **Columna Reserva visible en UI** ← el más importante |
| `count-state.service.ts` → `completeInventoryCount` | Construcción del mapa | Varianza al completar |
| `version.service.ts` → `getCountItems` | Construcción del mapa | Stock ajustado para auditor |
| `reports/service.ts` → `getPhysicalInventoryReport` | Construcción del mapa | Reporte de varianzas |
| `reports/service.ts` → `getVarianceSummary` | Construcción del mapa | Resumen financiero |
| `sync-to-erp.service.ts` → `syncToERP` | Construcción del mapa | Cantidad enviada al ERP |

**Requisito para que funcione:** El mapping PENDING_INVOICES y PICKING_LIST deben tener `itemProv` mapeado a la columna del ERP que contiene el código de proveedor compartido (ej: `a.ARTICULO_DEL_PROV`).

### 📋 Fix: Picking List preview mostraba "1 Factura" con datos vacíos

**Causa:** `transformData` solo mapea columnas ERP que están en `fieldMappings`. Si el mapping de PICKING_LIST no tiene `invoiceNumber` y `clientName` mapeados, todos los ítems tienen `invoiceNumber=undefined` → se colapsan en 1 fila vacía.

**Fix:** El dryRun ahora auto-detecta columnas directamente del raw ERP data por patrón:
- `FACTURA|INVOICE|FOLIO` → número de factura
- `NOMBRE_CLIENTE|CLIENTE|CUSTOMER` → cliente
- `ARTICULO|ITEM_CODE` → artículo
- `CANTIDAD|QTY` → cantidad

### 🗄️ Proceso de deploy a producción (PM2 sin Docker)

```bash
# 1. Compilar en local
pnpm -F @cigua-inv/backend build

# 2. Subir dist/ al servidor
rsync -avz apps/backend/dist/ usuario@servidor:/ruta/dist/

# 3. Reiniciar PM2
pm2 restart ciguainv

# 4. Para la migración DB (solo si hay schema changes):
cd /ruta/produccion && ./node_modules/.bin/prisma migrate deploy
# Si hay migration fallida: ./node_modules/.bin/prisma migrate resolve --applied "nombre_migration"
```

---

*Actualizado el 2026-06-19*
