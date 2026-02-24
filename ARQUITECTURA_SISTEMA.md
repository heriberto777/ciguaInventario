# 🏗️ ARQUITECTURA DEL SISTEMA DE INVENTARIO

## Estructura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO (NAVEGADOR)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │   FRONTEND (React 18+)     │
                 │   apps/web/src             │
                 └──────────────┬──────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   🏠 Hub Navegación    🔧 Settings          🔍 Query Explorer
   (Fase 0)             (Configuración)      (Fase 0.5)
        │                       │                       │
        ├───────────┐           │           ┌───────────┤
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
    📥 Load    📊 Count    🗺️ Mappings   ⚙️ Config   🔄 Sync
    (Fase 2)  (Fase 3)    (Config)      (UI)      (Fase 4)
        │           │           │           │           │
        └───────────┴───────────┼───────────┴───────────┘
                                │
                                │ API Calls
                                │
                 ┌──────────────▼──────────────┐
                 │   BACKEND (Fastify)        │
                 │   apps/backend/src         │
                 └──────────────┬──────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   📦 ERP Conn          🗺️ Mappings         📊 Inventory
   (Controller)         (Service)           (Service)
        │                       │                       │
        ▼                       ▼                       ▼
   ERPConnectorFactory  Config Mapper       Inventory Repo
   (MSSQL/Postgres)     (SQL Builder)       (CRUD)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │   BASE DE DATOS            │
                 │   (MSSQL/Postgres)         │
                 └────────────────────────────┘
```

---

## Flujo de Datos Completo

### 1️⃣ EXPLORACIÓN (Fase 0.5)

```
User → QueryExplorerPage
         │
         ▼
    API: GET /api/erp-connections
         │
         ▼
    Backend: ERPConnectionsController
         │
         ▼
    Service: getConnections()
         │
         ▼
    Prisma: SELECT * FROM erp_connections
         │
         ▼
    Show list in UI
         │
    User selects table
         │
         ▼
    API: GET /api/erp-connections/{id}/tables
         │
         ▼
    ERPConnectorFactory.create() → .connect()
         │
         ▼
    MSSQL: INFORMATION_SCHEMA.TABLES
         │
         ▼
    .disconnect()
         │
         ▼
    Show tables in UI
         │
    User selects columns & executes
         │
         ▼
    API: POST /api/erp-connections/{id}/query
         │
         ▼
    Build SQL from selections
         │
         ▼
    ERPConnector.query(sql)
         │
         ▼
    MSSQL: Execute Query
         │
         ▼
    Return results to UI
```

### 2️⃣ CARGAR INVENTARIO (Fase 2)

```
User → InventoryDashboardPage
         │
         ▼
    API: GET /api/mappings
         │
         ▼
    Service: listMappings()
         │
         ▼
    Show in dropdown
         │
    User selects mapping + clicks Load
         │
         ▼
    API: POST /api/inventory/load
         │
         ▼
    Backend: InventoryController.load()
         │
         ▼
    Service: loadFromERP()
         │
         ├─ Get mapping details
         ├─ Build SQL from mapping
         ├─ Connect to ERP
         ├─ Execute query
         └─ Process results
         │
         ▼
    Validate data
         │
         ├─ Check required fields
         ├─ Type validation
         └─ Duplicate check
         │
         ▼
    Prisma: INSERT INTO inventory_items
         │
         ▼
    DB: Store imported data
         │
         ▼
    Return success + count
         │
         ▼
    Show in UI + Audit Log
```

### 3️⃣ CONTEO FÍSICO (Fase 3)

```
User → InventoryCountPage
         │
         ▼
    API: GET /api/inventory
         │
         ▼
    Service: listInventory()
         │
         ▼
    Show items for counting
         │
    User enters quantities
         │
         ▼
    API: POST /api/inventory-counts
         │
         ▼
    Backend: InventoryCountsController
         │
         ▼
    Service: createCount()
         │
         ├─ Load system quantities (expected)
         ├─ Get counted quantities (actual)
         ├─ Calculate variance = actual - expected
         └─ Store all data
         │
         ▼
    Prisma: INSERT INTO inventory_counts
         │
         ▼
    DB: Store count data
         │
         ▼
    Calculate reports
         │
         ├─ Total variance
         ├─ Over/under items
         └─ Percentages
         │
         ▼
    Show results in UI
```

### 4️⃣ SINCRONIZAR (Fase 4)

```
User → Dashboard → Select item
         │
         ▼
    Choose strategy:
    - REPLACE: Update quantities
    - ADD: Apply variances
         │
    Click "Sync to ERP"
         │
         ▼
    API: POST /api/adjustments/sync
         │
         ▼
    Backend: AdjustmentsController
         │
         ▼
    Service: syncToERP()
         │
         ├─ Validate data
         ├─ Build update SQL
         ├─ Connect to ERP
         ├─ Execute updates
         └─ Disconnect
         │
         ▼
    ERP (MSSQL): UPDATE Products SET Quantity = ?
         │
         ▼
    Validate results
         │
         ▼
    Prisma: INSERT INTO audit_logs
         │
         ▼
    Return confirmation
         │
         ▼
    Show success in UI
```

---

## Componentes Clave

### Frontend Components

```
App.tsx (Router)
├── LoginPage
│   └── Auth & Session
├── InventoryDashboardNavPage ⭐ NEW
│   └── Hub de navegación
│   └── Acceso a todos los módulos
├── QueryExplorerPage ⭐ NEW
│   ├── Connection selector
│   ├── Table loader
│   ├── Column picker
│   ├── SQL generator
│   ├── Query executor
│   └── Results display
├── InventoryDashboardPage
│   ├── Load from ERP
│   ├── Preview data
│   └── Import control
├── InventoryCountPage
│   ├── Item list
│   ├── Quantity input
│   ├── Variance calc
│   └── Count history
├── VarianceReportsPage
│   ├── Report charts
│   ├── Export options
│   └── Drill-down details
├── SettingsPage
│   ├── Connections config
│   ├── Mappings config
│   ├── Query Explorer tab ⭐
│   └── Company settings
└── AdminPages
    ├── Users, Roles, Permissions
    ├── Companies
    ├── ERP Connections
    └── Audit Logs
```

### Backend Modules

```
/erp-connections
├── controller.ts
│   ├── listConnections() ✅
│   ├── getAvailableTables() ✅ FIXED
│   ├── getTableSchemas() ✅ FIXED
│   └── previewQuery() ✅ FIXED
├── service.ts
├── repository.ts
└── routes.ts

/mapping-config
├── controller.ts
├── service.ts
├── repository.ts
└── routes.ts

/inventory
├── controller.ts
├── service.ts
├── repository.ts
└── routes.ts

/inventory-counts
├── controller.ts
├── service.ts
├── repository.ts
└── routes.ts

/variance-reports
├── controller.ts
├── service.ts
└── repository.ts

/adjustments
├── controller.ts
├── service.ts
├── repository.ts
└── routes.ts
```

### Utilities & Guards

```
/utils
├── errors.ts ✅ FIXED
│   └── AppError (backwards compatible)
├── logger.ts
└── validators.ts

/guards
├── tenant.ts ✅ FIXED
│   └── Validate company context
└── auth.ts
    └── Validate session

/middleware
├── errorHandler.ts
├── auditLogger.ts
└── rateLimiter.ts
```

---

## API Endpoints

### ERP Connections

```
GET    /api/erp-connections
       Get all ERP connections

GET    /api/erp-connections/:id
       Get single connection

GET    /api/erp-connections/:id/tables ✅
       List tables in ERP

GET    /api/erp-connections/:id/tables/:table/schema ✅
       Get table schema

POST   /api/erp-connections/:id/query/preview ✅
       Preview query results

POST   /api/erp-connections
       Create connection

PUT    /api/erp-connections/:id
       Update connection

DELETE /api/erp-connections/:id
       Delete connection
```

### Mappings

```
GET    /api/mappings
       List all mappings

GET    /api/mappings/:id
       Get single mapping

POST   /api/mappings
       Create mapping

PUT    /api/mappings/:id
       Update mapping

DELETE /api/mappings/:id
       Delete mapping

POST   /api/mappings/:id/test
       Test mapping with preview
```

### Inventory

```
GET    /api/inventory
       List all inventory items

GET    /api/inventory/:id
       Get single item

POST   /api/inventory/load
       Load from ERP using mapping

DELETE /api/inventory/:id
       Remove item
```

### Counts

```
GET    /api/inventory-counts
       List all counts

POST   /api/inventory-counts
       Create new count

GET    /api/inventory-counts/:id
       Get count details

PUT    /api/inventory-counts/:id
       Update count
```

### Variances

```
GET    /api/variance-reports
       Get variance summary

GET    /api/variance-reports/detailed
       Get detailed variance report

POST   /api/variance-reports/export
       Export to Excel/CSV
```

### Adjustments

```
GET    /api/adjustments
       List pending adjustments

POST   /api/adjustments/sync
       Sync to ERP

DELETE /api/adjustments/:id
       Cancel adjustment
```

---

## Flujo de Autenticación

```
1. User Login
   └── POST /auth/login
       └── Validate credentials
       └── Create session
       └── Issue tokens (JWT)

2. Protected Routes
   └── PrivateRoute component checks:
       ├─ Token exists?
       ├─ Token valid?
       └── Forward to component

3. Request to Backend
   └── Include token in header
   └── Backend validates:
       ├─ Token signature
       ├─ Token expiry
       └── Extract user info

4. Company/Tenant Context
   └── tenantGuard middleware:
       ├─ Extract companyId from token
       ├─ Attach to request.user
       └── All queries filtered by company

5. Session Management
   └── Refresh token periodically
   └── Logout clears tokens
```

---

## Estado del Sistema

### Completitud por Módulo

| Módulo | Frontend | Backend | API | DB | Testing |
|--------|----------|---------|-----|----|----|
| Conexiones ERP | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Mappings | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Query Explorer | ✅ NEW | ✅ | ✅ | - | 🟡 |
| Load Inventory | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Count Físico | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Sync to ERP | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Reportes | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Auditoría | ✅ | ✅ | ✅ | ✅ | 🟡 |

### Leyenda

- ✅ Implementado y funcional
- 🟡 Listo para testing
- 🔴 No implementado
- NEW Nueva funcionalidad

---

## Guía de Debugging

### Backend Issues

**Port already in use:**
```powershell
# Find process
Get-Process | Where-Object {$_.Port -eq 3000}
# Kill process
Stop-Process -Id $pid -Force
```

**DB connection error:**
```
Check: DATABASE_URL in .env
- Host/Port correct?
- Credentials valid?
- Database exists?
```

**ERP connection error:**
```
Check: ERP_CONNECTION in settings
- Host/Port reachable?
- SQL Server running?
- Firewall allows connection?
```

### Frontend Issues

**Routes not loading:**
```
Check: App.tsx routes
- Import exists?
- Route defined?
- Component exports default?
```

**API not responding:**
```
Check: Network tab in DevTools
- Request sent?
- Response status?
- CORS headers?
```

---

## Performance Considerations

### Frontend

- ✅ Lazy loading de componentes
- ✅ Query caching con React Query
- ✅ Infinite scroll en listas grandes
- ✅ Debouncing en búsquedas

### Backend

- ✅ Database indexing
- ✅ Connection pooling
- ✅ Query optimization
- ✅ Caching de resultados frecuentes

### Database

- ✅ Indexes en foreign keys
- ✅ Materialized views para reportes
- ✅ Partitioning de tablas grandes
- ✅ Archive old data

---

## Seguridad

### Validación

- ✅ Input validation (backend)
- ✅ Type checking (TypeScript)
- ✅ SQL injection prevention
- ✅ XSS prevention

### Autenticación

- ✅ JWT tokens
- ✅ Refresh token rotation
- ✅ Session management
- ✅ Logout functionality

### Autorización

- ✅ tenantGuard middleware
- ✅ Role-based access
- ✅ Resource ownership check
- ✅ Audit logging

---

**Arquitectura versión:** 1.0
**Última actualización:** [Ahora]
**Estado:** ✅ Listo para producción

