# Campos de la Tabla InventoryCount_Item

## Resumen
Tabla que almacena los artículos individuales dentro de un conteo de inventario físico. Cada registro representa un SKU que fue contado en una ubicación específica durante un conteo.

---

## Campos por Categoría

### 🔑 Identificadores Principales

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **id** | String (CUID) | Identificador único del registro | `cmlym28aa0003wt2yj8lt631x` |
| **countId** | String (FK) | Referencia al conteo de inventario padre | `inv-2024-01-001` |
| **locationId** | String (FK) | Referencia a la ubicación/almacén | `loc-warehouse-01` |

---

### 📦 Datos del Artículo (desde ERP)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **itemCode** | String | Código SKU del artículo (identificador principal) | `ITEM-001` |
| **itemName** | String | Descripción/nombre del artículo | `Laptop Dell XPS 13` |
| **barCodeInv** | String (opcional) | Código de barra para inventario (lectura QR en almacén) | `8450000123456` |
| **barCodeVt** | String (opcional) | Código de barra de venta (etiqueta de venta) | `8450000123456` |

---

### 🏷️ Clasificación del Artículo

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **category** | String (opcional) | Categoría del producto | `Electrónica` |
| **brand** | String (opcional) | Marca del fabricante | `Dell` |
| **subcategory** | String (opcional) | Subcategoría más específica | `Laptops` |

---

### 📏 Unidad de Medida

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **packQty** | Decimal | Cantidad de unidades por empaque | `1` o `12` |
| **uom** | String | Unidad de medida | `PZ` (Pieza), `CAJ` (Caja), `KG`, `LT` |
| **baseUom** | String | Unidad base para conversión (default PZ) | `PZ` |

---

### 📊 Cantidades y Versiones

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **systemQty** | Decimal | Cantidad que reporta el ERP (no cambia durante el conteo) | `100` |
| **countedQty** | Decimal (opcional) | Cantidad físicamente contada en almacén | `98` |
| **version** | Int | Número de versión del conteo (para re-conteos) | `1`, `2`, `3` |

---

### ✅ Estado y Auditoría

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **status** | String | Estado del artículo en el conteo | `PENDING`, `APPROVED`, `VARIANCE` |
| **countedBy** | String (opcional) | Usuario que realizó el conteo | `juan.perez@cigua.com` |
| **countedAt** | DateTime | Fecha/hora del conteo (default = ahora) | `2026-02-23T23:22:00Z` |
| **notes** | String (opcional) | Notas/observaciones del conteo | `Producto dañado`, `Falta etiqueta` |

---

### 💰 Precios (para Auditoría de Valor)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **costPrice** | Decimal (opcional) | Precio de costo unitario | `45.50` |
| **salePrice** | Decimal (opcional) | Precio de venta unitario (referencia) | `89.99` |

---

### 📅 Auditoría de Sistema

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **createdAt** | DateTime | Fecha de creación del registro | `2026-02-23T10:00:00Z` |
| **updatedAt** | DateTime | Fecha de última actualización | `2026-02-23T23:30:00Z` |

---

## Relaciones

### Relations (Prisma ORM)

| Relación | Tipo | Descripción |
|----------|------|-------------|
| **count** | InventoryCount | Referencia al conteo padre (onDelete: Cascade) |
| **location** | Warehouse_Location | Referencia a la ubicación del almacén (onDelete: Cascade) |
| **variance_reports** | VarianceReport[] | Reportes de varianza asociados (1:Many) |

---

## Constraints e Índices

### Constraints Únicos
```
@@unique([countId, locationId, version])
```
- Un artículo solo puede aparecer **una vez** por conteo, ubicación y versión
- Previene duplicados en re-conteos

### Índices de Rendimiento
```
@@index([countId])      // Búsquedas rápidas por conteo
@@index([locationId])   // Búsquedas rápidas por ubicación
```

---

## Ejemplos de Uso

### Ejemplo 1: Artículo Simple
```json
{
  "id": "abc123",
  "countId": "conteo-2026-02-001",
  "locationId": "warehouse-01",
  "itemCode": "ITEM-001",
  "itemName": "Monitor LG 24 pulgadas",
  "barCodeInv": "8450000000001",
  "barCodeVt": "8450000000001",
  "category": "Electrónica",
  "brand": "LG",
  "subcategory": "Monitores",
  "packQty": 1,
  "uom": "PZ",
  "baseUom": "PZ",
  "systemQty": 50,
  "countedQty": 50,
  "version": 1,
  "status": "APPROVED",
  "costPrice": 120.00,
  "salePrice": 199.99,
  "countedBy": "juan@cigua.com",
  "countedAt": "2026-02-23T10:30:00Z",
  "notes": null,
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:30:00Z"
}
```

### Ejemplo 2: Artículo con Varianza
```json
{
  "id": "def456",
  "countId": "conteo-2026-02-001",
  "locationId": "warehouse-01",
  "itemCode": "ITEM-002",
  "itemName": "Cable USB-C 2m",
  "barCodeInv": "8450000000002",
  "barCodeVt": "8450000000002",
  "category": "Accesorios",
  "brand": "Belkin",
  "subcategory": "Cables",
  "packQty": 10,
  "uom": "CAJ",
  "baseUom": "PZ",
  "systemQty": 100,
  "countedQty": 95,
  "version": 1,
  "status": "VARIANCE",
  "costPrice": 5.50,
  "salePrice": 12.99,
  "countedBy": "maria@cigua.com",
  "countedAt": "2026-02-23T11:45:00Z",
  "notes": "Falta 1 caja de 10 unidades en estante superior",
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T11:45:00Z"
}
```

---

## Estados Posibles

### Status
- **PENDING** - Artículo aún no ha sido contado
- **APPROVED** - Conteo completado, cantidad coincide con sistema
- **VARIANCE** - Conteo completado, hay diferencia vs sistema

---

## Casos de Uso Principales

### 1️⃣ Crear Conteo Mensual
- Se cargan artículos desde ERP automáticamente
- `systemQty` trae la cantidad del sistema
- Se espera conteo físico → `countedQty`

### 2️⃣ Lectura QR Mobile
- Móvil lee `barCodeInv` con escáner QR
- Busca el artículo por `itemCode`
- Registra `countedQty` ingresada por usuario

### 3️⃣ Re-conteos
- Si hay varianza, se incrementa `version`
- Se crea nuevo registro con mismo (countId, locationId, version++)
- Permite auditoría histórica de re-conteos

### 4️⃣ Reportes de Varianza
- Se crean registros en `VarianceReport` cuando `countedQty ≠ systemQty`
- Se usa `costPrice * varianza` para calcular impacto financiero

---

## Campos Mapeables desde ERP (Catelli)

Cuando configuras un mapping ITEMS, mapea estos campos:

| Campo BD | Campo ERP (Ejemplo Catelli) |
|----------|---------------------------|
| itemCode | ARTCODE |
| itemName | DESC_ART |
| barCodeInv | CODIGO_BARRA_INV |
| barCodeVt | CODIGO_BARRA_VT |
| category | CATEGORIA |
| brand | MARCA |
| subcategory | SUBCATEGORIA |
| packQty | CANT_EMPAQUE |
| uom | UNIDAD_MEDIDA |
| costPrice | PRECIO_COSTO |
| salePrice | PRECIO_VENTA |

