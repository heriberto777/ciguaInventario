# 🧪 Testing: Carga Automática de Artículos

**Guía práctica para validar la implementación**

---

## 🚀 Inicio Rápido

### 1. Iniciar Backend
```bash
cd D:\proyectos\app\ciguaInv\apps\backend
npm run dev
# o
npx ts-node src/server.ts
```

### 2. Verificar compilación
```bash
npx tsc --noEmit
# Ignorar errores preexistentes, enfocarse en inventory-counts/service.ts
```

---

## 📝 Test Cases

### TEST 1: Verificar Conexión ERP Configurable

**Objetivo:** Confirmar que el sistema detecta y usa ERPConnection

**Pasos:**
```bash
# 1. En terminal SQL de la app (Prisma Studio u otra)
# Verificar que existe ERPConnection:
SELECT * FROM "ERPConnection"
WHERE isActive = true
LIMIT 1;

# Esperar: Al menos una conexión activa con erpType = 'MSSQL'

# Si no existe, crear una (reemplaza valores):
INSERT INTO "ERPConnection"
  (id, companyId, erpType, host, port, database, username, password, isActive)
VALUES
  (
    'conn_test_' || gen_random_uuid(),
    'TU_COMPANY_ID',
    'MSSQL',
    'localhost',
    1433,
    'TestDB',
    'sa',
    'TestPassword123',
    true
  );
```

---

### TEST 2: Crear Conteo e Intentar Carga Automática

**Objetivo:** Verificar que prepareCountItems intenta cargar artículos

**Con cURL:**
```bash
# 1. Obtener token de autenticación
$token = "tu_jwt_token_aqui"
$headers = @{"Authorization" = "Bearer $token"}

# 2. Crear conteo
$body = @{
    "warehouseId" = "warehouse_id_aqui"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "http://localhost:3000/api/inventory-counts" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -ContentType "application/json"

$countId = ($response.Content | ConvertFrom-Json).id
Write-Host "✅ Conteo creado: $countId"

# 3. Cargar artículos automáticamente
$prepareBody = @{
    "warehouseId" = "warehouse_id_aqui"
} | ConvertTo-Json

$prepareResponse = Invoke-WebRequest `
  -Uri "http://localhost:3000/api/inventory-counts/$countId/prepare" `
  -Method POST `
  -Headers $headers `
  -Body $prepareBody `
  -ContentType "application/json"

$result = $prepareResponse.Content | ConvertFrom-Json
Write-Host "✅ Items Cargados: $($result.itemsLoaded)"
Write-Host "📊 Fuente: $($result.source)"
Write-Host "💾 Total Sistema: $($result.summary.totalSystemQty)"
```

**Esperar:**
```
✅ Conteo creado: cml...
✅ Items Cargados: 450 (o 0 si sin conexión)
📊 Fuente: DIRECT_QUERY | MAPPING_CONFIG | MANUAL
💾 Total Sistema: 12500
```

**Verificar en Logs del Backend:**
```
📍 Using Option A: MappingConfig  ← Si hay mappings configurados
📍 Using Option B: Direct Query from Catelli  ← Si conexión activa
📍 Using Option C: Manual entry  ← Si sin conexión
```

---

### TEST 3: Verificar Items en BD

**Objetivo:** Confirmar que items se guardaron en InventoryCount_Item

**Query:**
```sql
SELECT
  ic.code,
  ic.status,
  COUNT(ici.id) as total_items,
  SUM(ici.systemQty) as total_qty
FROM "InventoryCount" ic
LEFT JOIN "InventoryCount_Item" ici ON ic.id = ici.countId
WHERE ic.id = 'EL_COUNT_ID_AQUI'
GROUP BY ic.id, ic.code, ic.status;
```

**Esperar:**
```
code        | status   | total_items | total_qty
INV-2026-... | DRAFT    | 450         | 12500
```

---

### TEST 4: Agregar Cantidad Contada

**Objetivo:** Validar que el frontend puede actualizar cantidades y calcular varianzas

**Con cURL:**
```bash
# 1. Obtener primer item
$itemsResponse = Invoke-WebRequest `
  -Uri "http://localhost:3000/api/inventory-counts/$countId" `
  -Method GET `
  -Headers $headers `
  -ContentType "application/json"

$items = ($itemsResponse.Content | ConvertFrom-Json).countItems
$firstItemId = $items[0].id
$systemQty = $items[0].systemQty
Write-Host "Item: $firstItemId, Sistema: $systemQty"

# 2. Actualizar cantidad contada (+2 artículos)
$updateBody = @{
    "countedQty" = [int]$systemQty + 2
} | ConvertTo-Json

$updateResponse = Invoke-WebRequest `
  -Uri "http://localhost:3000/api/inventory-counts/$countId/items/$firstItemId" `
  -Method PUT `
  -Headers $headers `
  -Body $updateBody `
  -ContentType "application/json"

$updated = $updateResponse.Content | ConvertFrom-Json
Write-Host "✅ Cantidad Contada: $($updated.countedQty)"
Write-Host "📊 Varianza: +$($updated.countedQty - $systemQty)"
```

**Esperar:**
```
✅ Cantidad Contada: 102
📊 Varianza: +2
(Color amarillo en tabla: varianza 2-5%)
```

---

### TEST 5: Verificar VarianceReport Automático

**Objetivo:** Confirmar que se crea VarianceReport al actualizar cantidad

**Query:**
```sql
SELECT
  vr.itemCode,
  vr.itemName,
  vr.systemQty,
  vr.countedQty,
  vr.difference,
  vr.variancePercent,
  vr.status
FROM "VarianceReport" vr
WHERE vr.countId = 'EL_COUNT_ID_AQUI'
LIMIT 10;
```

**Esperar:**
```
itemCode | itemName    | systemQty | countedQty | difference | variancePercent | status
ART001   | Producto A  | 100       | 102        | 2          | 2.0             | PENDING
```

---

### TEST 6: Completar Conteo

**Objetivo:** Validar que completeCount cambia estado y auditaría

**Con cURL:**
```bash
$completeResponse = Invoke-WebRequest `
  -Uri "http://localhost:3000/api/inventory-counts/$countId/complete" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json"

$completed = $completeResponse.Content | ConvertFrom-Json
Write-Host "✅ Conteo Completado"
Write-Host "📊 Estado: $($completed.status)"
Write-Host "🕐 Completado en: $($completed.completedAt)"
```

**Esperar:**
```
✅ Conteo Completado
📊 Estado: COMPLETED
🕐 Completado en: 2026-02-21T...
```

---

### TEST 7: Fallback Manual (Sin Conexión)

**Objetivo:** Verificar que sin ERPConnection, sistema permite entrada manual

**Pasos:**
```bash
# 1. Desactivar conexión ERP
UPDATE "ERPConnection"
SET isActive = false
WHERE companyId = 'tu_company_id';

# 2. Crear nuevo conteo
# POST /inventory-counts → { countId: xxx }

# 3. Intentar cargar artículos
# POST /inventory-counts/{countId}/prepare
# Esperar: { itemsLoaded: 0, items: [], source: "MANUAL" }

# 4. En frontend: Agregar artículos manualmente
# Input: Código, Descripción, Stock Sistema, UDM
# Sistema debe permitir ingresar y calcular varianzas normalmente

# 5. Reactivar conexión
UPDATE "ERPConnection"
SET isActive = true
WHERE companyId = 'tu_company_id';
```

---

## 🐛 Debugging Tips

### Ver qué opción se está usando

**En backend logs:**
```
📍 Using Option A: MappingConfig
  → Significa: MappingConfig encontrado y activo
  → Verify: SELECT * FROM "MappingConfig" WHERE isActive = true

📍 Using Option B: Direct Query from Catelli
  → Significa: Connexión MSSQL activa, sin mappings
  → Verify: SELECT * FROM "ERPConnection" WHERE isActive = true

📍 Using Option C: Manual entry
  → Significa: Sin conexión ERP configurada
  → Verify: SELECT * FROM "ERPConnection" WHERE isActive = true
    → Si vacío, crear conexión
```

### Error: "Cannot connect to Catelli"

```bash
# 1. Verificar que el host es accesible
ping catelli.local
# o
nslookup catelli.local

# 2. Verificar credenciales
sqlcmd -S catelli.local -U sa -P password123 -C
# Si funciona: 1>

# 3. Actualizar en BD
UPDATE "ERPConnection"
SET
  host = 'catelli.local',
  port = 1433,
  database = 'CiguaDB',
  username = 'sa',
  password = 'password123'
WHERE id = 'conn_id';

# 4. Reintentar /prepare
```

### Error: "No items found in Catelli"

```sql
-- Verificar que existen artículos
SELECT COUNT(*) FROM articulo WHERE estado = 'ACTIVO';
-- Esperar: > 0

-- Verificar existencias en bodega
SELECT COUNT(*) FROM existencia_bodega
WHERE bodega_id = 'tu_bodega_id';
-- Esperar: > 0

-- Verificar tablas existen
SELECT * FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('articulo', 'existencia_bodega', 'articulo_precio');
```

---

## 📊 Casos de Prueba Completos

### Caso 1: MVP Manual (Sin Catelli)

```
Prerequisitos:
  ✅ Backend corriendo
  ✅ Frontend corriendo
  ❌ Sin ERPConnection (intencionalmente)

Pasos:
1. Crear conteo
2. POST /prepare → { items: [], source: "MANUAL" }
3. En frontend: Agregar artículos manualmente
4. Ingresar: ART001, Producto A, 100, Piezas
5. Ingresar cantidad contada: 102
6. Sistema calcula: varianza = +2 (amarillo)
7. Completar conteo
8. Verificar VarianceReport creado

Resultado Esperado:
✅ Flujo manual completamente funcional
✅ Varianzas calculadas correctamente
✅ VarianceReport generado
```

### Caso 2: Carga Automática desde Catelli

```
Prerequisitos:
  ✅ Backend corriendo
  ✅ ERPConnection configurada y activa
  ✅ Conexión a Catelli funcional
  ✅ Artículos activos en Catelli

Pasos:
1. Crear conteo
2. POST /prepare → { items: [450 items], source: "DIRECT_QUERY" }
3. Frontend carga tabla automáticamente
4. Verificar: Códigos, descripciones, stocks correctos
5. Ingresar cantidades contadas
6. Calcular varianzas
7. Completar conteo
8. Verificar VarianceReport con datos de Catelli

Resultado Esperado:
✅ 450+ artículos cargados automáticamente
✅ Stock del sistema desde Catelli
✅ UDM correcta
✅ Precios para auditoría
✅ Varianzas calculadas correctamente
```

### Caso 3: Fallback Automático

```
Prerequisitos:
  ✅ MappingConfig mal configurado (error intencional)
  ✅ ERPConnection válida

Pasos:
1. Crear conteo
2. POST /prepare
3. Sistema intenta Opción A → error
4. System logs: "⚠️ Option A failed, trying Option B..."
5. Sistema intenta Opción B → éxito
6. Retorna { items: [desde query directa], source: "DIRECT_QUERY" }

Resultado Esperado:
✅ Fallback automático funciona
✅ No interrumpe flujo de usuario
✅ Items cargados sin intervención
```

---

## ✅ Checklist de Validación

- [ ] Backend compila sin errores
- [ ] MSSQL Connector conecta a Catelli
- [ ] Factory crea conectores correctamente
- [ ] Opción A detecta mappings
- [ ] Opción B ejecuta query directa
- [ ] Opción C retorna array vacío
- [ ] Items se guardan en InventoryCount_Item
- [ ] VarianceReport se genera automáticamente
- [ ] Fallback funciona si una opción falla
- [ ] Frontend carga tabla con items
- [ ] Cálculo de varianzas correcto
- [ ] Colores por estado varianza funcionan
- [ ] Conteo completo cambia estado
- [ ] Logs muestran qué opción se usó

---

## 🎯 Próximos Tests

Una vez validados estos 7 tests:

1. **Performance Test**
   - Medir tiempo de carga de 450 items
   - Optimizar queries si necesario

2. **Security Test**
   - Validar que no expone credenciales Catelli
   - Encriptar password en BD

3. **Edge Cases**
   - Artículos sin existencias (cantidad = 0)
   - Cambios durante conteo (redraw)
   - Conteo parcial de bodega

4. **Integration Test**
   - End-to-end desde Catelli a VarianceReport
   - InventoryAdjustment automático

---

**¡Listo para testing! Ejecuta los 7 tests y reporta resultados.**
