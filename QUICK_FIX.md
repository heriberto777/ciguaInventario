# ⚡ QUICK FIX - Setup Errors

## Si viste errores con "pnpm install":

### Paso 1: Limpiar e Reinstalar
```bash
cd d:\proyectos\app\ciguaInv

# Limpiar
rmdir /s /q node_modules 2>nul
del pnpm-lock.yaml 2>nul

# Reinstalar
pnpm install
```

**Esto puede tomar 5-10 minutos en la primera vez**

---

### Paso 2: Setup Manual de Dependencias del Backend
```bash
# Generar Prisma client
pnpm -F @cigua-inv/backend prisma:generate

# Verificar que Prisma está listo
cd apps/backend
dir node_modules\.prisma
cd ..\..
```

---

### Paso 3: Verificar Docker
```bash
# Ver si Docker Desktop está corriendo
docker --version
docker ps

# Si NO está instalado:
# - Descargar: https://www.docker.com/products/docker-desktop
# - Instalar y reiniciar Windows
# - Verificar: docker ps
```

---

### Paso 4: PostgreSQL - Opción A (Con Docker)
```bash
# Iniciar PostgreSQL en contenedor
docker-compose up -d

# Verificar que está corriendo
docker ps
# Deberías ver "postgres" en la lista

# Esperar 5 segundos
timeout /t 5
```

### Paso 4 Alternativa: PostgreSQL - Opción B (Local)
```bash
# Si NO tienes Docker instalado, instala PostgreSQL local:
# https://www.postgresql.org/download/windows/

# Luego actualiza .env:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/cigua_inventory"

# Crea la DB:
# Abre pgAdmin o Command Line Client de PostgreSQL
# CREATE DATABASE cigua_inventory;
```

---

### Paso 5: Migraciones
```bash
# Aplicar schema a la BD
pnpm -F @cigua-inv/backend prisma:migrate

# Si pide nombre de migración, escribe: "init"
# Luego presiona Enter
```

---

### Paso 6: ¡Listo! Inicia desarrollo
```bash
# En una terminal:
pnpm -F @cigua-inv/backend dev

# En otra terminal:
pnpm -F @cigua-inv/web dev

# Abre navegador:
# http://localhost:5173
# Login: user@company.com / Password123!
```

---

## Si aún hay problemas:

### ✓ Opción: Solución Nuclear (Todo desde cero)
```bash
# 1. CIERRA TODOS los VS Code, terminal, etc.
# 2. En Windows PowerShell AS ADMIN:

cd D:\proyectos\app\ciguaInv

# Limpiar TODO
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps\backend\node_modules
Remove-Item -Recurse -Force apps\web\node_modules
Remove-Item -Recurse -Force packages\shared\node_modules
Remove-Item -Force pnpm-lock.yaml

# Reinstalar desde cero
pnpm install

# Generar Prisma
pnpm -F @cigua-inv/backend prisma:generate

# Detener cualquier Docker previo
docker-compose down

# Iniciar BD fresca
docker-compose up -d

# Esperar 5 seg
Start-Sleep -Seconds 5

# Migraciones
pnpm -F @cigua-inv/backend prisma:migrate

# LISTO
pnpm dev
```

---

## Verificaciones Rápidas

Antes de pedir ayuda, verifica:

```bash
# 1. ¿Node instalado?
node -v
# Debe mostrar: v20.10.0 o superior

# 2. ¿pnpm instalado?
pnpm -v
# Debe mostrar: 9.0.0 o superior

# 3. ¿Docker corriendo? (si lo usas)
docker ps
# Debe mostrar containers sin error

# 4. ¿Base de datos creada?
# Backend debe estar corriendo sin "connection refused"
pnpm -F @cigua-inv/backend dev

# 5. ¿Frontend encuentra el backend?
# Abre http://localhost:5173
# Si ves página de login = ✅ OK
```

---

## Si TODO falla:

1. **Copia este comando exactamente:**
   ```
   node -v && pnpm -v && docker -v
   ```
   Pegalo en PowerShell y muestra los resultados.

2. **Copia el último error completo**
   ```
   pnpm install 2>&1 > error.log
   cat error.log
   ```

3. **Incluye esto en tu reporte:**
   - Tu versión Node (node -v)
   - Tu versión pnpm (pnpm -v)
   - ¿Tienes Docker instalado?
   - El error COMPLETO que ves
   - La línea de comando que ejecutaste

---

## Comandos Útiles

```bash
# Ver todas las dependencias instaladas
pnpm ls --depth=0

# Ver solo problemas
pnpm ls --depth=0 | grep ERR

# Limpiar cache de pnpm
pnpm store prune

# Ver qué está usando un puerto
netstat -ano | findstr :3000

# Matar proceso en puerto 3000
taskkill /PID <número> /F

# Ver logs de Docker
docker-compose logs -f postgres

# Detener DB sin perder datos
docker-compose stop

# Detener DB Y BORRAR DATOS
docker-compose down

# Reiniciar BD (limpia datos)
pnpm -F @cigua-inv/backend prisma:migrate reset
```

---

**Última actualización:** 20 Feb 2026
**Versión más reciente de Fastify JWT:** 7.8.1
