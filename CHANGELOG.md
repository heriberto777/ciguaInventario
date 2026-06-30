# CHANGELOG

Historial de cambios del proyecto Cigua Inventory.

---

## [Unreleased] — 2026-06-21

### feat(inventory): conteo concurrente multi-equipo con `CountItemContribution`

**Problema resuelto:** Cuando 3 equipos contaban el mismo artículo en distintas zonas del almacén, el endpoint `PATCH /inventory-counts/:id/items/:itemId` ejecutaba un `UPDATE` directo que sobreescribía el conteo anterior. El último en sincronizar ganaba, borrando los datos de los demás equipos.

**Solución:** Nueva tabla `CountItemContribution` con constraint `UNIQUE(itemId, userId)`.

Cada equipo (identificado por su `userId` del JWT) hace un upsert en esa tabla. Después se recalcula la suma de todas las contribuciones y se actualiza `countedQty` en `InventoryCount_Item`. Todo dentro de una transacción PostgreSQL, sin race conditions.

**Ejemplo:**
```
Equipo A cuenta 50 → CountItemContribution(itemId, userId=A, qty=50)  → countedQty=50
Equipo B cuenta 30 → CountItemContribution(itemId, userId=B, qty=30)  → countedQty=80
Equipo C cuenta 45 → CountItemContribution(itemId, userId=C, qty=45)  → countedQty=125
Equipo A corrige a 48 → UPSERT userId=A qty=48                        → countedQty=123
```

**Offline:** El móvil sincroniza por JWT; el userId se extrae en el servidor. Si el equipo A sincroniza después de que B y C ya registraron sus conteos, su UPSERT solo actualiza su fila sin tocar las de los demás.

**Archivos modificados:**
- `apps/backend/prisma/schema.prisma` — nuevo modelo `CountItemContribution`
- `apps/backend/prisma/migrations/20260621000000_add_count_item_contribution/migration.sql`
- `apps/backend/src/modules/inventory/inventory.repository.ts` — `updateItemCount(itemId, data, userId?)` con lógica transaccional; nuevo método `getContributionsByItemId`
- `apps/backend/src/modules/inventory/controller.ts` — pasa `user.id` en la llamada a `updateItemCount`

**Deploy en producción (requiere migración):**
```bash
# 1. Subir dist/ compilado
rsync -avz apps/backend/dist/ usuario@IP:/ruta/dist/

# 2. Subir la nueva migración
rsync -avz apps/backend/prisma/migrations/ usuario@IP:/ruta/prisma/migrations/

# 3. En el servidor: aplicar migración y reiniciar
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma generate
pm2 restart ciguainv
```

---

## [2026-06-20] — Ajustes de layout y filtros

### style(layout): reducir márgenes globales y quitar `max-w` en páginas de tabla

- `.main-content` padding: `24px → 8px`
- Removido `max-w-7xl` de 3 contenedores en `InventoryCountProcessPage`
- Aplicado en todos los módulos con páginas de tabla para maximizar el uso del espacio

### fix(inventory): corregir filtros de conteo físico

- Reemplazado checkbox `varianceOnly` por select de 4 opciones (`countStatus`)
- Corregido highlight de fila: solo cuando `countedQty !== null AND variance !== 0`
- Formula `expectedStock = systemQty - separated + inAisle` aplicada en filtros

---

## [2026-06-18] — Modal Resumen Reservas con PDF

### feat(inventory): agregar modal Resumen Reservas con export PDF

- Nuevo botón "Resumen Reservas" en `InventoryCountProcessPage`
- Modal con tabla de facturas reservadas y totales por tipo (SEPARATED / IN_AISLE)
- Export a PDF usando `jsPDF + autoTable`
- Columna `itemProv` visible en el reporte

---

## [2026-06-15] — Fix itemProv para reservas con códigos distintos

### fix(inventory): resolver matching de reservas cuando itemProv difiere del itemCode

Los ítems del ERP usan un código de artículo diferente al del catálogo para las facturas. La lógica de reservas ahora indexa por `itemCode` Y `itemProv`, permitiendo que un ítem (2999) encuentre la reserva hecha por el código ERP (2429) si comparten el mismo `itemProv`.

Aplicado en 5 lugares:
- `controller.ts` — `maskCountData`
- `count-state.service.ts`
- `version.service.ts`
- `reports/service.ts` (2 métodos)
- `sync-to-erp.service.ts`

---

## [2026-06-10] — Sistema de mappings unificado

### feat(mapping): unificar flujo de creación/edición de mappings

- Corregido el flujo de edición: el wizard precargaba el estado incorrecto
- Añadido soporte `PENDING_INVOICES` y `PICKING_LIST` en el wizard
- Auto-detección de columnas FECHA/VENDEDOR via regex en `reserved-invoices.service.ts`
- Corrección: el preview del picking list mostraba datos del endpoint incorrecto

---

## [2026-06-05] — Setup Docker y corrección JWT

### fix(auth): JWT_ACCESS_EXPIRY debe ser string con unidad

`JWT_ACCESS_EXPIRY=900` se interpretaba como 900ms. Cambiado a `15m`.

### fix(docker): healthcheck con Node en Alpine

`wget localhost:3000` fallaba en Alpine. Reemplazado por `node -e` con `127.0.0.1` explícito.

### feat(docker): staging con clinic_postgres

- `docker-compose.yml` conecta al contenedor `clinic_postgres` existente
- Migración automática en startup del backend
- Documentados comandos de seed dentro del contenedor

---

## [2026-05-28] — Cleanup de código muerto

### refactor: eliminar módulos duplicados y rutas huérfanas

- Eliminados módulos duplicados de reports, configuración y sync
- Corregidos bugs en rutas del router
- Restaurado `sync-history` que había quedado sin registrar
