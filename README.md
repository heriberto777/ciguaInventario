# Cigua Inventory - Physical Inventory Management with ERP Mapping

Production-ready monorepo for managing physical inventory with configurable ERP mapping and multi-tenant RBAC.

## Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Node.js 20, Fastify, Prisma ORM, PostgreSQL
- **Frontend**: React 18, Vite, Tailwind CSS, React Query
- **Mobile**: React Native (stub)
- **Auth**: JWT (access 15m + refresh 7d), HTTP-only cookies
- **Database**: PostgreSQL
- **Logging**: Pino

## Project Structure

```
cigua-inv/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── plugins/        # Fastify plugins
│   │   │   ├── routes/         # Route definitions
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/       # Authentication
│   │   │   │   └── config-mapping/
│   │   │   ├── guards/         # Middleware (tenant guard)
│   │   │   ├── utils/          # Helpers
│   │   │   ├── app.ts          # Fastify app factory
│   │   │   └── server.ts       # Entry point
│   │   └── prisma/
│   │       ├── schema.prisma   # DB schema
│   │       └── migrations/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── atoms/      # Button, Input, Label
│   │   │   │   ├── molecules/  # Card, Table, LabeledInput
│   │   │   │   ├── organisms/  # MappingEditor, ConnectionTestPanel
│   │   │   │   └── templates/  # AdminLayout
│   │   │   ├── pages/          # LoginPage, MappingPage, etc.
│   │   │   ├── hooks/          # useAuth, useApi hooks
│   │   │   ├── store/          # Zustand stores
│   │   │   ├── services/       # API client
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── index.html
│   └── mobile/
│       └── src/
│           ├── db/             # SQLite stub
│           ├── sync/           # Queue stub
│           ├── auth/           # Keychain stub
│           └── screens/        # React Native screens
├── packages/
│   └── shared/
│       └── src/
│           ├── types/          # Domain types
│           └── schemas/        # Zod schemas
├── docs/               # Root for all project documentation
│   ├── architecture/   # Technical design, schemas, and system overviews
│   ├── archive/        # Legacy summaries and completed session notes
│   ├── checklists/     # Verification, migration, and planning checklists
│   ├── features/       # Documentation for specific functional areas
│   ├── fixes/          # Reports and guides for solved issues
│   ├── guides/         # Instructional guides, manuals, and FAQs
│   ├── processes/      # Business logic, workflows, and state machines
│   └── reports/        # Audits, analysis, and session summaries
├── scripts/            # Shell and batch scripts for setup and maintenance
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── .env.example
```

## Documentation

The project documentation has been reorganized into the `docs/` directory for better maintainability. Use the [Index Master](file:///docs/INDEX_MASTER_FINAL.md) as a starting point to navigate the available documentation.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### Installation

1. Clone repository and install dependencies:

```bash
pnpm install
```

2. Setup environment:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start PostgreSQL:

```bash
docker-compose up -d
```

4. Run Prisma migrations:

```bash
pnpm -F @cigua-inv/backend prisma:migrate
```

5. Start all services:

```bash
pnpm dev
```

- Backend: http://localhost:3000
- API Docs: http://localhost:3000/docs
- Web: http://localhost:5173

## Architecture Principles

### Multi-Tenant (RBAC)

- **Company ID Required**: Every query filters by `companyId` (enforced via tenant guard)
- **User Roles**: Users assigned roles → roles have permissions
- **Audit Trail**: All actions logged to `audit_log` table

### Authentication

- **Access Token**: JWT 15min lifespan in cookies
- **Refresh Token**: JWT 7 days in cookies
- **Token Rotation**: Refresh endpoint issues new tokens, invalidates old refresh token
- **HttpOnly Cookies**: Prevents XSS token theft

### Data Security

- **No Dynamic SQL**: All ERP queries use SQL templates + allowlist
- **Parameter Binding**: Parameterized queries prevent injection
- **Template Allowlist**: Only ITEMS_QUERY, STOCK_QUERY, etc. allowed
- **Field Validation**: Metadata validation against ERP schema

## API Endpoints

### Authentication

```
POST /auth/login
Body: { email, password }
Response: { accessToken, refreshToken, user }

POST /auth/refresh
Body: { refreshToken }
Response: { accessToken, refreshToken }

POST /auth/logout
Response: { success: true }
```

### Mapping Configuration

```
GET /config/mapping
Query: ?datasetType=ITEMS&erpConnectionId=<id>&isActive=true
Response: { data: [MappingConfig], count: 5 }

GET /config/mapping/:mappingId
Response: { data: MappingConfig }

POST /config/mapping
Body: CreateMappingConfigRequest
Response: { data: MappingConfig }

POST /config/mapping/test
Body: { mappingId, limitRows }
Response: { data: PreviewDataResponse }
```

## Key Features

### ERP Mapping Module

- **Versioned Configs**: Each dataset type has versions (auto-increment)
- **Field Mapping**: Map source ERP fields to target fields
- **Transformations**: Optional transformation expressions
- **Filters**: Filter data before preview
- **Data Types**: STRING, INT, DECIMAL, DATE, BOOLEAN validation
- **Preview**: Test mapping with sample data

### SQL Template Builder

```typescript
const builder = new SqlTemplateBuilder('ITEMS_QUERY');
builder.setTableName('inventory_items')
  .addParameter('companyId', 'company-123')
  .setLimit(10);

const { sql, parameters } = builder.build();
```

**Allowlist Templates**:
- `ITEMS_QUERY`: Product master data
- `STOCK_QUERY`: Warehouse inventory levels
- `COST_QUERY`: Cost center tracking
- `PRICE_QUERY`: Pricing and discounts
- `DESTINATION_QUERY`: Physical location mapping

### Audit Logging

```typescript
await fastify.auditLog({
  companyId,
  userId,
  action: 'CREATE',
  resource: 'MappingConfig',
  resourceId: mappingId,
  newValue: mappingData,
});
```

## Error Handling

Global error handler normalizes responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [...]
  }
}
```

Common codes:
- `INTERNAL_ERROR`: Unhandled error
- `VALIDATION_ERROR`: Schema validation failed
- `UNAUTHORIZED`: Missing/invalid token
- `FORBIDDEN`: Missing company ID
- `NOT_FOUND`: Resource not found

## Conventions

### Database

- **Always filter by `companyId`**: Tenant isolation mandatory
- **Soft deletes via `isActive` flag**: Never hard-delete audit data
- **Indexed queries**: company_id, createdAt, userId on audit_log
- **Foreign keys with CASCADE**: Cascade on company delete

### Service Layer

- **Controller** → Handles I/O, parsing, HTTP
- **Service** → Business logic, validation, external calls
- **Repository** → Database queries only

### API Schemas

- Zod schemas for request/response validation
- Shared types exported from `@shared` package
- Consistent error shape

### Security

- No raw SQL concatenation
- Template-based queries with parameterization
- RBAC enforced at guard level
- Audit all state changes

## Development Workflow

### Backend Development

```bash
# Start dev server with hot reload
pnpm -F @cigua-inv/backend dev

# Run migrations
pnpm -F @cigua-inv/backend prisma:migrate

# Open Prisma Studio
pnpm -F @cigua-inv/backend prisma:studio

# Type checking
pnpm -F @cigua-inv/backend type-check
```

### Web Development

```bash
# Start dev server
pnpm -F @cigua-inv/web dev

# Build for production
pnpm -F @cigua-inv/web build

# Preview build
pnpm -F @cigua-inv/web preview
```

### Linting & Types

```bash
# Run all type checks
pnpm type-check

# Run linters
pnpm lint
```

## Database Schema

### User Management

```sql
-- Users belong to company
-- Roles are per-company
-- Permissions are global (assigned to roles)
-- UserRole creates many-to-many relationship
```

### Mapping & ERP

```sql
-- ERPConnection per company + erpType
-- MappingConfig versions tracked per datasetType
-- Audit trail captures all changes
```

## Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ chars)
- [ ] Enable HTTPS (adjust cookie `secure: true`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure PostgreSQL connection pooling
- [ ] Enable CORS whitelist
- [ ] Rotate JWT secret periodically
- [ ] Monitor audit_log table growth
- [ ] Set up database backups
- [ ] Enable Pino log shipping
- [ ] Test token refresh flow

## Idempotency Strategy

- **Create Operations**: Use unique constraints (company_id + dataset_type + version)
- **Update Operations**: Version-based (optimistic locking with version field)
- **Refresh Token**: Invalidate old refresh token after rotation

## Testing

```bash
# Unit tests (stub)
pnpm test

# Integration tests (stub)
pnpm test:integration
```

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose ps

# Verify DATABASE_URL in .env
# Reset migrations (dev only)
pnpm -F @cigua-inv/backend prisma:migrate reset
```

### Token Expired

Automatic refresh via interceptor. If 401 persists, login again.

### CORS Issues

Check `vite.config.ts` proxy and Fastify CORS plugin config.

## License

MIT

## Contact

Cigua Inventory Team
