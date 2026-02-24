# Plan de Testing Fase 0.5-4

**Objetivo:** Validar que todo el sistema funciona correctamente end-to-end

**Cobertura:**
- Fase 0.5: Frontend dinámico (mapping)
- Fase 1.5: Query Explorer (exploración sin mapping)
- Fase 2: Cargar desde ERP (load inventory)
- Fase 3: Conteo físico (physical count)
- Fase 4: Sincronización al ERP (sync to ERP)

---

## TEST 0.5: Query Explorer - Exploración Dinámico de ERP

### Objetivo
Verificar que el frontend no tiene datos hardcodeados y todo viene de APIs

### Pasos

1. **Abrir página de mapeos**
   ```
   GET http://localhost:3000/inventory/mappings
   ```

2. **Verificar carga de datos**
   - [x] Se carga lista de mappings desde API
   - [x] Se carga lista de warehouses desde API
   - [x] Se carga lista de field mappings dinamicamente

3. **Crear nuevo mapeo**
   - [x] Formulario vacío (sin datos hardcodeados)
   - [x] Al seleccionar tabla ERP → obtiene campos dinámicamente
   - [x] Al seleccionar warehouse → obtiene ubicaciones
   - [x] Al agregar field mapping → valida campos

4. **Validar Network Tab**
   - [x] No hay datos en HTML estático
   - [x] Todos los datos vienen via fetch/XHR
   - [x] No hay JSON embedded en page

---

## TEST 2: Cargar Inventario del ERP (Fase 2)

### Objetivo
Verificar que se carga inventario correctamente desde Catelli

### Prerequisitos
- ✅ Debe existir una ERPConnection configurada
- ✅ Debe existir un MappingConfig válido
- ✅ Debe existir un Warehouse

### Pasos

1. **Abrir página de carga**
   ```
   GET http://localhost:3000/inventory/load-from-erp
   ```

2. **Cargar inventario**
   - [ ] Seleccionar mapping del dropdown
   - [ ] Seleccionar warehouse del dropdown
   - [ ] Click "Load from ERP"
   - [ ] Ver loading spinner
   - [ ] Esperar respuesta
   - [ ] Ver success dialog con count ID

3. **Validar datos cargados**
   ```
   GET /api/inventory/load-from-erp/:countId
   ```
   - [ ] Response status 200
   - [ ] countCode generado correctamente
   - [ ] status = "DRAFT"
   - [ ] items array poblado
   - [ ] Cada item tiene: itemId, itemCode, itemName, systemQty, warehouseId

4. **Verificar DB**
   ```
   SELECT * FROM "InventoryCount" WHERE status = 'DRAFT'
   SELECT * FROM "InventoryCount_Item"
   ```
   - [ ] InventoryCount creado
   - [ ] InventoryCount_Item creado para cada item
   - [ ] systemQty poblado correctamente
   - [ ] countedQty vacío (NULL)

5. **Error Handling**
   - [ ] Sin connection: "ERP connection not configured"
   - [ ] Connection inactiva: "ERP connection is not active"
   - [ ] Mapping no existe: "Mapping config not found"

---

## TEST 3: Interfaz de Conteo Físico (Fase 3)

### Objetivo
Verificar que usuarios pueden ingresar cantidades contadas

### Prerequisitos
- ✅ InventoryCount existente con status DRAFT (de Test 2)

### Pasos

1. **Abrir página de conteo**
   ```
   GET http://localhost:3000/inventory/physical-count/:countId
   ```

2. **Verificar carga de datos**
   - [ ] Summary box muestra:
     - Total Items
     - Items Counted: 0
     - Items Not Counted: X
     - Items with Variance: 0

3. **Contar items**
   - [ ] Click "Count" en primer item
   - [ ] Ingresa cantidad (ej: 85)
   - [ ] Opcionalmente nota
   - [ ] Click "Save"
   - [ ] Verifica respuesta

4. **Validar actualización**
   - [ ] Item se actualiza en tabla
   - [ ] Variance se calcula: 85 - 100 = -15
   - [ ] VariancePercent: -15%
   - [ ] itemsCounted incrementa a 1
   - [ ] Status transiciona a IN_PROGRESS

5. **Contar más items**
   - [ ] Repetir para 5 items al menos
   - [ ] Mezclar overages y shortages
   - [ ] Algunos sin contar

6. **Ver Varianzas**
   - [ ] Click "Show Variances"
   - [ ] Tabla muestra top 20 varianzas
   - [ ] Ordenadas por magnitud
   - [ ] Muestra overages y shortages

7. **Incompleto - No completar**
   - [ ] Intentar complete con items sin contar
   - [ ] Botón deshabilitado
   - [ ] O muestra error si intenta

8. **Completar Conteo**
   - [ ] Contar todos los items restantes
   - [ ] Click "Complete Count"
   - [ ] Validar status = COMPLETED
   - [ ] Redirecciona a página de detalle

9. **Verificar DB**
   ```
   SELECT status FROM "InventoryCount" WHERE id = :countId
   SELECT COUNT(*) FROM "InventoryCount_Item" WHERE countedQty > 0
   ```
   - [ ] Status = COMPLETED
   - [ ] Todos los items tienen countedQty > 0

---

## TEST 4: Sincronización al ERP (Fase 4)

### Objetivo
Verificar que resultados de conteo se sincronizan al ERP

### Prerequisitos
- ✅ InventoryCount con status COMPLETED (de Test 3)

### Pasos

1. **Abrir página de sincronización**
   ```
   GET http://localhost:3000/inventory/sync/:countId
   ```

2. **Validar Precondiciones**
   - [ ] Valida que count esté COMPLETED
   - [ ] Muestra items con varianza
   - [ ] Si no se puede sincronizar: muestra razón

3. **Seleccionar Estrategia**
   - [ ] REPLACE: "Set quantity to counted amount"
   - [ ] ADD: "Add variance to current quantity"
   - [ ] Selecciona REPLACE para test

4. **Revisar Items a Sincronizar**
   - [ ] Tabla muestra items con variance != 0
   - [ ] Solo items con varianza (no todos)
   - [ ] Muestra sistema qty, contado qty, varianza

5. **Ejecutar Sincronización**
   - [ ] Click "Start Sync"
   - [ ] Ver loading spinner
   - [ ] POST /api/inventory/counts/:countId/sync
   - [ ] Body: { updateStrategy: "REPLACE" }

6. **Validar Resultado**
   - [ ] Tabla de resultados muestra:
     - Código, nombre, cantidades, varianza, status
   - [ ] Items SUCCESS (verde)
   - [ ] Items FAILED si hay (rojo)
   - [ ] Summary: itemsSynced, itemsFailed, successRate %

7. **Verificar DB - Catelli**
   ```
   -- En Catelli MSSQL
   SELECT * FROM [tu_tabla_inventario]
   WHERE Código IN (codigos_sincronizados)
   ```
   - [ ] Cantidades actualizadas correctamente
   - [ ] Nueva cantidad = countedQty (con REPLACE)

8. **Verificar DB - Cigua**
   ```
   SELECT * FROM "InventorySyncHistory"
   WHERE "countId" = :countId
   ```
   - [ ] Registro creado
   - [ ] status = COMPLETED o PARTIAL
   - [ ] itemsSynced > 0
   - [ ] details JSON con resultados

9. **Verificar Status**
   ```
   SELECT status FROM "InventoryCount" WHERE id = :countId
   ```
   - [ ] Status = SYNCED (si sync fue exitoso)

10. **Ver Historial**
    - [ ] Click "Show History"
    - [ ] Tabla muestra sincronización que acaba de hacer
    - [ ] Fecha, status, items, success rate

11. **Click en Registro del Historial**
    - [ ] GET /api/inventory/counts/sync/:syncHistoryId
    - [ ] Muestra detalles: success/failed, error messages, duration

---

## TEST 5: Estrategia ADD (Fase 4)

### Objetivo
Verificar segunda estrategia de actualización

### Prerequisitos
- ✅ Otro InventoryCount COMPLETED

### Pasos

1. **Abrir página de sincronización**
   - [ ] Seleccionar estrategia ADD
   - [ ] Sistema qty = 100
   - [ ] Contado qty = 85
   - [ ] Varianza = -15
   - [ ] Con ADD: nueva qty = 100 + (-15) = 85

2. **Ejecutar Sincronización ADD**
   - [ ] POST con updateStrategy: "ADD"
   - [ ] Resultado igual que REPLACE en este caso

3. **Probar con overage**
   - [ ] Sistema qty = 100
   - [ ] Contado qty = 125
   - [ ] Varianza = +25
   - [ ] Con ADD: nueva qty = 100 + 25 = 125

---

## TEST 6: Error Handling

### Test 6.1: Connection Fallida
```
Pasos:
1. Cambiar contraseña en ERPConnection
2. Intentar cargar inventario
3. Verificar error: "Failed to connect to MSSQL"
```

### Test 6.2: Mapping Inválido
```
Pasos:
1. Crear mapping con tabla que no existe
2. Intentar cargar inventario
3. Verificar error apropiado
```

### Test 6.3: Sincronización Parcial
```
Pasos:
1. Cambiar tabla ERP a una que no existe
2. Ejecutar sincronización
3. Verificar itemsFailed > 0
4. Verificar status = PARTIAL
```

### Test 6.4: Count No Completado
```
Pasos:
1. Abrir sync page de count DRAFT
2. Verificar: canSync = false, reason = "Count must be completed"
```

---

## TEST 7: Security

### Test 7.1: Tenant Isolation
```
Pasos:
1. Crear 2 usuarios en 2 compañías diferentes
2. Usuario A intenta acceder a count de Usuario B
3. Verificar: 403 Access Denied
```

### Test 7.2: Authentication Required
```
Pasos:
1. Hacer request sin JWT token
2. Verificar: 401 Unauthorized
```

### Test 7.3: Invalid Token
```
Pasos:
1. Usar token expirado o inválido
2. Verificar: 401 Unauthorized
```

---

## TEST 8: Performance

### Test 8.1: Carga Grande de Items
```
Pasos:
1. Cargar inventario con 1000+ items
2. Medir tiempo de carga
3. Verificar lista se carga en < 2 segundos
4. Verificar paginación si existe
```

### Test 8.2: Sincronización Grande
```
Pasos:
1. Sincronizar 500+ items
2. Medir tiempo total
3. Verificar duration en response
4. Verificar progress si existe
```

---

## Checklist de Testing Completo

### Antes de Empezar
- [ ] Backend running en http://localhost:3001
- [ ] Frontend running en http://localhost:3000
- [ ] Database (PostgreSQL) running
- [ ] ERP (MSSQL Catelli) accessible
- [ ] JWT token válido para testing
- [ ] Company/Warehouse creados en DB

### Fase 1 Testing
- [ ] Frontend no tiene datos hardcodeados
- [ ] Dropdowns cargan dinámicamente
- [ ] Network tab muestra todas las llamadas API

### Fase 2 Testing
- [ ] Cargar inventario exitoso
- [ ] InventoryCount creado en DB
- [ ] InventoryCount_Item creados
- [ ] systemQty poblado correctamente
- [ ] Error handling funciona

### Fase 3 Testing
- [ ] Página abre correctamente
- [ ] Cargua items del conteo
- [ ] Actualizar item funciona
- [ ] Variance se calcula
- [ ] Status transiciona DRAFT → IN_PROGRESS → COMPLETED
- [ ] No permite completar si items sin contar
- [ ] Descartar conteo funciona

### Fase 4 Testing
- [ ] Validación de precondiciones
- [ ] Obtener items sincronizables
- [ ] Seleccionar estrategia REPLACE
- [ ] Seleccionar estrategia ADD
- [ ] Sincronización exitosa
- [ ] InventorySyncHistory creado
- [ ] Cantidades actualizadas en Catelli
- [ ] Ver historial
- [ ] Ver detalles de sincronización
- [ ] Error handling (partial failures)

### Security Testing
- [ ] Tenant isolation
- [ ] Authentication required
- [ ] Invalid token rejected

### Performance Testing
- [ ] Carga grande de items
- [ ] Sincronización grande

---

## Reportar Issues

Cuando encuentres un problema, documenta:

1. **Paso reproducible:** Qué hiciste exactamente
2. **Resultado esperado:** Qué debería haber pasado
3. **Resultado actual:** Qué pasó en realidad
4. **Logs:** Errores en console/backend logs
5. **DB State:** Verificar DB después del error

Ejemplo:
```
Issue: Sync fallido con "itemsSynced = 0"

Pasos:
1. Crear InventoryCount con 10 items
2. Contar todos los items
3. Completar conteo
4. Ir a sync page
5. Seleccionar REPLACE
6. Click "Start Sync"

Esperado: Items sincronizados, status = COMPLETED

Actual: status = FAILED, itemsSynced = 0

Error: "Query execution failed: Invalid column name 'TuCampo'"

DB State: InventoryCount.status = COMPLETED, InventorySyncHistory.status = FAILED
```

---

## Orden de Ejecución Recomendado

1. **TEST 1** - Frontend Dinámico (10 min)
2. **TEST 2** - Cargar Inventario (15 min)
3. **TEST 3** - Conteo Físico (20 min)
4. **TEST 4** - Sincronización REPLACE (15 min)
5. **TEST 5** - Sincronización ADD (10 min)
6. **TEST 6** - Error Handling (20 min)
7. **TEST 7** - Security (15 min)
8. **TEST 8** - Performance (15 min)

**Tiempo Total Estimado:** 2 horas

---

**Status:** 🟢 Listo para Testing
**Última Actualización:** 2026-02-21
