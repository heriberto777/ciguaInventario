# Arquitectura del Monorepo Cigua Inventory

## Estructura General

Este proyecto sigue una arquitectura de monorepo con separación clara entre:
- **Backend** (Fastify + Prisma)
- **Frontend** (React + Vite)
- **Mobile** (React Native - stub)
- **Packages Compartidos** (Tipos y esquemas)

## Convenciones de Desarrollo

### Backend (Node.js/Fastify)

#### Estructura de Módulos

Cada módulo sigue patrón MVC:

```
modules/
├── [nombre-modulo]/
│   ├── controller.ts    # Manejo HTTP (request/response)
│   ├── service.ts       # Lógica de negocio
│   ├── repository.ts    # Acceso a datos (Prisma)
│   ├── schemas.ts       # Validación Zod
│   └── routes.ts        # Definición de rutas
```

#### Flujo de Solicitud

1. **routes.ts**: Define endpoints y guards
2. **controller.ts**: Parsea request, llama service, responde
3. **service.ts**: Valida datos, aplica reglas, llama repository
4. **repository.ts**: Ejecuta queries Prisma, filtra por company_id
5. **schemas.ts**: Define Zod schemas para validación

#### Multi-Tenancy

**CRÍTICO**: Toda query a base de datos DEBE filtrar por `companyId`:

```typescript
// ✅ CORRECTO
await prisma.mappingConfig.findMany({
  where: {
    companyId,  // <-- OBLIGATORIO
    datasetType: 'ITEMS',
  },
});

// ❌ INCORRECTO
await prisma.mappingConfig.findMany({
  where: {
    datasetType: 'ITEMS',  // Falta companyId
  },
});
```

#### Seguridad SQL

**NUNCA concatenar SQL dinámico**:

```typescript
// ❌ INCORRECTO - SQL Injection
const query = `SELECT * FROM items WHERE company_id = '${companyId}'`;

// ✅ CORRECTO - Template + Parámetros
const builder = new SqlTemplateBuilder('ITEMS_QUERY');
builder.setTableName('items').addParameter('companyId', companyId);
const { sql, parameters } = builder.build();
```

#### Manejo de Errores

```typescript
import { AppError, ValidationError, NotFoundError } from '@/utils/errors';

// En service
if (!mapping) {
  throw new NotFoundError('Mapping not found');
}

if (!isValid(data)) {
  throw new ValidationError('Field X is invalid');
}

// En controller - error handler intercepta automáticamente
```

### Frontend (React/Vite)

#### Atomic Design

```
components/
├── atoms/           # Básicos: Button, Input, Label
├── molecules/       # Compuestos: Card, Table, LabeledInput
├── organisms/       # Complejos: MappingEditor, FormPanel
└── templates/       # Layouts: AdminLayout
```

#### Hooks Personalizados

```typescript
// hooks/useApi.ts
export function useMappingConfigs() {
  return useQuery(['mappings'], fetchMappings);
}

// En componentes
const { data, isLoading } = useMappingConfigs();
```

#### Estado Global (Zustand)

```typescript
// store/auth.ts
export const useAuthStore = create((set) => ({
  user: null,
  setAuth: (user) => set({ user }),
}));

// En componentes
const { user } = useAuthStore();
```

#### Interceptor de Tokens

El `api.ts` maneja automáticamente:
- Refresh token cuando 401
- Reintento de solicitud
- Logout si falla refresh

### Validación (Zod)

**Backend**: Esquemas en `/schemas`
**Frontend**: Esquemas compartidos desde `@shared/schemas`

```typescript
// shared/schemas/api.ts
export const CreateMappingSchema = z.object({
  erpConnectionId: z.string().cuid(),
  datasetType: z.enum(['ITEMS', 'STOCK']),
});

// backend/controller.ts
const data = CreateMappingSchema.parse(request.body);

// web/pages
const { register } = useForm({
  resolver: zodResolver(CreateMappingSchema),
});
```

### Auditoría

Toda acción que modifica datos debe registrarse:

```typescript
await fastify.auditLog({
  companyId,
  userId,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW',
  resource: 'MappingConfig',
  resourceId: mapping.id,
  oldValue: previous,      // Solo para UPDATE/DELETE
  newValue: current,       // Para CREATE/UPDATE
});
```

## Reglas de Idempotencia

### Creación (POST)

Use `UNIQUE` constraints:
```sql
UNIQUE(company_id, dataset_type, version)
```

Si duplicado → error 409 Conflict

### Actualización (PUT/PATCH)

Use versionado:
```typescript
// schema
version: z.number()

// Verifica versión antes de actualizar
if (current.version !== expected.version) {
  throw new ConflictError('Resource was modified');
}
```

### Eliminación (DELETE)

Use soft delete (isActive = false):
```typescript
// No eliminar, marcar inactivo
await prisma.mapping.update({
  where: { id },
  data: { isActive: false }
});
```

## Autenticación & Cookies

### Flow

1. **Login**: `POST /auth/login` → Genera access + refresh tokens
2. **Cookies**: Se establecen automáticamente (`httpOnly`, `secure`)
3. **Request**: Browser envía cookies automáticamente
4. **Refresh**: Interceptor detecta 401 → llama `/auth/refresh`
5. **Nuevo token**: Se actualiza cookie automáticamente

### Validación en Rutas

```typescript
// routes.ts
fastify.addHook('preHandler', tenantGuard);

// tenantGuard verifica JWT + inyecta companyId en request
```

## Base de Datos

### Migraciones

```bash
# Crear migración
pnpm prisma migrate dev --name add_users_table

# Ver cambios
pnpm prisma migrate status

# Reset (solo dev)
pnpm prisma migrate reset
```

### Índices

Índices obligatorios:
- `company_id` en todas las tablas
- `created_at` en tablas de auditoría
- `email` en User (UNIQUE)
- Índices en FK

### Relaciones

```prisma
// Cascada al eliminar empresa
model User {
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  companyId String
}
```

## Testing

```bash
# Unit tests
pnpm test

# Cobertura
pnpm test:coverage

# Integration
pnpm test:integration
```

## Variables de Entorno

```bash
# .env (desarrollo)
DATABASE_URL=postgresql://user:password@localhost:5432/cigua_inv
JWT_SECRET=dev-secret-key-32-chars-minimum
NODE_ENV=development
PORT=3000
```

## Despliegue

### Build

```bash
# Construir todos los apps
pnpm build

# Verificar tipos
pnpm type-check
```

### Variables de Producción

- `JWT_SECRET`: Strong key (32+ chars)
- `NODE_ENV=production`
- `DATABASE_URL`: Conexión pooled a Postgres
- HTTPS habilitado (`cookie.secure=true`)

## Troubleshooting

### Error en Prisma

```bash
# Regenerar cliente
pnpm prisma generate

# Ver esquema actual
pnpm prisma db push --skip-generate
```

### Token inválido

- Limpiar cookies del navegador
- Verificar `JWT_SECRET` coincide
- Ver logs en `request.log`

### Query lenta

- Verificar índices: `pnpm prisma studio`
- Añadir índice si falta
- Ejecutar `EXPLAIN ANALYZE` en PG

---

**Última actualización**: Febrero 2026
