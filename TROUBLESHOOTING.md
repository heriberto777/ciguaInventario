# 🔧 TROUBLESHOOTING - Cigua Inventory

## Setup Issues

### ❌ "No matching version found for @fastify/jwt"

**Problema:** `ERR_PNPM_NO_MATCHING_VERSION No matching version found for @fastify/jwt@^7.8.0`

**Solución:**
```bash
# Limpiar node_modules y reinstalar
rm -r node_modules pnpm-lock.yaml
pnpm install

# O solo limpiar backend
cd apps/backend
rm -r node_modules
cd ../..
pnpm install
```

**Causa:** Las versiones en package.json no son compatibles. Se han actualizado a:
- `@fastify/jwt`: ^7.8.1
- `@fastify/cors`: ^9.0.1
- `fastify-plugin`: ^4.5.1

---

### ❌ "'docker-compose' is not recognized"

**Problema:** `'docker-compose' is not recognized as an internal or external command`

**Soluciones:**

**Option 1: Instalar Docker Desktop (recomendado)**
- Descargar: https://www.docker.com/products/docker-desktop
- Instalar y reiniciar Windows
- El script lo detectará automáticamente

**Option 2: Usar docker compose (v2+)**
```bash
docker compose up -d  # Note: sin guión
```

**Option 3: Saltarse Docker y usar PostgreSQL local**
```bash
# Instalar PostgreSQL local
# Actualizar .env con:
DATABASE_URL="postgresql://user:password@localhost:5432/cigua_inventory"

# Crear DB manualmente:
# 1. Abrir pgAdmin o psql
# 2. CREATE DATABASE cigua_inventory;
# 3. Correr migraciones
pnpm -F @cigua-inv/backend prisma:migrate
```

---

### ❌ "'prisma' is not recognized"

**Problema:** `'prisma' is not recognized as an internal or external command`

**Solución:**
```bash
# Generar Prisma client
pnpm -F @cigua-inv/backend prisma:generate

# Luego migrations
pnpm -F @cigua-inv/backend prisma:migrate
```

**Causa:** Los node_modules no están instalados. El script lo intenta automáticamente.

---

### ❌ "'tsx' is not recognized"

**Problema:** `'tsx' is not recognized as an internal or external command`

**Solución:**
```bash
# Reinstalar dependencias del backend
cd apps/backend
pnpm install
cd ../..

# Luego intentar seed
pnpm -F @cigua-inv/backend seed
```

---

### ❌ "WARN Local package.json exists, but node_modules missing"

**Problema:** Este warning aparece durante install

**Solución:**
```bash
# Limpiar e reinstalar todo
pnpm clean    # Si está disponible
rm -r node_modules
pnpm install --force
```

---

## Database Issues

### ❌ "connect ECONNREFUSED - PostgreSQL not running"

**Problema:** La base de datos no está disponible

**Soluciones:**

**Si usas Docker:**
```bash
# Iniciar contenedor
docker-compose up -d

# Verificar que está running
docker ps

# Ver logs
docker-compose logs postgres

# Detener si hay conflicto de puerto
docker-compose down
docker-compose up -d
```

**Si usas PostgreSQL local:**
```bash
# Windows - verificar servicio
sc query postgresql-x64-16  # o tu versión

# Iniciar PostgreSQL
net start postgresql-x64-16

# O usar pgAdmin GUI
```

---

### ❌ "Migrations already applied" after restart

**Problema:** Las migraciones se intenta ejecutar dos veces

**Solución:**
```bash
# Esto es normal. Prisma solo aplica una vez.
# Si hay error real:
pnpm -F @cigua-inv/backend prisma:migrate reset
# ⚠️ Esto borra TODOS los datos
```

---

## Development Issues

### ❌ Port already in use (3000 o 5173)

**Problema:** `EADDRINUSE: address already in use :::3000`

**Solución:**

**Encontrar qué está usando el puerto:**
```bash
# Windows - Port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**O cambiar ports:**
```bash
# Backend .env
PORT=3001

# Web vite.config.ts
export default defineConfig({
  server: {
    port: 5174,
  },
})
```

---

### ❌ Login doesn't work - "Invalid credentials"

**Problema:** No puedes hacer login

**Verificar:**
1. ¿La BD está creada?
   ```bash
   pnpm -F @cigua-inv/backend prisma:studio
   # Debería abrirse en http://localhost:5555
   # Ver si hay datos en tablas
   ```

2. ¿El backend está corriendo?
   ```bash
   pnpm -F @cigua-inv/backend dev
   # Debe mostrar "Server running at..."
   ```

3. ¿El seed fue exitoso?
   ```bash
   pnpm -F @cigua-inv/backend seed
   ```

**Default credentials después del seed:**
```
Email: user@company.com
Password: Password123!
```

---

### ❌ Frontend cannot connect to backend

**Problema:** Error en network requests

**Verificar:**
1. Backend corriendo: `pnpm -F @cigua-inv/backend dev`
2. Proxy en vite.config.ts correcto:
   ```typescript
   proxy: {
     '/api': {
       target: 'http://localhost:3000',
       changeOrigin: true,
     }
   }
   ```
3. CORS headers en app.ts:
   ```typescript
   await app.register(cors, {
     origin: '*', // en dev
     credentials: true,
   });
   ```

---

### ❌ TypeScript compilation errors

**Problema:** `Type 'X' has no property 'Y'`

**Solución:**
```bash
# Regenerar Prisma client
pnpm -F @cigua-inv/backend prisma:generate

# Regenerar tipos en monorepo
pnpm type-check

# Build fresh
pnpm build
```

---

## Performance Issues

### 🐌 Slow initial install

**Normal para 1ª vez (~5-10 minutos)**

```bash
# Monitorear progreso
pnpm install --verbose

# O mostrar stats después
pnpm install && pnpm ls --depth=0
```

---

### 🐌 Slow Prisma Studio

**Solución:**
```bash
# Studio a veces falla con muchas queries
pnpm -F @cigua-inv/backend prisma:studio

# Si cuelga:
# 1. CTRL+C para detener
# 2. Limpiar cache
cd apps/backend
rm -rf node_modules/.prisma
pnpm install
```

---

## Cleaning & Reset

### 🧹 Full Clean Restart

```bash
# 1. Detener servicios
docker-compose down
pnpm kill  # si existe

# 2. Limpiar archivos
rm -r node_modules pnpm-lock.yaml
rm -r apps/*/node_modules
rm -r packages/*/node_modules
rm .env

# 3. Reinstalar todo
pnpm install

# 4. Recrear DB
cp .env.example .env
docker-compose up -d
pnpm -F @cigua-inv/backend prisma:migrate reset
pnpm -F @cigua-inv/backend seed

# 5. Iniciar
pnpm dev
```

### 🗑️ Reset Database Only

```bash
# Borra todos los datos pero mantiene schema
pnpm -F @cigua-inv/backend prisma:migrate reset

# Reseed datos default
pnpm -F @cigua-inv/backend seed
```

---

## Getting Help

Si persisten los problemas:

1. **Verifica logs:**
   ```bash
   # Backend logs
   pnpm -F @cigua-inv/backend dev 2>&1 | tee backend.log

   # Database logs
   docker-compose logs postgres
   ```

2. **Check .env:**
   ```bash
   cat .env
   # Debe tener DATABASE_URL, JWT_SECRET, etc.
   ```

3. **Verify file structure:**
   ```bash
   # Ver que todos los archivos están
   ls -la apps/backend/src/
   ls -la apps/web/src/
   ls -la packages/shared/src/
   ```

4. **Reinstall from scratch:**
   - Sigue "Full Clean Restart" arriba
   - Si aún falla, reporta el error exacto

---

**Last Updated:** Feb 20, 2026
**Node.js Version:** 20+
**pnpm Version:** 9.0+
**Docker:** Optional (PostgreSQL local alternative)
