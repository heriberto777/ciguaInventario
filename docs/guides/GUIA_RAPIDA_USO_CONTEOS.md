# 🚀 GUÍA RÁPIDA - CÓMO USAR LA NUEVA PÁGINA DE CONTEOS

## 📍 Acceso

### URL
```
http://localhost:3000/inventory/counts-management
```

### Requisitos
- ✅ Server backend corriendo (`npm run dev`)
- ✅ Estar autenticado en la aplicación
- ✅ Tener permisos de acceso

---

## 🎯 Flujo Paso a Paso

### 1️⃣ Crear un Nuevo Conteo

1. Ve a `/inventory/counts-management`
2. Click en el botón **"+ Nuevo Conteo"** (arriba derecha)
3. Se abre un modal con dos campos:
   - **Almacén** (obligatorio)
   - **Configuración de Mapeo** (obligatorio)

4. Selecciona ambos campos
5. Click en **"Crear Conteo"**

#### Resultado
- Se crea un conteo en estado **DRAFT**
- Se asigna automáticamente una secuencia: `CONT-2026-001`
- Aparece mensaje: ✓ "Conteo creado: CONT-2026-001"
- El conteo aparece en la tabla

---

### 2️⃣ Ver Lista de Conteos

En la tabla verás:
- **Secuencia**: CONT-2026-001, CONT-2026-002, etc.
- **Almacén**: Nombre del almacén
- **Estado**: Con badge de color
  - Gris = DRAFT
  - Azul = ACTIVE
  - Amarillo = EN PAUSA
  - Verde = COMPLETADO
  - Púrpura = CERRADO
- **Creado**: Fecha de creación
- **Acciones**: Botones contextuales

---

### 3️⃣ Transiciones de Estado

#### De DRAFT a ACTIVE (Iniciar)
```
Usuario ve: [Iniciar]
Click: ✓
Resultado: Conteo ahora en estado ACTIVE
```

#### De ACTIVE a COMPLETED (Completar)
```
Usuario ve: [Completar] [Pausar] [Cancelar]
Click: Completar
Resultado: Conteo ahora en estado COMPLETED
```

#### De ACTIVE a ON_HOLD (Pausar)
```
Usuario ve: [Completar] [Pausar] [Cancelar]
Click: Pausar
Resultado: Conteo ahora en estado ON_HOLD
```

#### De ON_HOLD a ACTIVE (Reanudar)
```
Usuario ve: [Reanudar] [Cancelar]
Click: Reanudar
Resultado: Conteo regresa a estado ACTIVE
```

#### De COMPLETED a CLOSED (Cerrar)
```
Usuario ve: [Cerrar] [Cancelar]
Click: Cerrar
Resultado: Conteo ahora en estado CLOSED (final)
```

#### Cancelar Conteo (desde cualquier estado)
```
Usuario ve: [Cancelar] (en cualquier botón)
Click: Cancelar
Sistema pide: ¿Estás seguro de que deseas cancelar este conteo?
Si: Conteo ahora en estado CANCELLED (final)
```

---

## 📊 Estadísticas

En la parte superior derecha hay 4 tarjetas que muestran:

1. **Total**: Número total de conteos
2. **Activos**: Conteos en progreso (ACTIVE)
3. **En Pausa**: Conteos pausados (ON_HOLD)
4. **Cerrados**: Conteos finalizados (CLOSED)

Se actualiza automáticamente con cada acción.

---

## ✨ Características Especiales

### 🔍 Validaciones
- ❌ No puedes crear 2 conteos activos en el mismo almacén
- ❌ No puedes dejar campos en blanco
- ✅ Las transiciones de estado son automáticas y validadas

### 🎨 UI
- 🌈 Colores para distinguir estados fácilmente
- 💬 Mensajes claros de éxito/error
- ⏳ Loading visual mientras se procesan cambios
- 📱 Responsive (funciona en mobile, tablet, desktop)

### 📝 Auditoría
Cada conteo registra:
- **Creado por**: Usuario que creó
- **Iniciado por**: Usuario que inició (si aplica)
- **Completado por**: Usuario que completó (si aplica)
- **Cerrado por**: Usuario que cerró (si aplica)
- **Fechas**: Timestamps de cada transición

---

## 🐛 Troubleshooting

### Problema: No veo la página
**Solución:**
- ✅ Verifica que estés autenticado
- ✅ Verifica URL: `/inventory/counts-management`
- ✅ Recarga la página (F5)

### Problema: No puedo crear conteo
**Posibles causas:**
- ❌ No seleccionaste almacén
- ❌ No seleccionaste mapeo
- ❌ Ya existe un conteo activo en ese almacén

**Solución:** Completa todos los campos y verifica que no hay conteos activos

### Problema: Botones deshabilitados
**Causa:** Mientras se procesa una acción
**Solución:** Espera a que termine (verás "Creando..." o similar)

### Problema: Mensaje de error
**Pasos:**
1. Lee el mensaje (tiene detalles del problema)
2. Recarga la página
3. Intenta nuevamente
4. Si persiste, revisa la consola del navegador (F12)

---

## 📚 Estados Explicados

### 🔵 DRAFT (Gris)
**Qué es:** Conteo recién creado
**Qué puedes hacer:**
- Iniciar el conteo → ACTIVE
- Cancelar

---

### 🟦 ACTIVE (Azul)
**Qué es:** Conteo en progreso
**Qué puedes hacer:**
- Completar → COMPLETED
- Pausar → ON_HOLD
- Cancelar → CANCELLED

---

### 🟨 ON_HOLD (Amarillo)
**Qué es:** Conteo pausado temporalmente
**Qué puedes hacer:**
- Reanudar → ACTIVE
- Cancelar → CANCELLED

---

### 🟩 COMPLETED (Verde)
**Qué es:** Conteo terminado, pero aún abierto
**Qué puedes hacer:**
- Cerrar → CLOSED
- Cancelar → CANCELLED

---

### 🟪 CLOSED (Púrpura)
**Qué es:** Conteo finalmente cerrado
**Qué puedes hacer:**
- ❌ Nada (estado final)

---

### 🔴 CANCELLED (Rojo)
**Qué es:** Conteo cancelado
**Qué puedes hacer:**
- ❌ Nada (estado final)

---

## 💡 Casos de Uso

### Caso 1: Conteo Normal
```
1. Crear conteo (DRAFT)
2. Iniciar conteo (ACTIVE)
3. Completar conteo (COMPLETED)
4. Cerrar conteo (CLOSED)
```

### Caso 2: Conteo con Pausa
```
1. Crear conteo (DRAFT)
2. Iniciar conteo (ACTIVE)
3. Pausar conteo (ON_HOLD)
   [Usuario realiza otras tareas]
4. Reanudar conteo (ACTIVE)
5. Completar conteo (COMPLETED)
6. Cerrar conteo (CLOSED)
```

### Caso 3: Conteo Cancelado
```
1. Crear conteo (DRAFT)
2. Iniciar conteo (ACTIVE)
3. [Error o cambio de planes]
4. Cancelar conteo (CANCELLED)
```

---

## 🔧 API Endpoints (Para Desarrolladores)

Si quieres llamar a los endpoints directamente:

```bash
# Crear conteo
POST /api/inventory-counts/create
Body: { "warehouseId": "id", "mappingConfigId": "id" }

# Iniciar
POST /api/inventory-counts/{countId}/start

# Completar
POST /api/inventory-counts/{countId}/complete

# Pausar
POST /api/inventory-counts/{countId}/pause

# Reanudar
POST /api/inventory-counts/{countId}/resume

# Cerrar
POST /api/inventory-counts/{countId}/close

# Cancelar
POST /api/inventory-counts/{countId}/cancel
```

Todos requieren header: `Authorization: Bearer {token}`

---

## 📞 Soporte

Para problemas:
1. Revisa este documento
2. Verifica la consola del navegador (F12)
3. Revisa los logs del servidor
4. Contacta al equipo de desarrollo

---

**¡Listo! Ya puedes usar la nueva página de gestión de conteos.** 🎉
