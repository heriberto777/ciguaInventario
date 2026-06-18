# Código Archivado: Sistema Viejo de Inventario

Archivado el 2026-06-18 durante la limpieza de la refactorización incompleta del módulo `inventory`.

## Por qué se eliminó

El módulo `inventory` fue refactorizado en algún momento pero el código viejo nunca se borró.
Estos archivos **nunca estuvieron registrados en `app.ts`** — es decir, nunca ejecutaron en producción
después de la refactorización. El sistema nuevo (`routes.ts` + `services/`) los reemplazó completamente.

## Lo que encontrarás aquí

### `backend/inventory/` — Sistema viejo del backend

| Archivo | Qué hacía | Por qué no se usó |
|---|---|---|
| `physical-count.routes.ts` | Rutas bajo `/api/inventory/counts/*` | `registerPhysicalCountRoutes` nunca se registró en app.ts |
| `physical-count.controller.ts` | Controller que usaba `PhysicalCountService` | Solo lo usaba la ruta de arriba |
| `physical-count.service.ts` | Lógica de conteo con estados `DRAFT→IN_PROGRESS→COMPLETED` | Reemplazado por `count-state.service.ts` con máquina de estados más completa |
| `sync-to-erp.routes.ts` | Rutas `/api/inventory/counts/:id/sync`, `/syncable-items`, etc. | `registerSyncToERPRoutes` nunca se registró en app.ts |
| `sync-to-erp.controller.ts` | Controller de sync con Zod validation | Solo lo usaba la ruta de arriba |
| `sync-to-erp.service.ts` | Versión vieja del SyncToERPService — inyectaba `fastify` directamente | Reemplazado por `services/sync-to-erp.service.ts` (inyección de repositorio limpia) |
| `load-from-erp.routes.ts` | Rutas `/api/inventory/load-from-erp` | `loadInventoryFromERPRoutes` nunca se registró en app.ts |
| `load-from-erp.controller.ts` | Controller de carga desde ERP | Importaba `./load-from-erp.service` que NO EXISTÍA en esa ruta (el service real está en `services/`) |

### `web/` — Páginas web que ya no se usan

| Archivo | Qué hacía | Por qué no se usó |
|---|---|---|
| `SyncToERPPage.tsx` | Página de sincronización al ERP | En `App.tsx` estaba redirigida: `<Navigate to="/inventory/counts" replace />`. Además llamaba a los 4 endpoints del sistema viejo que no estaban registrados. |
| `InventoryDashboardPage.backup.tsx` | Backup de un dashboard antiguo | Archivo de backup hardcodeado en `src/pages/`. No estaba en el router. |

## Diferencias clave entre el sistema viejo y el nuevo

### Máquina de estados del conteo

```
VIEJO (PhysicalCountService):
DRAFT → IN_PROGRESS → COMPLETED

NUEVO (CountStateService — el activo):
DRAFT → ACTIVE → ON_HOLD ↔ ACTIVE
                    ↓
                SUBMITTED → COMPLETED → FINALIZED → CLOSED
                CANCELLED (desde cualquier estado excepto CLOSED)
```

### Fórmula de reservas en sync (el bug que se corrigió al pasar al nuevo)

```typescript
// VIEJO — unificaba SEPARATED + IN_AISLE en un solo mapa
const physicalReal = countQty - (separated + inAisle);

// NUEVO (services/sync-to-erp.service.ts) — solo resta IN_AISLE
const physicalReal = countQty - inAisleVal;
```

### Lo que el servicio viejo tenía y el nuevo no (recuperado en Fase 3)

- `getSyncHistory()` — historial de sincronizaciones
- `getSyncDetails()` — detalle de una sincronización específica
- `validateSync()` — validación pre-sync
- Grabación en tabla `InventorySyncHistory` después de cada sync
