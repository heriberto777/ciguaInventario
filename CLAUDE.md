# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (monorepo)
```bash
pnpm dev              # Start all services in parallel
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm type-check       # Type-check all packages
```

### Backend (`@cigua-inv/backend`)
```bash
pnpm -F @cigua-inv/backend dev             # Start with hot reload (tsx watch)
pnpm -F @cigua-inv/backend build           # Compile TypeScript + generate Prisma client
pnpm -F @cigua-inv/backend type-check      # tsc --noEmit
pnpm -F @cigua-inv/backend lint            # ESLint
pnpm -F @cigua-inv/backend prisma:migrate  # Run Prisma migrations (dev)
pnpm -F @cigua-inv/backend prisma:studio   # Open Prisma Studio GUI
pnpm -F @cigua-inv/backend seed            # Run DB seed (tsx prisma/seed.ts)
```

### Web (`@cigua-inv/web`)
```bash
pnpm -F @cigua-inv/web dev       # Vite dev server (http://localhost:5173)
pnpm -F @cigua-inv/web build     # tsc + vite build
pnpm -F @cigua-inv/web preview   # Preview production build
```

### Docker (staging/dev)
```bash
docker compose up -d              # Start all containers
docker compose up -d --build      # Rebuild and start both
docker compose up -d --build backend  # Rebuild only backend
docker compose up -d --build web      # Rebuild only web
docker compose down               # Stop all
docker logs cigua_backend -f      # Stream backend logs
# Seed dentro del contenedor:
docker exec cigua_backend sh -c "cd /app && node_modules/.bin/tsx apps/backend/prisma/seed.ts"
```

### Producción — PM2 sin Docker (servidor Linux)

**Compilar el backend (en la máquina de desarrollo):**
```bash
# Con pnpm:
pnpm -F @cigua-inv/backend build

# Sin pnpm (Windows PowerShell o cuando pnpm no está en PATH):
cd apps/backend
npx prisma generate   # actualiza node_modules/@prisma/client localmente
npx tsc               # compila TypeScript → dist/
cd ../..
```

**`npx prisma generate` y `npx tsc` se corren SOLO en local — nunca en el servidor para deploys de código.**
El `dist/` generado es JavaScript puro (independiente de plataforma) y es lo único que se sube.

**Deploy de solo código (sin cambios de schema.prisma):**
```bash
rsync -avz apps/backend/dist/ usuario@IP:/ruta/dist/
ssh usuario@IP "pm2 restart ciguainv"
```

**Deploy con cambio de schema.prisma (nueva migración):**
```bash
# 1. Subir dist/ + migraciones
rsync -avz apps/backend/dist/ usuario@IP:/ruta/dist/
rsync -avz apps/backend/prisma/migrations/ usuario@IP:/ruta/prisma/migrations/

# 2. En el servidor: aplicar migración Y regenerar cliente Prisma para Linux
ssh usuario@IP
cd /ruta/produccion
./node_modules/.bin/prisma migrate deploy   # aplica SQL pendiente
./node_modules/.bin/prisma generate         # regenera cliente para Linux
pm2 restart ciguainv
```

**Nunca en producción:**
- `prisma migrate dev` — usa shadow DB, falla en producción
- `prisma db push` — aplica schema sin archivos de migración, peligroso

**Resolver migración fallida (error P3009):**
```bash
# Si la columna/tabla ya existe en la DB:
./node_modules/.bin/prisma migrate resolve --applied "NOMBRE_MIGRACION"
# Si no existe, crearla manualmente y luego marcar como applied
./node_modules/.bin/prisma migrate deploy  # verificar que dice "No pending migrations"
```

## Docker Setup

The project runs in Docker pointing to the shared `clinic_postgres` container (PostgreSQL already running on the same host). **Do not start a local postgres** — use the clinic container.

- Backend: `host:3990 → container:3000`
- Frontend: `host:8285 → container:80`
- DB: `clinic_postgres:5432` (network `clinic_default`, db: `cigua_inv`)
- Credentials: `postgres / postgres123`

Files: `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `docker-compose.yml`, `.env.docker`

## Architecture

### Monorepo layout
- `apps/backend` — Fastify + Prisma + PostgreSQL API
- `apps/web` — React 18 + Vite + Tailwind + React Query SPA
- `apps/mobile` — React Native (Expo Router, SQLite offline)
- `packages/shared` — Domain types (`@cigua-inv/shared`) and Zod schemas

### Backend (`apps/backend/src/`)

**Plugin loading order** (`app.ts`): `env` → `cors` → `helmet` → `multipart` → `prisma` → `auth` → `audit` → `logger` → routes.

Key plugins:
- `plugins/auth.ts` — registers `@fastify/jwt`; decorates `fastify.generateTokens()` producing access (15 min) and refresh (7 days) JWTs
- `plugins/prisma.ts` — decorates `fastify.prisma`
- `plugins/audit.ts` — decorates `fastify.auditLog()`

**`guards/tenant.ts`** — the primary auth middleware. Verifies JWT, checks session is active in DB, injects `request.companyId`. Every DB query **must** filter by `companyId`.

**Module structure** (`src/modules/<name>/`): `routes.ts` → `controller.ts` → `service.ts` → `repository.ts`.

**All API routes are prefixed `/api`**. Health: `GET /health` and `GET /api/health`.

### Inventory module (`modules/inventory/`)

The active system lives in:
- `routes.ts` + `controller.ts` + `inventory.repository.ts`
- `services/count-state.service.ts` — count lifecycle (DRAFT→ACTIVE→SUBMITTED→COMPLETED→FINALIZED→CLOSED)
- `services/erp-loader.service.ts` — load items from ERP
- `services/sync-to-erp.service.ts` — send results to ERP
- `services/reserved-invoices.service.ts` — PENDING_INVOICES and PICKING_LIST reservations
- `services/version.service.ts` — multi-version counting

**Count status machine:**
```
DRAFT → ACTIVE → ON_HOLD ↔ ACTIVE
                    ↓
                SUBMITTED → COMPLETED → FINALIZED → CLOSED
                CANCELLED (from any state except CLOSED)
```

**Reservation formula (unified):**
```
Expected Stock = ERP_systemQty - SEPARATED + IN_AISLE
Variance       = Counted - Expected Stock
```
Applied in: `count-state.service.ts`, `version.service.ts`, `reports/service.ts`, `sync-to-erp.service.ts`.

**itemProv matching:** Reserved items may use ERP article codes (e.g., `2898`) while inventory items use internal codes (e.g., `100`). All 4 services above do a double-lookup:
```typescript
const qty = map.get(internalCode) ?? (itemProv ? map.get(itemProv) ?? 0 : 0);
```
This requires `itemProv` to be mapped in the ITEMS mapping and stored in `InventoryCount_Item.itemProv`.

### Mapping system (`modules/mapping-config/`)

**Single active module:** `mapping-config` (routes at `/api/mapping-configs`). The old `config-mapping` module (`/api/config/mapping`) is still registered for legacy compatibility but all new code uses the new one.

**Supported datasetTypes:**

| Type | Used by | Purpose |
|---|---|---|
| `ITEMS` | ERP loader | Import article catalog into a count |
| `DESTINATION` | sync-to-erp | Export count results to ERP table |
| `PENDING_INVOICES` | reserveInvoice | Fetch invoice items by invoice number (IN_AISLE) |
| `PICKING_LIST` | reservePickingList | Fetch all dispatches by date range (SEPARATED) |
| `STOCK` | (future) | Import stock quantities only |
| `COST` | (future) | Import costs only |

**Storage structure in DB:** `MappingConfig.filters` (JSON) stores the wizard state:
```json
{
  "mainTable": "catelli.ARTICULO",
  "mainTableAlias": "a",
  "joins": [...],
  "filters": [...],
  "selectedColumns": [...]
}
```
`MappingConfig.fieldMappings` stores the field translations at the top level.

**PICKING_LIST date/seller detection:** `reserved-invoices.service.ts` auto-detects ERP column names via regex patterns when they're not in `fieldMappings`. Patterns: `FECHA|DATE` for date, `VENDEDOR|SELLER` for seller.

### Web (`apps/web/src/`)

**API client** (`services/api.ts`): singleton Axios with base URL `/api`. Interceptors auto-refresh on 401 and queue concurrent requests.

**State management:** Zustand in `store/`. Auth (`store/auth.ts`) holds tokens and user info.

**Data fetching:** React Query. `hooks/useApi.ts` wraps key mutations/queries — all mapping hooks now use `/mapping-configs` (not the old `/config/mapping`).

**Modal pattern** (no `window.alert/confirm/prompt` allowed):
```typescript
// Notification
const [notification, setNotification] = useState({ isOpen: false, type: 'info', title: '', message: '' });
const showNotification = (type, title, message) => setNotification({ isOpen: true, type, title, message });
// Confirm
const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false });
const confirmAction = (title, message, onConfirm, isDangerous?) => setConfirmState({ isOpen: true, ... });
// Render at bottom of JSX:
<NotificationModal isOpen={...} onClose={...} type={...} title={...} message={...} />
<ConfirmModal isOpen={...} onConfirm={...} onCancel={...} title={...} message={...} isDangerous={...} />
```

**useInventoryActions hook** accepts `onNotify?: (type, title, message) => void` — pass `showNotification` from the page component.

**React Query cache keys for inventory:**
- List: `['inventory-counts']`
- Detail: `['inventory-count', id]`
- All mutations must invalidate BOTH keys after success.

### RBAC

Roles → Permissions model. Pattern: `resource:action` (e.g., `users:view`, `inv_counts:execute`). Full catalog in `RBAC_PERMISSIONS_GUIDE.md`. Enforced at:
1. Backend — route handlers check `request.user.permissions`
2. Frontend — `usePermissions` hook gates UI elements

### Multi-tenancy

`companyId` in every JWT → `request.companyId` via `tenantGuard`. Every Prisma query **must** include `where: { companyId }`. Soft deletes via `isActive` — no hard deletes on audit tables.

### Database

Schema at `apps/backend/prisma/schema.prisma`. Key models: `User`, `Company`, `Role`, `Permission`, `InventoryCount`, `InventoryCount_Item`, `VarianceReport`, `Warehouse`, `ERPConnection`, `MappingConfig`, `CountReservedInvoice`, `CountReservedItem`.

**Creating manual migrations:** When a schema field is added without running `prisma migrate dev`, create the file manually:
1. Create `apps/backend/prisma/migrations/YYYYMMDDHHMMSS_name/migration.sql`
2. Write the `ALTER TABLE` statement
3. Rebuild the backend — `prisma migrate deploy` runs automatically on startup

## Environment Variables (`.env.docker`)

```
DATABASE_URL   = postgresql://postgres:postgres123@clinic_postgres:5432/cigua_inv
JWT_SECRET     = [32+ chars]
JWT_ACCESS_EXPIRY  = 15m    # Must be a duration string with unit. "900" without unit = 900ms!
JWT_REFRESH_EXPIRY = 7d
NODE_ENV       = production
PORT           = 3000
HOST           = 0.0.0.0
FRONTEND_URL   = http://localhost:8285   # CORS origin in production
ERP_MSSQL_HOST = 10.0.11.49
```

## Key Policies

- **Never use `window.alert()`, `window.confirm()`, `window.prompt()`** — use `NotificationModal`, `ConfirmModal`, or inline input modals from `atoms/`.
- **JWT expiry values** must be duration strings (`15m`, `7d`), not plain numbers.
- **Every mutation** that changes a count must invalidate both `['inventory-counts']` and `['inventory-count', countId]`.
- **itemProv** must be mapped in ITEMS mapping if the ERP uses different codes for invoices vs. catalog (resolves reservation matching).
- **Mappings** are stored in `mapping-config` module (`/api/mapping-configs`). The old `config-mapping` module exists for legacy compatibility only.
- **No `window.alert`** — see modal pattern above.
