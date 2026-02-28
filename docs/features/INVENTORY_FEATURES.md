# 📦 Módulos de Inventario Físico - Documentación Completa

## 🎯 Descripción General

Se han implementado **4 módulos completos** para gestionar el conteo de inventario físico, varianzas y ajustes:

1. **Warehouses** - Gestión de almacenes y ubicaciones
2. **Inventory Counts** - Conteo de inventario físico
3. **Variance Reports** - Análisis de discrepancias
4. **Adjustments** - Correcciones de inventario

---

## 1️⃣ MÓDULO: WAREHOUSES (Almacenes)

### Modelos de Base de Datos

```sql
-- Almacenes
Warehouse {
  id: String (PK)
  companyId: String (FK)
  code: String (UNIQUE per company)
  name: String
  address: String?
  city: String?
  manager: String?
  isActive: Boolean
}

-- Ubicaciones dentro del almacén
Warehouse_Location {
  id: String (PK)
  warehouseId: String (FK)
  code: String (UNIQUE per warehouse) -- Ej: A-01-01
  description: String?
  capacity: Int?
  isActive: Boolean
}
```

### Endpoints

#### Almacenes
```
POST   /api/warehouses              → Crear almacén
GET    /api/warehouses              → Listar almacenes (paginated)
GET    /api/warehouses/:id          → Obtener almacén
PATCH  /api/warehouses/:id          → Actualizar almacén
DELETE /api/warehouses/:id          → Eliminar almacén
```

#### Ubicaciones
```
POST   /api/warehouses/:warehouseId/locations     → Crear ubicación
GET    /api/warehouses/:warehouseId/locations     → Listar ubicaciones
GET    /api/locations/:id                         → Obtener ubicación
PATCH  /api/locations/:id                         → Actualizar ubicación
DELETE /api/locations/:id                         → Eliminar ubicación
```

### Request/Response Examples

**Crear Almacén**
```bash
curl -X POST http://localhost:3000/api/warehouses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ALM-001",
    "name": "Almacén Principal",
    "address": "Calle 123",
    "city": "Madrid",
    "manager": "Juan Pérez"
  }'
```

**Crear Ubicación**
```bash
curl -X POST http://localhost:3000/api/warehouses/warehouse-id/locations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "A-01-01",
    "description": "Pasillo A, Estante 1, Nivel 1",
    "capacity": 100
  }'
```

---

## 2️⃣ MÓDULO: INVENTORY COUNTS (Conteos de Inventario)

### Modelos de Base de Datos

```sql
InventoryCount {
  id: String (PK)
  companyId: String (FK)
  warehouseId: String (FK)

  code: String (UNIQUE per company) -- INV-2026-02-001
  description: String?

  status: ENUM [DRAFT, IN_PROGRESS, COMPLETED, APPROVED, REJECTED]

  startedBy: String?
  startedAt: DateTime

  completedBy: String?
  completedAt: DateTime?

  approvedBy: String?
  approvedAt: DateTime?
}

InventoryCount_Item {
  id: String (PK)
  countId: String (FK)
  locationId: String (FK)

  itemCode: String         -- SKU del producto
  itemName: String?        -- Nombre del producto
  uom: String             -- PZ, KG, LT, M, etc

  systemQty: Decimal      -- Cantidad en ERP
  countedQty: Decimal     -- Cantidad física

  notes: String?
  countedBy: String?
  countedAt: DateTime
}
```

### Estados del Conteo

```
DRAFT         → Conteo creado, sin ítems
↓
IN_PROGRESS   → Conteo en curso, agregando ítems
↓
COMPLETED     → Conteo finalizado
↓
APPROVED      → Conteo revisado y aprobado
↓
REJECTED      → Conteo rechazado
```

### Endpoints

```
POST   /api/inventory-counts                  → Iniciar conteo
GET    /api/inventory-counts                  → Listar conteos
GET    /api/inventory-counts/:id              → Obtener conteo
PATCH  /api/inventory-counts/:id/complete     → Completar conteo

POST   /api/inventory-counts/:countId/items   → Agregar artículo
PATCH  /api/inventory-count-items/:itemId     → Actualizar artículo
DELETE /api/inventory-count-items/:itemId     → Eliminar artículo
```

### Workflow Completo

**1. Iniciar Conteo**
```bash
curl -X POST http://localhost:3000/api/inventory-counts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "warehouse-123",
    "description": "Conteo mensual febrero 2026"
  }'
```
Respuesta: `{ id: "count-123", code: "INV-2026-02-001", status: "DRAFT" }`

**2. Agregar Artículos**
```bash
curl -X POST http://localhost:3000/api/inventory-counts/count-123/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "loc-001",
    "itemCode": "SKU-12345",
    "itemName": "Producto A",
    "uom": "PZ",
    "systemQty": 100,
    "countedQty": 98,
    "notes": "Faltaban 2 unidades"
  }'
```

El sistema **automáticamente**:
- Calcula la varianza: `98 - 100 = -2`
- Calcula porcentaje: `(-2/100) * 100 = -2%`
- Crea un reporte de varianza en estado PENDING
- Cambia el conteo a IN_PROGRESS

**3. Completar Conteo**
```bash
curl -X PATCH http://localhost:3000/api/inventory-counts/count-123/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "user-123"
  }'
```

---

## 3️⃣ MÓDULO: VARIANCE REPORTS (Reportes de Varianzas)

### Modelos de Base de Datos

```sql
VarianceReport {
  id: String (PK)
  companyId: String (FK)
  countId: String (FK)
  countItemId: String (UNIQUE, FK)

  itemCode: String
  itemName: String?

  systemQty: Decimal       -- Cantidad en sistema
  countedQty: Decimal      -- Cantidad contada
  difference: Decimal      -- countedQty - systemQty
  variancePercent: Decimal -- (difference / systemQty) * 100

  status: ENUM [PENDING, APPROVED, REJECTED, ADJUSTED]
  reason: String?          -- Motivo de rechazo
  resolution: String?      -- Resolución aplicada

  approvedBy: String?
  approvedAt: DateTime?
}
```

### Endpoints

```
GET    /api/variance-reports                    → Listar varianzas (con filtros)
GET    /api/variance-reports/:id                → Obtener varianza
GET    /api/variance-reports/summary             → Resumen de varianzas
GET    /api/variance-reports/high-variance      → Artículos con mayor varianza
GET    /api/inventory-counts/:countId/variances → Varianzas de un conteo

PATCH  /api/variance-reports/:id/approve        → Aprobar varianza
PATCH  /api/variance-reports/:id/reject         → Rechazar varianza
```

### Ejemplos

**Obtener Resumen de Varianzas**
```bash
curl -X GET "http://localhost:3000/api/variance-reports/summary?countId=count-123" \
  -H "Authorization: Bearer <token>"
```

Respuesta:
```json
{
  "totalVariances": 15,
  "approvedVariances": 8,
  "rejectedVariances": 2,
  "pendingVariances": 5,
  "totalDifference": 25,
  "avgVariancePercent": 3.5
}
```

**Aprobar Varianza**
```bash
curl -X PATCH http://localhost:3000/api/variance-reports/var-456/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "Verificado y ajustado en sistema",
    "approvedBy": "user-789"
  }'
```

**Obtener Artículos con Mayor Varianza**
```bash
curl -X GET "http://localhost:3000/api/variance-reports/high-variance?threshold=10" \
  -H "Authorization: Bearer <token>"
```

Retorna top 20 artículos con varianza ≥ 10%

---

## 4️⃣ MÓDULO: ADJUSTMENTS (Ajustes de Inventario)

### Modelos de Base de Datos

```sql
InventoryAdjustment {
  id: String (PK)
  companyId: String (FK)
  warehouseId: String (FK)

  code: String (UNIQUE per company) -- ADJ-2026-02-001
  description: String?

  type: ENUM [
    VARIANCE_CORRECTION,  -- Corrección por varianza
    PHYSICAL_LOSS,        -- Pérdida física
    GAIN,                 -- Ganancia inesperada
    TRANSFER              -- Transferencia entre almacenes
  ]

  items: Json[]           -- Array de ajustes
  // { itemCode, quantity, reason }

  status: ENUM [PENDING, APPROVED, REJECTED]

  createdBy: String?
  createdAt: DateTime

  approvedBy: String?
  approvedAt: DateTime?
}
```

### Endpoints

```
POST   /api/adjustments                    → Crear ajuste
GET    /api/adjustments                    → Listar ajustes
GET    /api/adjustments/:id                → Obtener ajuste
PATCH  /api/adjustments/:id/approve        → Aprobar ajuste
PATCH  /api/adjustments/:id/reject         → Rechazar ajuste
DELETE /api/adjustments/:id                → Eliminar ajuste
```

### Ejemplos

**Crear Ajuste de Corrección de Varianza**
```bash
curl -X POST http://localhost:3000/api/adjustments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "warehouse-123",
    "type": "VARIANCE_CORRECTION",
    "description": "Corrección por conteo de febrero",
    "items": [
      {
        "itemCode": "SKU-12345",
        "quantity": 2,
        "reason": "Diferencia encontrada en conteo"
      },
      {
        "itemCode": "SKU-67890",
        "quantity": -5,
        "reason": "Pérdida física"
      }
    ]
  }'
```

**Aprobar Ajuste**
```bash
curl -X PATCH http://localhost:3000/api/adjustments/adj-123/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "supervisor-123"
  }'
```

---

## 📊 COMPONENTES FRONTEND

### Páginas Creadas

#### 1. **InventoryCountPage** (`/pages/InventoryCountPage.tsx`)
- Interfaz para iniciar conteos
- Selección de almacén
- Formulario para agregar artículos
- Tabla con resumen en tiempo real
- Cálculo automático de varianzas

#### 2. **VarianceReportsPage** (`/pages/VarianceReportsPage.tsx`)
- Visualización de varianzas por conteo
- Filtros por estado (PENDING, APPROVED, REJECTED)
- Dashboard con KPIs
- Botones para aprobar/rechazar varianzas
- Tabla interactiva

#### 3. **WarehousesPage** (`/pages/WarehousesPage.tsx`)
- CRUD completo de almacenes
- Gestión de ubicaciones
- Grid card view

#### 4. **InventoryDashboardPage** (`/pages/InventoryDashboardPage.tsx`)
- Dashboard principal
- KPIs: Conteos totales, Varianzas detectadas, Aprobadas, Pendientes
- Tabla de conteos recientes
- Top varianzas

### Componentes Reutilizables

```
/components/inventory/
├── Button.tsx              → Botón con variantes (primary, secondary, danger, success)
├── Input.tsx               → Input con label y validación
├── InventoryCountItemForm.tsx  → Formulario para agregar artículos
├── InventoryCountSummary.tsx   → Tabla resumen de conteo
├── VarianceTable.tsx       → Tabla de varianzas con acciones
└── index.ts                → Barrel export
```

---

## 🔄 FLUJO COMPLETO DE CONTEO

### Paso 1: Preparación
```
1. Encargado crea almacén (ALM-001)
2. Encargado crea ubicaciones (A-01-01, A-01-02, etc)
3. Sistema sincroniza cantidades del ERP
```

### Paso 2: Conteo Físico
```
1. Usuario inicia conteo: POST /inventory-counts
   ↓ Status: DRAFT
2. Usuario agrega artículos: POST /inventory-counts/{id}/items
   ↓ Status cambia a: IN_PROGRESS
   ↓ Sistema calcula varianzas automáticamente
3. Por cada artículo con diferencia, se crea VarianceReport
```

### Paso 3: Revisión de Varianzas
```
1. Supervisor ve varianzas: GET /variance-reports?countId=...
2. Aprueba varianzas válidas: PATCH /variance-reports/{id}/approve
3. Rechaza varianzas con error: PATCH /variance-reports/{id}/reject
```

### Paso 4: Ajuste y Cierre
```
1. Sistema identifica ajustes necesarios
2. Supervisor crea ajuste: POST /adjustments
3. Supervisor aprueba ajuste: PATCH /adjustments/{id}/approve
4. Conteo se marca como COMPLETED y APPROVED
```

---

## 🔐 Validaciones y Reglas de Negocio

### Conteos
- ✅ No puede completarse un conteo sin artículos
- ✅ No puede modificarse un conteo COMPLETED
- ✅ No puede eliminarse un conteo COMPLETED
- ✅ Código auto-generado: `INV-{YEAR}-{MONTH}-{SEQUENCE}`

### Varianzas
- ✅ Se crean automáticamente cuando hay diferencia
- ✅ No pueden aprobarse si ya están en otro estado
- ✅ Requieren resolución para aprobación
- ✅ Se calcula porcentaje automáticamente

### Ajustes
- ✅ Requieren al menos un artículo
- ✅ No pueden aprobarse si están APPROVED
- ✅ Código auto-generado: `ADJ-{YEAR}-{MONTH}-{SEQUENCE}`

---

## 📡 Filtros y Paginación

### Conteos
```
GET /api/inventory-counts?page=1&pageSize=20&warehouseId=...&status=COMPLETED
```

### Varianzas
```
GET /api/variance-reports?page=1&pageSize=20&countId=...&status=PENDING&minVariance=5&maxVariance=50
```

### Ajustes
```
GET /api/adjustments?page=1&pageSize=20&warehouseId=...&status=PENDING
```

---

## 🗂️ Estructura de Archivos

```
apps/backend/src/modules/
├── warehouses/
│   ├── schema.ts           (Zod schemas)
│   ├── repository.ts       (Prisma queries)
│   ├── service.ts          (Business logic)
│   ├── controller.ts       (Request handlers)
│   └── routes.ts           (Fastify routes)
├── inventory-counts/
│   ├── schema.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── controller.ts
│   └── routes.ts
├── variance-reports/
│   ├── schema.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── controller.ts
│   └── routes.ts
└── adjustments/
    ├── schema.ts
    ├── repository.ts
    ├── service.ts
    ├── controller.ts
    └── routes.ts

apps/web/src/
├── pages/
│   ├── InventoryCountPage.tsx
│   ├── VarianceReportsPage.tsx
│   ├── WarehousesPage.tsx
│   └── InventoryDashboardPage.tsx
└── components/
    └── inventory/
        ├── Button.tsx
        ├── Input.tsx
        ├── InventoryCountItemForm.tsx
        ├── InventoryCountSummary.tsx
        ├── VarianceTable.tsx
        └── index.ts
```

---

## ⚙️ Configuración Requerida

### Migraciones de Base de Datos
```bash
cd apps/backend
npx prisma migrate dev --name add_inventory_modules
```

### Variables de Entorno
No requiere configuración adicional, usa las existentes.

---

## 🚀 Próximos Pasos

1. ✅ **Implementado**: Módulos básicos de inventario
2. ⏳ **Pendiente**: Soporte para escaneo de códigos QR/Barcode
3. ⏳ **Pendiente**: Sincronización automática con ERP
4. ⏳ **Pendiente**: Reportes PDF/Excel
5. ⏳ **Pendiente**: Notificaciones en tiempo real (WebSockets)
6. ⏳ **Pendiente**: App móvil para captura de datos

---

## 📞 Soporte

Para más información, consulta:
- Schema: `apps/backend/prisma/schema.prisma`
- Tests: Próximamente
- API Docs: `/docs` endpoint en backend
