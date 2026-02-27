import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/templates/AdminLayout';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Maestros',
      icon: '🏢',
      items: [
        { label: 'Empresas', path: '/admin/companies', description: 'Gestión multicliente y datos fiscales', icon: '🏢' },
        { label: 'Almacenes', path: '/inventory/warehouses', description: 'Zonas y ubicaciones físicas', icon: '📦' },
        { label: 'Clasificaciones', path: '/admin/classifications', description: 'Familias, marcas y subcategorías', icon: '🏷️' },
      ]
    },
    {
      title: 'Configuración ERP',
      icon: '🔌',
      items: [
        { label: 'Conexiones ERP', path: '/admin/erp-connections', description: 'Servidores y credenciales', icon: '🔌' },
        { label: 'Mapping ERP', path: '/admin/mapping', description: 'Mapeo de campos y tablas', icon: '🗺️' },
      ]
    },
    {
      title: 'Seguridad y Acceso',
      icon: '🔐',
      items: [
        { label: 'Usuarios', path: '/admin/users', description: 'Cuentas y estados de acceso', icon: '👥' },
        { label: 'Roles', path: '/admin/roles', description: 'Perfiles y responsabilidades', icon: '👔' },
        { label: 'Permisos', path: '/admin/permissions', description: 'Matriz de acciones permitidas', icon: '🔐' },
      ]
    },
    {
      title: 'Sistema y Auditoría',
      icon: '🖥️',
      items: [
        { label: 'Auditoría', path: '/admin/audit-logs', description: 'Trazabilidad de cambios críticos', icon: '📋' },
        { label: 'Sesiones', path: '/admin/sessions', description: 'Dispositivos y tokens activos', icon: '📱' },
        { label: 'Inteligencia Artificial', path: '/admin/ai-config', description: 'Modelos LLM y Prompts', icon: '🤖' },
      ]
    }
  ];

  return (
    <AdminLayout title="Configuración del Sistema">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <span className="text-xl">{section.icon}</span>
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">{section.title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {section.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group flex items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left"
                >
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-50 group-hover:bg-blue-50 rounded-lg flex items-center justify-center text-2xl transition-colors">
                    {item.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{item.label}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m-7-7l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
