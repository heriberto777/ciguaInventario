# 📚 GUÍA: CREAR NUEVOS MÓDULOS

**Última actualización:** 20 de Febrero 2026

---

## 🎯 Resumen

Acabo de crear un **módulo completo de Usuarios** (Users Management) siguiendo el patrón establecido en config-mapping. Este documento te enseña exactamente cómo replicar el patrón para crear nuevos módulos.

---

## 📂 PATRÓN DE MÓDULO

Cada módulo tiene esta estructura:

```
apps/backend/src/modules/[nombre]/
├── schemas.ts        ← Zod validation + TypeScript types
├── repository.ts     ← Database access (Prisma)
├── service.ts        ← Business logic
├── controller.ts     ← HTTP handlers (request/response)
└── routes.ts         ← Route definitions
```

### Layers Explanation:

| Layer | Responsabilidad | Ejemplo |
|-------|-----------------|---------|
| **Routes** | Define HTTP endpoints | `GET /users`, `POST /users` |
| **Controller** | Parse request, call service, format response | Validate input, call service.createUser() |
| **Service** | Business logic, validation, audit | Check duplicates, hash password, log changes |
| **Repository** | Database queries with Prisma | `prisma.user.findFirst()` con company_id filter |
| **Schemas** | Zod validation + TypeScript types | Define request/response structure |

---

## 🔄 Flujo de Ejecución

```
Client Request
      ↓
Routes (tenantGuard verifies JWT)
      ↓
Controller (parses request.body with Zod)
      ↓
Service (business logic)
      ↓
Repository (database operation with company_id filter)
      ↓
Service (format response, audit log)
      ↓
Controller (send HTTP response)
      ↓
Client
```

---

## 📋 EJEMPLO: USERS MODULE (CREADO HOY)

### 1️⃣ Schemas (Validation + Types)

```typescript
// apps/backend/src/modules/users/schemas.ts

import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().uuid('Invalid role ID'),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  companyId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;
```

**Claves:**
- ✅ Usa Zod para runtime validation
- ✅ Exporta tipos TypeScript (`z.infer<typeof ...>`)
- ✅ Incluye mensajes de error claros
- ✅ Define tanto request como response schemas

---

### 2️⃣ Repository (Database Access)

```typescript
// apps/backend/src/modules/users/repository.ts

import { PrismaClient } from '@prisma/client';
import { CreateUserRequest } from './schemas';

export class UsersRepository {
  constructor(private prisma: PrismaClient) {}

  // Create user
  async createUser(companyId: string, data: CreateUserRequest) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        companyId, // MANDATORY: Multi-tenant enforcement
      },
    });
  }

  // Get with company filter (IMPORTANT!)
  async getUserById(userId: string, companyId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId, // MANDATORY: Enforce multi-tenancy
      },
    });
  }

  // List with company filter
  async listUsers(companyId: string, skip: number, take: number) {
    return this.prisma.user.findMany({
      where: {
        companyId, // MANDATORY: Only users from this company
      },
      skip,
      take,
    });
  }
}
```

**Claves:**
- ✅ Cada query DEBE filtrar por `companyId`
- ✅ **NUNCA** retornar datos de otros companies
- ✅ Constructor recibe `PrismaClient`
- ✅ Métodos son async
- ✅ NO hacer lógica de negocio aquí

---

### 3️⃣ Service (Business Logic)

```typescript
// apps/backend/src/modules/users/service.ts

import { FastifyInstance } from 'fastify';
import { UsersRepository } from './repository';
import { CreateUserRequest } from './schemas';
import { AppError, ValidationError } from '../../utils/errors';

export class UsersService {
  constructor(
    private repository: UsersRepository,
    private fastify: FastifyInstance
  ) {}

  async createUser(companyId: string, data: CreateUserRequest) {
    // 1. Validate email is unique
    const existingUser = await this.repository.getUserByEmail(
      data.email,
      companyId
    );

    if (existingUser) {
      throw new ValidationError('Email already exists');
    }

    // 2. Create user
    const user = await this.repository.createUser(companyId, data);

    // 3. Audit log (will happen in controller)
    // 4. Return safe user (no password)
    const { ...safeUser } = user;
    return safeUser;
  }

  async getUser(userId: string, companyId: string) {
    const user = await this.repository.getUserById(userId, companyId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}
```

**Claves:**
- ✅ Validación de reglas de negocio
- ✅ Llama al repository para BD
- ✅ Lanza excepciones con `AppError` o `ValidationError`
- ✅ Nunca retorna datos sensibles (passwords, etc.)

---

### 4️⃣ Controller (HTTP Handlers)

```typescript
// apps/backend/src/modules/users/controller.ts

import { FastifyInstance } from 'fastify';
import { UsersController } from './controller';
import { UsersService } from './service';
import { CreateUserSchema } from './schemas';
import { AppError } from '../../utils/errors';

export class UsersController {
  private repository: UsersRepository;
  private service: UsersService;

  constructor(private fastify: FastifyInstance) {
    this.repository = new UsersRepository(fastify.prisma);
    this.service = new UsersService(this.repository, fastify);
  }

  async createUser(request: any, reply: any) {
    try {
      const companyId = request.user?.companyId;
      if (!companyId) {
        throw new AppError('Company context required', 401);
      }

      // 1. Validate request body with Zod
      const payload = CreateUserSchema.parse(request.body);

      // 2. Call service
      const user = await this.service.createUser(companyId, payload);

      // 3. Audit log
      await this.fastify.auditLog(
        request.user?.id,
        companyId,
        'CREATE',
        'User',
        user.id
      );

      // 4. Return response
      return reply.code(201).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      throw error; // Global error handler catches it
    }
  }
}
```

**Claves:**
- ✅ Extrae `companyId` de `request.user`
- ✅ Valida input con Zod (`.parse()` throws si inválido)
- ✅ Llama al service
- ✅ Audit log en mutaciones
- ✅ Manejo de errores delegado al handler global

---

### 5️⃣ Routes (Endpoint Definitions)

```typescript
// apps/backend/src/modules/users/routes.ts

import { FastifyInstance } from 'fastify';
import { UsersController } from './controller';
import { tenantGuard } from '../../guards/tenant';

export async function usersRoutes(fastify: FastifyInstance) {
  const controller = new UsersController(fastify);

  fastify.post<{ Body: any }>(
    '/users',
    {
      preHandler: [tenantGuard], // IMPORTANT: Verify JWT and inject companyId
      schema: {
        description: 'Create new user',
        tags: ['Users'],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            roleId: { type: 'string', format: 'uuid' },
          },
          required: ['email', 'password', 'firstName', 'lastName', 'roleId'],
        },
      },
    },
    async (request, reply) => controller.createUser(request, reply)
  );

  fastify.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [tenantGuard] },
    async (request, reply) => controller.getUser(request, reply)
  );
}
```

**Claves:**
- ✅ `preHandler: [tenantGuard]` en TODOS los endpoints
- ✅ Schema con TypeScript types
- ✅ Descripción para Swagger docs
- ✅ Tags para agrupar en documentación

---

### 6️⃣ Registrar Routes en app.ts

```typescript
// apps/backend/src/app.ts

import { usersRoutes } from './modules/users/routes';

export async function createApp() {
  // ... plugins ...

  // Register routes
  await app.register(authRoutes);
  await app.register(configMappingRoutes);
  await app.register(usersRoutes); // ← ADD THIS

  // ... documentation ...
}
```

---

## 🎨 FRONTEND: CREAR COMPONENTES

### 1️⃣ Crear Componente Organism

```typescript
// apps/web/src/components/organisms/UserForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

const UserFormSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

type UserFormData = z.infer<typeof UserFormSchema>;

export const UserForm = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(UserFormSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} />
      <Input {...register('firstName')} />
      <Input {...register('lastName')} />
      <Input {...register('password')} type="password" />
      <Button type="submit">Create User</Button>
    </form>
  );
};
```

---

### 2️⃣ Crear Página

```typescript
// apps/web/src/pages/UsersPage.tsx

import { useQuery, useMutation } from 'react-query';
import { api } from '../services/api';
import { UserForm } from '../components/organisms/UserForm';
import { UsersTable } from '../components/organisms/UsersTable';
import { AdminLayout } from '../components/templates/AdminLayout';

export const UsersPage = () => {
  const queryClient = useQueryClient();

  const { data: users } = useQuery('users', async () => {
    return (await api.get('/users')).data;
  });

  const createMutation = useMutation(
    (data) => api.post('/users', data),
    {
      onSuccess: () => queryClient.invalidateQueries('users'),
    }
  );

  return (
    <AdminLayout>
      <UserForm onSubmit={(data) => createMutation.mutate(data)} />
      <UsersTable users={users} />
    </AdminLayout>
  );
};
```

---

### 3️⃣ Registrar en App.tsx

```typescript
// apps/web/src/App.tsx

import { UsersPage } from '@/pages/UsersPage';

function App() {
  return (
    <Routes>
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <UsersPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
```

---

## ✅ CHECKLIST PARA CREAR UN NUEVO MÓDULO

Cuando crees un nuevo módulo, sigue este checklist:

### Backend:
- [ ] Crear carpeta `apps/backend/src/modules/[nombre]/`
- [ ] Crear `schemas.ts` con Zod validation
- [ ] Crear `repository.ts` con métodos Prisma
  - [ ] TODOS los queries filtran por `companyId`
  - [ ] Métodos son async
- [ ] Crear `service.ts` con lógica de negocio
  - [ ] Validaciones de reglas
  - [ ] Llama a repository
  - [ ] Lanza AppError o ValidationError
- [ ] Crear `controller.ts` con HTTP handlers
  - [ ] Extrae companyId de request.user
  - [ ] Valida input con Zod
  - [ ] Llama a service
  - [ ] Audit log en mutaciones
- [ ] Crear `routes.ts`
  - [ ] `preHandler: [tenantGuard]` en TODO
  - [ ] Schema para Swagger
- [ ] Registrar en `app.ts` → `await app.register(routes)`

### Frontend:
- [ ] Crear componentes atoms/molecules necesarios
- [ ] Crear component organism para formularios
- [ ] Crear page component
- [ ] Registrar rutas en App.tsx
- [ ] Crear React Query hooks en useApi.ts

### Database:
- [ ] Si necesitas nuevas tablas, actualizar prisma/schema.prisma
- [ ] Crear migration: `pnpm -F @cigua-inv/backend prisma:migrate dev`

### Documentation:
- [ ] Documentar endpoints en API_EXAMPLES.md
- [ ] Documentar nuevas types en START_HERE.md

---

## 📊 MODULES CREADOS HASTA AHORA

| Módulo | Backend | Frontend | Endpoints |
|--------|---------|----------|-----------|
| **auth** | ✅ | ✅ | 3 (login, refresh, logout) |
| **config-mapping** | ✅ | ✅ | 4 (GET, GET/:id, POST, POST/test) |
| **users** | ✅ | ✅ | 6 (GET, GET/:id, POST, PATCH, DELETE, POST/:id/role) |

**Total endpoints:** 13 endpoints API funcionales

---

## 🚀 PRÓXIMAS FEATURE SUGERIDAS

1. **Roles Management** (Crear, listar, asignar permisos)
2. **Permissions Management** (CRUD de permisos)
3. **Companies Management** (Multi-tenant admin)
4. **Audit Logs Viewer** (Ver cambios realizados)
5. **Reports Module** (Generar reportes)

Cada una seguiría el mismo patrón que Users.

---

## 💡 BEST PRACTICES

### Multi-tenancy:
- ✅ SEMPRE filtrar por `companyId` en repository
- ✅ Extraer `companyId` de `request.user` en controller
- ✅ Nunca confiar en `companyId` del client

### Validation:
- ✅ Usar Zod en schemas.ts
- ✅ Validar en controller (`.parse()`)
- ✅ Validaciones de negocio en service

### Error Handling:
- ✅ Usar `AppError(message, statusCode)` para errores conocidos
- ✅ Usar `ValidationError(message)` para validaciones
- ✅ El global handler formatea respuestas

### Audit Logging:
- ✅ `await this.fastify.auditLog()` en TODA mutación (POST, PATCH, DELETE)
- ✅ Parámetros: userId, companyId, action, entityType, entityId

### API Response Format:
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error (handled by global handler)
{
  success: false,
  error: {
    message: "...",
    code: "VALIDATION_ERROR"
  }
}
```

---

## 📖 REFERENCIAS

- **ARCHITECTURE.md** - Patrones completos
- **API_EXAMPLES.md** - Ejemplos de requests/responses
- **apps/backend/src/modules/config-mapping/** - Ejemplo completo
- **apps/backend/src/modules/users/** - Módulo nuevo (creado hoy)

---

**¡Listo para crear tu propio módulo!** 🚀

Sigue el patrón de Users Module para cualquier nueva feature.
