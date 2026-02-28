// EJEMPLO DE USO DEL NotificationModal
// ====================================

// 1. Importar el componente
import { NotificationModal } from '@/components/atoms/NotificationModal';

// 2. En tu componente, agregar estado
const [notification, setNotification] = useState({
  isOpen: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  title: '',
  message: '',
});

// 3. Crear función helper para mostrar notificaciones
const showNotification = useCallback((
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string
) => {
  setNotification({
    isOpen: true,
    type,
    title,
    message,
  });
}, []);

// 4. Usar en onSuccess/onError de mutaciones
const miMutation = useMutation({
  mutationFn: async () => {
    // tu lógica aquí
  },
  onSuccess: () => {
    showNotification('success', '✅ Éxito', 'Operación completada correctamente');
  },
  onError: (error) => {
    showNotification('error', '❌ Error', 'Algo salió mal, intenta nuevamente');
  },
});

// 5. Agregar el componente en el JSX
<NotificationModal
  isOpen={notification.isOpen}
  onClose={() => setNotification({ ...notification, isOpen: false })}
  type={notification.type}
  title={notification.title}
  message={notification.message}
  autoClose={3000} // Se cierra automáticamente después de 3 segundos (opcional)
/>

// VARIANTES DE TIPOS
// ==================

// Notificación de éxito
showNotification('success', '✅ Éxito', 'Los datos se guardaron correctamente');

// Notificación de error
showNotification('error', '❌ Error', 'No se pudo guardar los datos');

// Notificación de advertencia
showNotification('warning', '⚠️ Advertencia', 'Asegúrate de revisar los datos');

// Notificación de información
showNotification('info', 'ⓘ Información', 'Este es un mensaje informativo');

// PROPIEDADES DEL COMPONENTE
// ==========================
interface NotificationModalProps {
  isOpen: boolean;              // Controla si el modal está visible
  onClose: () => void;          // Callback cuando se cierra
  title: string;                // Título del modal
  message: string;              // Mensaje a mostrar
  type?: 'success' | 'error' | 'warning' | 'info'; // Tipo de notificación
  icon?: React.ReactNode;       // Icono personalizado (opcional)
  autoClose?: number;           // Milisegundos para cerrar automáticamente (opcional)
}

// EJEMPLOS CON ICONOS PERSONALIZADOS
// ==================================

// Con icono emoji personalizado
showNotification('success', '🎉 Felicidades', 'Tu conteo fue completado');

// Con icono HTML
<NotificationModal
  isOpen={notification.isOpen}
  onClose={() => setNotification({ ...notification, isOpen: false })}
  title={notification.title}
  message={notification.message}
  type={notification.type}
  icon={<span className="text-3xl">🚀</span>}
/>
