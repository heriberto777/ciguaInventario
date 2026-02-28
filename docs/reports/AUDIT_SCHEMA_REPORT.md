# 🔍 REPORTE DE AUDITORÍA - ESQUEMA PRISMA vs REPOSITORIOS

## RESUMEN EJECUTIVO

Se encontraron **15 discrepancias críticas** entre el esquema Prisma y la lógica de los repositorios que causan **500 Internal Server Errors** y fallos en CRUD operations.

---

## ❌ PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. **COMPANY MODEL - 8 CAMPOS FALTANTES** 🔴 CRÍTICO

**Ubicación:** `apps/backend/prisma/schema.prisma` líneas 26-39

**Problema:** Repositorio intenta usar campos que no existen en el schema

**Campos que FALTAN en Prisma pero se usan en repository.ts:**
- `email` (String, @unique) - línea 18
- `phone` (String?) - línea 19
- `website` (String?) - línea 20
- `address` (String?) - línea 21
- `city` (String?) - línea 22
- `country` (String?) - línea 23
- `description` (String?) - línea 17
- `isActive` (Boolean, @default(true)) - NO ESTÁ

**Métodos Afectados:**
- `createCompany()` - intenta guardar email, phone, website, address, city, country, description
- `updateCompany()` - intenta actualizar estos campos
- `getCompanyByEmail()` - intenta buscar por email

**Error Resultante:**
```
PrismaClientValidationError: Unknown argument 'email'. Available options are marked with ?.
```

**Fix Requerido:** Agregar estos 8 campos al model Company

---

### 2. **USER MODEL - CAMPO 'name' vs 'firstName'/'lastName'** 🟡 ALTA PRIORIDAD

**Ubicación:** Schema define solo `name`, pero repository usa `firstName` y `lastName`

**Problema:**
- Schema: `name String`
- Repository: `firstName: data.firstName`, `lastName: data.lastName`

**Métodos Afectados:**
- `createUser()` línea 11-12
- `updateUser()` línea 101-102

**Fix Requerido:**
- OPCIÓN A: Reemplazar `name` por `firstName` y `lastName` en schema
- OPCIÓN B: Reemplazar `firstName`/`lastName` en repository con `name`

---

### 3. **ROLE MODEL - RELACIÓN INCORRECTA** 🟡 ALTA PRIORIDAD

**Ubicación:** Schema usa `rolePermissions` (junction table) pero repository usa `permissions` (direct relation)

**Problema:**
- Schema: `rolePermissions RolePermission[]` (many-to-many a través de junction table)
- Repository: `permissions: { connect: ... }` (intenta relación directa que NO EXISTE)

**Métodos Afectados:**
- `createRole()` línea 17-19 - intenta conectar directamente a permissions
- `getRoleById()` línea 31 - intenta include de permissions
- `getRoleWithStats()` línea 48 - intenta include de permissions
- Múltiples otros métodos

**Causa Raíz:** Schema usa patrón correcto (junction table) pero repository asume relación directa

**Fix Requerido:** Cambiar todas las referencias de `permissions` a `rolePermissions` en el repository

---

### 4. **PERMISSION MODEL - CAMPO 'category' FALTANTE** 🟡 MEDIA PRIORIDAD

**Ubicación:** `apps/backend/prisma/schema.prisma` líneas 54-59

**Problema:** Repository intenta guardar campo `category` que no existe

**Método Afectado:**
- `createPermission()` línea 13: `category: data.category`

**Error Resultante:**
```
PrismaClientValidationError: Unknown argument 'category'. Available options are marked with ?.
```

**Fix Requerido:** Agregar campo `category` al model Permission

```prisma
category String // e.g., USERS, ROLES, COMPANIES, REPORTS, etc.
```

---

### 5. **SESSION MODEL - COMPLETAMENTE FALTANTE** 🔴 CRÍTICO

**Ubicación:** Schema NO tiene model Session definido

**Problema:** Repository intenta crear/leer sessions pero modelo NO EXISTE

**Campos Requeridos (según repository):**
- `id` (String, @id)
- `companyId` (String, @relation)
- `userId` (String, @relation)
- `userAgent` (String?, opcional)
- `ipAddress` (String?, opcional)
- `isActive` (Boolean, @default(true))
- `lastActivityAt` (DateTime)
- `createdAt` (DateTime, @default(now()))
- `updatedAt` (DateTime, @updatedAt)

**Métodos Afectados:**
- `createSession()` línea 11-19
- `getSessionById()` línea 21-31
- `listSessions()` línea 33+
- `updateSession()` - probablemente existe
- `deleteSession()` - probablemente existe

**Fix Requerido:** Crear model Session completo en schema

---

### 6. **USER MODEL - CAMPO 'password' FALTANTE** 🔴 CRÍTICO

**Ubicación:** Schema tiene `password` (línea 13), BUT...

**Problema:** CreateUserRequest no incluye password en muchos casos, pero:
- La tabla User tiene password NOT NULL
- Pero createUser() NO asigna password (línea 8-17)
- Esto causaría error de NOT NULL en inserción

**Métodos Afectados:**
- `createUser()` - no asigna password
- `updateUser()` - no permite cambiar password

**Fix Requerido:** O bien:
- OPCIÓN A: Hacer `password` nullable en schema: `password String?`
- OPCIÓN B: Requerir password en createUser

---

### 7. **ROLE MODEL - CAMPO 'permissions' vs 'userRoles'** 🟡 MEDIA PRIORIDAD

**Ubicación:** Repository asume relación `users` pero schema define `userRoles`

**Problema:**
- Schema: `userRoles UserRole[]` (junction table)
- Repository: `users: { select: { userId: true } }` - intenta acceso directo

**Métodos Afectados:**
- `getRoleById()` línea 34-35: asume `users` existe
- `listRoles()` línea 51: intenta include de `users`
- `getRoleWithStats()` línea 43: `_count: { select: { users: true } }`

**Fix Requerido:** Cambiar referencias de `users` a `userRoles` en query de roles

---

### 8. **AUDIT LOG MODEL - CAMPO 'action' MISMATCH** 🟡 MEDIA PRIORIDAD

**Ubicación:** Schema define `action String` línea 145, pero repository filtra con:

**Problema:**
```typescript
where.action = { contains: filters.action, mode: 'insensitive' };
```

El schema tiene `action` como String simple (sin restricciones), lo cual es OK.

**Nota:** Este es OK, solo necesita verificar valores permitidos.

---

### 9. **ERP CONNECTION MODEL - CAMPO 'name' FALTANTE** 🟡 MEDIA PRIORIDAD

**Ubicación:** Repository probablemente intenta guardar `name` o `description`

**Problema:** Schema solo tiene: erpType, host, port, database, username, password, isActive
- No tiene `name` o `description`
- No está claro si es requerido

**Fix Requerido:** Verificar si se necesita agregar `name` o `description`

---

### 10. **ROLE MODEL - CAMPO 'isActive' FALTANTE** 🟡 MEDIA PRIORIDAD

**Ubicación:** Schema NO tiene `isActive` en Role

**Problema:** Repository intenta filtrar por `isActive` en listRoles (línea 58-67):
```typescript
if (isActive !== undefined) {
  where.isActive = isActive;
}
```

**Fix Requerido:** Agregar `isActive Boolean @default(true)` al model Role

---

### 11. **USER MODEL - CAMPO 'isActive' FALTANTE** 🟡 MEDIA PRIORIDAD

**Ubicación:** Schema NO tiene `isActive` en User

**Problema:** Repository intenta usar `isActive` en:
- `listUsers()` línea 50+ (filtro)
- `updateUser()` línea 104 (actualización)

**Fix Requerido:** Agregar `isActive Boolean @default(true)` al model User

---

### 12. **ROLE MODEL - ACCESO INCORRECTO A PERMISOS** 🔴 CRÍTICO

**Ubicación:** Repository hace include de campos que no existen

**Problema:** En getRoleById() línea 31:
```typescript
include: {
  permissions: true,  // ❌ NO EXISTE - debe ser rolePermissions
  users: {           // ❌ NO EXISTE - debe ser userRoles
    select: {
      userId: true,
    },
  },
}
```

**Fix Requerido:** Cambiar estructura del include para usar junction tables correctamente

---

### 13. **PERMISSION MODEL - ACCESO INCORRECTO A ROLES** 🟡 MEDIA PRIORIDAD

**Ubicación:** Repository incluye permisos en roles incorrectamente

**Problema:** Cuando se obtiene un Role, repository intenta:
```typescript
include: {
  permissions: true,  // ❌ NO EXISTE
}
```

Debería ser:
```typescript
include: {
  rolePermissions: {
    include: {
      permission: true
    }
  }
}
```

---

### 14. **USER MODEL - ACCESO A ROLES INCORRECTO** 🟡 MEDIA PRIORIDAD

**Ubicación:** Repository getUserById() línea 19-23:

**Problema:**
```typescript
include: {
  roles: {           // ❌ NO EXISTE - debe ser userRoles
    include: {
      permissions: true,  // ❌ NO EXISTE
    },
  },
}
```

**Fix Requerido:** Cambiar a userRoles con estructura correcta

---

### 15. **ERPLAYLOAD MODEL - FALTANTE O INCORRECTO** 🟡 MEDIA PRIORIDAD

**Ubicación:** No hay información clara si existe mapping entre ERPConnection credentials y tabla de almacenamiento

**Problema:** Passwords no están encriptados en transit/storage

**Fix Requerido:**
- Agregar middleware de encriptación para `password` en ERPConnection
- O cambiar a vault/secrets manager

---

## 📋 RESUMEN DE CAMBIOS NECESARIOS

### CAMBIOS AL SCHEMA (apps/backend/prisma/schema.prisma)

#### 1. **Company Model** - Agregar campos
```prisma
model Company {
  id        String   @id @default(cuid())
  name      String   @unique
  email     String?  @unique  // NUEVO
  description String?         // NUEVO
  phone     String?           // NUEVO
  website   String?           // NUEVO
  address   String?           // NUEVO
  city      String?           // NUEVO
  country   String?           // NUEVO
  isActive  Boolean  @default(true)  // NUEVO

  users     User[]
  roles     Role[]
  erpConnections ERPConnection[]
  mappingConfigs MappingConfig[]
  auditLogs AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### 2. **User Model** - Reemplazar 'name' con firstName/lastName O usar name
**OPCIÓN A (firstName/lastName):**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?  // Cambiar a nullable
  firstName String   // NUEVO
  lastName  String   // NUEVO
  isActive  Boolean  @default(true)  // NUEVO
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  userRoles UserRole[]
  sessions  Session[]  // NUEVO
  auditLogs AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([companyId])
}
```

#### 3. **Permission Model** - Agregar category
```prisma
model Permission {
  id   String @id @default(cuid())
  name String @unique
  description String?
  category String  // NUEVO - e.g., USERS, ROLES, COMPANIES, AUDIT_LOGS

  rolePermissions RolePermission[]

  createdAt DateTime @default(now())
}
```

#### 4. **Role Model** - Agregar isActive y verificar relaciones
```prisma
model Role {
  id        String   @id @default(cuid())
  name      String
  description String?  // Verificar si existe
  isActive  Boolean  @default(true)  // NUEVO
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  userRoles    UserRole[]
  rolePermissions RolePermission[]  // USAR ESTO, no 'permissions'

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([companyId, name])
  @@index([companyId])
}
```

#### 5. **Session Model** - CREAR NUEVO
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  userAgent String?
  ipAddress String?
  isActive  Boolean  @default(true)
  lastActivityAt DateTime @updatedAt

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([companyId])
  @@index([userId])
  @@index([createdAt])
}
```

---

## 🛠️ CAMBIOS AL CÓDIGO (Repositorios)

### Archivo: apps/backend/src/modules/roles/repository.ts

**Cambio 1: getRoleById() - Arreglar includes**
```typescript
// ANTES:
include: {
  permissions: true,
  users: {
    select: {
      userId: true,
    },
  },
}

// DESPUÉS:
include: {
  rolePermissions: {
    include: {
      permission: true,
    },
  },
  userRoles: {
    select: {
      userId: true,
    },
  },
}
```

**Cambio 2: createRole() - Arreglar conexión de permisos**
```typescript
// ANTES:
permissions: {
  connect: data.permissionIds.map((id) => ({ id })),
}

// DESPUÉS:
rolePermissions: {
  create: data.permissionIds.map((id) => ({
    permission: { connect: { id } },
  })),
}
```

### Archivo: apps/backend/src/modules/users/repository.ts

**Cambio 1: getUserById() - Arreglar estructura de roles/permisos**
```typescript
// ANTES:
include: {
  roles: {
    include: {
      permissions: true,
    },
  },
}

// DESPUÉS:
include: {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
}
```

### Archivo: apps/backend/src/modules/users/repository.ts

**Cambio 2: createUser() - Agregar password o hacerlo opcional**
```typescript
// Si password es requerido en creación, agregarlo
// Si es opcional, cambiar schema User.password a nullable

// OPCIÓN: Cambiar password a nullable en schema (arriba)
```

---

## ✅ TESTING PLAN

Después de hacer estos cambios, probar:

### 1. **Companies CRUD**
- [ ] POST /companies con email
- [ ] PATCH /companies/:id con email
- [ ] GET /companies con filters
- [ ] DELETE /companies/:id

### 2. **Users CRUD**
- [ ] POST /users con firstName/lastName
- [ ] PATCH /users/:id
- [ ] GET /users con filters (isActive)
- [ ] GET /users/:id (debe incluir roles y permisos)

### 3. **Roles CRUD**
- [ ] POST /roles con permissions
- [ ] GET /roles/:id (debe incluir permissions)
- [ ] PATCH /roles/:id
- [ ] GET /roles con filter isActive

### 4. **Permissions CRUD**
- [ ] POST /permissions con category
- [ ] GET /permissions con filter category

### 5. **Sessions CRUD**
- [ ] POST /sessions (create session)
- [ ] GET /sessions/:id
- [ ] PATCH /sessions/:id (update lastActivityAt)
- [ ] GET /sessions (listar por user)

---

## 📊 MATRIZ DE SEVERIDAD

| Módulo | Problema | Severidad | Bloquea | Status |
|--------|----------|-----------|---------|--------|
| Company | 8 campos faltantes | 🔴 CRÍTICO | POST, PATCH | TODO |
| User | firstName/lastName vs name | 🟡 ALTA | POST, PATCH | TODO |
| User | password nullable | 🟡 ALTA | POST | TODO |
| User | isActive faltante | 🟡 ALTA | GET filter | TODO |
| Role | permissions vs rolePermissions | 🔴 CRÍTICO | POST, GET | TODO |
| Role | users vs userRoles | 🔴 CRÍTICO | GET | TODO |
| Role | isActive faltante | 🟡 ALTA | GET filter | TODO |
| Permission | category faltante | 🟡 MEDIA | POST | TODO |
| Session | Model no existe | 🔴 CRÍTICO | TODO | TODO |
| ERP Connection | name/description | 🟡 MEDIA | POST | TODO |

---

## 🚀 PRÓXIMOS PASOS

1. **Actualizar schema.prisma** con todos los cambios arriba
2. **Crear migration**: `pnpm -F @cigua-inv/backend exec prisma migrate dev --name fix_schema_issues`
3. **Actualizar repositorios** con cambios de includes/creates
4. **Regenerar Prisma client**: `pnpm -F @cigua-inv/backend exec prisma generate`
5. **Ejecutar tests** del plan anterior
6. **Reiniciar servidor backend**

