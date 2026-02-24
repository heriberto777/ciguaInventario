# Fase 2: Cargar Inventario desde ERP

## 🎯 Objetivo

Implementar la funcionalidad para cargar automáticamente datos de inventario desde el ERP (Catelli) a Cigua, utilizando las configuraciones de mapeo creadas en la Fase 1.

## ✅ Componentes Implementados

### 1. **Backend - LoadInventoryFromERPService**
**Archivo:** `apps/backend/src/modules/inventory/load-from-erp.service.ts`

**Funcionalidad principal:**
```typescript
loadInventoryFromERP(params: {
  mappingId: string;
  warehouseId: string;
  companyId: string;
  userId: string;
}): Promise<LoadInventoryResult>
```

**Proceso interno:**
1. Validar que la configuración de mapeo existe y pertenece a la empresa
2. Validar que el warehouse existe
3. Obtener conexión ERP desde la configuración de mapeo
4. Crear conector MSSQL usando ERPConnectorFactory
5. Ejecutar query SQL contra el ERP
6. Transformar datos según fieldMappings
7. Crear InventoryCount en DRAFT
8. Cargar InventoryCount_Item para cada artículo
9. Registrar en audit log

**Características importantes:**
- ✅ Manejo robusto de errores
- ✅ Transformación de datos flexible
- ✅ Generación automática de código de conteo único
- ✅ Soporte para múltiples ubicaciones en warehouse
- ✅ Logging completo de operaciones

### 2. **Backend - LoadInventoryFromERPController**
**Archivo:** `apps/backend/src/modules/inventory/load-from-erp.controller.ts`

**Endpoints implementados:**

#### POST /api/inventory/load-from-erp
Cargar inventario desde ERP
```bash
POST /api/inventory/load-from-erp
Content-Type: application/json

{
  "mappingId": "cm...",
  "warehouseId": "cm..."
}
```

**Respuesta exitosa (200):**
```json
{
  "countId": "cm...",
  "itemsLoaded": 245,
  "status": "SUCCESS",
  "message": "Successfully loaded 245 items from ERP"
}
```

**Respuesta parcial (200):**
```json
{
  "countId": "cm...",
  "itemsLoaded": 240,
  "status": "PARTIAL",
  "message": "Loaded 240/245 items. 5 items failed",
  "errors": [
    "Failed to create item SKU123: ...",
    "Failed to create item SKU124: ..."
  ]
}
```

#### GET /api/inventory/load-from-erp/:countId
Obtener estado de una carga
```bash
GET /api/inventory/load-from-erp/cm...
```

**Respuesta:**
```json
{
  "countId": "cm...",
  "code": "INV-2026-02-XXXXX",
  "status": "DRAFT",
  "itemsCount": 245,
  "items": [
    {
      "id": "cm...",
      "itemCode": "ART001",
      "itemName": "Producto A",
      "systemQty": 100,
      "uom": "PZ"
    }
  ],
  "createdAt": "2026-02-21T...",
  "startedAt": "2026-02-21T..."
}
```

#### DELETE /api/inventory/load-from-erp/:countId
Cancelar una carga (solo estado DRAFT)
```bash
DELETE /api/inventory/load-from-erp/cm...
```

**Respuesta:** 204 No Content

### 3. **Backend - Rutas**
**Archivo:** `apps/backend/src/modules/inventory/load-from-erp.routes.ts`

Registra automáticamente los 3 endpoints con:
- ✅ Autenticación requerida
- ✅ Schemas OpenAPI documentados
- ✅ Manejo de errores

### 4. **Frontend - LoadInventoryFromERPPage**
**Archivo:** `apps/web/src/pages/LoadInventoryFromERPPage.tsx`

**Componente React con:**
- Select para elegir configuración de mapeo
- Select para elegir almacén de destino
- Botón para iniciar carga
- Dialog mostrando resultado
- Información del proceso paso a paso
- Links para navegar al conteo de inventario

**Características:**
- ✅ Validaciones de entrada
- ✅ Loading states
- ✅ Manejo de errores
- ✅ Dialog con resultado detallado
- ✅ Integración con React Query
- ✅ Navegación a conteo creado

## 🔄 Flujo Completo End-to-End

```
┌─────────────────────────────────────────────────────────────┐
│         Frontend: LoadInventoryFromERPPage                  │
└─────────────────────────────────────────────────────────────┘
                            │
         1. Usuario selecciona Mapeo y Almacén
                            │
         POST /api/inventory/load-from-erp
         {
           "mappingId": "...",
           "warehouseId": "..."
         }
                            │
         ┌─────────────────────────────────────────────┐
         │  Backend: LoadInventoryFromERPService       │
         └─────────────────────────────────────────────┘
                            │
         2. Obtener configuración de mapeo
            ├─ Validar que existe y está activa
            └─ Extraer erpConnectionId
                            │
         3. Obtener conexión ERP
            ├─ Validar que existe y está activa
            └─ Extraer credenciales (host, port, user, pass)
                            │
         4. Crear conector MSSQL
            └─ ERPConnectorFactory.create(config)
                            │
         5. Ejecutar query contra Catelli
            ├─ Usar query del mapeo O construirla automáticamente
            └─ Obtener datos crudos del ERP
                            │
         6. Transformar datos
            ├─ Aplicar fieldMappings
            ├─ Validar campos obligatorios
            └─ Convertir tipos de datos
                            │
         7. Crear InventoryCount
            ├─ Status: DRAFT
            ├─ Código único: INV-2026-02-XXXXX
            └─ Asociar a warehouse
                            │
         8. Crear InventoryCount_Item para cada artículo
            ├─ itemCode (del ERP)
            ├─ itemName (del ERP)
            ├─ systemQty (cantidad en Catelli)
            ├─ uom (unidad)
            ├─ physicalQty: 0 (usuario debe contar)
            └─ variance: systemQty (diferencia inicial)
                            │
         9. Registrar en audit log
                            │
         ┌─────────────────────────────────────────────┐
         │      Respuesta al Frontend                  │
         └─────────────────────────────────────────────┘
                            │
         10. Mostrar Dialog con resultado
             ├─ Status: SUCCESS/PARTIAL/FAILED
             ├─ Items cargados
             ├─ Errores (si los hay)
             └─ Link para ir al conteo
                            │
         11. Usuario navega al conteo
             └─ /inventory-counts/{countId}
                     ↓
         Continuar con conteo físico (Fase 3)
```

## 📊 Ejemplo de Datos

### Antes (en Catelli)
```
INFORMATION_SCHEMA de Catelli:

TABLA: articulo
├─ codigo        │ artículo XXXXX
├─ descripcion   │ Descripción del artículo
├─ costo         │ 100.50
└─ precio_venta  │ 150.00

TABLA: existencia_bodega
├─ bodega_id     │ 1
├─ articulo_id   │ XXXXX
├─ cantidad      │ 500
└─ lote          │ LOT-2024-01
```

### Mapeo (MappingConfig)
```json
{
  "datasetType": "ITEMS",
  "sourceTables": ["articulo", "existencia_bodega"],
  "fieldMappings": {
    "itemCode": "codigo",
    "itemName": "descripcion",
    "systemQty": "cantidad",
    "uom": "'PZ'",
    "baseUom": "'PZ'",
    "packQty": "1"
  }
}
```

### Después (en Cigua - InventoryCount_Item)
```
itemCode:    "artículo XXXXX"
itemName:    "Descripción del artículo"
systemQty:   500        (cantidad en Catelli)
uom:         "PZ"       (unidad)
physicalQty: 0          (usuario ingresa durante conteo)
variance:    500        (diferencia inicial)
```

## 🔒 Seguridad y Validaciones

### Validaciones de Negocio
- ✅ Mapeo debe existir y estar activo
- ✅ Warehouse debe existir y pertenecer a la empresa
- ✅ Conexión ERP debe estar activa
- ✅ Usuario debe pertenecer a la empresa

### Validaciones de Datos
- ✅ Query debe retornar datos válidos
- ✅ Campos obligatorios (itemCode, itemName, systemQty)
- ✅ Cantidades deben ser numéricas
- ✅ Códigos de artículos no pueden estar vacíos

### Seguridad
- ✅ Credenciales ERP nunca se devuelven al cliente
- ✅ Credenciales solo en memoria durante carga
- ✅ Autenticación requerida en todos los endpoints
- ✅ Validación de companyId en todas las operaciones

## 🎯 Casos de Uso

### 1. Cargar Inventario Completo
```bash
# Usuario tiene mapeo ITEMS que incluye todo el catálogo
POST /api/inventory/load-from-erp
{
  "mappingId": "mapping-all-items",
  "warehouseId": "warehouse-main"
}
# Resultado: 5000 artículos cargados
```

### 2. Cargar Inventario Filtrado
```bash
# El mapeo incluye WHERE para solo artículos activos
sourceQuery: "SELECT ... FROM articulo WHERE estado = 'ACTIVO'"

POST /api/inventory/load-from-erp
{
  "mappingId": "mapping-active-items",
  "warehouseId": "warehouse-main"
}
# Resultado: 3000 artículos cargados (solo los activos)
```

### 3. Manejo de Errores Parciales
```bash
# Si algunos artículos fallan durante la carga
# La carga continúa y devuelve status PARTIAL

POST /api/inventory/load-from-erp
{
  "mappingId": "mapping-with-issues",
  "warehouseId": "warehouse-main"
}

Respuesta:
{
  "countId": "inv-123",
  "itemsLoaded": 4998,
  "status": "PARTIAL",
  "message": "Loaded 4998/5000 items. 2 items failed",
  "errors": [
    "Failed to create item SKU-BAD-1: Invalid quantity",
    "Failed to create item SKU-BAD-2: Duplicate item code"
  ]
}
```

### 4. Cancelar Carga
```bash
# Usuario decide no usar esta carga
DELETE /api/inventory/load-from-erp/inv-123

# Resultado: Se elimina el InventoryCount y todos sus items
```

## 📈 Próximos Pasos (Fase 3)

**Fase 3: Interface de Conteo Físico**
- [ ] Página para ingresar cantidades físicas
- [ ] Cálculo automático de varianzas
- [ ] QR/Barcode scanning (opcional)
- [ ] Validaciones de cantidades
- [ ] Aprobación de conteo

**Fase 4: Sincronización**
- [ ] Exportar varianzas a Catelli
- [ ] Actualizar existencias en ERP
- [ ] Generar reportes de diferencias

## 📝 Archivos Creados

```
✅ apps/backend/src/modules/inventory/load-from-erp.service.ts
✅ apps/backend/src/modules/inventory/load-from-erp.controller.ts
✅ apps/backend/src/modules/inventory/load-from-erp.routes.ts
✅ apps/web/src/pages/LoadInventoryFromERPPage.tsx
```

## 🧪 Testing

### Test Manual - Cargar Inventario
```bash
curl -X POST http://localhost:3000/api/inventory/load-from-erp \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "mappingId": "cm...",
    "warehouseId": "cm..."
  }'
```

### Test Manual - Obtener Estado
```bash
curl -X GET http://localhost:3000/api/inventory/load-from-erp/cm... \
  -H "Authorization: Bearer {token}"
```

### Test Manual - Cancelar Carga
```bash
curl -X DELETE http://localhost:3000/api/inventory/load-from-erp/cm... \
  -H "Authorization: Bearer {token}"
```

## 🏗️ Integración del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA CIGUA                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FASE 1: Mapping Configuration (✅ Completado)        │   │
│  │ - Seleccionar tablas del ERP                         │   │
│  │ - Mapear campos                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FASE 2: Load from ERP (✅ ACABAS DE IMPLEMENTAR)      │   │
│  │ - Cargar datos usando mapeo                          │   │
│  │ - Crear InventoryCount                               │   │
│  │ - Cargar artículos con cantidades del ERP            │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FASE 3: Physical Count (⏳ Próxima)                   │   │
│  │ - Ingrese cantidades físicas                         │   │
│  │ - Calcular varianzas                                 │   │
│  │ - Aprobación del conteo                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FASE 4: Sync back to ERP (⏳ Próxima)                 │   │
│  │ - Exportar varianzas a Catelli                       │   │
│  │ - Actualizar existencias                             │   │
│  │ - Sincronización bidireccional                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Validación de Implementación

| Aspecto | Estado | Detalles |
|---------|--------|---------|
| Service | ✅ | Lógica completa de carga |
| Controller | ✅ | 3 endpoints documentados |
| Routes | ✅ | Integración con auth |
| Frontend Page | ✅ | UI completa con dialogs |
| Error Handling | ✅ | Validaciones robutas |
| Audit Logging | ✅ | Registra operaciones |
| Security | ✅ | Validación de empresa |
| Documentation | ✅ | Completa |

## 📞 Soporte y Debugging

### Error: "Mapping configuration not found"
- Verificar que el mappingId es correcto
- Verificar que el mapeo pertenece a la empresa actual

### Error: "ERP connection is not active"
- Verificar que la conexión ERP está activa
- Puede reactivarla desde ERPConnectionsPage

### Error: "Failed to execute ERP query"
- Verificar que la query es válida SQL
- Verificar que las tablas/campos existen en el ERP
- Ver logs para más detalles

### Carga PARTIAL (algunos items fallan)
- Ver el campo `errors` para ver qué items fallaron
- Posibles causas:
  - Campos faltantes en el ERP
  - Códigos duplicados
  - Conversiones de tipo inválidas

---

**Status:** ✅ Fase 2 Completada
**Próxima:** Fase 3 - Interface de Conteo Físico
