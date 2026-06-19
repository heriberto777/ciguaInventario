# Manual de Funciones — Cigua Inventory

Este documento explica todas las funciones del sistema, cómo configurarlas y qué hace cada una.

---

## 1. Tipos de Mapping ERP — Guía de configuración

Los mappings son la traducción entre las tablas de tu ERP (SQL Server) y los campos del sistema de inventario. Sin mappings correctos, el sistema no puede importar artículos ni reservar facturas.

### Cómo crear un mapping

1. Ir a **Admin → Mapeos de Datos**
2. Clic en **✨ Nuevo Mapping**
3. Seleccionar el tipo de mapping (ver tabla abajo)
4. Seguir los 4 pasos del wizard

---

### Tipo 1: ITEMS — Carga de Artículos

**Para qué sirve:** Importar el catálogo de artículos desde el ERP para iniciar un conteo físico. Este es el mapping principal.

**Cuándo se usa:** Al hacer clic en "Preparar / Cargar desde ERP" dentro de un conteo.

**Estructura de tablas típica (Catelli):**
```
Tabla principal: catelli.ARTICULO       (alias: a)
  JOIN LEFT: catelli.EXISTENCIA_BODEGA  (alias: eb)   ON a.articulo = eb.articulo
  JOIN LEFT: catelli.ARTICULO_PRECIO    (alias: ap)   ON a.articulo = ap.articulo
```

**Campo Mapping requerido:**

| Campo Local | Columna ERP (ejemplo) | Obligatorio | Descripción |
|---|---|---|---|
| `itemCode` | `a.ARTICULO` | ✅ | Código del artículo |
| `itemName` | `a.DESCRIPCION` | ✅ | Descripción/nombre |
| `systemQty` | `eb.CANT_DISPONIBLE` | ✅ | Stock teórico actual |
| `uom` | `a.UNIDAD_ALMACEN` | Recomendado | Unidad de medida |
| `costPrice` | `a.COSTO_ULT_LOC` | Recomendado | Costo unitario (para valorizar varianzas) |
| `salePrice` | `ap.PRECIO` | Opcional | Precio de venta |
| `brand` | `a.CLASIFICACION_3` | Recomendado | Código de marca (para filtros) |
| `category` | `a.CLASIFICACION_1` | Recomendado | Código de categoría (para filtros) |
| `subcategory` | `a.CLASIFICACION_2` | Opcional | Subcategoría |
| `itemProv` | `a.ARTICULO_PROV` | **Muy importante** | Código del proveedor/ERP. Resuelve mismatch de códigos |
| `barCodeInv` | `a.CODIGO_BARRAS_INVT` | Opcional | Código de barras inventario |

**Filtros estáticos típicos (Paso 2 del wizard):**
```
a.TIPO = 'M'           (solo artículos tipo producto)
a.ACTIVO = 'S'         (solo artículos activos)
```

**Nota sobre `itemProv`:** Si en tu ERP el artículo con código interno `100` tiene un código de proveedor `2898`, mapea esa columna a `itemProv`. Esto permite que el sistema identifique que `100 = 2898` cuando hay facturas que usan el código del proveedor.

---

### Tipo 2: DESTINATION — Exportación al ERP

**Para qué sirve:** Enviar los resultados del conteo físico al ERP. Define qué tabla del ERP recibe los datos y cómo se mapean las columnas.

**Cuándo se usa:** Al hacer clic en "Enviar al ERP" después de finalizar un conteo.

**Estructura típica:**
```
Tabla principal: catelli.BOLETA_INVENTARIO  (alias: b)
```
*(Solo la tabla de destino, sin JOINs)*

**Campo Mapping (es al revés — local → ERP):**

| Campo Local | Columna ERP destino | Obligatorio | Descripción |
|---|---|---|---|
| `itemCode` | columna_articulo | ✅ | Código del artículo |
| `countedQty` | columna_cantidad | ✅ | Cantidad contada físicamente |
| `warehouseCode` | columna_bodega | Recomendado | Código del almacén |
| `uom` | columna_unidad | Opcional | Unidad de medida |
| `lot` | columna_lote | Opcional | Lote del artículo |

**Campos especiales AUTO_GENERATE:**
- `CONSECUTIVE` → genera número de boleta automático (ej: B0000001)
- `NOW` → fecha y hora actual
- `USER` → email del usuario que ejecutó el sync

**Nota:** El campo `filters.mainTable` define la tabla destino donde se hace el INSERT.

---

### Tipo 3: PENDING_INVOICES — Reserva de Facturas (IN_AISLE)

**Para qué sirve:** Cuando el operador escribe un número de factura manualmente en la pantalla de conteo, el sistema va al ERP, busca esa factura y registra sus artículos como "en pasillo" (mercancía que el ERP ya descontó pero sigue físicamente en el almacén).

**Cuándo se usa:** En la pestaña "Despachos/Reservas" → campo "Número de Factura".

**Estructura de tablas (Catelli):**
```
Tabla principal: catelli.FACTURA_LINEA  (alias: fl)
  JOIN LEFT: catelli.FACTURA            (alias: f)   ON fl.factura = f.factura
  JOIN LEFT: catelli.ARTICULO           (alias: a)   ON fl.articulo = a.articulo
```

**Por qué `FACTURA_LINEA` como principal:** Cada registro = un ítem de factura. Así el SELECT devuelve una fila por artículo.

**Campo Mapping:**

| Campo Local | Columna ERP | Obligatorio | Por qué |
|---|---|---|---|
| `invoiceNumber` | `fl.FACTURA` | ✅ **CRÍTICO** | El sistema filtra `WHERE fl.FACTURA = 'FV0902015'`. Sin este mapeo no sabe qué columna comparar |
| `itemCode` | `fl.ARTICULO` | ✅ | Código del artículo |
| `systemQty` | `fl.CANTIDAD` | ✅ | Cantidad facturada = cantidad a reservar |
| `itemName` | `a.DESCRIPCION` | Recomendado | Descripción |
| `clientName` | `f.NOMBRE_CLIENTE` | Recomendado | Nombre del cliente |
| `uom` | `a.UNIDAD_ALMACEN` | Opcional | Unidad de medida |
| `itemProv` | `a.ARTICULO_PROV` | Importante | Para matching código interno↔ERP |

**Filtros estáticos (Paso 2):**
```
f.TIPO_DOCUMENTO = 'f'
f.ANULADA = 'N'
```

**Cómo funciona internamente:** El sistema agrega automáticamente `AND fl.FACTURA = '[número digitado]'` al WHERE. El campo `invoiceNumber` le indica qué columna ERP contiene el número de factura.

---

### Tipo 4: PICKING_LIST — Picking List/Separados (SEPARATED)

**Para qué sirve:** El operador selecciona un rango de fechas y opcionalmente un vendedor. El sistema extrae del ERP todas las órdenes de despacho de ese período y registra los artículos como "separados" (mercancía que ya salió del estante pero aún no fue facturada en el ERP).

**Cuándo se usa:** En la pestaña "Despachos/Reservas" → sección "Picking List".

**Estructura de tablas (Catelli):**
```
Tabla principal: catelli.FACTURA         (alias: f)
  JOIN LEFT: catelli.FACTURA_LINEA       (alias: fl)  ON f.factura = fl.factura
  JOIN LEFT: catelli.ARTICULO            (alias: a)   ON fl.articulo = a.articulo
```

**Por qué `FACTURA` como principal:** El filtro de fecha y vendedor son campos de la cabecera de factura.

**Campo Mapping:**

| Campo Local | Columna ERP | Obligatorio | Por qué |
|---|---|---|---|
| `itemCode` | `fl.ARTICULO` | ✅ | Código del artículo para consolidar |
| `systemQty` | `fl.CANTIDAD` | ✅ | Cantidad a reservar |
| `invoiceNumber` | `f.FACTURA` | Importante | Para mostrar facturas en la vista previa |
| `clientName` | `f.NOMBRE_CLIENTE` | Importante | Para identificar el cliente |
| `itemName` | `a.DESCRIPCION` | Recomendado | Descripción |
| `uom` | `a.UNIDAD_ALMACEN` | Opcional | Unidad de medida |
| `itemProv` | `a.ARTICULO_PROV` | Importante | Para matching código interno↔ERP |

**Filtros estáticos (Paso 2):**
```
f.TIPO_DOCUMENTO = 'f'
f.ANULADA = 'N'
```

**NO mapear:** `f.FECHA` ni `f.VENDEDOR` como campos locales — el sistema los agrega dinámicamente según el rango de fechas y vendedor que el operador ingresa.

**Nota sobre la vista previa:** El sistema auto-detecta las columnas de factura/cliente/artículo por nombre (FACTURA, NOMBRE_CLIENTE, ARTICULO, CANTIDAD) incluso si no están en el field mapping. Sin embargo, es recomendable mapearlas para mayor precisión.

---

### Resumen visual de mappings

```
ITEMS          → Importa artículos al conteo
DESTINATION    → Exporta resultados al ERP
PENDING_INVOICES → Reserva facturas manuales (IN_AISLE: mercancía en pasillo)
PICKING_LIST   → Reserva picking list por fechas (SEPARATED: mercancía separada)
```

---

## 2. Flujo completo de un Conteo Físico

### Paso a paso

```
1. CREAR CONTEO
   → Seleccionar almacén
   → Sistema crea conteo en estado DRAFT

2. PREPARAR (cargar desde ERP)
   → Seleccionar mapping tipo ITEMS
   → Seleccionar ubicación (opcional)
   → Sistema importa artículos con stock teórico del ERP
   → Conteo pasa a estado DRAFT (con ítems)

3. INICIAR
   → Conteo pasa a ACTIVE
   → Auditor puede empezar a registrar cantidades físicas

4. CONTAR (mientras está ACTIVE)
   → Auditor ingresa cantidades físicamente contadas
   → Sistema calcula varianza en tiempo real
   → El auditor puede:
     a) Reservar facturas (IN_AISLE o SEPARATED) — ver sección 3
     b) Pausar → ON_HOLD → Reanudar → ACTIVE
     c) Refrescar stock teórico desde ERP

5. COMPLETAR (Submit)
   → Conteo pasa a SUBMITTED
   → Sistema calcula varianzas finales con fórmula:
     Stock Esperado = ERP - SEPARATED + IN_AISLE
     Diferencia = Contado - Stock Esperado
   → Supervisor recibe para revisión

6. FINALIZAR
   → Conteo pasa a COMPLETED
   → Supervisor aprueba varianzas

7. CERRAR / ENVIAR AL ERP
   → Conteo pasa a CLOSED
   → Opcionalmente: enviar ajustes al ERP via mapping DESTINATION
```

### Estados del conteo

```
DRAFT → ACTIVE → ON_HOLD ↔ ACTIVE
                     ↓
                 SUBMITTED → COMPLETED → FINALIZED → CLOSED
                                                    ↗
                 CANCELLED (desde cualquier estado, excepto CLOSED)
```

---

## 3. Sistema de Reservas (Facturas no despachadas)

### ¿Por qué reservar facturas?

Durante un conteo físico, puede haber artículos que ya fueron facturados al cliente (el ERP los descontó del stock teórico) pero todavía están físicamente en el almacén porque el cliente no los retiró. Sin reservar estas facturas, el sistema marcaría esos artículos como "sobrantes" incorrectamente.

También puede haber artículos que ya fueron separados para despacho (el ERP aún los tiene en stock) pero ya no están en el estante. Sin reservarlos, el sistema los marcaría como "faltantes" incorrectamente.

### Tipos de reserva

| Tipo | Nombre | Situación | Efecto en fórmula |
|---|---|---|---|
| `IN_AISLE` | Pasillo | ERP ya lo descontó, pero está físicamente en el estante | **Suma** al stock esperado |
| `SEPARATED` | Separado | ERP aún lo tiene, pero ya no está en el estante (en zona de staging) | **Resta** del stock esperado |

### Fórmula unificada

```
Stock Esperado = ERP_Stock - SEPARATED + IN_AISLE
Varianza       = Contado - Stock Esperado
```

**Ejemplo:**
- ERP stock: 100 unidades
- SEPARATED: 5 (en zona de staging, ERP aún los cuenta)
- IN_AISLE: 3 (en pasillo, ERP ya los descontó)
- El auditor cuenta: 90 unidades
- Stock esperado: 100 - 5 + 3 = 98
- Varianza real: 90 - 98 = **-8** (merma real sin explicación logística)

### Matching por código alterno (itemProv) — Bridge de sub-artículos

En muchos ERPs un mismo producto físico puede tener dos códigos diferentes:
- **Código principal** (el que aparece en el conteo, ej: `2999`)
- **Sub-artículo o código de proveedor** (el que aparece en facturas, ej: `2429`)

Ambos comparten el **mismo `itemProv`** (código del proveedor, ej: `GT01731A`).

**El sistema resuelve este caso automáticamente** usando el campo `itemProv` como puente:

```
Conteo:    itemCode='2999'  itemProv='GT01731A'
Factura:   itemCode='2429'  itemProv='GT01731A'  ← mismo itemProv
                                    ↑
                           El sistema conecta ambos por aquí
```

**Cómo funciona internamente:**

El sistema construye el mapa de reservas indexando por **dos claves**:
```
mapa = {
  '2429'     → qty reservada,   ← por itemCode del ítem de la factura
  'GT01731A' → qty reservada    ← por itemProv del ítem de la factura (nuevo)
}
```

Al buscar para el ítem del conteo `2999` (con `itemProv='GT01731A'`):
1. Busca `mapa['2999']` → no encontrado
2. Busca `mapa['GT01731A']` → **encontrado** ✓ → aplica la reserva

**Esto aplica en 6 puntos del sistema:**
- Columna Reserva visible en pantalla del auditor
- Varianza calculada al completar el conteo
- Stock ajustado que ve el auditor mientras cuenta
- Reportes de varianzas
- Resumen financiero del reporte
- Cantidad enviada al ERP en el sync

**Requisitos para que funcione:**

1. El mapping **ITEMS** debe tener `itemProv` mapeado a la columna del ERP con el código de proveedor (ej: `a.ARTICULO_DEL_PROV`)
2. El mapping **PENDING_INVOICES** también debe tener `itemProv` mapeado a la misma columna
3. El mapping **PICKING_LIST** igualmente

Si `itemProv` no está mapeado en las reservas, el campo queda `null` en la DB y el bridge no existe.

---

## 4. Roles y Permisos

### Roles predefinidos

| Rol | Descripción | Permisos clave |
|---|---|---|
| SuperAdmin | Control total | Todos los 61 permisos |
| Admin | Administrador de empresa | Todo excepto `companies:manage` y `settings:manage` |
| Operator | Operador de conteo | `inv_counts:view`, `inv_counts:execute`, `warehouses:view`, `ai:chat` |

### Permisos de visibilidad (Blind Count)

| Permiso | Sin el permiso | Con el permiso |
|---|---|---|
| `inventory:view_qty` | Oculta stock teórico (blind count) | Ve stock teórico |
| `inventory:view_costs` | Oculta costos unitarios | Ve costos |
| `inventory:view_variances` | Oculta varianzas en tiempo real | Ve varianzas |

---

## 5. Clasificaciones de Artículos

Las clasificaciones permiten filtrar artículos durante el conteo y en los reportes.

### Tipos de grupos

| groupNumber | groupType | Descripción |
|---|---|---|
| 1 | BRAND | Marcas comerciales |
| 2 | CATEGORY | Categorías de producto |
| 3 | SUBCATEGORY | Subcategorías |
| 4 | OTHER | Otras clasificaciones |

### Cómo cargar clasificaciones

**Opción A — Sincronizar desde artículos ERP:**
Admin → Clasificaciones → "🔄 Sinc. desde Items" → extrae clasificaciones únicas de los artículos ya cargados.

**Opción B — Importar Excel:**
Admin → Clasificaciones → "📥 Cargar Excel" → el Excel debe tener columnas: `CLASIFICACION`, `DESCRIPCION`, `AGRUPACION` (número del grupo).

**Opción C — Crear manualmente:**
Admin → Clasificaciones → Nueva clasificación.

---

## 6. Conexión ERP

### Configurar conexión MSSQL

Admin → Conexiones ERP → Nueva Conexión:
- **Tipo:** MSSQL
- **Host:** IP del servidor SQL Server (ej: `10.0.11.49`)
- **Puerto:** `1433` (por defecto)
- **Base de datos:** nombre exacto (ej: `EXACTUS`)
- **Usuario/Contraseña:** credenciales SQL Server

Usar **"Probar Conexión"** antes de guardar.

---

## 7. Reportes

### Reporte de Inventario Físico

Ruta: **Reportes → Inventario**

Muestra un reporte agrupado por marca con todas las varianzas, aplicando la fórmula de reservas. Permite exportar a:
- **Excel:** Hoja de resumen + hoja de detalle por marca
- **PDF:** Tabla agrupada por marca con varianzas y costos

### Reporte de Varianzas

Ruta: **Varianzas**

Lista los ítems con diferencia entre contado y stock esperado. Filtros por: conteo, marca, categoría, estado (PENDING, APPROVED, REJECTED).

### Cross Count Report

Ruta: **Inventario → Comparar**

Compara resultados de múltiples conteos para detectar tendencias de varianza.

---

## 8. Comandos Docker del día a día

```bash
# Ver estado
docker compose ps

# Logs en tiempo real
docker logs cigua_backend -f
docker logs cigua_web -f

# Rebuild tras cambios en código backend
docker compose up -d --build backend

# Rebuild tras cambios en código frontend
docker compose up -d --build web

# Rebuild ambos
docker compose up -d --build

# Detener todo
docker compose down

# Ejecutar seed (crear datos iniciales)
docker exec cigua_backend sh -c "cd /app && node_modules/.bin/tsx apps/backend/prisma/seed.ts"

# Crear migración manualmente (si el schema cambia sin archivo de migración)
# 1. Crear carpeta: apps/backend/prisma/migrations/YYYYMMDDHHMMSS_nombre/
# 2. Crear migration.sql con el ALTER TABLE
# 3. Rebuild el backend → la migración se aplica automáticamente al arrancar
```

---

## 9. Variables de entorno importantes (.env.docker)

| Variable | Valor correcto | Nota |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres123@clinic_postgres:5432/cigua_inv` | Host = nombre del contenedor |
| `JWT_ACCESS_EXPIRY` | `15m` | String con unidad. `900` (sin unidad) = 900ms, no segundos |
| `JWT_REFRESH_EXPIRY` | `7d` | Idem |
| `JWT_SECRET` | string de 32+ chars | Mismo valor en todos los entornos del mismo deployment |
| `NODE_ENV` | `production` | En Docker siempre production |
| `FRONTEND_URL` | `http://localhost:8285` | Para CORS. En producción poner el dominio real |

---

## 10. Deploy a producción (servidor PM2, sin Docker)

La producción corre el backend compilado directamente con PM2. El flujo de deploy es:

### Estructura del servidor de producción

```
/home/heriberto777/proyectos/ciguainv/
├── dist/                  ← backend compilado (lo que se sube)
├── prisma/                ← schema + migraciones
│   └── migrations/
├── node_modules/
├── package.json
├── pm2-production.config.cjs
└── .env                   ← variables de entorno
```

### Pasos para subir cambios de código (sin cambios de DB)

```bash
# 1. En la máquina de desarrollo — compilar el backend
pnpm -F @cigua-inv/backend build

# 2. Subir solo el dist/ al servidor (ajusta usuario/IP/ruta)
rsync -avz apps/backend/dist/ usuario@IP:/home/heriberto777/proyectos/ciguainv/dist/

# 3. En el servidor — reiniciar PM2
ssh usuario@IP
pm2 restart ciguainv   # o: pm2 restart all

# 4. Verificar que arrancó bien
pm2 logs --lines 20
```

### Pasos para subir cambios que incluyen migración de DB

```bash
# 1. Compilar
pnpm -F @cigua-inv/backend build

# 2. Subir dist/ Y el nuevo archivo de migración
rsync -avz apps/backend/dist/ usuario@IP:/home/heriberto777/proyectos/ciguainv/dist/
rsync -avz apps/backend/prisma/migrations/ usuario@IP:/home/heriberto777/proyectos/ciguainv/prisma/migrations/

# 3. En el servidor — aplicar migración PRIMERO
ssh usuario@IP
cd /home/heriberto777/proyectos/ciguainv
./node_modules/.bin/prisma migrate deploy

# 4. Reiniciar PM2
pm2 restart ciguainv
```

### Resolver migración fallida en producción (error P3009)

Si `prisma migrate deploy` falla con P3009 porque una migración quedó marcada como fallida:

```bash
# Si la columna/cambio YA existe en la DB (fue aplicado manualmente):
./node_modules/.bin/prisma migrate resolve --applied "NOMBRE_DE_LA_MIGRACION"

# Si el cambio NO existe en la DB (hay que aplicarlo y volver a intentar):
# 1. Aplicar el SQL manualmente
psql -U postgres -d cigua_inv -c "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..."
# 2. Marcar como aplicada
./node_modules/.bin/prisma migrate resolve --applied "NOMBRE_DE_LA_MIGRACION"

# Verificar que quedó limpio:
./node_modules/.bin/prisma migrate deploy
# Debe decir: "No pending migrations to apply."
```

### NUNCA usar en producción

```bash
prisma migrate dev   # ← solo desarrollo. Crea shadow DB, puede fallar en producción
prisma db push       # ← peligroso en producción, puede alterar el schema sin registro
```

---

*Manual actualizado el 2026-06-19.*
