# 🚀 Cigua Inversiones ERP - Guía de Instalación y Desarrollo

## 📋 Requisitos del Sistema

### Mínimos
- **Node.js**: v18.0.0 o superior (recomendado v22.10.0)
- **npm/pnpm**: v7.0.0 o superior (usando pnpm 9.0.0)
- **PostgreSQL**: v12 o superior (tested en v16)
- **RAM**: 2GB mínimo
- **Espacio Disco**: 500MB

### Recomendados
- **Node.js**: v22.10.0
- **PostgreSQL**: v16
- **RAM**: 4GB+
- **CPU**: 2+ cores
- **OS**: Windows 10/11, macOS 10.15+, o Linux (Ubuntu 20.04+)

---

## 📦 Instalación Inicial

### 1. Clonar o Descargar Proyecto
```bash
# Si es repositorio git
git clone <repo-url>
cd ciguaInv

# O navega al directorio existente
cd d:\proyectos\app\ciguaInv
```

### 2. Instalar Node.js y pnpm
```bash
# Verifica versión de Node
node --version  # Debe ser v18+

# Instala pnpm globalmente
npm install -g pnpm

# Verifica pnpm
pnpm --version
```

### 3. Configurar Base de Datos PostgreSQL

#### En Windows:
```bash
# Iniciar PostgreSQL (si está instalado como servicio)
# Generalmente ya corre automáticamente

# Conectar a PostgreSQL
psql -U postgres

# En el prompt de PostgreSQL, crear DB si no existe
CREATE DATABASE cigua_inv;
\q
```

#### En macOS:
```bash
# Instalar PostgreSQL
brew install postgresql@16

# Iniciar el servicio
brew services start postgresql@16

# Conectar
psql postgres

# Crear DB
CREATE DATABASE cigua_inv;
\q
```

#### En Linux (Ubuntu):
```bash
# Instalar
sudo apt-get install postgresql postgresql-contrib

# Iniciar
sudo systemctl start postgresql

# Conectar
sudo -u postgres psql

# Crear DB
CREATE DATABASE cigua_inv;
\q
```

### 4. Configurar Variables de Entorno

Crea archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env  # Si existe template
# O edita/crea .env manualmente
```

Contenido de `.env`:
```dotenv
# ===== BASE DE DATOS =====
DATABASE_URL="postgresql://postgres:eli112910@localhost:5432/cigua_inv"

# ===== JWT =====
JWT_SECRET="9b9d6d68d6fc2c537472ef81fb96118cb995adf0c70ed0f8bc0365b6f6153b50"
JWT_ACCESS_EXPIRY=900        # 15 minutos (segundos)
JWT_REFRESH_EXPIRY=604800    # 7 días (segundos)

# ===== SERVIDOR =====
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# ===== ERP MSSQL (Opcional) =====
ERP_MSSQL_HOST=10.0.11.49
ERP_MSSQL_PORT=1433
ERP_MSSQL_USER=sa
ERP_MSSQL_PASSWORD=eli112190

# ===== LOGGING =====
LOG_LEVEL=info
```

**⚠️ IMPORTANTE**:
- **NO** comitees `.env` al repositorio
- Cambia `JWT_SECRET` en producción
- Usa contraseñas fuertes en producción

### 5. Instalar Dependencias

```bash
cd d:\proyectos\app\ciguaInv

# Instala todas las dependencias del monorepo
pnpm install

# Esto instala:
# - Backend dependencies (apps/backend)
# - Frontend dependencies (apps/web)
# - Shared packages
```

### 6. Ejecutar Migraciones y Seed

```bash
# Opción A: Reset completo (borra datos, recrea esquema, ejecuta seed)
pnpm -F @cigua-inv/backend exec prisma migrate reset --force

# Opción B: Solo push schema sin reset
pnpm -F @cigua-inv/backend exec prisma db push

# Ver status de migraciones
pnpm -F @cigua-inv/backend exec prisma migrate status
```

**Datos creados por el seed**:
- 🏢 Empresa: "Cigua Inversiones"
- 🎯 Rol: "Admin"
- 👤 Usuario: `admin@cigua.com` / `admin123456`
- 🔑 7 Permisos de ejemplo

### 7. Verificar Instalación

```bash
# Generar cliente Prisma
pnpm -F @cigua-inv/backend exec prisma generate

# Ver esquema de BD
pnpm -F @cigua-inv/backend exec prisma studio
```

---

## ▶️ Ejecutar la Aplicación

### Opción A: Dos Terminales Separadas (Recomendado)

**Terminal 1 - Backend**:
```bash
cd d:\proyectos\app\ciguaInv
pnpm -F @cigua-inv/backend dev
```

Espera el mensaje:
```
🚀 Server running at http://0.0.0.0:3000
📚 API docs: http://0.0.0.0:3000/docs
[21:57:00.793] INFO (8560): Server listening at http://0.0.0.0:3000
```

**Terminal 2 - Frontend**:
```bash
cd d:\proyectos\app\ciguaInv
pnpm -F @cigua-inv/web dev
```

Espera:
```
VITE v5.4.21  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Press h + enter to show help
```

**Abrir en Navegador**:
```
http://localhost:5173
```

### Opción B: Una Terminal (Desarrollo Rápido)

```bash
cd d:\proyectos\app\ciguaInv
pnpm dev  # Si está configurado en root package.json
```

Esto debería iniciar ambos servidores en paralelo.

---

## 🔨 Tareas de Desarrollo Útiles

### Compilar TypeScript
```bash
# Backend
pnpm -F @cigua-inv/backend build

# Frontend
pnpm -F @cigua-inv/web build
```

### Ejecutar Tests (si existen)
```bash
pnpm -F @cigua-inv/backend test
pnpm -F @cigua-inv/web test
```

### Linting y Formateo
```bash
# Revisar problemas
pnpm lint

# Arreglar automáticamente
pnpm format
```

### Actualizar Prisma
```bash
# Generar cliente (después de cambios en schema.prisma)
pnpm -F @cigua-inv/backend exec prisma generate

# Ver cambios pendientes
pnpm -F @cigua-inv/backend exec prisma migrate diff --from-empty --to-schema-datamodel

# Crear nueva migración
pnpm -F @cigua-inv/backend exec prisma migrate dev --name add_new_field
```

---

## 📁 Estructura del Proyecto

```
ciguaInv/
├── apps/
│   ├── backend/                    # API Fastify + Prisma
│   │   ├── src/
│   │   │   ├── server.ts          # Punto de entrada
│   │   │   ├── modules/           # 9 módulos del sistema
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── roles/
│   │   │   │   ├── permissions/
│   │   │   │   ├── companies/
│   │   │   │   ├── erp-connections/
│   │   │   │   ├── sessions/
│   │   │   │   ├── audit-logs/
│   │   │   │   └── config-mapping/
│   │   │   ├── guards/            # Middleware (auth, tenant)
│   │   │   ├── utils/             # Helpers y utilidades
│   │   │   └── middleware/        # Middleware global
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Esquema de BD
│   │   │   ├── migrations/        # Historial de cambios
│   │   │   └── seed.ts           # Datos iniciales
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Frontend React + Vite
│       ├── src/
│       │   ├── main.tsx           # Punto de entrada
│       │   ├── App.tsx            # Root component
│       │   ├── pages/             # Páginas por módulo
│       │   ├── components/        # Componentes reutilizables
│       │   ├── hooks/             # Custom hooks
│       │   ├── services/          # API client
│       │   ├── store/             # Zustand stores
│       │   └── styles/            # Tailwind + CSS
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                       # Código compartido (si aplica)
├── .env                            # Variables de entorno
├── .env.example                    # Template
├── .gitignore
├── package.json                    # Root package.json
├── pnpm-workspace.yaml             # Configuración monorepo
└── README.md
```

---

## 🔐 Flujo de Autenticación

```
Login (email + password)
         ↓
   Validar credenciales
         ↓
   Hash password con bcrypt.compare()
         ↓
   Generar JWT tokens:
   - accessToken (15 min)
   - refreshToken (7 días)
         ↓
   Crear sesión en BD
         ↓
   Enviar tokens al cliente
         ↓
   Frontend almacena en Zustand store
         ↓
   Incluye Authorization header en requests
         ↓
   Backend valifica token con @fastify/jwt
         ↓
   Continúa flujo o retorna 401
```

---

## 📡 Arquitectura API

### Estructura por Módulo

Cada módulo sigue el patrón:
```
módulo/
├── routes.ts          # Definición de endpoints
├── controller.ts      # Lógica de HTTP
├── service.ts         # Lógica de negocio
├── repository.ts      # Acceso a datos (Prisma)
└── schemas.ts         # Validación con Zod
```

### Ejemplo de Flujo de Request

```
GET /companies?skip=0&take=10
         ↓
   Middleware: tenantGuard (valida token)
         ↓
   Route handler → companiesController.listCompanies()
         ↓
   Validar query con ListCompaniesQuerySchema
         ↓
   companiesService.listCompanies(query)
         ↓
   companiesRepository.listCompanies(query)
         ↓
   prisma.company.findMany()
         ↓
   Retornar { data, pagination }
```

---

## 🗄️ Base de Datos

### Tablas Principales

| Tabla | Propósito | Registros |
|-------|-----------|-----------|
| companies | Empresas del sistema | 1+ |
| users | Usuarios del sistema | 1+ |
| roles | Definiciones de roles | 1+ |
| permissions | Permisos disponibles | 7+ |
| role_permissions | Mapeo roles-permisos | 1+ |
| user_roles | Mapeo usuarios-roles | 1+ |
| sessions | Sesiones activas | 0+ |
| audit_logs | Historial de cambios | 0+ |
| erp_connections | Conexiones a ERP | 0+ |
| config_mappings | Mapeos de campos | 0+ |

### Relaciones Principales

```
Company
  ├─ Users
  ├─ Roles
  │   ├─ Permissions
  │   └─ Users
  ├─ Sessions
  └─ AuditLogs

User
  ├─ Company
  ├─ Roles
  └─ Sessions
```

---

## 🐛 Troubleshooting Desarrollo

### Error: "Module not found"
```bash
# Asegúrate de estar en el directorio correcto
cd apps/backend  # para backend
cd apps/web      # para frontend

# Reinstala dependencias
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error: "Port already in use"
```bash
# Ver qué proceso usa el puerto
# Windows
netstat -ano | findstr :3000
# Linux/Mac
lsof -i :3000

# Mata el proceso
# Windows
taskkill /PID <PID> /F
# Linux/Mac
kill -9 <PID>

# O cambia los puertos en .env y vite.config.ts
```

### Error: "Database connection refused"
```bash
# Verifica que PostgreSQL esté corriendo
# Windows: Services > postgresql-x64-16
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Verifica credenciales en .env
# Conecta manualmente con psql:
psql -U postgres -d cigua_inv -h localhost -p 5432
```

### Hot Reload no funciona
```bash
# Reinicia el servidor
# Ctrl+C en la terminal

# Borra caché de tsx
rm -rf .tsx-cache

# Inicia de nuevo
pnpm dev
```

---

## 🚢 Deployment (Producción)

### Backend (Fastify)

```bash
# Build
pnpm -F @cigua-inv/backend build

# Archivo generado: dist/server.js
# Ejecutar:
node dist/server.js
```

### Frontend (Vite)

```bash
# Build
pnpm -F @cigua-inv/web build

# Archivos generados: dist/
# Servir con nginx o similar:
# root /path/to/dist;
# try_files $uri /index.html;
```

### Variables Importantes para Producción

```dotenv
# SEGURIDAD
NODE_ENV=production
JWT_SECRET="cambiar-a-algo-aleatorio-y-fuerte"

# HTTPS
PORT=443  # HTTPS
# O 80 si está detrás de reverse proxy

# Logs
LOG_LEVEL=warn
```

---

## 📚 Recursos Útiles

- [Fastify Docs](https://www.fastify.io/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [TanStack Query](https://tanstack.com/query/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Zod](https://zod.dev)

---

## ✅ Checklist Post-Instalación

- [ ] PostgreSQL está corriendo
- [ ] `.env` está configurado correctamente
- [ ] `pnpm install` completó sin errores
- [ ] `pnpm -F @cigua-inv/backend exec prisma db push` fue exitoso
- [ ] Backend inicia sin errores (puerto 3000)
- [ ] Frontend inicia sin errores (puerto 5173)
- [ ] Login funciona con `admin@cigua.com` / `admin123456`
- [ ] Puedes crear una empresa nueva
- [ ] Puedes ver registros de auditoría
- [ ] F12 DevTools muestra requests sin errores 401

---

## 🎉 ¡Listo!

Ahora tienes un sistema ERP completo y funcional. Revisa la guía de uso para aprender a usar los módulos.

**Para más ayuda**: Consulta los logs del backend y revisa la consola del navegador (F12).

Happy coding! 🚀

