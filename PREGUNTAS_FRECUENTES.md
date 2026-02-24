# 🆘 FAQ y Solución de Problemas - Cigua Inversiones ERP

## 📌 Problemas Comunes y Soluciones

---

## 🔴 Backend

### ❌ Error: "Port 3000 already in use"

**Síntomas**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Soluciones**:

**Opción 1**: Matar el proceso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

**Opción 2**: Cambiar puerto
```bash
# En .env
PORT=3001

# Luego reinicia el servidor
pnpm -F @cigua-inv/backend dev
```

---

### ❌ Error: "Cannot connect to database"

**Síntomas**:
```
Error: getaddrinfo ENOTFOUND localhost
Database error: connection refused
```

**Soluciones**:

**1. Verifica que PostgreSQL esté corriendo**:
```bash
# Windows - Services
# Ctrl+R > services.msc > busca "postgresql"

# Linux
sudo systemctl status postgresql

# Mac
brew services list
```

**2. Verifica credenciales en .env**:
```bash
# .env debe tener:
DATABASE_URL="postgresql://postgres:eli112910@localhost:5432/cigua_inv"
```

**3. Intenta conectar manualmente**:
```bash
psql -U postgres -d cigua_inv -h localhost -p 5432
```

---

### ❌ Error: "relation \"company\" does not exist"

**Síntomas**:
```
error: relation "Company" does not exist
Prisma error: Table not found
```

**Soluciones**:

```bash
# Ejecuta migraciones
pnpm -F @cigua-inv/backend exec prisma db push

# O reset completo (BORRA DATOS)
pnpm -F @cigua-inv/backend exec prisma migrate reset --force
```

---

### ❌ Error: "JWT secret not found"

**Síntomas**:
```
Error: JWT_SECRET not configured
Invalid token signature
```

**Soluciones**:

```bash
# Verifica .env
cat .env | grep JWT_SECRET

# Si está vacío:
# 1. Abre .env
# 2. Agrega: JWT_SECRET="tu-secret-aleatorio"
# 3. Reinicia backend
```

---

### ❌ Error 401 "Unauthorized" en endpoints

**Síntomas**:
```
401 Unauthorized
message: "Missing or invalid token"
```

**Soluciones**:

**1. Verifica que envíes el token**:
```bash
# ✅ Correcto
Authorization: Bearer eyJhbGci...

# ❌ Incorrecto - sin token
# ❌ Incorrecto - formato mal
```

**2. Verifica que el token sea válido** (expira en 15 min):
```bash
# Si expiró, vuelve a loguear con POST /auth/login
```

---

## 🔴 Frontend

### ❌ Error: "Port 5173 already in use"

**Síntomas**:
```
Error: Port 5173 is already in use
```

**Soluciones**:

```bash
# Opción 1: Matar proceso
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Opción 2: Usar puerto diferente
pnpm -F @cigua-inv/web dev -- --port 5174
```

---

### ❌ Error: "Cannot find module '@/...'"

**Síntomas**:
```
Module not found: Can't resolve '@/pages'
```

**Soluciones**:

```bash
# Reinicia el servidor Vite
Ctrl+C
pnpm -F @cigua-inv/web dev
```

---

### ❌ Error: "useQuery error - Bad argument type"

**Síntomas**:
```
Uncaught Error: Bad argument type. Starting with v5...
```

**Soluciones**:

Usa sintaxis v5 de React Query:

**Incorrecto**:
```typescript
const { data } = useQuery('users', async () => {...});
```

**Correcto**:
```typescript
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {...},
});
```

---

### ❌ Error: "Cannot read property 'accessToken' of undefined"

**Síntomas**:
```
TypeError: Cannot read property 'accessToken' of undefined
useAuthStore not working
```

**Soluciones**:

```typescript
// ✅ Correcto
const { accessToken } = useAuthStore();

// ❌ Incorrecto
const { accessToken } = useAuthStore;  // Falta ()
```

---

### ❌ Error 401 en API calls

**Síntomas**:
```
GET /api/companies 401 Unauthorized
```

**Soluciones**:

Verifica que el interceptor axios agregue el token:
- Abre F12 > Network tab
- Haz un request
- Revisa que tenga header `Authorization: Bearer ...`

---

### ❌ Página no carga datos

**Síntomas**:
```
Página abierta pero sin datos
isLoading siempre true
```

**Soluciones**:

1. **F12 > Console**: Busca errores rojos
2. **F12 > Network**: Revisa respuesta del API (debe ser 200 y JSON válido)
3. **Verifica URL**: Debe estar completa `/companies?skip=0&take=10`
4. **Recarga página**: F5
5. **Limpia caché**: Ctrl+Shift+Del

---

## 🟡 Problemas de Sincronización

### ❌ Datos no se reflejan después de crear

**Síntomas**:
```
Creo una empresa pero no aparece
```

**Soluciones**:

Recarga la página:
```bash
F5  # Recarga manual
```

---

### ❌ Login fallido

**Síntomas**:
```
Credenciales correctas pero error 401
```

**Soluciones**:

Las credenciales por defecto son:
- Email: `admin@cigua.com`
- Contraseña: `admin123456`

Si no funcionan, reset la BD:
```bash
pnpm -F @cigua-inv/backend exec prisma migrate reset --force
```

---

## 🧹 Limpiar y Empezar de Cero

```bash
# 1. Cierra todos los servidores (Ctrl+C en ambas terminales)

# 2. Limpia caché y dependencias
rm -rf node_modules pnpm-lock.yaml

# 3. Reinstala
pnpm install

# 4. Reset completo de BD
pnpm -F @cigua-inv/backend exec prisma migrate reset --force

# 5. Inicia backends (dos terminales)
# Terminal 1
pnpm -F @cigua-inv/backend dev

# Terminal 2
pnpm -F @cigua-inv/web dev

# 6. Abre http://localhost:5173
```

---

## 📊 Checklist de Debug

- [ ] PostgreSQL está corriendo
- [ ] Backend inicia sin errores (puerto 3000)
- [ ] Frontend inicia sin errores (puerto 5173)
- [ ] Login funciona (admin@cigua.com / admin123456)
- [ ] F12 Console no tiene errores rojos
- [ ] F12 Network muestra requests 200
- [ ] Authorization header está en requests
- [ ] Datos se cargan en las páginas

---

## 🆘 ¿Aún no funciona?

**Pasos finales**:

1. Abre F12 (DevTools)
2. Copia el error exacto
3. Revisa terminal del backend para logs
4. Verifica que PostgreSQL esté corriendo
5. Prueba limpiar y empezar de cero (ver arriba)

Si nada funciona: **reinicia tu computadora** 🔄

