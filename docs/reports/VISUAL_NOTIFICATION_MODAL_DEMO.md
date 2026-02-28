# 🎬 DEMOSTRACIÓN VISUAL - NotificationModal

## 🎥 Escena 1: Usuario envía conteo al ERP

```
┌──────────────────────────────────────────────────┐
│  Cigua Inventory - Conteo Activo                │
├──────────────────────────────────────────────────┤
│                                                  │
│  Estado: COMPLETED                              │
│  Items: 1468                                     │
│  Versión: 4                                      │
│                                                  │
│  ┌──────────┬──────────┬──────────┐             │
│  │ Procesar │ ✓ Final. │ 🚀 ERP  │             │
│  └──────────┴──────────┴──────────┘             │
│                   ↑ Usuario hace click            │
│
│  [LOADING...]
│  POST /inventory-counts/abc123/send-to-erp
│
│  ✅ Éxito!
│
│  ┌─────────────────────────────────┐
│  │                                 │
│  │ ✓ ✅ Éxito                      │
│  │                                 │
│  │ Conteo enviado al ERP           │
│  │ exitosamente                    │
│  │                                 │
│  │                       [Aceptar] │
│  └─────────────────────────────────┘
│
│  Fondo oscuro de overlay
│
│  Usuario hace click en [Aceptar]
│  ↓
│  Modal se cierra
│  ↓
│  Vuelve a vista de lista
│
└──────────────────────────────────────────────────┘
```

## 🎥 Escena 2: Usuario intenta eliminar conteo

```
┌──────────────────────────────────────────────────┐
│  Cigua Inventory - Lista de Conteos             │
├──────────────────────────────────────────────────┤
│                                                  │
│  Tabla de conteos:                              │
│  ┌─────────┬──────────────┬──────────────────┐ │
│  │ Número  │ Estado       │ Acciones       │ │
│  ├─────────┼──────────────┼──────────────────┤ │
│  │ CONT001 │ DRAFT        │ [Procesar][🗑] │ │
│  │ CONT002 │ ACTIVE       │ [Proc][Final][🗑]│ │
│  │ CONT003 │ COMPLETED    │ [Version][ERP] │ │
│  └─────────┴──────────────┴──────────────────┘ │
│
│  Usuario hace click en 🗑 (eliminar CONT002)
│  ↓
│  window.confirm("¿Estás seguro?")
│  ↓
│  Usuario hace click en "OK"
│
│  [LOADING...]
│  DELETE /inventory-counts/cont002id
│
│  ✅ Éxito!
│
│  ┌─────────────────────────────────┐
│  │                                 │
│  │ ✓ ✅ Eliminado                  │
│  │                                 │
│  │ Conteo eliminado                │
│  │ correctamente                   │
│  │                                 │
│  │                       [Aceptar] │
│  └─────────────────────────────────┘
│
│  Fondo oscuro de overlay
│
│  [TIEMPO: 3 segundos después - autoClose]
│  ↓
│  Modal se cierra automáticamente
│  ↓
│  Tabla se refresca (CONT002 desaparece)
│
└──────────────────────────────────────────────────┘
```

## 🎨 Paletas de Colores

### Success (Verde) ✓
```
Background: #F0FDF4 (bg-green-50)
Border:     #DCFCE7 (border-green-200)
Icon:       #16A34A (text-green-600)
Title:      #166534 (text-green-900)
Button:     #15803D (bg-green-600)
Button:     #166534 (hover:bg-green-700)
Text:       #374151 (text-gray-700)
```

### Error (Rojo) ✕
```
Background: #FEF2F2 (bg-red-50)
Border:     #FECACA (border-red-200)
Icon:       #DC2626 (text-red-600)
Title:      #7F1D1D (text-red-900)
Button:     #DC2626 (bg-red-600)
Button:     #B91C1C (hover:bg-red-700)
Text:       #374151 (text-gray-700)
```

### Warning (Amarillo) ⚠
```
Background: #FFFBEB (bg-yellow-50)
Border:     #FCD34D (border-yellow-200)
Icon:       #CA8A04 (text-yellow-600)
Title:      #78350F (text-yellow-900)
Button:     #EABB08 (bg-yellow-600)
Button:     #B45309 (hover:bg-yellow-700)
Text:       #374151 (text-gray-700)
```

### Info (Azul) ⓘ
```
Background: #EFF6FF (bg-blue-50)
Border:     #BFDBFE (border-blue-200)
Icon:       #2563EB (text-blue-600)
Title:      #1E3A8A (text-blue-900)
Button:     #2563EB (bg-blue-600)
Button:     #1D4ED8 (hover:bg-blue-700)
Text:       #374151 (text-gray-700)
```

## 📱 Responsividad

### Desktop (1024px+)
```
┌─────────────────────────────────┐
│                                 │
│ ✓ Título                        │
│                                 │
│ Mensaje largo y descriptivo     │
│                                 │
│                       [Aceptar] │
└─────────────────────────────────┘
Max-width: 384px (max-w-sm)
Centered en viewport
```

### Tablet (768px)
```
┌───────────────────────────────┐
│                               │
│ ✓ Título                      │
│                               │
│ Mensaje                       │
│                               │
│                     [Aceptar] │
└───────────────────────────────┘
Max-width: 384px (max-w-sm)
Con margins (mx-4)
```

### Mobile (320px)
```
┌──────────────────┐
│                  │
│ ✓ Título         │
│                  │
│ Mensaje          │
│                  │
│        [Aceptar] │
└──────────────────┘
Max-width: 100% - 32px
Margin: 16px (mx-4)
```

## 🔄 Estados del Modal

### Estado 1: Cerrado
```
isOpen = false
↓
No renderiza
↓
Componente no visible
```

### Estado 2: Abierto
```
isOpen = true
↓
Renderiza Portal
↓
Overlay + Modal visible
↓
Usuario puede leer mensaje
```

### Estado 3: Con autoClose
```
isOpen = true
autoClose = 3000 (ms)
↓
Renderiza Portal
↓
useEffect inicia timer
↓
Después de 3 segundos
↓
onClose() ejecuta
↓
isOpen = false
↓
Modal se cierra automáticamente
```

## 💬 Ejemplos de Mensajes

### Success
```
showNotification('success', '✅ Éxito', 'Conteo enviado al ERP exitosamente')
showNotification('success', '✅ Guardado', 'Los datos se guardaron correctamente')
showNotification('success', '✅ Completado', 'Operación finalizada sin errores')
showNotification('success', '✅ Eliminado', 'Conteo eliminado correctamente')
```

### Error
```
showNotification('error', '❌ Error', 'No se pudo eliminar el conteo')
showNotification('error', '❌ Error', 'Algo salió mal, intenta nuevamente')
showNotification('error', '❌ Error de conexión', 'No se pudo conectar al servidor')
showNotification('error', '❌ Datos inválidos', 'Revisa los campos requeridos')
```

### Warning
```
showNotification('warning', '⚠️ Advertencia', 'Algunos datos podrían estar incompletos')
showNotification('warning', '⚠️ Confirmar', 'Esta acción no se puede deshacer')
showNotification('warning', '⚠️ Atención', 'Revisa la información antes de continuar')
```

### Info
```
showNotification('info', 'ℹ️ Información', 'Conteo importado desde mapeo de datos')
showNotification('info', 'ℹ️ Nota', 'Se han encontrado 15 items con varianza')
showNotification('info', 'ℹ️ Sistema', 'Nueva versión creada automáticamente')
```

## 🎯 Casos de Uso Actuales

### 1. Envío al ERP (sendToERPMutation)
```
Trigger: Usuario hace click en "🚀 ERP"
Action:  POST /inventory-counts/:id/send-to-erp
Success: showNotification('success', '✅ Éxito', 'Conteo enviado al ERP')
Effect:  Vuelve a lista
```

### 2. Eliminación de Conteo (deleteMutation)
```
Trigger:   Usuario hace click en "🗑 Eliminar"
Confirm:   window.confirm("¿Estás seguro?")
Success:   showNotification('success', '✅ Eliminado', '...')
Error:     showNotification('error', '❌ Error', '...')
Effect:    Vuelve a lista
```

## 🎬 Timeline Completo

```
T=0ms:     Usuario interactúa con UI
T=1ms:     Mutation se inicia
T=10ms:    Request enviado a servidor
T=500ms:   Servidor procesa
T=1000ms:  Respuesta recibida
T=1001ms:  onSuccess callback
T=1002ms:  showNotification() ejecuta
T=1003ms:  State notification actualizado
T=1004ms:  Modal renderiza
T=1005ms:  Portal monta en DOM
T=1006ms:  CSS se aplica
T=1100ms:  Usuario ve modal
T=2000ms:  Usuario lee mensaje
T=2500ms:  Usuario hace click en [Aceptar]
T=2501ms:  onClose() ejecuta
T=2502ms:  State actualizado
T=2503ms:  Portal desmonta
T=2504ms:  Modal desaparece
T=2505ms:  Flujo completo
```

O con autoClose:
```
T=1006ms:  Modal visible
T=4006ms:  autoClose timer expira (3000ms)
T=4007ms:  onClose() ejecuta automáticamente
T=4008ms:  Modal desaparece
T=4009ms:  Flujo completo
```

---

**Notas**:
- Todos los colores usan Tailwind CSS
- El modal es responsive
- El overlay previene interacción con elementos detrás
- El componente usa Portal para no afectar el DOM flow
