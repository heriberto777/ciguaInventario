import React, { useState } from 'react';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { MappingConfigAdminPage } from './MappingConfigAdminPage';
import { CompaniesContent } from './CompaniesPage';
import { UsersContent } from './UsersPage';
import { RolesContent } from './RolesPage';
import { PermissionsContent } from './PermissionsPage';
import { ERPConnectionsContent } from './ERPConnectionsPage';
import { AuditLogsContent } from './AuditLogsPage';
import { SessionsContent } from './SessionsPage';

type SettingsTab = 'mapping' | 'companies' | 'erp-connections' | 'users' | 'roles' | 'permissions' | 'audit-logs' | 'sessions';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('mapping');

  const tabs: { id: SettingsTab; label: string; description: string; icon: string }[] = [
    { id: 'mapping', label: 'ERP Mapping', description: 'Configurar mapeo de campos ERP', icon: '🗺️' },
    { id: 'companies', label: 'Empresas', description: 'Gestionar empresas', icon: '🏢' },
    { id: 'erp-connections', label: 'Conexiones ERP', description: 'Configurar conexiones ERP', icon: '🔌' },
    { id: 'users', label: 'Usuarios', description: 'Gestionar usuarios del sistema', icon: '👥' },
    { id: 'roles', label: 'Roles', description: 'Configurar roles y responsabilidades', icon: '👔' },
    { id: 'permissions', label: 'Permisos', description: 'Asignar permisos a roles', icon: '🔐' },
    { id: 'audit-logs', label: 'Auditoría', description: 'Ver registro de auditoría', icon: '📋' },
    { id: 'sessions', label: 'Sesiones', description: 'Gestionar sesiones activas', icon: '📱' },
  ];

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    // No longer navigate to separate pages - content is embedded here
  };

  // Renderizar contenido según tab activo
  const renderTabContent = () => {
    switch (activeTab) {
      case 'mapping':
        return <MappingConfigAdminPage />;
      case 'companies':
        return <CompaniesContent />;
      case 'erp-connections':
        return <ERPConnectionsContent />;
      case 'users':
        return <UsersContent />;
      case 'roles':
        return <RolesContent />;
      case 'permissions':
        return <PermissionsContent />;
      case 'audit-logs':
        return <AuditLogsContent />;
      case 'sessions':
        return <SessionsContent />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Sección no encontrada
            </p>
          </div>
        );
    }
  };

  return (
    <AdminLayout title="Configuración del Sistema">
      <div className="flex flex-col h-full">
        {/* Main Layout - Sidebar + Content */}
        <div className="flex gap-6 flex-1">
          {/* Sidebar - Tabs Navigation */}
          <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow overflow-y-auto">
            <div className="p-4 space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full p-4 rounded-lg text-left transition-all border-l-4 ${
                    activeTab === tab.id
                      ? 'border-l-blue-500 bg-blue-50 text-blue-900'
                      : 'border-l-transparent bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tab.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{tab.label}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">{tab.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-y-auto">
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
