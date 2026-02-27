import { useAuthStore } from '@/store/auth';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '@/components/templates/AppShell';

interface PrivateRouteProps {
  children: ReactNode;
}

/**
 * PrivateRoute — Protege las rutas autenticadas y aplica el AppShell (layout)
 * de forma consistente en todas las páginas.
 *
 * El LoginPage es la única rutra que NO usa este componente,
 * por lo que tiene su propio diseño standalone.
 */
export function PrivateRoute({ children }: PrivateRouteProps) {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!hasHydrated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-app)', color: 'var(--text-muted)',
        flexDirection: 'column', gap: 12,
      }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-primary)' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span style={{ fontSize: '0.875rem' }}>Cargando...</span>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}
