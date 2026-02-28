# 📘 Guía de Uso - Cigua Inversiones ERP

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js**: v22.10.0 o superior
- **PostgreSQL**: Versión 16 local en `localhost:5432`
- **Credenciales BD**:
  - Usuario: `postgres`
  - Contraseña: `eli112910`
  - Base de datos: `cigua_inv`

---

## 📋 Tabla de Contenidos
1. [Iniciando la Aplicación](#iniciando-la-aplicación)
2. [Login y Autenticación](#login-y-autenticación)
3. [Módulos Disponibles](#módulos-disponibles)
4. [Guía de Operaciones](#guía-de-operaciones)
5. [Endpoints API](#endpoints-api)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Iniciando la Aplicación

### Paso 1: Instalar Dependencias
```bash
cd d:\proyectos\app\ciguaInv
pnpm install
```

### Paso 2: Configurar Base de Datos
```bash
# Ejecutar migraciones y seed (crear datos iniciales)
pnpm -F @cigua-inv/backend exec prisma migrate reset --force
```

**Datos de usuario creado por el seed:**
- 📧 Email: `admin@cigua.com`
- 🔐 Contraseña: `admin123456`

### Paso 3: Iniciar Servidores (en terminales separadas)

**Terminal 1 - Backend (Puerto 3000):**
```bash
cd d:\proyectos\app\ciguaInv
pnpm -F @cigua-inv/backend dev
```
✅ Espera: `Server listening at http://0.0.0.0:3000`

**Terminal 2 - Frontend (Puerto 5173):**
```bash
cd d:\proyectos\app\ciguaInv
pnpm -F @cigua-inv/web dev
```
✅ Espera: `http://localhost:5173`

### Paso 4: Acceder a la Aplicación
Abre tu navegador en: **http://localhost:5173**

---

## 🔐 Login y Autenticación

### Iniciar Sesión
1. Accede a la página de login
2. Ingresa las credenciales:
   - **Email**: `admin@cigua.com`
   - **Contraseña**: `admin123456`
3. Haz clic en **"Iniciar Sesión"**
4. Serás redirigido al dashboard

### ¿Qué Sucede al Loguear?
- Se genera un **JWT Token** (validez: 15 minutos)
- Se genera un **Refresh Token** (validez: 7 días)
- Los tokens se almacenan en el navegador
- Se establece una **sesión de usuario** en la BD

### Cerrar Sesión
- En el menú de usuario (esquina superior derecha)
- Haz clic en **"Cerrar Sesión"**
- Los tokens se limpian automáticamente

---

## 📦 Módulos Disponibles

La aplicación incluye **9 módulos completos** con 51+ endpoints:

### 1. 🏢 **Empresas** (Companies)
**Descripción**: Gestión centralizada de empresas dentro del sistema.

**Operaciones**:
- ✏️ Crear nueva empresa
- 👁️ Ver detalles de empresa
- 🔄 Editar información
- ❌ Eliminar empresa
- 📊 Listar todas (con paginación)

**Campos**: Nombre, Descripción, Email, Teléfono, Website, Dirección, Ciudad, País, Estado Activo

---

### 2. 👥 **Usuarios** (Users)
**Descripción**: Gestión de cuentas de usuario y perfiles.

**Operaciones**:
- ✏️ Crear usuario
- 👁️ Ver perfil
- 🔄 Editar información
- ❌ Eliminar usuario
- 📊 Listar usuarios con filtros

**Campos**: Email, Nombre, Apellido, Empresa, Contraseña (encriptada), Estado

**Nota**: Las contraseñas se hashean con bcrypt, nunca se guardan en texto plano.

---

### 3. 🎯 **Roles** (Roles)
**Descripción**: Definición de roles y asignación de permisos.

**Operaciones**:
- ✏️ Crear nuevo rol
- 👁️ Ver permisos asignados
- 🔄 Editar rol
- ❌ Eliminar rol
- 📋 Ver permisos disponibles
- 📊 Listar roles

**Ejemplos de Roles**: Admin, Manager, Supervisor, Viewer

---

### 4. 🔑 **Permisos** (Permissions)
**Descripción**: Control granular de acceso a funciones.

**Operaciones**:
- ✏️ Crear permiso
- 👁️ Ver detalles
- 🔄 Editar permiso
- ❌ Eliminar permiso
- 📁 Agrupar por categorías
- 📊 Listar permisos

**Categorías de Permisos**:
- 🏢 **companies**: Crear, leer, actualizar, eliminar empresas
- 👥 **users**: Gestionar usuarios
- 🎯 **roles**: Gestionar roles
- 📊 **audit**: Ver registros de auditoría

---

### 5. 🔌 **Conexiones ERP** (ERP Connections)
**Descripción**: Integración con sistemas ERP externos (SAP, Oracle, Navision, etc.).

**Operaciones**:
- ✏️ Crear conexión a ERP
- 👁️ Probar conexión
- 🔄 Editar credenciales
- ❌ Eliminar conexión
- 📊 Listar todas

**Tipos Soportados**: SAP, Oracle, Navision, NetSuite, Otros

**Información Requerida**:
- Tipo ERP
- Host/Servidor
- Puerto
- Base de datos
- Usuario/Contraseña

---

### 6. ⚙️ **Configuración de Mapeo** (Config Mapping)
**Descripción**: Mapeo de campos entre sistemas CRM/ERP.

**Operaciones**:
- ✏️ Crear mapeo
- 👁️ Ver configuración
- 🔄 Editar mapeo
- 📊 Listar mapeos

**Uso**: Sincronizar campos entre sistemas distintos.

---

### 7. 📝 **Sesiones** (Sessions)
**Descripción**: Gestión de sesiones activas de usuarios.

**Operaciones**:
- 👁️ Ver sesiones activas
- 📊 Listar todas (con estado)
- 🔚 Cerrar sesión específica
- 🔚 Cerrar todas las sesiones
- 📈 Ver estadísticas
- 🧹 Limpiar sesiones inactivas

**Información**: Usuario, IP, User Agent, Última actividad, Estado

---

### 8. 📋 **Registros de Auditoría** (Audit Logs)
**Descripción**: Historial completo de todas las acciones del sistema.

**Operaciones**:
- 👁️ Ver registro
- 📊 Listar todos (con filtros)
- 📈 Ver estadísticas
- 🧹 Limpiar registros antiguos

**Información Registrada**:
- Acción realizada (CREATE, UPDATE, DELETE)
- Usuario que la hizo
- Recurso afectado
- Cambios antes/después
- Fecha y hora
- IP y User Agent

---

### 9. 🔐 **Autenticación** (Auth)
**Descripción**: Login, logout y gestión de tokens JWT.

**Operaciones**:
- 🔓 Login con email/contraseña
- 🔐 Generar tokens JWT
- 🔄 Renovar token de acceso
- 🚪 Logout

---

## 📋 Guía de Operaciones

### Crear una Nueva Empresa

1. **Navega a Empresas** en el menú
2. Haz clic en **"+ Nueva Empresa"**
3. Completa el formulario:
   ```
   Nombre*: Ejemplo S.A.
   Descripción: Empresa dedicada a inversiones
   Email*: contacto@ejemplo.com
   Teléfono: +1-234-567-8900
   Website: https://www.ejemplo.com
   Dirección: Calle Principal 123
   Ciudad: Santo Domingo
   País: República Dominicana
   ```
4. Haz clic en **"Guardar"**
5. Verás confirmación: ✅ "Empresa creada exitosamente"

### Crear un Nuevo Usuario

1. **Navega a Usuarios**
2. Haz clic en **"+ Nuevo Usuario"**
3. Completa:
   ```
   Email*: usuario@empresa.com
   Nombre*: Juan
   Apellido*: Pérez
   Empresa*: Cigua Inversiones
   Contraseña*: MiContraseña123
   ```
4. **Guardar**
5. El usuario ahora puede login con estas credenciales

### Asignar Roles a un Usuario

1. **Navega a Usuarios**
2. Selecciona el usuario
3. En la sección "Roles":
   - Haz clic en **"Agregar Rol"**
   - Selecciona **"Admin"** o el rol deseado
   - Confirma

### Ver Auditoría de Cambios

1. **Navega a Registros de Auditoría**
2. Verás todos los cambios del sistema ordenados por fecha (más recientes primero)
3. **Filtrar por**:
   - Acción (CREATE, UPDATE, DELETE)
   - Tipo de recurso (Company, User, Role, etc.)
   - Usuario
   - Rango de fechas
4. Haz clic en un registro para ver **cambios detallados**

### Gestionar Sesiones Activas

1. **Navega a Sesiones**
2. Verás:
   - Todas las sesiones activas de todos los usuarios
   - IP de origen
   - Dispositivo (User Agent)
   - Última actividad
3. **Acciones**:
   - 🔚 Cerrar sesión específica
   - 🔚 Cerrar todas las sesiones de un usuario
   - 🧹 Limpiar sesiones inactivas (>1 hora)

---

## 🔗 Endpoints API

### Base URL
```
http://localhost:3000
```

### Autenticación
Todos los endpoints requieren:
```
Authorization: Bearer {accessToken}
```

### Ejemplos de Uso

#### 1. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cigua.com",
    "password": "admin123456"
  }'
```

**Respuesta**:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@cigua.com",
    "name": "Admin System",
    "companyId": "uuid"
  }
}
```

#### 2. Listar Empresas
```bash
curl -X GET "http://localhost:3000/companies?skip=0&take=10" \
  -H "Authorization: Bearer {token}"
```

**Respuesta**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Cigua Inversiones",
      "email": "contact@cigua.com",
      "isActive": true,
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

#### 3. Crear Usuario
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@cigua.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "password": "SecurePassword123"
  }'
```

#### 4. Ver Auditoría
```bash
curl -X GET "http://localhost:3000/audit-logs?skip=0&take=20&action=CREATE" \
  -H "Authorization: Bearer {token}"
```

#### 5. Sesiones Activas
```bash
curl -X GET "http://localhost:3000/sessions?isActive=true" \
  -H "Authorization: Bearer {token}"
```

---

## ⚙️ Configuración Avanzada

### Variables de Entorno (.env)

```dotenv
# Base de Datos
DATABASE_URL="postgresql://postgres:eli112910@localhost:5432/cigua_inv"

# JWT - Cambiar en producción!
JWT_SECRET="your-secret-key-here"
JWT_ACCESS_EXPIRY=900           # 15 minutos (segundos)
JWT_REFRESH_EXPIRY=604800       # 7 días (segundos)

# Servidor
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# ERP MSSQL (Opcional)
ERP_MSSQL_HOST=10.0.11.49
ERP_MSSQL_PORT=1433
ERP_MSSQL_USER=sa
ERP_MSSQL_PASSWORD=eli112190
```

### Cambiar Puerto del Frontend
Edita `apps/web/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5174  // Cambiar aquí
  }
});
```

---

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"
```
Solución:
1. Verifica que PostgreSQL esté corriendo
2. Comprueba credenciales en .env
3. Verifica puerto (5432 por defecto)
4. Reinicia el servidor backend
```

### Error: "Invalid token"
```
Solución:
1. Vuelve a loguear
2. Verifica que el token no haya expirado (15 min)
3. Limpia el localStorage del navegador
4. Intenta en incógnito si problemas persisten
```

### Error 500 en Endpoints
```
Solución:
1. Verifica los logs del backend
2. Confirma que el usuario está autenticado
3. Valida los parámetros enviados
4. Reinicia ambos servidores
```

### Las Sesiones no se Cargan
```
Solución:
1. Verifica en DevTools > Network que se envía Authorization header
2. Comprueba que el token es válido
3. Mira los logs del backend para errores
4. Intenta logout y login nuevamente
```

### Cambios en BD no se Reflejan
```
Solución:
1. Presiona F5 para refrescar la página
2. Limpia caché: Ctrl+Shift+Del
3. Abre en pestaña incógnita
4. Revisa que no haya error en API (F12 > Network)
```

---

## 📊 Estadísticas del Sistema

### Base de Datos
- **Motor**: PostgreSQL 16
- **Tablas**: 9 (companies, users, roles, permissions, sessions, audit_logs, etc.)
- **Relaciones**: Roles ↔ Permissions, Users ↔ Roles, Sessions ↔ Users

### API REST
- **Total Endpoints**: 51+
- **Métodos**: GET, POST, PUT, PATCH, DELETE
- **Autenticación**: JWT (Bearer Token)
- **Validación**: Zod schemas

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite 5.4.21
- **State Management**: Zustand (auth), TanStack Query (server state)
- **Styling**: Tailwind CSS

### Backend
- **Framework**: Fastify 4.29.1
- **ORM**: Prisma 5.22.0
- **Database**: PostgreSQL 16
- **Runtime**: Node.js + tsx (TypeScript executor)

---

## 🎓 Tips y Mejores Prácticas

1. **Seguridad**:
   - Cambia JWT_SECRET en producción
   - Usa HTTPS en producción
   - Implementa rate limiting
   - Valida todas las entradas

2. **Performance**:
   - Usa filtros de búsqueda para datasets grandes
   - Limpia sesiones inactivas regularmente
   - Archiva logs de auditoría antiguos

3. **Mantenimiento**:
   - Revisa auditoría regularmente
   - Monitorea sesiones activas
   - Backup de BD periódicamente
   - Actualiza dependencias mensualmente

4. **Operacional**:
   - Documenta cambios en módulos ERP
   - Capacita usuarios en nuevas empresas/roles
   - Establece políticas de contraseñas
   - Revisa permisos periódicamente

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs: `apps/backend/logs/` (si aplica)
2. Consulta la BD directamente con PgAdmin
3. Revisa auditoría de cambios
4. Verifica Network tab en DevTools

---

## 🎉 ¡Listo!

Ya tienes una aplicación ERP completa funcionando. Explora los módulos, crea datos de prueba y familiarízate con la interfaz.

**¡Bienvenido a Cigua Inversiones!** 🚀

