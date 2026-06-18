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

### Database
```bash
docker-compose up -d   # Start PostgreSQL (port 5432, db: cigua_inv)
```

## Architecture

### Monorepo layout
- `apps/backend` — Fastify + Prisma + PostgreSQL API
- `apps/web` — React 18 + Vite + Tailwind + React Query SPA
- `apps/mobile` — React Native stub (SQLite offline, keychain auth)
- `packages/shared` — Domain types (`@cigua-inv/shared`) and Zod schemas shared between backend and web

### Backend (`apps/backend/src/`)

**Plugin loading order** (`app.ts`): `env` → `cors` → `helmet` → `multipart` → `prisma` → `auth` → `audit` → `logger` → routes.

Key plugins:
- `plugins/auth.ts` — registers `@fastify/jwt`; decorates `fastify.generateTokens()` which produces both access (15 min) and refresh (7 days) JWTs
- `plugins/prisma.ts` — decorates `fastify.prisma` with the Prisma client
- `plugins/audit.ts` — decorates `fastify.auditLog()` for writing to `audit_log`

**`guards/tenant.ts`** — the primary auth middleware. Every authenticated route should use it. It: verifies the JWT, checks the session is still active in the DB (sliding session update), and injects `request.companyId` from the token. Every DB query **must** filter by `companyId`.

**Module structure** (`src/modules/<name>/`): `routes.ts` → `controller.ts` → `service.ts` → `repository.ts`. Controllers handle HTTP I/O; services own business logic; repositories do DB queries only.

**All API routes are prefixed `/api`**. Health checks: `GET /health` and `GET /api/health`.

**ERP integration** (`modules/erp-connections`): connects to external SQL Server (mssql). SQL queries use a template allowlist (`ITEMS_QUERY`, `STOCK_QUERY`, `COST_QUERY`, `PRICE_QUERY`, `DESTINATION_QUERY`) with parameterized binding — never raw SQL concatenation.

### Web (`apps/web/src/`)

**API client** (`services/api.ts`): singleton Axios instance with base URL `/api` (Vite proxies to backend in dev). Interceptors automatically refresh the access token on 401 and queue concurrent requests during refresh; only logs out on a 401 from the refresh endpoint itself.

**State management**: Zustand stores in `store/`. Auth state (`store/auth.ts`) holds `accessToken`, `refreshToken`, and user info.

**Data fetching**: React Query (`@tanstack/react-query`) for server state. Custom hooks in `hooks/` wrap query/mutation calls.

**UI component hierarchy** (`components/`):
- `atoms/` — Button, Input, Label
- `molecules/` — Card, Table, LabeledInput
- `organisms/` — MappingEditor, ConnectionTestPanel
- `templates/` — AdminLayout

**Permission checks** in the UI use the `usePermissions` hook, which reads the permissions array from the JWT payload stored in Zustand.

### RBAC

Roles → Permissions model. Permissions follow the `resource:action` pattern (e.g., `users:view`, `inv_counts:execute`). The full permission catalog is in `RBAC_PERMISSIONS_GUIDE.md`. Permission enforcement happens at two layers:
1. **Backend** — route handlers check `request.user.permissions`
2. **Frontend** — `usePermissions` hook gates UI elements

### Multi-tenancy

`companyId` is embedded in every JWT and injected into `request.companyId` by `tenantGuard`. Every Prisma query **must** include `where: { companyId }`. Soft deletes via `isActive` flag — no hard deletes on audit-sensitive tables.

### Database

Managed by Prisma ORM. Schema at `apps/backend/prisma/schema.prisma`. Key conventions:
- `companyId` foreign key on every tenant-scoped table
- `audit_log` table tracks all state changes (indexed on `company_id`, `createdAt`, `userId`)
- Optimistic locking with `version` field on mutable configs (e.g., `MappingConfig`)

### Shared package

`packages/shared/src/types/` exports domain types consumed by both backend and web. Import via `@cigua-inv/shared` (resolved by workspace protocol). TypeScript path alias `@shared/*` maps to `packages/shared/src/*`.

## Environment

Copy `.env.example` to `.env`. Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — must be 32+ chars in production
- `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` — seconds
- `PORT` / `HOST` — backend server (default 3000 / 0.0.0.0)
- `MSSQL_*` — ERP SQL Server connection (optional in dev)
