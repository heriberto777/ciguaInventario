import { useAuthStore } from '@/store/auth';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Mientras se hidrata, mostrar cargando
  if (!hasHydrated) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  // Si no está autenticado o no hay token, redirigir al login
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
