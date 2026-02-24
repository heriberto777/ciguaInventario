# 📱 API ENDPOINTS - VERSIONING

## IMPLEMENTADO EN BACKEND ✅

### 1. GET /inventory-counts/{countId}/items
**Obtener todos los items de un conteo con datos de versión**

```bash
GET /inventory-counts/c3p0-001/items
```

**Response:**
```json
{
  "countId": "c3p0-001",
  "currentVersion": 1,
  "totalVersions": 1,
  "items": [
    {
      "id": "item-001",
      "itemCode": "SKU-123",
      "itemName": "Producto A",
      "uom": "Cajas",
      "systemQty": 100,
      "countedQty_V1": 98,
      "countedQty_V2": null,
      "currentVersion": 1,
      "status": "PENDING",
      "variance_reports": [
        {
          "id": "var-001",
          "version": 1,
          "systemQty": 100,
          "countedQty": 98,
          "difference": -2,
          "variancePercent": -2.0,
          "status": "PENDING"
        }
      ]
    }
  ]
}
```

---

### 2. GET /inventory-counts/{countId}/variance-items?version=1
**Obtener solo items con varianza para recontar en V2**

```bash
GET /inventory-counts/c3p0-001/variance-items?version=1
```

**Response:**
```json
{
  "countId": "c3p0-001",
  "version": 2,
  "previousVersion": 1,
  "totalItems": 3,
  "items": [
    {
      "id": "item-001",
      "itemCode": "SKU-123",
      "itemName": "Producto A",
      "uom": "Cajas",
      "systemQty": 100,
      "previousCountedQty": 98,
      "varianceReport": {
        "id": "var-001",
        "version": 1,
        "systemQty": 100,
        "countedQty": 98,
        "difference": -2,
        "variancePercent": -2.0,
        "status": "PENDING"
      }
    },
    {
      "id": "item-002",
      "itemCode": "SKU-456",
      "itemName": "Producto B",
      "uom": "Unidades",
      "systemQty": 500,
      "previousCountedQty": 450,
      "varianceReport": {
        "id": "var-002",
        "version": 1,
        "systemQty": 500,
        "countedQty": 450,
        "difference": -50,
        "variancePercent": -10.0,
        "status": "PENDING"
      }
    }
  ]
}
```

---

### 3. POST /inventory-counts/{countId}/submit-count
**Registrar conteo para una versión específica (V1, V2, V3...)**

**Request (V1 - Primer conteo):**
```bash
POST /inventory-counts/c3p0-001/submit-count
Content-Type: application/json

{
  "version": 1,
  "locationId": "loc-a1",
  "items": [
    {
      "itemCode": "SKU-123",
      "countedQty": 98,
      "uom": "Cajas"
    },
    {
      "itemCode": "SKU-456",
      "countedQty": 450,
      "uom": "Unidades"
    },
    {
      "itemCode": "SKU-789",
      "countedQty": 75,
      "uom": "KG"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "version": 1,
  "itemsProcessed": 3,
  "variancesDetected": 2,
  "message": "Version 1 submitted with 3 items and 2 variances"
}
```

**Request (V2 - Recontar items con varianza):**
```bash
POST /inventory-counts/c3p0-001/submit-count
Content-Type: application/json

{
  "version": 2,
  "locationId": "loc-a1",
  "items": [
    {
      "itemCode": "SKU-123",
      "countedQty": 100,
      "uom": "Cajas"
    },
    {
      "itemCode": "SKU-456",
      "countedQty": 500,
      "uom": "Unidades"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "version": 2,
  "itemsProcessed": 2,
  "variancesDetected": 0,
  "message": "Version 2 submitted with 2 items and 0 variances"
}
```

---

### 4. POST /inventory-counts/{countId}/new-version
**Crear nueva versión para recontar items con varianza**

**Request:**
```bash
POST /inventory-counts/c3p0-001/new-version
Content-Type: application/json
```

**Response:**
```json
{
  "countId": "c3p0-001",
  "newVersion": 2,
  "itemsToRecount": 2,
  "items": [
    {
      "id": "item-001",
      "itemCode": "SKU-123",
      "itemName": "Producto A",
      "uom": "Cajas",
      "systemQty": 100,
      "previousCountedQty": 98,
      "varianceReport": {
        "id": "var-001",
        "version": 1,
        "difference": -2,
        "variancePercent": -2.0
      }
    },
    {
      "id": "item-002",
      "itemCode": "SKU-456",
      "itemName": "Producto B",
      "uom": "Unidades",
      "systemQty": 500,
      "previousCountedQty": 450,
      "varianceReport": {
        "id": "var-002",
        "version": 1,
        "difference": -50,
        "variancePercent": -10.0
      }
    }
  ]
}
```

---

### 5. GET /inventory-counts/{countId}/version-history
**Obtener historial de todas las versiones de un conteo**

**Request:**
```bash
GET /inventory-counts/c3p0-001/version-history
```

**Response:**
```json
{
  "countId": "c3p0-001",
  "code": "INV-2026-02-001",
  "currentVersion": 2,
  "totalVersions": 2,
  "versions": [
    {
      "version": 1,
      "totalItems": 100,
      "itemsWithVariance": 15,
      "approvedItems": 0,
      "status": "COMPLETED"
    },
    {
      "version": 2,
      "totalItems": 15,
      "itemsWithVariance": 3,
      "approvedItems": 0,
      "status": "IN_PROGRESS"
    }
  ]
}
```

---

## 🔄 FLUJO COMPLETO - EJEMPLO

### PASO 1: Usuario inicia conteo V1
```
1. Frontend carga items del ERP
2. App móvil recibe: 100 items
3. Usuario cuenta todos los 100
4. POST /inventory-counts/{id}/submit-count (version: 1)
```

### PASO 2: Backend procesa V1
```
1. Registra countedQty_V1 para cada item
2. Calcula varianzas
3. Crea VarianceReport (v1) para items con varianza
4. Resultado: 85 OK, 15 varianza
```

### PASO 3: Web muestra resultados V1
```
1. Obtiene: GET /inventory-counts/{id}/version-history
2. Muestra: 15 items con varianza
3. Usuario elige: "Recontar items con varianza"
```

### PASO 4: Crear V2 para recontar
```
1. POST /inventory-counts/{id}/new-version
2. Backend actualiza: totalVersions = 2
3. Frontend descarga: GET /inventory-counts/{id}/variance-items?version=1
4. App móvil recibe: Solo los 15 items con varianza
```

### PASO 5: Usuario recontar V2 (solo 15 items)
```
1. App móvil muestra: systemQty + countedQty_V1 + varianza_V1
2. Usuario recontar los 15
3. POST /inventory-counts/{id}/submit-count (version: 2)
```

### PASO 6: Backend procesa V2
```
1. Registra countedQty_V2 para los 15 items
2. Calcula nuevas varianzas
3. Crea VarianceReport (v2) para items con varianza
4. Resultado: 12 OK, 3 varianza
```

### PASO 7: Web revisa V2
```
1. Obtiene: GET /inventory-counts/{id}/version-history
2. Muestra: V2 con 3 items aún con varianza
3. Si OK: Aprobar y sincronizar al ERP
4. Si NO: Crear V3 (recontar los 3 críticos)
```

---

## 📊 ESTADO DE LA BASE DE DATOS

### InventoryCount
```
id: c3p0-001
code: INV-2026-02-001
locationId: loc-a1
currentVersion: 2          ← Versión activa
totalVersions: 2           ← Total de versiones
status: IN_PROGRESS        ← Vuelve a IN_PROGRESS al crear V2
```

### InventoryCount_Item (Ejemplo: SKU-123)
```
id: item-001
countId: c3p0-001
itemCode: SKU-123
systemQty: 100

countedQty_V1: 98          ← Contado en V1
countedQty_V2: null        ← Pendiente en V2
countedQty_V3: null        ← No existe V3
currentVersion: 1          ← Última versión contada

variance_reports: [
  { version: 1, countedQty: 98, difference: -2 },
  { version: 2, countedQty: 100, difference: 0 }
]
```

### VarianceReport
```
id: var-001
countId: c3p0-001
countItemId: item-001
version: 1                 ← Versión del reporte
itemCode: SKU-123
systemQty: 100
countedQty: 98
difference: -2
variancePercent: -2.0
status: PENDING/APPROVED
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Schema Prisma actualizado con versionado
- [x] Migración BD ejecutada
- [x] Endpoint: GET /inventory-counts/{id}/items
- [x] Endpoint: GET /inventory-counts/{id}/variance-items
- [x] Endpoint: POST /inventory-counts/{id}/submit-count
- [x] Endpoint: POST /inventory-counts/{id}/new-version
- [x] Endpoint: GET /inventory-counts/{id}/version-history
- [ ] UI Web: Mostrar versión actual
- [ ] UI Web: Botón "Recontar"
- [ ] UI Web: Mostrar historial de versiones
- [ ] App Móvil: Descargar items
- [ ] App Móvil: Descargar variance-items
- [ ] App Móvil: Enviar conteo

