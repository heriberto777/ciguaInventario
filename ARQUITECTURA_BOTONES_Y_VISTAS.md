# 🎨 ARQUITECTURA DE BOTONES Y VISTAS - Proceso de Conteo Físico

## 📊 ESTRUCTURA ACTUAL DE VISTAS

Tu aplicación tiene **3 vistas principales**:

```
┌─────────────────────────────────────────────────────────┐
│                   InventoryCountPage                    │
│                                                         │
│  view = 'list' | 'create' | 'process'                  │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ↓                    ↓                    ↓
    ┌────────┐         ┌──────────┐         ┌─────────┐
    │  LIST  │         │  CREATE  │         │ PROCESS │
    │ (tabla)│         │  (form)  │         │ (editar)│
    └────────┘         └──────────┘         └─────────┘
```

---

## 1️⃣ VISTA: LIST (Tabla Principal de Conteos)

### Ubicación:
```
InventoryCountPage → view='list'
```

### ¿Qué muestra?
```
┌──────────────────────────────────────────────────────┐
│ Conteo Físico - Lista de Conteos                     │
├──────────────────────────────────────────────────────┤
│ [+] Nuevo Conteo                                     │
├──────────────────────────────────────────────────────┤
│ Tabla:                                               │
│ ┌────────────────────────────────────────────────┐   │
│ │ # │ Código │ Estado │ Items │ Varianza │ Botones│   │
│ ├────────────────────────────────────────────────┤   │
│ │ 1 │ CNT001 │ ACTIVE │ 100   │ 15       │ Procesar
│ │   │        │        │       │          │ Eliminar│
│ ├────────────────────────────────────────────────┤   │
│ │ 2 │ CNT002 │ COMPLETED│ 50 │ 0 (fin) │ Ver     │
│ │   │        │          │     │         │ Eliminar│
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 🎯 Botones en la Tabla Principal (LIST):

| Botón | Acción | Destino |
|-------|--------|---------|
| **Procesar** | Abre el conteo para digitar/recontar | view='process' |
| **Eliminar** | Borra el conteo (si está en DRAFT/CANCELLED) | Refresca tabla |
| **Ver** | Abre modo lectura (si está COMPLETED) | view='process' (read-only) |

### 💡 PROPÓSITO DE ESTA VISTA:
**"Administrar todos los conteos y decidir cuál procesar"**

```
Decisiones que toma aquí el usuario:
✓ Crear nuevo conteo
✓ Ver estado general de todos los conteos
✓ Elegir cuál conteo abrir para trabajar
✓ Ver si un conteo está finalizado o en progreso
✓ Eliminar conteos cancelados
```

### ❌ NO es para:
```
✗ Finalizar el conteo
✗ Crear versiones
✗ Digitar cantidades
✗ Enviar al ERP
```

---

## 2️⃣ VISTA: PROCESS (Área de Trabajo - Digitación/Recontas)

### Ubicación:
```
InventoryCountPage → view='process'
```

### ¿Qué muestra?
```
┌────────────────────────────────────────────────────────┐
│ Conteo #1 - CNT-001                       [ACTIVE]     │
├────────────────────────────────────────────────────────┤
│ [✓ Finalizar]  [🔄 Crear Versión]  [← Volver]         │
├────────────────────────────────────────────────────────┤
│ Varianzas: 5 │ Bajo: 3 │ Sobre: 2                     │
├────────────────────────────────────────────────────────┤
│ Tabla de items:                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Código │ Nombre │ Sistema │ Contado │ Varianza   │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ PROD-A │ Producto A │ 100 │ [95____] │ -5 (-5%) │ │
│ │ PROD-B │ Producto B │ 50  │ [50____] │ 0        │ │
│ │ PROD-C │ Producto C │ 80  │ [85____] │ +5 (+6%) │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 🎯 Botones en PROCESS VIEW:

#### **Botón 1: ✓ Finalizar**
```
Aparece si: status = ACTIVE || ON_HOLD
Acción: Completa el conteo (calcula varianzas)
Resultado:
├─ Si NO hay varianza
│  └─ Status → COMPLETED
│  └─ Fin del conteo
│
└─ Si HAY varianza
   └─ Status → COMPLETED
   └─ Aparece botón "Crear Versión" ← para recontar
```

#### **Botón 2: 🔄 Crear Versión (Auditoría)**
```
Aparece si:
  └─ Status = ACTIVE || ON_HOLD
  └─ Y hay items con varianza

Acción: Crea V2 (o V3, V4...)
Resultado:
├─ Crea nuevos items con version=2
├─ Limpia countedQty para recontar
├─ Status → IN_PROGRESS
├─ Refresca la vista
└─ Muestra SOLO items de V2

NOTA: Este botón está EN ESTA VENTANA (process)
      NO en la tabla principal (list)
```

#### **Botón 3: ← Volver**
```
Aparece SIEMPRE
Acción: Vuelve a la tabla (view='list')
Resultado: Vuelves a ver todos los conteos
```

### ✅ ACCIONES EN ESTA VISTA:

```
DURANTE DIGITACIÓN (V1):
│
├─ Digitas cantidades → Se guardan con debounce
├─ Ves varianzas en tiempo real
├─ Puedes pausar (botón pausar si existe)
│
└─ Cuando terminas → Clic "✓ Finalizar"
     │
     ├─ Sistema analiza varianzas
     │
     ├─ Si NO hay varianza:
     │  └─ Fin del conteo (COMPLETED)
     │
     └─ Si HAY varianza:
        └─ Botón "Crear Versión" aparece aquí
           │
           └─ Clic "Crear Versión"
              │
              ├─ Se crea V2
              ├─ Vuelve a mostrar SOLO items con varianza
              ├─ countedQty = null (para recontar)
              │
              └─ Recontas V2...
                 │
                 ├─ Clic "✓ Finalizar" de V2
                 │
                 ├─ Si NO hay más varianza: FIN
                 │
                 └─ Si HAY más varianza: Crear V3 (etc)
```

---

## 3️⃣ VISTA: CREATE (Crear Nuevo Conteo)

### Ubicación:
```
InventoryCountPage → view='create'
```

### ¿Qué muestra?
```
┌────────────────────────────────────────────────┐
│ Crear Nuevo Conteo                             │
├────────────────────────────────────────────────┤
│ Almacén: [Seleccionar ▼]                       │
│ Mapeo de Datos: [Seleccionar ▼]                │
│                                                │
│ [Crear Conteo]  [Cancelar]                     │
└────────────────────────────────────────────────┘
```

### 🎯 Botones:
- **[Crear Conteo]**: Crea conteo en estado DRAFT
- **[Cancelar]**: Vuelve a LIST

---

## 🔄 FLUJO DE NAVEGACIÓN COMPLETO

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USUARIO INICIA LA APP                                     │
│    └─ view = 'list' (Tabla de conteos)                       │
└──────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
    [Nuevo Conteo]   [Procesar]      [Eliminar]
            │               │               │
            ↓               ↓               ↓
       view='create'   view='process'   Refresca
            │               │               │
            └───────────────┼───────────────┘
                            │
┌──────────────────────────────────────────────────────────────┐
│ 2. EN PROCESS VIEW - DIGITACIÓN V1                           │
│    └─ Usuario digita cantidades                             │
│    └─ Se guardan con debounce                               │
│    └─ Ve varianzas en tiempo real                           │
└──────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
    [✓ Finalizar]    [← Volver]   [Cancelar]
            │               │           │
            ↓               ↓           ↓
      Completa V1      view='list'  Cancela
            │
            ├─ NO hay varianza
            │  └─ FIN (Status=COMPLETED)
            │
            └─ HAY varianza
               └─ Aparece: [🔄 Crear Versión]
                  │
                  ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. CREAR NUEVA VERSIÓN (V2)                                  │
│    └─ Se crean items con version=2                          │
│    └─ countedQty = null (para recontar)                     │
│    └─ Status = IN_PROGRESS                                  │
│    └─ Muestra SOLO items con varianza                       │
└──────────────────────────────────────────────────────────────┘
                            │
                    [🔄 Crear Versión]
                    [✓ Finalizar V2]
                    [← Volver]
                            │
                    Recontas V2
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
     NO hay var.   HAY var.         Volver
            │           │                │
            ↓           ↓                ↓
          FIN    [🔄 Crear V3]   view='list'
                        │
                     ... (puede seguir)
                        │
                      FIN
```

---

## 🎯 RESPUESTA A TUS PREGUNTAS

### **P1: ¿Cada sección de versionado tiene botones de acción para finalizar?**

**Respuesta: SÍ, pero en la misma ventana (process)**

```
Todos los botones están en la vista 'process':

V1 Botones:
├─ ✓ Finalizar (completa V1)
├─ 🔄 Crear Versión (si hay varianza)
├─ ← Volver
└─ ✕ Cancelar

V2 Botones:
├─ ✓ Finalizar (completa V2)
├─ 🔄 Crear Versión (si SIGUE habiendo varianza)
├─ ← Volver
└─ ✕ Cancelar

V3, V4... MISMO PATRÓN
```

### **P2: ¿Puedo crear nueva versión desde esa ventana?**

**Respuesta: SÍ, el botón 🔄 Crear Versión está en 'process'**

```
No necesitas volver a LIST para crear V2.
El botón está en la misma ventana (process).

Flujo:
1. Finalizas V1 (clic ✓ Finalizar)
2. Sistema analiza varianzas
3. Si hay varianza → Botón "Crear Versión" aparece
4. Haces clic "Crear Versión" → Se crea V2
5. SIGUE EN LA MISMA VENTANA, pero con items de V2
```

### **P3: ¿La acción en la tabla principal es para finalizar el proceso y enviarlo al ERP?**

**Respuesta: NO, la tabla principal es solo para ADMINISTRACIÓN**

```
TABLA PRINCIPAL (LIST) - Botón "Procesar":
├─ NO finaliza
├─ NO crea versiones
├─ NO envía al ERP
└─ SOLO abre el conteo para trabajar

ENVIARÁ AL ERP:
├─ Será un botón DIFERENTE (cuando implemente)
├─ Probablemente estará en:
│  ├─ Vista PROCESS (cuando conteo está COMPLETED)
│  ├─ O en la tabla LIST (botón "Enviar a ERP")
│  └─ O ambos
├─ Requiere:
│  ├─ Conteo en status COMPLETED
│  ├─ Sin varianza (o varianza aprobada)
│  └─ Confirmación del usuario
└─ Acción: Envía datos al ERP, Status → CLOSED
```

---

## 📋 MATRIZ DE BOTONES

```
┌─────────────────┬──────────────┬────────────────┬─────────────┐
│ Vista           │ Botón        │ Condición      │ Resultado   │
├─────────────────┼──────────────┼────────────────┼─────────────┤
│ LIST (Tabla)    │ Procesar     │ Siempre        │ → process   │
│                 │ Eliminar     │ DRAFT/CANCEL   │ Elimina     │
│                 │ Ver          │ COMPLETED      │ → process   │
│                 │              │                │ (read-only) │
├─────────────────┼──────────────┼────────────────┼─────────────┤
│ PROCESS         │ ✓ Finalizar  │ ACTIVE/ON_HOLD │ Completa V  │
│ (Edición)       │ 🔄 Versión   │ + varianza     │ Crea V+1    │
│                 │ ← Volver     │ Siempre        │ → list      │
│                 │ ✕ Cancelar   │ DRAFT/ACT/HOLD │ Cancela     │
├─────────────────┼──────────────┼────────────────┼─────────────┤
│ CREATE (Form)   │ Crear Conteo │ Siempre        │ Crea + list │
│                 │ Cancelar     │ Siempre        │ → list      │
└─────────────────┴──────────────┴────────────────┴─────────────┘
```

---

## 🎬 FLUJO DE VERSIONADO EN UNA VENTANA (PROCESS)

```
                    ╔════════════════════╗
                    ║   PROCESO COMPLETO ║
                    ║   EN UNA VENTANA   ║
                    ║   (view=process)   ║
                    ╚════════════════════╝
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
    V1 ITEMS          V2 ITEMS (si var)   V3 ITEMS (si var)
    (digitación)      (recontar)          (recontar)

    ┌──────────────┐  ┌──────────────┐   ┌──────────────┐
    │ Item A: 95   │  │ Item A: null │   │ Item A: null │
    │ Item B: 50   │  │ Item C: null │   │ Item C: null │
    │ Item C: 85   │  │              │   │              │
    └──────────────┘  └──────────────┘   └──────────────┘
         │                 │                   │
         ↓                 ↓                   ↓
    [✓ Finalizar]    [✓ Finalizar]      [✓ Finalizar]
    [🔄 Versión] →   [🔄 Versión] →    [FIN]
    [← Volver]       [← Volver]        [← Volver]

    TODO ESTO EN LA MISMA VENTANA (process)
    NO necesitas cambiar de vista
```

---

## 🔑 RESUMEN FINAL

| Aspecto | Respuesta |
|--------|-----------|
| **¿Botones por versión?** | SÍ, en la ventana 'process' |
| **¿Crear versión desde esa ventana?** | SÍ, botón "🔄 Crear Versión" |
| **¿Está en tabla principal?** | NO, en la ventana de edición |
| **¿Tabla principal finaliza?** | NO, solo abre para trabajar |
| **¿Se envía al ERP desde aquí?** | NO, será un botón separado (a implementar) |
| **¿Dónde enviar al ERP?** | Cuando conteo esté COMPLETED (probablemente en process) |
| **¿Cuántas versiones máximo?** | Ilimitadas (V1, V2, V3... hasta resolver varianzas) |

