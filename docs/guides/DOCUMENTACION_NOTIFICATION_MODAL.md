# 📢 NotificationModal - Componente Simple de Notificaciones

## 🎯 Descripción

Componente React simple y limpio para mostrar notificaciones en forma de modal. Reemplaza los `window.alert()` con modales profesionales.

## 📦 Ubicación

```
apps/web/src/components/atoms/NotificationModal.tsx
```

## ✨ Características

- ✅ 4 tipos de notificación: `success`, `error`, `warning`, `info`
- ✅ Auto-cierre opcional (configurable en milisegundos)
- ✅ Iconos contextuales automáticos
- ✅ Estilos Tailwind CSS responsivos
- ✅ Portal rendering (no bloquea flujo de DOM)
- ✅ Overlay oscuro clickeable para cerrar

## 🎨 Tipos de Notificación

### Success (Éxito)
```
┌─────────────────────────────┐
│ ✓ Título                    │
│                             │
│ Mensaje descriptivo         │
│ de la acción completada     │
│                     [Aceptar]│
└─────────────────────────────┘
Color: Verde (bg-green-50, border-green-200)
```

### Error (Error)
```
┌─────────────────────────────┐
│ ✕ Título de Error           │
│                             │
│ Mensaje de error            │
│ explicando qué pasó         │
│                     [Aceptar]│
└─────────────────────────────┘
Color: Rojo (bg-red-50, border-red-200)
```

### Warning (Advertencia)
```
┌─────────────────────────────┐
│ ⚠ Título de Advertencia     │
│                             │
│ Mensaje de advertencia      │
│ para el usuario             │
│                     [Aceptar]│
└─────────────────────────────┘
Color: Amarillo (bg-yellow-50, border-yellow-200)
```

### Info (Información)
```
┌─────────────────────────────┐
│ ⓘ Información               │
│                             │
│ Mensaje informativo         │
│ del sistema                 │
│                     [Aceptar]│
└─────────────────────────────┘
Color: Azul (bg-blue-50, border-blue-200)
```

## 🚀 Cómo Usar

### 1. En InventoryCountPage (IMPLEMENTADO)

```tsx
// Estado
const [notification, setNotification] = useState({
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
});

// Función helper
const showNotification = useCallback((
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string
) => {
  setNotification({ isOpen: true, type, title, message });
}, []);

// En mutación
const sendToERPMutation = useMutation({
  mutationFn: async (countId: string) => {
    await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
  },
  onSuccess: () => {
    showNotification('success', '✅ Éxito', 'Conteo enviado al ERP');
  },
});

// En JSX
<NotificationModal
  isOpen={notification.isOpen}
  onClose={() => setNotification({ ...notification, isOpen: false })}
  type={notification.type}
  title={notification.title}
  message={notification.message}
  autoClose={3000}
/>
```

### 2. En Otros Componentes

```tsx
// Copiar el patrón anterior y adaptar según necesites
```

## 📋 Props

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `isOpen` | `boolean` | ✅ | Controla si el modal está visible |
| `onClose` | `() => void` | ✅ | Callback cuando se cierra |
| `title` | `string` | ✅ | Título del modal |
| `message` | `string` | ✅ | Mensaje a mostrar |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | ❌ | Tipo de notificación (default: 'info') |
| `icon` | `React.ReactNode` | ❌ | Icono personalizado |
| `autoClose` | `number` | ❌ | Milisegundos para cerrar automáticamente |

## 🎯 Casos de Uso Implementados

- ✅ Envío al ERP exitoso → `success`
- ✅ Eliminación de conteo → `success`
- ✅ Error al eliminar → `error`
- ✅ Error en operación → `error`

## 🎯 Casos de Uso Posibles

- Validación fallida → `warning`
- Datos guardados → `success`
- Conexión perdida → `error`
- Cambio importante → `info`

## 🔄 Ciclo de Vida

```
1. Usuario hace acción
2. mutationFn ejecuta
3. En onSuccess/onError:
   → showNotification('type', 'title', 'message')
4. Estado notification se actualiza
5. Modal aparece con contenido
6. Usuario hace click en Aceptar O pasa autoClose
7. onClose se ejecuta
8. Modal desaparece
```

## 💡 Tips

- **Auto-close**: Configura `autoClose={3000}` para cerrar en 3 segundos
- **Sin auto-close**: Omite `autoClose` para que cierre solo con click
- **Iconos**: Usa emojis como `✅`, `❌`, `⚠️`, `ⓘ` o componentes React
- **Mensajes claros**: Sé específico en el mensaje (qué pasó y por qué)

## 🎨 Estilo

- **Redondeado**: `rounded-lg` (esquinas suaves)
- **Sombra**: `shadow-xl` (profundidad)
- **Colores**: Cada tipo tiene su paleta Tailwind
- **Responsive**: `mx-4` para espacios en pantallas pequeñas

## 📱 Responsive

El modal se adapta automáticamente:
- 📱 Mobile: `max-w-sm` (pequeño)
- 💻 Desktop: Centra en pantalla

## 🔒 Seguridad

- Portal rendering: No interfiere con otros elementos
- Overlay clickeable: Forma fácil de cerrar
- Sin XSS: Props son textos simples (no HTML raw)

## 🚀 Estado Implementado

```
✅ Componente creado: NotificationModal.tsx
✅ Importado en: InventoryCountPage.tsx
✅ Estado configurado: notification
✅ Función helper: showNotification()
✅ Mutaciones actualizadas: sendToERPMutation, deleteMutation
✅ JSX agregado: NotificationModal component
✅ Ejemplo documentado: EJEMPLO_NOTIFICATION_MODAL.md
```

## 🔄 Próximos Pasos (Opcional)

- Usar en más componentes (InventoryCountsTable, otros)
- Agregar sonidos opcionales
- Agregar animaciones de entrada/salida
- Crear un hook `useNotification()` reutilizable

---

**Archivo**: `apps/web/src/components/atoms/NotificationModal.tsx`
**Líneas de código**: 90+
**Tipos soportados**: 4 (success, error, warning, info)
**Estado**: ✅ Listo para usar
