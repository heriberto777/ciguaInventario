# 📊 DIAGRAMA VISUAL: Nueva Arquitectura de Conteos

---

## 1. FLUJO GENERAL

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    USUARIO ACCEDE A CONTEOS                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                 ↓
                    ┌────────────────────────┐
                    │  PÁGINA DASHBOARD      │
                    │  (Plantilla Conteos)   │
                    └────────────────────────┘
                                 ↓
                    ┌────────────────────────┐
        ┌──────────→ │ MOSTRAR:               │ ←──────────┐
        │           │ • Activos (1)          │            │
        │           │ • Pendientes (0)       │            │
        │           │ • Completados (3)      │            │
        │           │ • Cerrados (8)         │            │
        │           └────────────────────────┘            │
        │                      ↓                          │
        │        ┌─────────────────────────────┐          │
        │        │ USUARIO ELIGE ACCIÓN       │          │
        │        └─────────────────────────────┘          │
        │                      ↓                          │
        │     ┌────────────────┴────────────────┐         │
        │     ↓                                 ↓         │
   [CREAR NUEVO]                         [VER EXISTENTE] │
        │                                      │          │
        │                              ┌───────▼──────┐  │
        │                              │  CONT-001    │  │
        │                              │  Status      │  │
        │                              │  Versiones   │  │
        │                              │  Botones     │  │
        │                              └──────────────┘  │
        │                                      ↑          │
        └──────────────────────────────────────┘          │
                                                          │
                        ┌─────────────────────────────────┘
                        ↓
                  [FINALIZAR]
```

---

## 2. MÁQUINA DE ESTADOS

```
           ┏━━━━━━━━━┓
           ┃  DRAFT  ┃ (Recién creado)
           ┗━━━━━━━━━┛
               ↓
        [Iniciar Conteo]
               ↓
          ┏━━━━━━━━━┓
    ┌────→┃ ACTIVE  ┃←────────┐
    │     ┗━━━━━━━━━┛         │
    │          ↓ ↓            │
    │       ↙   ↓   ↖         │
    │      /    │    \        │
[Reanudar]  [Pausar] [Crear V2]
    │      \    │    /        │
    │       ↖   ↓   ↙         │
    │       ┏━━━━━━━━━┓       │
    └───────┃ ON_HOLD ┃───────┘
            ┗━━━━━━━━━┛
                ↓
        [Completar]
                ↓
           ┏━━━━━━━━━━━┓
           ┃ COMPLETED ┃
           ┗━━━━━━━━━━━┛
                ↓
            [Cerrar]
                ↓
           ┏━━━━━━━━━┓
           ┃ CLOSED  ┃ (Archivado)
           ┗━━━━━━━━━┛


    [Cualquier estado] → [Cancelar] → CANCELLED (final)
```

---

## 3. ESTRUCTURA DE DATOS

```
╔════════════════════════════════════════════════════════════════╗
║               INVENTORYCOUNT (Mejorado)                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  IDENTIFICADORES                                              ║
║  ├─ id: "cmly777g0000572ldto1lj3mn"                           ║
║  ├─ sequenceNumber: "CONT-2026-001" (✨ NUEVO)               ║
║  └─ companyId: "comp_123"                                     ║
║                                                                ║
║  UBICACIÓN                                                    ║
║  ├─ warehouseId: "ware_001"                                   ║
║  └─ locationId: "cmlxersop0007jsdo7zr1x8yz"                  ║
║                                                                ║
║  ESTADO (✨ NUEVO)                                            ║
║  ├─ status: "ACTIVE"  (DRAFT|ACTIVE|ON_HOLD|COMPLETED|...)  ║
║  ├─ currentVersion: 1 (V1, V2, V3...)                         ║
║  └─ totalVersions: 2  (Se incrementa con V2, V3...)          ║
║                                                                ║
║  VERSIONADO (Ya existía)                                      ║
║  ├─ items[]                                                   ║
║  │  ├─ countedQty_V1: 0    (Conteo en V1)                    ║
║  │  ├─ countedQty_V2: null (Aún no hay V2)                   ║
║  │  └─ status: "PENDING"   (PENDING|APPROVED|VARIANCE)       ║
║  └─ varianceReports[]                                         ║
║     ├─ version: 1                                             ║
║     └─ difference: -2                                         ║
║                                                                ║
║  AUDITORÍA (✨ NUEVO)                                         ║
║  ├─ createdBy: "user_123"                                     ║
║  ├─ startedBy: "user_123"                                     ║
║  ├─ completedBy: null                                         ║
║  ├─ closedBy: null                                            ║
║  ├─ createdAt: 2026-02-22T10:00Z                             ║
║  ├─ startedAt: 2026-02-22T10:05Z                             ║
║  ├─ completedAt: null                                         ║
║  └─ closedAt: null                                            ║
║                                                                ║
║  OBSERVACIONES (✨ NUEVO)                                     ║
║  └─ notes: "Revisar almacén C, hay movimiento de merch"      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 4. TABLA DE CONTEOS (UI)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                   GESTIÓN DE CONTEOS DE INVENTARIO                       ║
║                                                                          ║
║  [Almacén: Todos ▼] [Estado: Todos ▼] [Buscar...] [+ Crear Nuevo]     ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  📌 CONTEOS ACTIVOS (1)                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐
║  │#│Secuencia│Almacén │Status   │Versión│Inicio │Responsable│Acciones │
║  ├─┼────────┼────────┼─────────┼───────┼────────┼────────────┼─────────┤
║  │1│CONT-001│ALMACÉN A│🟢 ACTIVO│ V1/V1 │14:30  │Juan López │[▶][⚙️] │
║  └──────────────────────────────────────────────────────────────────────┘
║
║  📋 CONTEOS PENDIENTES (0)
║  └─ Sin conteos en estado DRAFT
║
║  ✅ CONTEOS COMPLETADOS (3)
║  ┌──────────────────────────────────────────────────────────────────────┐
║  │#│Secuencia│Almacén │Status   │Versión│Completado│Responsable│Acciones│
║  ├─┼────────┼────────┼─────────┼───────┼──────────┼───────────┼────────┤
║  │1│CONT-A01│ALMACÉN B│✅ OK    │ V2/V3 │22 14:35 │Juan López │[👁️][⬇️]│
║  │2│CONT-B08│ALMACÉN C│✅ OK    │ V1/V1 │21 09:20 │María Pérez│[👁️][⬇️]│
║  │3│CONT-C15│ALMACÉN D│✅ OK    │ V3/V3 │19 16:15 │Pedro  Gómez│[👁️][⬇️]│
║  └──────────────────────────────────────────────────────────────────────┘
║
║  🔒 CONTEOS CERRADOS (8)
║  └─ [Ver archivados ↓] (Ver 2025 y anteriores)
║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 5. BOTONES CONTEXTUALES POR ESTADO

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 DRAFT (Recién creado)                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  [✓ Iniciar Conteo] → ACTIVE                           ┃
┃  [📝 Editar Datos] (puedes cambiar mapping)            ┃
┃  [❌ Cancelar Conteo] → CANCELLED                      ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                ACTIVE (En conteo)                       ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  Progreso: [████████░░░] 75% (375/500 items)           ┃
┃                                                         ┃
┃  [✓ Completar V1] (si 100% contados)                   ┃
┃    → COMPLETED                                          ┃
┃                                                         ┃
┃  [📊 Ver Varianzas (23 items)]                          ┃
┃    → Modal con items con diferencia                    ┃
┃                                                         ┃
┃  [➕ Crear Versión 2] (si hay varianzas)               ┃
┃    → currentVersion=2, totalVersions=2                 ┃
┃                                                         ┃
┃  [⏸️ Pausar Conteo]                                     ┃
┃    → ON_HOLD                                            ┃
┃                                                         ┃
┃  [📝 Notas] (agregar observaciones)                    ┃
┃    → Guardar en field "notes"                          ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               ON_HOLD (Pausado)                         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  [▶️ Reanudar Conteo] → ACTIVE                         ┃
┃                                                         ┃
┃  [📝 Notas]                                             ┃
┃                                                         ┃
┃  [👤 Cambiar Responsable]                              ┃
┃                                                         ┃
┃  [❌ Cancelar Conteo] → CANCELLED                      ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃             COMPLETED (Finalizado)                      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  ✅ Conteo Completado: 2026-02-22 14:35                ┃
┃  Versión Final: V2                                      ┃
┃  Responsable: Juan López                                ┃
┃                                                         ┃
┃  [👁️ Ver Detalles]                                     ┃
┃    → Resumen de varianzas, historial V1-V2             ┃
┃                                                         ┃
┃  [⬇️ Descargar Reporte PDF]                            ┃
┃    → PDF con resumen ejecutivo                         ┃
┃                                                         ┃
┃  [🔒 Cerrar Conteo] → CLOSED                           ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              CLOSED (Archivado)                         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  🔒 Cerrado: 2026-02-22 14:45                          ┃
┃  Por: Juan López                                        ┃
┃                                                         ┃
┃  [👁️ Ver (Solo lectura)]                               ┃
┃                                                         ┃
┃  [⬇️ Descargar PDF]                                     ┃
┃                                                         ┃
┃  [📋 Ver Auditoría]                                     ┃
┃    → Historial de cambios y responsables               ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 6. MODAL: CREAR NUEVO CONTEO

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ➕ CREAR NUEVO CONTEO                                          [X]   ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  1️⃣  SELECCIONAR ALMACÉN                                             ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │                                                                 │ ║
║  │  -- Seleccionar Almacén --                                 ▼   │ ║
║  │                                                                 │ ║
║  │  • ALMACÉN A                    [✅ Disponible]                │ ║
║  │    └─ 0 conteos activos                                       │ ║
║  │                                                                 │ ║
║  │  • ALMACÉN B                    [⚠️ BLOQUEADO]                │ ║
║  │    └─ Conteo activo: CONT-2026-001 (Juan López)             │ ║
║  │                                                                 │ ║
║  │  • ALMACÉN C                    [✅ Disponible]                │ ║
║  │    └─ 0 conteos activos                                       │ ║
║  │                                                                 │ ║
║  │  • ALMACÉN D                    [✅ Disponible]                │ ║
║  │    └─ 1 conteo completado                                     │ ║
║  │                                                                 │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ℹ️  Cada almacén solo puede tener 1 conteo en estado ACTIVE o       ║
║      ON_HOLD simultáneamente.                                        ║
║                                                                       ║
║  2️⃣  SELECCIONAR MAPPING (ARTÍCULOS A CARGAR)                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │                                                                 │ ║
║  │  -- Seleccionar Mapping --                                 ▼   │ ║
║  │                                                                 │ ║
║  │  • Mapping Principales       (523 artículos)                  │ ║
║  │                                                                 │ ║
║  │  • Mapping Complementarios   (87 artículos)                   │ ║
║  │                                                                 │ ║
║  │  • Mapping Especiales        (15 artículos)                   │ ║
║  │                                                                 │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  3️⃣  CONFIRMAR CREACIÓN                                              ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │                                                                 │ ║
║  │  📋 Resumen:                                                   │ ║
║  │                                                                 │ ║
║  │  Secuencia:  CONT-2026-002  (auto-generado)                   │ ║
║  │  Almacén:    ALMACÉN A                                        │ ║
║  │  Mapping:    Principales                                       │ ║
║  │  Artículos:  523                                              │ ║
║  │  Versión:    V1                                               │ ║
║  │  Estado:     DRAFT                                            │ ║
║  │  Creado por: Juan López                                       │ ║
║  │                                                                 │ ║
║  │  [CANCELAR]                    [✓ CREAR CONTEO]              │ ║
║  │                                                                 │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 7. FLUJO VERSIONADO MEJORADO

```
                          CONTEO: CONT-2026-001

                                 V1
                              ┌────────┐
                              │ ACTIVE │
                              └────────┘
                                   ↓
                         [Contando 500 items]
                                   ↓
                    ┌──────────────────────────────┐
                    │ 23 items con VARIANZA        │
                    │ - 13 (3664)                  │
                    │ - 56 (3740)                  │
                    │ - 79 (3631)                  │
                    │ ...                          │
                    └──────────────────────────────┘
                                   ↓
                         [Crear Versión 2]
                                   ↓
                              V2 Creada
                          ┌────────────────┐
                          │ currentVersion=2│
                          │ totalVersions=2 │
                          │ 23 items cargados
                          └────────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │ RECONTEO V2                  │
                    │ - 3664: 825 → 838 (✓ OK)    │
                    │ - 3740: 4200 → 4256 (✓ OK)  │
                    │ - 3631: 2220 → 2299 (✓ OK)  │
                    └──────────────────────────────┘
                                   ↓
                         [Completar V2]
                                   ↓
                              ┌──────────┐
                              │COMPLETED │
                              └──────────┘
                                   ↓
                            [Cerrar Conteo]
                                   ↓
                              ┌────────┐
                              │ CLOSED │
                              └────────┘
                                   ↓
                    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
                    ┃  REPORTE FINAL:          ┃
                    ┃  ✓ V1: 500 items         ┃
                    ┃  ✓ V2: 23 varianzas      ┃
                    ┃  ✓ Total correcciones: 3 ┃
                    ┃  ✓ Precisión: 99.4%      ┃
                    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 8. VALIDACIONES DE NEGOCIO

```
╔════════════════════════════════════════════════════════════════╗
║              VALIDACIONES POR ACCIÓN                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ✅ CREAR NUEVO CONTEO                                        ║
║  └─ ✓ Almacén no tiene conteo ACTIVE ni ON_HOLD             ║
║  └─ ✓ Mapping seleccionado existe                            ║
║  └─ ✓ Mapping tiene items                                    ║
║                                                                ║
║  ✅ INICIAR CONTEO (DRAFT → ACTIVE)                           ║
║  └─ ✓ Conteo está en estado DRAFT                            ║
║  └─ ✓ Usuario tiene permisos                                 ║
║                                                                ║
║  ✅ COMPLETAR V1 (ACTIVE → COMPLETED)                         ║
║  └─ ✓ Todos los items tienen countedQty_V{N}                ║
║  └─ ✓ currentVersion == totalVersions                        ║
║                                                                ║
║  ✅ CREAR V2 (ACTIVE → ACTIVE con V++, totalVersions++)      ║
║  └─ ✓ Existen items con estado VARIANCE                     ║
║  └─ ✓ currentVersion < 5 (máx 5 versiones)                  ║
║  └─ ✓ Status actual es ACTIVE                               ║
║                                                                ║
║  ✅ PAUSAR CONTEO (ACTIVE → ON_HOLD)                          ║
║  └─ ✓ Conteo está ACTIVE                                    ║
║                                                                ║
║  ✅ REANUDAR (ON_HOLD → ACTIVE)                              ║
║  └─ ✓ Conteo está ON_HOLD                                   ║
║                                                                ║
║  ✅ CERRAR (COMPLETED → CLOSED)                              ║
║  └─ ✓ Conteo está COMPLETED                                 ║
║  └─ ✓ Usuario que cierra es diferente (reqs opcional)       ║
║                                                                ║
║  ✅ CANCELAR (de cualquier estado)                            ║
║  └─ ✓ Usuario tiene permisos de administrador               ║
║  └─ ✓ Estado != CLOSED (no se cancela cerrado)              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 9. INDICES DE BASE DE DATOS

```sql
-- Búsqueda rápida por secuencia
CREATE INDEX idx_inventory_count_sequence
  ON "InventoryCount"("sequenceNumber");

-- Filtros por estado y almacén
CREATE INDEX idx_inventory_count_status_warehouse
  ON "InventoryCount"("status", "warehouseId");

-- Conteos activos por almacén (validación de unicidad)
CREATE INDEX idx_inventory_count_active_warehouse
  ON "InventoryCount"("warehouseId", "status")
  WHERE "status" IN ('ACTIVE', 'ON_HOLD');

-- Búsqueda por empresa
CREATE INDEX idx_inventory_count_company
  ON "InventoryCount"("companyId", "status");

-- Auditoría
CREATE INDEX idx_inventory_count_created_by
  ON "InventoryCount"("createdBy");

CREATE INDEX idx_inventory_count_completed
  ON "InventoryCount"("completedAt", "closedAt");
```

---

## 10. CASO DE USO COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│ 📌 CASO PRÁCTICO: Conteo en Almacén A                          │
└─────────────────────────────────────────────────────────────────┘

T1: 08:00 - Juan López crea conteo
    ├─ sequenceNumber: CONT-2026-001
    ├─ status: DRAFT
    ├─ createdBy: juan_lopez
    └─ Mapping: Principales (500 items)

T2: 08:05 - Juan inicia conteo
    ├─ status: ACTIVE (DRAFT → ACTIVE)
    ├─ startedBy: juan_lopez
    └─ totalVersions: 1

T3: 12:00 - Pausa para almuerzo
    ├─ status: ON_HOLD (ACTIVE → ON_HOLD)
    ├─ items: 250/500 contados
    └─ varianzas: 0 (aún)

T4: 13:00 - Reanuda Juan
    ├─ status: ACTIVE (ON_HOLD → ACTIVE)
    ├─ continúa contando
    └─ items: 500/500

T5: 14:30 - Completa V1
    ├─ status: COMPLETED (ACTIVE → COMPLETED)
    ├─ completedBy: juan_lopez
    ├─ completedAt: 2026-02-22T14:30Z
    ├─ totalVersions: 1
    └─ varianzas detectadas: 23 items

    ANÁLISIS AUTOMÁTICO:
    ├─ 3664: 838 vs 825 (-1.6%)
    ├─ 3740: 4256 vs 4200 (-1.3%)
    ├─ 3631: 2299 vs 2220 (-3.4%)
    ├─ ... (20 más)
    └─ Promedio: -2.1%

T6: 14:35 - Crea Versión 2 para reconteo
    ├─ status: ACTIVE (COMPLETED → ACTIVE)
    ├─ currentVersion: 2
    ├─ totalVersions: 2
    ├─ items cargados: 23 (solo varianzas)
    └─ Comienza reconteo

T7: 15:00 - Termina V2
    ├─ status: COMPLETED
    ├─ completedBy: juan_lopez
    ├─ currentVersion: 2
    ├─ totalVersions: 2
    └─ varianzas residuales: 0 (todas corregidas)

T8: 15:05 - Cierra conteo formalmente
    ├─ status: CLOSED
    ├─ closedBy: juan_lopez
    ├─ closedAt: 2026-02-22T15:05Z
    └─ Sistema genera reporte PDF

REPORTE FINAL:
┌────────────────────────────────────────┐
│ CONTEO: CONT-2026-001                  │
│ Almacén: ALMACÉN A                     │
│ Responsable: Juan López                │
│ Duración total: 7 horas (con pausa)    │
│ Versiones: 2                           │
│ Items finales: 500                     │
│ Diferencias corregidas: 23             │
│ Precisión final: 100%                  │
│ Estado: ✅ CERRADO                    │
│ Fecha cierre: 2026-02-22 15:05        │
└────────────────────────────────────────┘
```

---

**Esta arquitectura es clara, escalable y lista para integrar con la app móvil.**

