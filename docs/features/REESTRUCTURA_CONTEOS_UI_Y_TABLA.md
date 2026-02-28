# 🔄 REESTRUCTURA: Gestión de Conteos de Inventario

**Fecha:** 22 de Febrero de 2026
**Estado:** Análisis y Diseño
**Prioridad:** CRÍTICA

---

## 🎯 Objetivo

Cambiar de un flujo "Iniciar Conteo" directo a un sistema robusto donde:

1. ✅ Existe un **número/secuencia** único para cada conteo
2. ✅ Solo **1 conteo ACTIVO por almacén** a la vez
3. ✅ **Plantilla de conteos** que lista todos (activos, cerrados, pausados)
4. ✅ **Botones inteligentes** según estado del conteo
5. ✅ Seguimiento claro de versiones (V1, V2, V3...)

---

## 📊 PROBLEMA ACTUAL

```
❌ Flujo actual:
   Página de Conteos → [Botón "Iniciar Conteo"]
   → Seleccionar Almacén
   → Seleccionar Mapping
   → Iniciar

PROBLEMAS:
   - No hay número/ID visible para rastrear
   - Permite múltiples conteos simultáneos del mismo almacén
   - No muestra estado (activo, pausado, cerrado)
   - No hay forma de "continuar" uno existente
   - Sin historial de versiones visible
```

---

## ✅ SOLUCIÓN PROPUESTA

### 1. ESTRUCTURA DE TABLA `InventoryCount` (Mejorada)

#### Campos Actuales vs Nuevos

```prisma
model InventoryCount {
  // ✅ Identificadores únicos
  id        String   @id @default(cuid())
  sequenceNumber   String   @unique  // "CONT-2026-001", "CONT-2026-002"
  companyId String

  // ✅ Ubicación
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])

  locationId  String?
  location    Warehouse_Location? @relation(fields: [locationId], references: [id])

  // ✅ Estado del conteo
  status      String   @default("DRAFT")  // DRAFT, ACTIVE, ON_HOLD, COMPLETED, CLOSED, CANCELLED

  // ✅ Versionado
  currentVersion  Int  @default(1)
  totalVersions   Int  @default(1)

  // ✅ Mapeo
  mappingConfigId String?
  mappingConfig   MappingConfig? @relation(fields: [mappingConfigId], references: [id])

  // ✅ Auditoría temporal
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  closedAt     DateTime?

  // ✅ Responsables
  createdBy    String   // Usuario que inició
  startedBy    String?  // Usuario que activó
  completedBy  String?  // Usuario que terminó
  closedBy     String?  // Usuario que cerró

  // ✅ Notas y observaciones
  notes        String?

  // ✅ Relaciones
  items        InventoryCount_Item[]
  varianceReports VarianceReport[]
}
```

#### Transición de valores

```typescript
// Conteo NUEVO (recién creado)
sequenceNumber: "CONT-2026-001"
status: "DRAFT"           // ← Aún no inicia conteo
currentVersion: 1
startedAt: 2026-02-22     // Cuándo se creó
completedAt: null
closedAt: null

// Conteo EN PROCESO
status: "ACTIVE"          // ← Actualmente contando
currentVersion: 1
startedAt: 2026-02-22     // Cuándo se inició
completedAt: null

// Conteo CON VARIANZAS (Necesita Reconteo)
status: "ACTIVE"          // ← Sigue activo (V2 creada)
currentVersion: 2         // ← Ahora en V2
totalVersions: 2

// Conteo COMPLETADO (Cierre de conteo)
status: "COMPLETED"       // ← Conteo finalizado
completedAt: 2026-02-22   // Cuándo se completó

// Conteo CERRADO (Proceso terminado)
status: "CLOSED"          // ← Ya no se modifica
closedAt: 2026-02-22      // Cuándo se cerró
```

---

## 🎨 FLUJO UI - NUEVA ARQUITECTURA

### PASO 1: PLANTILLA DE CONTEOS (Nueva Página)

```
╔════════════════════════════════════════════════════════════╗
║         GESTIÓN DE CONTEOS DE INVENTARIO                  ║
║                                                            ║
║  [Almacén: Todos ▼] [Estado: Todos ▼] [Buscar...]   ║
║  [+ Crear Nuevo Conteo] [Exportar]                    ║
║════════════════════════════════════════════════════════════║
║
║  📌 CONTEOS ACTIVOS (1)
║  ┌─────────────────────────────────────────────────────────┐
║  │ #  Secuencia    Almacén      Status      Versión  Acciones
║  ├─────────────────────────────────────────────────────────┤
║  │ 1  CONT-2026-001 ALMACÉN A    🟢 ACTIVO  V1/V1   [▶ Cont.] [⚙️]
║  └─────────────────────────────────────────────────────────┘
║
║  📋 CONTEOS PENDIENTES (0)
║  └─ Sin conteos en estado DRAFT
║
║  ✅ CONTEOS COMPLETADOS (3)
║  ┌─────────────────────────────────────────────────────────┐
║  │ #  Secuencia    Almacén      Completado  Versión  Acciones
║  ├─────────────────────────────────────────────────────────┤
║  │ 1  CONT-2026-A01 ALMACÉN B    2026-02-21 V2/V3   [👁️] [⬇️]
║  │ 2  CONT-2025-B08 ALMACÉN C    2026-02-20 V1/V1   [👁️] [⬇️]
║  │ 3  CONT-2025-C15 ALMACÉN D    2026-02-19 V3/V3   [👁️] [⬇️]
║  └─────────────────────────────────────────────────────────┘
║
║  🔒 CONTEOS CERRADOS (8)
║  └─ [Ver archivados ↓]
║
╚════════════════════════════════════════════════════════════╝
```

#### Columnas principales

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Secuencia | ID único generado automático | `CONT-2026-001` |
| Almacén | Ubicación del conteo | `ALMACÉN A` |
| Status | Estado actual | 🟢 ACTIVO, ⏸️ PAUSADO, ✅ COMPLETADO |
| Versión | V actual / V total | `V1/V1` (sin varianzas), `V2/V3` (en proceso) |
| Fecha Inicio | Cuándo se inició | `2026-02-22 10:30` |
| Responsable | Quién lo creó | `Juan López` |
| Acciones | Botones contextuales | ▶️ Continuar, ⚙️ Opciones |

---

### PASO 2: MODAL / SIDEBAR "CREAR NUEVO CONTEO"

```
╔════════════════════════════════════════════════════════════╗
║  ➕ CREAR NUEVO CONTEO                              [X]   ║
╠════════════════════════════════════════════════════════════╣
║
║  1️⃣  SELECCIONAR ALMACÉN
║  ┌────────────────────────────────────────────────────────┐
║  │ -- Seleccionar Almacén --                      ▼       │
║  │ • ALMACÉN A   (0 conteos activos)  ✅               │
║  │ • ALMACÉN B   (1 conteo activo)    ⚠️ BLOQUEADO   │
║  │ • ALMACÉN C   (0 conteos activos)  ✅               │
║  └────────────────────────────────────────────────────────┘
║
║  ℹ️  Un almacén solo puede tener 1 conteo activo.
║      ALMACÉN B tiene uno en progreso.
║
║  2️⃣  SELECCIONAR MAPPING
║  ┌────────────────────────────────────────────────────────┐
║  │ -- Seleccionar Mapping (Artículos a Cargar) --  ▼     │
║  │ • Mapping Principales     (523 artículos)             │
║  │ • Mapping Complementarios (87 artículos)              │
║  └────────────────────────────────────────────────────────┘
║
║  3️⃣  CONFIRMAR
║  ┌────────────────────────────────────────────────────────┐
║  │
║  │  Se creará:
║  │  • Secuencia: CONT-2026-002
║  │  • Almacén: ALMACÉN A
║  │  • Artículos: 523
║  │  • Versión: V1
║  │  • Estado: ACTIVE
║  │
║  │  [CANCELAR]                    [✓ CREAR CONTEO]
║  │
║  └────────────────────────────────────────────────────────┘
║
╚════════════════════════════════════════════════════════════╝
```

---

### PASO 3: PÁGINA DE CONTEO (Mejorada)

```
╔════════════════════════════════════════════════════════════╗
║  CONTEO: CONT-2026-001 | ALMACÉN A | V1                   ║
║  Status: 🟢 ACTIVO | Responsable: Juan López              ║
╠════════════════════════════════════════════════════════════╣
║
║  Progreso: [████████░░] 80% (400/500 items)
║
║  ┌───────────────────────┬──────────────────────────────┐
║  │ INFORMACIÓN CONTEO    │ ACCIONES CONTEXTUALES        │
║  ├───────────────────────┼──────────────────────────────┤
║  │ Secuencia: CONT-002   │ [✓ Completar V1]            │
║  │ Almacén: ALMACÉN A    │ [📊 Ver Resumen]            │
║  │ Versión Actual: 1/1   │ [⏸️  Pausar Conteo]         │
║  │ Inicio: 2026-02-22    │ [📝 Notas]                  │
║  │ Artículos: 500        │                              │
║  │ Contados: 400         │                              │
║  │ Varianzas: 23         │                              │
║  │ Pendientes: 100       │                              │
║  └───────────────────────┴──────────────────────────────┘
║
║  [Tabla de Conteos]
║  ┌──────────────────────────────────────────────────────┐
║  │ Código  Descripción          Sistema  Contado Status │
║  ├──────────────────────────────────────────────────────┤
║  │ 3622    CEP 3PK 360          4        0      ⏳ PEND. │
║  │ 3623    PALM CHERRY          54       54     ✅ OK   │
║  │ 3664    CEP PREMIER          838      825    ⚠️ VAR.  │
║  │ ...                                                   │
║  │ [Cargar más items]                                   │
║  └──────────────────────────────────────────────────────┘
║
╚════════════════════════════════════════════════════════════╝
```

#### Estados de Items

- `⏳ PENDING` - Aún no contado
- `✅ OK` - Contado sin varianza
- `⚠️ VARIANCE` - Diferencia detectada (candidato para V2)
- `🔒 LOCKED` - Validado en reconteo (V2+)

---

### PASO 4: MODAL "VER VARIANZAS + CREAR V2"

```
╔════════════════════════════════════════════════════════════╗
║  VARIANZAS DETECTADAS - CONTEO: CONT-2026-001         [X] ║
╠════════════════════════════════════════════════════════════╣
║
║  Resumen:
║  • Items con varianza: 23
║  • Diferencia total: -127 unidades
║  • % Afectado: 4.6%
║
║  [Tabla de varianzas]
║  ┌──────────────────────────────────────────────────────┐
║  │ Código  Sistema  V1 Contado  Diferencia  % Var.     │
║  ├──────────────────────────────────────────────────────┤
║  │ 3664    838      825        -13        -1.55%       │
║  │ 3740    4256     4200       -56        -1.31%       │
║  │ 3631    2299     2220       -79        -3.43%       │
║  │ 3640    5        3          -2         -40.0%       │
║  │ ...                                                   │
║  └──────────────────────────────────────────────────────┘
║
║  Opciones:
║  ┌──────────────────────────────────────────────────────┐
║  │
║  │  [⬅️ Continuar contando V1]
║  │
║  │  [✓ CREAR VERSIÓN 2 para reconteo]
║  │
║  │  Si creas V2:
║  │  ✓ Se cargarán SOLO estos 23 items
║  │  ✓ Podrás recontarlos
║  │  ✓ Se comparará V1 vs V2
║  │  ✓ Se generará reporte final
║  │
║  └──────────────────────────────────────────────────────┘
║
╚════════════════════════════════════════════════════════════╝
```

---

## 🔄 FLUJOS DE ESTADO

### Estado 1: DRAFT (Recién Creado)

```
Cuando: Se crea nuevo conteo pero no se ha iniciado
Acciones disponibles:
  ✅ [Iniciar Conteo] → ACTIVE
  ✅ [Editar Datos]
  ✅ [Cancelar] → CANCELLED

Botones DESHABILITADOS:
  ❌ Crear V2
  ❌ Completar
  ❌ Pausar
```

### Estado 2: ACTIVE (En Conteo)

```
Cuando: Conteo iniciado, se está cargando/contando
Acciones disponibles:
  ✅ [Completar V1] → COMPLETED (si está completo)
  ✅ [Pausar] → ON_HOLD
  ✅ [Ver Varianzas]
  ✅ [Crear V2] (si hay varianzas)
  ✅ [Notas/Observaciones]

Ver en tiempo real:
  • Progreso (X de Y items)
  • Varianzas detectadas
  • Responsable actual
```

### Estado 3: ON_HOLD (Pausado)

```
Cuando: Usuario pausó temporalmente
Acciones disponibles:
  ✅ [Reanudar] → ACTIVE
  ✅ [Notas]
  ✅ [Cambiar Responsable]
  ✅ [Cancelar] → CANCELLED

Botones DESHABILITADOS:
  ❌ Completar
  ❌ Crear V2
```

### Estado 4: COMPLETED (Conteo Finalizado)

```
Cuando: Se completó el conteo (todas las versiones)
Acciones disponibles:
  ✅ [Ver Detalle]
  ✅ [Descargar Reporte]
  ✅ [Crear Nuevo Conteo] (otro almacén)
  ✅ [Cerrar] → CLOSED

Ver:
  • Resumen final con varianzas
  • Historial de versiones
  • Responsables por versión
```

### Estado 5: CLOSED (Archivado)

```
Cuando: Se cerró formalmente (no se modifica más)
Acciones disponibles:
  ✅ [Ver (Solo lectura)]
  ✅ [Descargar Reporte PDF]
  ✅ [Ver Auditoría]

NO se puede:
  ❌ Modificar nada
  ❌ Agregar items
  ❌ Crear nuevas versiones
```

---

## 🗄️ SECUENCIAS DE NUMERACIÓN

### Formato de Secuencia

```
CONT-YYYY-NNN

Ejemplo: CONT-2026-001
         CONT-2026-002
         CONT-2026-100
         CONT-2027-001

Donde:
  CONT = Prefijo fijo (Conteo)
  YYYY = Año
  NNN = Secuencial por año (001-999)

Auto-generado en backend:
```

```typescript
// En InventoryCountService.ts
private async generateSequenceNumber(companyId: string, year: number): Promise<string> {
  const lastCount = await this.prisma.inventoryCount.findFirst({
    where: {
      companyId,
      sequenceNumber: {
        startsWith: `CONT-${year}-`,
      },
    },
    orderBy: {
      sequenceNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastCount) {
    const lastNum = parseInt(lastCount.sequenceNumber.split('-')[2]);
    nextNumber = lastNum + 1;
  }

  return `CONT-${year}-${String(nextNumber).padStart(3, '0')}`;
}
```

---

## 📈 CAMBIOS EN EL CÓDIGO

### 1. MODELO PRISMA (schema.prisma)

```prisma
model InventoryCount {
  id        String   @id @default(cuid())
  sequenceNumber String @unique  // ← NUEVO

  companyId String
  warehouseId String
  locationId  String?
  mappingConfigId String?

  status    String   @default("DRAFT")  // ← NUEVO: DRAFT, ACTIVE, ON_HOLD, COMPLETED, CLOSED, CANCELLED
  currentVersion  Int @default(1)
  totalVersions   Int @default(1)

  startedAt    DateTime @default(now())
  completedAt  DateTime?  // ← NUEVO
  closedAt     DateTime?  // ← NUEVO

  createdBy    String  // ← NUEVO
  startedBy    String?  // ← NUEVO
  completedBy  String?  // ← NUEVO
  closedBy     String?  // ← NUEVO

  notes        String?  // ← NUEVO

  // ... relaciones ...
}
```

### 2. MIGRACIÓN PRISMA

```sql
-- Agregar columnas nuevas a InventoryCount
ALTER TABLE "InventoryCount" ADD COLUMN "sequenceNumber" TEXT UNIQUE;
ALTER TABLE "InventoryCount" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "InventoryCount" ADD COLUMN "completedAt" TIMESTAMP;
ALTER TABLE "InventoryCount" ADD COLUMN "closedAt" TIMESTAMP;
ALTER TABLE "InventoryCount" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "InventoryCount" ADD COLUMN "startedBy" TEXT;
ALTER TABLE "InventoryCount" ADD COLUMN "completedBy" TEXT;
ALTER TABLE "InventoryCount" ADD COLUMN "closedBy" TEXT;
ALTER TABLE "InventoryCount" ADD COLUMN "notes" TEXT;

-- Generar secuencias para conteos existentes
UPDATE "InventoryCount"
SET "sequenceNumber" = 'CONT-2026-' || LPAD(ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt")::TEXT, 3, '0')
WHERE "sequenceNumber" IS NULL;

-- Marcar conteos existentes como COMPLETED
UPDATE "InventoryCount"
SET "status" = 'COMPLETED', "completedAt" = "createdAt"
WHERE "status" = 'ACTIVE';

-- Crear índices para mejor performance
CREATE INDEX idx_inventory_count_sequence ON "InventoryCount"("sequenceNumber");
CREATE INDEX idx_inventory_count_status ON "InventoryCount"("status", "warehouseId");
CREATE INDEX idx_inventory_count_warehouse ON "InventoryCount"("warehouseId", "status");
```

### 3. SERVICIO (Nuevo método)

```typescript
// InventoryCountService.ts

async createNewInventoryCount(
  companyId: string,
  warehouseId: string,
  mappingConfigId: string,
  createdBy: string
): Promise<InventoryCount> {
  // 1. Validar que no existe conteo ACTIVE en este almacén
  const activeCount = await this.prisma.inventoryCount.findFirst({
    where: {
      companyId,
      warehouseId,
      status: 'ACTIVE',
    },
  });

  if (activeCount) {
    throw new AppError({
      code: 'INVENTORY_COUNT_ACTIVE',
      message: `Ya existe un conteo activo: ${activeCount.sequenceNumber}`,
      statusCode: 400,
    });
  }

  // 2. Generar secuencia única
  const year = new Date().getFullYear();
  const sequenceNumber = await this.generateSequenceNumber(companyId, year);

  // 3. Crear conteo
  const newCount = await this.prisma.inventoryCount.create({
    data: {
      sequenceNumber,
      companyId,
      warehouseId,
      mappingConfigId,
      createdBy,
      status: 'DRAFT',  // Comienza en DRAFT
      currentVersion: 1,
      totalVersions: 1,
    },
  });

  return newCount;
}

async startInventoryCount(countId: string, userId: string): Promise<void> {
  const count = await this.prisma.inventoryCount.findUnique({
    where: { id: countId },
  });

  if (!count) throw new AppError({ code: 'NOT_FOUND', statusCode: 404 });

  if (count.status !== 'DRAFT') {
    throw new AppError({
      code: 'INVALID_STATUS',
      message: 'El conteo no está en estado DRAFT',
      statusCode: 400,
    });
  }

  await this.prisma.inventoryCount.update({
    where: { id: countId },
    data: {
      status: 'ACTIVE',
      startedBy: userId,
    },
  });
}

async completeInventoryCount(countId: string, userId: string): Promise<void> {
  const count = await this.prisma.inventoryCount.findUnique({
    where: { id: countId },
  });

  if (count.status !== 'ACTIVE') {
    throw new AppError({
      code: 'INVALID_STATUS',
      message: 'El conteo no está ACTIVO',
      statusCode: 400,
    });
  }

  await this.prisma.inventoryCount.update({
    where: { id: countId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: userId,
    },
  });
}

async pauseInventoryCount(countId: string): Promise<void> {
  await this.prisma.inventoryCount.update({
    where: { id: countId },
    data: { status: 'ON_HOLD' },
  });
}

async resumeInventoryCount(countId: string): Promise<void> {
  await this.prisma.inventoryCount.update({
    where: { id: countId },
    data: { status: 'ACTIVE' },
  });
}

async closeInventoryCount(countId: string, userId: string): Promise<void> {
  await this.prisma.inventoryCount.update({
    where: { id: countId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: userId,
    },
  });
}
```

### 4. VALIDACIÓN EN CONTROLLER

```typescript
// inventory-counts.controller.ts

async createNew(req: FastifyRequest, res: FastifyReply) {
  const { warehouseId, mappingConfigId } = req.body as any;
  const companyId = (req.user as any).companyId;
  const userId = (req.user as any).id;

  // Validar que no existe ACTIVE
  const activeCount = await this.service.getActiveCountByWarehouse(
    companyId,
    warehouseId
  );

  if (activeCount) {
    return res.status(400).send({
      error: 'ACTIVE_COUNT_EXISTS',
      message: `Conteo activo existente: ${activeCount.sequenceNumber}`,
      activeCount: {
        id: activeCount.id,
        sequenceNumber: activeCount.sequenceNumber,
        status: activeCount.status,
        currentVersion: activeCount.currentVersion,
      },
    });
  }

  const newCount = await this.service.createNewInventoryCount(
    companyId,
    warehouseId,
    mappingConfigId,
    userId
  );

  return res.status(201).send({
    message: 'Conteo creado exitosamente',
    count: newCount,
  });
}
```

---

## 🎨 COLUMNAS PRIMARIAS EN TABLA

### InventoryCount_Item

```typescript
// Clave primaria
id: String @id @default(cuid())

// Índices compuestos clave
@@unique([countId, itemCode])  // Un item solo una vez por conteo
@@index([countId, currentVersion])  // Para consultas por versión
@@index([status])  // Para filtrar items por estado
@@index([locationId])  // Para consultas por ubicación

// Orden de importancia para UI
1. countId + itemCode (identificación)
2. systemQty (cantidad en sistema)
3. countedQty_V{N} (cantidad contada en versión N)
4. status (estado del item)
5. currentVersion (versión actual)
6. variance (calculado: countedQty - systemQty)
```

### Tabla UI (Orden de columnas)

```
┌──────┬──────────┬─────────────────────┬──────────┬──────────┬────────────┐
│ Item │ Código   │ Descripción         │ Sistema  │ V1       │ Status     │
├──────┼──────────┼─────────────────────┼──────────┼──────────┼────────────┤
│ 1    │ 3622     │ CEP 3PK 360         │ 4        │ 0        │ ⏳ PENDING │
│ 2    │ 3623     │ PALM CHERRY         │ 54       │ 54       │ ✅ OK      │
│ 3    │ 3664     │ CEP PREMIER         │ 838      │ 825      │ ⚠️ VARIANCE│
└──────┴──────────┴─────────────────────┴──────────┴──────────┴────────────┘
```

---

## 📋 PRÓXIMOS PASOS

### FASE 1: Base de datos (Esta semana)
- [ ] Crear migración con nuevos campos
- [ ] Actualizar schema.prisma
- [ ] Generar secuencias para datos existentes
- [ ] Crear índices

### FASE 2: Backend (Esta semana)
- [ ] Implementar métodos de servicio
- [ ] Crear endpoints de control de estado
- [ ] Validaciones de lógica de negocio
- [ ] Tests unitarios

### FASE 3: Frontend (Próxima semana)
- [ ] Nueva página de plantilla de conteos
- [ ] Modal de crear conteo
- [ ] Actualizar página de conteo existente
- [ ] Botones contextuales por estado

### FASE 4: QA (Próxima semana)
- [ ] Validar flujos de estado
- [ ] Pruebas de bloqueos (1 conteo activo)
- [ ] Verificar secuencias únicas
- [ ] Integración con móvil

---

## 🎯 BENEFICIOS

✅ **Rastreabilidad:** Cada conteo tiene número único
✅ **Control:** Solo 1 conteo activo por almacén
✅ **Claridad:** Estados claros en UI
✅ **Eficiencia:** Botones según contexto
✅ **Auditoría:** Quién inició, completó, cerró
✅ **Escalabilidad:** Soporte para múltiples versiones

---

**Estado:** Listo para implementación
**Estimado:** 3-4 días de desarrollo
**Riesgo:** Bajo (cambios principalmente de UI/lógica)

