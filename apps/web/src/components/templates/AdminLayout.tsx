import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

/**
 * AdminLayout — Wrapper de compatibilidad.
 *
 * El AppShell (provisto por PrivateRoute) ya incluye el sidebar, topbar
 * y toda la estructura de navegación. Este componente existe solo para
 * compatibilidad con páginas heredadas que aún lo importen.
 *
 * Simplemente renderiza children dentro de un contenedor estándar
 * con el título de página si se provee.
 */
export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div>
      {title && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            {title}
          </h1>
        </div>
      )}
      {children}
    </div>
  );
}
