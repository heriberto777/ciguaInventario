# 📋 CHECKLIST COMPLETO: Estado Actual vs Próximos Pasos

**Fecha:** 22 de Febrero de 2026 - 20:30
**Última actualización:** Después de análisis y documentación

---

## ✅ YA COMPLETADO EN ESTA SESIÓN

### 🔴 Error Crítico (Corregido)
- [x] Identificado error `countedQty` en repository.ts
- [x] Entendido que `countedQty` fue eliminado en migración de versionado
- [x] Reemplazado por `countedQty_V1` en repository.ts (línea 81)
- [x] Agregado `currentVersion: 1` en creación de items
- [x] Agregado `status: 'PENDING'` en creación de items
- [x] Actualizado varianceReport para incluir `version: 1`

### 📚 Documentación Generada
- [x] `REESTRUCTURA_CONTEOS_UI_Y_TABLA.md` (112 páginas)
  - Análisis del problema actual
  - Propuesta de solución completa
  - SQL de migración
  - Código TypeScript de servicios
  - Flujos de UI

- [x] `RESUMEN_CORRECCION_Y_PLAN.md` (8 páginas)
  - Explicación del error
  - Tu análisis (excelente)
  - Plan de 3-4 días
  - Comparativa ANTES vs DESPUÉS

- [x] `DIAGRAMA_VISUAL_ARQUITECTURA_CONTEOS.md` (10 páginas)
  - Diagramas ASCII de flujos
  - Máquina de estados
  - Estructura de datos
  - Caso de uso completo
  - Validaciones de negocio
  - Índices de BD

- [x] `RESUMEN_FINAL_CORRECCCION_Y_PROPUESTA.md` (9 páginas)
  - Resumen ejecutivo
  - Cambios propuestos en código
  - Timeline
  - Preguntas clave

### 🎨 Diseño Arquitectura
- [x] Diseño de nuevos campos en `InventoryCount`
- [x] Diseño de máquina de estados (5 estados)
- [x] Diseño de secuencias (`CONT-YYYY-NNN`)
- [x] Diseño de plantilla UI
- [x] Diseño de botones contextuales por estado
- [x] Diseño de modal "Crear Nuevo Conteo"
- [x] Validaciones de negocio definidas
- [x] Índices de BD planificados

---

## ⏳ PRÓXIMO PASO 1: MIGRACIÓN BD (~1-2 horas)

### Schema Prisma
- [ ] Agregar campo `sequenceNumber` a `InventoryCount`
  ```prisma
  sequenceNumber String @unique
  ```

- [ ] Agregar campo `status` a `InventoryCount`
  ```prisma
  status String @default("DRAFT")
  ```

- [ ] Agregar campos de timestamp
  ```prisma
  completedAt DateTime?
  closedAt DateTime?
  ```

- [ ] Agregar campos de auditoría
  ```prisma
  createdBy String
  startedBy String?
  completedBy String?
  closedBy String?
  ```

- [ ] Agregar campo de notas
  ```prisma
  notes String?
  ```

### Migración SQL
- [ ] Crear migración: `npx prisma migrate dev --name add_state_fields_to_inventory_count`
- [ ] ALTER TABLE "InventoryCount" ADD COLUMN "sequenceNumber" TEXT UNIQUE;
- [ ] ALTER TABLE "InventoryCount" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';
- [ ] Generar secuencias para conteos existentes
- [ ] Crear índices de performance
- [ ] Validar migración ejecuta sin errores

### Validación
- [ ] Conteos existentes mantienen estado ACTIVE
- [ ] Conteos existentes obtienen sequenceNumber único
- [ ] Nueva base de datos lista para consultas

---

## ⏳ PRÓXIMO PASO 2: BACKEND SERVICES (~3-4 horas)

### InventoryCountService - Nuevos Métodos
- [ ] `generateSequenceNumber(companyId, year)` - Auto-genera CONT-2026-001
- [ ] `getActiveCountByWarehouse(companyId, warehouseId)` - Verifica bloqueos
- [ ] `createNewInventoryCount(...)` - Crea con validaciones
  - Validar no existe ACTIVE en almacén
  - Validar mapping existe
  - Generar sequenceNumber
  - Crear conteo en estado DRAFT

- [ ] `startInventoryCount(countId, userId)` - DRAFT → ACTIVE
- [ ] `completeInventoryCount(countId, userId)` - ACTIVE → COMPLETED
- [ ] `pauseInventoryCount(countId)` - ACTIVE → ON_HOLD
- [ ] `resumeInventoryCount(countId)` - ON_HOLD → ACTIVE
- [ ] `closeInventoryCount(countId, userId)` - COMPLETED → CLOSED

### InventoryCountController - Nuevos Endpoints
- [ ] POST `/inventory-counts` → createNewInventoryCount
  - Body: { warehouseId, mappingConfigId }
  - Response: Conteo creado con sequenceNumber

- [ ] POST `/inventory-counts/:id/start` → startInventoryCount
- [ ] POST `/inventory-counts/:id/complete` → completeInventoryCount
- [ ] POST `/inventory-counts/:id/pause` → pauseInventoryCount
- [ ] POST `/inventory-counts/:id/resume` → resumeInventoryCount
- [ ] POST `/inventory-counts/:id/close` → closeInventoryCount

### Validaciones de Negocio
- [ ] No permitir 2 conteos ACTIVE del mismo almacén
- [ ] No permitir cambios de estado inválidos
- [ ] Validar usuario tiene permisos
- [ ] Generar errores claros con AppError

### Testing
- [ ] Test: Crear conteo (genera sequenceNumber)
- [ ] Test: Bloqueo cuando existe ACTIVE
- [ ] Test: Máquina de estados correcta
- [ ] Test: Auditoría (createdBy, startedBy, etc.)

---

## ⏳ PRÓXIMO PASO 3: FRONTEND - PLANTILLA (~4-5 horas)

### Nueva Página: `/inventory-counts/dashboard`
- [ ] Crear componente `InventoryCountDashboard.tsx`
- [ ] Implementar tabla con 4 secciones
  - [ ] Sección "CONTEOS ACTIVOS" (máx 1)
  - [ ] Sección "CONTEOS PENDIENTES" (estado DRAFT)
  - [ ] Sección "CONTEOS COMPLETADOS" (estado COMPLETED)
  - [ ] Sección "CONTEOS CERRADOS" (estado CLOSED)

- [ ] Implementar columnas principales
  - [ ] Secuencia (CONT-2026-001)
  - [ ] Almacén
  - [ ] Status (🟢 ACTIVO, ✅ OK, 🔒 CERRADO)
  - [ ] Versión (V1/V1, V2/V3, etc.)
  - [ ] Fecha (Inicio o Completado)
  - [ ] Responsable
  - [ ] Botones de Acciones

- [ ] Implementar filtros
  - [ ] Filtro por Almacén
  - [ ] Filtro por Estado
  - [ ] Búsqueda por Secuencia
  - [ ] Filtro por Fecha

- [ ] Implementar botón "Crear Nuevo"
  - [ ] Abre modal de creación
  - [ ] Selecciona almacén (muestra estado disponibilidad)
  - [ ] Selecciona mapping
  - [ ] Muestra resumen
  - [ ] Crea conteo en estado DRAFT

### Modal: "Crear Nuevo Conteo"
- [ ] Componente `CreateInventoryCountModal.tsx`
- [ ] Paso 1: Selector de Almacén
  - [ ] Lista almacenes con estado (✅ Disponible / ⚠️ BLOQUEADO)
  - [ ] Muestra conteo activo si existe
  - [ ] Deshabilita almacenes bloqueados

- [ ] Paso 2: Selector de Mapping
  - [ ] Carga mappings disponibles
  - [ ] Muestra cantidad de artículos

- [ ] Paso 3: Confirmación
  - [ ] Muestra resumen (Secuencia autogenerada)
  - [ ] Botones [CANCELAR] [CREAR]
  - [ ] Envía POST a `/inventory-counts`

- [ ] Manejo de errores
  - [ ] Si almacén bloqueado → error claro
  - [ ] Si mapping no existe → error
  - [ ] Si falla creación → error

### Acciones en Tabla
- [ ] Botón "Continuar" (▶) → Va a página de conteo
- [ ] Botón "Opciones" (⚙️) → Abre dropdown
  - [ ] Ver Detalles
  - [ ] Pausar (si ACTIVE)
  - [ ] Reanudar (si ON_HOLD)
  - [ ] Ver Varianzas (si ACTIVE)
  - [ ] Crear V2 (si ACTIVE con varianzas)
  - [ ] Completar (si ACTIVE)
  - [ ] Cerrar (si COMPLETED)

---

## ⏳ PRÓXIMO PASO 4: FRONTEND - PÁGINA CONTEO (~3-4 horas)

### Actualizar InventoryCountPage.tsx
- [ ] Mostrar secuencia en header
  ```
  CONTEO: CONT-2026-001 | ALMACÉN A | Status: 🟢 ACTIVO
  ```

- [ ] Mostrar indicador de versión
  ```
  Versión Actual: V1 | Total Versiones: 1
  ```

- [ ] Panel de información
  - [ ] Secuencia
  - [ ] Almacén
  - [ ] Responsable (createdBy)
  - [ ] Inicio (startedAt)
  - [ ] Items totales
  - [ ] Items contados
  - [ ] Varianzas detectadas

- [ ] Barra de progreso mejorada
  ```
  Progreso: [████████░░] 75% (375/500)
  ```

- [ ] Tabla de items
  - [ ] Código | Descripción | Sistema | V1 | Status
  - [ ] Filtrar por status
  - [ ] Buscar por código

- [ ] Botones contextuales según estado
  - [ ] DRAFT: [Iniciar], [Editar], [Cancelar]
  - [ ] ACTIVE: [Completar], [Ver Varianzas], [Crear V2], [Pausar], [Notas]
  - [ ] ON_HOLD: [Reanudar], [Notas], [Cambiar Resp], [Cancelar]
  - [ ] COMPLETED: [Ver Detalles], [Descargar PDF], [Cerrar]
  - [ ] CLOSED: [Ver], [PDF], [Auditoría]

### Modal: "Ver Varianzas"
- [ ] Mostrar tabla de items con varianza
- [ ] Columnas: Código | Sistema | V1 | Diferencia | % Var
- [ ] Botón [Crear Versión 2]
  - [ ] Valida que existen varianzas
  - [ ] Crea V2
  - [ ] Recarga página

### Llamadas a API
- [ ] GET `/inventory-counts/:id` → Obtener detalles
- [ ] POST `/inventory-counts/:id/start` → Iniciar
- [ ] POST `/inventory-counts/:id/complete` → Completar
- [ ] POST `/inventory-counts/:id/pause` → Pausar
- [ ] POST `/inventory-counts/:id/resume` → Reanudar
- [ ] POST `/inventory-counts/:id/close` → Cerrar
- [ ] POST `/inventory-counts/:id/new-version` → Crear V2

---

## ⏳ PRÓXIMO PASO 5: TESTING (~3-4 horas)

### Tests Unitarios Backend
- [ ] InventoryCountService
  - [ ] Test createNewInventoryCount
  - [ ] Test getActiveCountByWarehouse
  - [ ] Test máquina de estados
  - [ ] Test generación de secuencias
  - [ ] Test validaciones

- [ ] InventoryCountController
  - [ ] Test endpoints
  - [ ] Test validación de input
  - [ ] Test error handling
  - [ ] Test respuestas

### Tests E2E
- [ ] Crear conteo completo (DRAFT → ACTIVE → COMPLETED → CLOSED)
- [ ] Validar bloqueo de 2 conteos simultáneos
- [ ] Crear conteo, pausar, reanudar
- [ ] Crear V2 con varianzas
- [ ] Flujo completamente (8 pasos)

### Tests UI (Manual + Automático)
- [ ] Plantilla de conteos carga correctamente
- [ ] Modal "Crear Nuevo" funciona
- [ ] Botones contextuales aparecen según estado
- [ ] Flujos de click funcionan
- [ ] Errores se muestran correctamente

---

## 📊 ESTADO ACTUAL POR COMPONENTE

### Base de Datos
```
Status: ⏳ PENDIENTE
├─ Schema: Definido (documento)
├─ Migración: No creada
├─ Índices: Diseñados
└─ Testing: Necesario
```

### Backend Service
```
Status: ⏳ PENDIENTE
├─ Métodos: Diseñados (código)
├─ Implementación: No hecha
├─ Tests: No hechos
└─ Endpoints: Necesarios
```

### Frontend
```
Status: ⏳ PENDIENTE
├─ Plantilla: Diseñada (diagramas)
├─ Componentes: No creados
├─ Modal: No creado
├─ Acciones: No implementadas
└─ Integración API: Necesaria
```

### Documentación
```
Status: ✅ COMPLETADO
├─ Análisis: Hecho
├─ Diagramas: Creados
├─ Especificación: Completa
└─ Timeline: Definido
```

---

## 🎯 PRÓXIMAS 4 HORAS (Si empezamos ahora)

```
HORA 1: BD Migración
├─ Actualizar schema.prisma
├─ Crear migración
├─ Ejecutar y validar

HORA 2: Backend Service
├─ Crear métodos
├─ Implementar validaciones
├─ Tests básicos

HORA 3: Backend Controller
├─ Crear endpoints
├─ Validación input/output
├─ Error handling

HORA 4: Frontend - Plantilla
├─ Crear componente Dashboard
├─ Modal de creación
├─ Integración API

FALTA (2-3 horas): Página de conteo + botones contextuales + testing
```

---

## ✅ RESUMEN FINAL

### Lo que ya está HECHO ✅
- Corrección del error `countedQty` → `countedQty_V1`
- Análisis completo de la problemática
- Diseño de arquitectura completa
- Documentación exhaustiva (40+ páginas)
- Plan de implementación paso a paso

### Lo que FALTA
- Migración de BD
- Métodos en InventoryCountService
- Endpoints en InventoryCountController
- Página de plantilla de conteos
- Modal de crear nuevo conteo
- Actualización de página de conteo
- Botones contextuales
- Testing

**Tiempo estimado:** 3-4 días (si trabajas 8 horas/día)
**Riesgo:** Bajo (todo documentado)
**Complejidad:** Media (máquina de estados simple)

---

## 🚦 SEMÁFORO

| Componente | Status | Progreso | Bloques |
|-----------|--------|----------|---------|
| Corrección error | ✅ DONE | 100% | Ninguno |
| Análisis | ✅ DONE | 100% | Ninguno |
| Diseño | ✅ DONE | 100% | Ninguno |
| Documentación | ✅ DONE | 100% | Ninguno |
| BD Migración | 🟡 TODO | 0% | Hacer primero |
| Backend | 🟡 TODO | 0% | Espera BD |
| Frontend | 🟡 TODO | 0% | Espera Backend |
| Testing | 🟡 TODO | 0% | Al final |

---

## 📞 ¿QUÉ NECESITO DE TI?

- [ ] ¿Procedo con BD migración mañana?
- [ ] ¿Necesitas que prioritarice algo?
- [ ] ¿Hay deadline específico?
- [ ] ¿Alguna pregunta sobre el diseño?

**Estoy listo para comenzar cuando des la orden. Todo está documentado y diseñado.**

