import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/atoms/Button';
import { useLogout } from '@/hooks/useApi';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();

  const handleLogout = () => {
    logout();
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center gap-8">
              <button
                onClick={() => navigate('/')}
                className="text-xl font-bold text-blue-600 hover:text-blue-900 transition cursor-pointer"
                title="Ir al Home"
              >
                🏠 Cigua Inventory
              </button>
              <div className="flex gap-4 text-sm overflow-x-auto">
                <button
                  onClick={() => navigate('/inventory/dashboard')}
                  className="text-blue-600 hover:text-blue-900 px-3 py-2 whitespace-nowrap font-semibold"
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => navigate('/inventory/counts')}
                  className="text-blue-600 hover:text-blue-900 px-3 py-2 whitespace-nowrap font-semibold"
                >
                  📋 Conteos
                </button>
                <button
                  onClick={() => navigate('/inventory/variances')}
                  className="text-blue-600 hover:text-blue-900 px-3 py-2 whitespace-nowrap"
                >
                  ⚠️ Varianzas
                </button>
                <button
                  onClick={() => navigate('/inventory/warehouses')}
                  className="text-blue-600 hover:text-blue-900 px-3 py-2 whitespace-nowrap"
                >
                  🏭 Almacenes
                </button>
                <div className="border-l border-gray-300 mx-2"></div>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-purple-600 hover:text-purple-900 px-3 py-2 whitespace-nowrap font-semibold"
                >
                  ⚙️ Configuración
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 whitespace-nowrap"
                >
                  📈 Reportes
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {title && (
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
