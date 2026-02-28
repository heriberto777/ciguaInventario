# 🚀 Guía de Inicio Rápido - Módulos de Inventario

## 📋 Pre-requisitos

- Node.js 20+
- PostgreSQL corriendo
- `pnpm` instalado

---

## 🔧 Step 1: Configurar Base de Datos

### Windows
```powershell
.\setup-inventory.bat
```

### macOS/Linux
```bash
chmod +x setup-inventory.sh
./setup-inventory.sh
```

### Manual (Si los scripts no funcionan)
```bash
cd apps/backend
npx prisma migrate dev --name add_inventory_modules
npx prisma generate
cd ../..
```

---

## 🎯 Step 2: Iniciar el Backend

```bash
pnpm -F @cigua-inv/backend dev
```

Debería ver:
```
✓ Backend corriendo en http://localhost:3000
```

---

## 🎨 Step 3: Iniciar el Frontend

En otra terminal:
```bash
pnpm -F @cigua-inv/web dev
```

Debería ver:
```
✓ Frontend corriendo en http://localhost:5173
```

---

## 🌐 Step 4: Acceder a la Aplicación

1. Abra [http://localhost:5173](http://localhost:5173)
2. Login con credenciales de test (desde your database)
3. Navegue a los nuevos módulos

---

## 📊 Nuevos Módulos Disponibles

### 1. Almacenes
**Ruta:** `/api/warehouses`
- Crear, editar, eliminar almacenes
- Gestionar ubicaciones dentro de cada almacén

### 2. Conteo de Inventario
**Ruta:** `/api/inventory-counts`
- Iniciar conteos físicos
- Agregar artículos con cantidades
- Completar y aprobar conteos

### 3. Reportes de Varianzas
**Ruta:** `/api/variance-reports`
- Ver discrepancias detectadas
- Aprobar o rechazar varianzas
- Dashboard con estadísticas

### 4. Ajustes de Inventario
**Ruta:** `/api/adjustments`
- Crear ajustes de inventario
- Aplicar correcciones masivas
- Auditoría completa

---

## 🔍 Pruebas Rápidas (cURL)

### 1. Crear Almacén

```bash
curl -X POST http://localhost:3000/api/warehouses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ALM-001",
    "name": "Almacén Principal",
    "address": "Calle Principal 123",
    "city": "Madrid",
    "manager": "Juan Pérez"
  }'
```

### 2. Listar Almacenes

```bash
curl http://localhost:3000/api/warehouses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Crear Ubicación

```bash
curl -X POST http://localhost:3000/api/warehouses/{warehouse-id}/locations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "A-01-01",
    "description": "Pasillo A, Estante 1, Nivel 1",
    "capacity": 100
  }'
```

### 4. Iniciar Conteo

```bash
curl -X POST http://localhost:3000/api/inventory-counts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "{warehouse-id}",
    "description": "Conteo mensual"
  }'
```

### 5. Agregar Artículo al Conteo

```bash
curl -X POST http://localhost:3000/api/inventory-counts/{count-id}/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "{location-id}",
    "itemCode": "SKU-001",
    "itemName": "Producto A",
    "uom": "PZ",
    "systemQty": 100,
    "countedQty": 98,
    "notes": "Faltaban 2 unidades"
  }'
```

---

## 📁 Estructura de Archivos

Nuevos archivos creados:

```
Backend Modules:
apps/backend/src/modules/
├── warehouses/              (10 rutas)
├── inventory-counts/        (8 rutas)
├── variance-reports/        (7 rutas)
└── adjustments/             (6 rutas)

Frontend Pages:
apps/web/src/pages/
├── InventoryCountPage.tsx
├── VarianceReportsPage.tsx
├── WarehousesPage.tsx
└── InventoryDashboardPage.tsx

Frontend Components:
apps/web/src/components/inventory/
├── Button.tsx
├── Input.tsx
├── InventoryCountItemForm.tsx
├── InventoryCountSummary.tsx
├── VarianceTable.tsx
└── index.ts

Database:
apps/backend/prisma/schema.prisma
├── +Warehouse
├── +Warehouse_Location
├── +InventoryCount
├── +InventoryCount_Item
├── +VarianceReport
└── +InventoryAdjustment
```

---

## 📚 Documentación

- **INVENTORY_FEATURES.md** - Descripción completa de cada módulo
- **IMPLEMENTATION_SUMMARY.md** - Resumen de implementación
- **Este archivo** - Guía de inicio rápido

---

## ⚠️ Troubleshooting

### Error: "No se puede conectar a la base de datos"
```bash
# Verificar que PostgreSQL está corriendo
# En Windows:
pg_isready

# En macOS:
brew services list | grep postgres

# Ajustar DATABASE_URL en .env si es necesario
```

### Error: "Migración ya existe"
```bash
# Si la migración ya fue aplicada:
npx prisma migrate status

# Para forzar un reset (⚠️ borra datos):
npx prisma migrate reset
```

### Error: "TypeScript compilation failed"
```bash
# Limpiar node_modules y reinstalar
rm -rf apps/backend/node_modules apps/web/node_modules
pnpm install
pnpm -F @cigua-inv/backend build
```

---

## 🎯 Flujo Completo de Ejemplo

1. **Crear Almacén**
   ```
   POST /warehouses → ALM-001
   ```

2. **Crear Ubicaciones**
   ```
   POST /warehouses/{id}/locations → A-01-01, A-01-02
   ```

3. **Iniciar Conteo**
   ```
   POST /inventory-counts → INV-2026-02-001
   ```

4. **Agregar Artículos**
   ```
   POST /inventory-counts/{id}/items → Sistema crea VarianceReport
   ```

5. **Revisar Varianzas**
   ```
   GET /variance-reports?countId=...
   PATCH /variance-reports/{id}/approve
   ```

6. **Crear Ajuste**
   ```
   POST /adjustments (VARIANCE_CORRECTION)
   ```

7. **Completar Conteo**
   ```
   PATCH /inventory-counts/{id}/complete
   ```

---

## 📱 Funcionalidades por Página

### Dashboard de Inventario
- KPIs en tiempo real
- Conteos recientes
- Top varianzas
- Estadísticas generales

### Página de Conteos
- Iniciar nuevo conteo
- Selector de almacén
- Formulario de captura
- Resumen en tiempo real

### Página de Varianzas
- Listar varianzas con filtros
- Aprobar/rechazar
- Ver resumen ejecutivo
- Identificar artículos problemáticos

### Página de Almacenes
- CRUD completo
- Gestión de ubicaciones
- Vista de tarjetas
- Estado de activación

---

## 🔐 Seguridad

Todos los endpoints:
- ✅ Requieren token JWT
- ✅ Filtran por companyId (multi-tenant)
- ✅ Validan datos con Zod
- ✅ Usan tenantGuard

---

## 🚀 Próximas Mejoras

- [ ] Escaneo QR/Barcode
- [ ] Sincronización automática ERP
- [ ] Reportes PDF/Excel
- [ ] WebSockets para notificaciones
- [ ] App móvil (React Native)

---

## 💬 Soporte

Para preguntas o problemas:
1. Revisar logs del backend: `localhost:3000/docs`
2. Consultar INVENTORY_FEATURES.md
3. Verificar base de datos con Prisma Studio: `npx prisma studio`

---

**¡Listo para usar! 🎉**

Comienza con:
```bash
./setup-inventory.bat  # Windows
# o
./setup-inventory.sh   # macOS/Linux
```

Luego abre dos terminales:
```bash
# Terminal 1
pnpm -F @cigua-inv/backend dev

# Terminal 2
pnpm -F @cigua-inv/web dev
```

Abre [http://localhost:5173](http://localhost:5173) 🚀
