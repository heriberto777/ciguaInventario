import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { initializeApiClient } from '@/services/api';
import { LoginPage } from '@/pages/LoginPage';
import { MappingConfigAdminPage } from '@/pages/MappingConfigAdminPage';
import { InventoryDashboardNavPage } from '@/pages/InventoryDashboardNavPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { UsersPage } from '@/pages/UsersPage';
import { RolesPage } from '@/pages/RolesPage';
import { PermissionsPage } from '@/pages/PermissionsPage';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { ERPConnectionsPage } from '@/pages/ERPConnectionsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AIConfigPage } from '@/pages/AIConfigPage';
import { AIChatPage } from '@/pages/AIChatPage';
import SettingsPage from '@/pages/SettingsPage';
import InventoryDashboardPage from '@/pages/InventoryDashboardPage';
import InventoryCountPage from '@/pages/InventoryCountPage';
import VarianceReportsPage from '@/pages/VarianceReportsPage';
import WarehousesPage from '@/pages/WarehousesPage';
import ItemClassificationsPage from '@/pages/ItemClassificationsPage';
import { PrivateRoute } from '@/components/PrivateRoute';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

initializeApiClient();

function App() {
  // Limpieza de localStorage corrupto (prevención de SyntaxError)
  React.useEffect(() => {
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key);
        if (!value) continue;

        const trimmed = value.trim();

        // Detección de valores que NO son JSON pero deberían serlo
        const shouldBeJson = key.includes('store') || key.startsWith('inventory_count_');

        if (shouldBeJson) {
          try {
            JSON.parse(value);
          } catch (e) {
            // Solo borramos si contiene caracteres sospechosos de error de red o de parseo fallido de objeto
            if (trimmed.includes('<!DOCTYPE') || trimmed.includes('@keyframes') || (trimmed.startsWith('{') && !trimmed.endsWith('}'))) {
              keysToClear.push(key);
            }
          }
        }
      }

      keysToClear.forEach(key => {
        console.warn(`Limpiando localStorage corrupto [${key}]`);
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.error('Error durante limpieza de localStorage:', e);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin/mapping" element={<PrivateRoute><MappingConfigAdminPage /></PrivateRoute>} />
          <Route path="/admin/audit-logs" element={<PrivateRoute><AuditLogsPage /></PrivateRoute>} />
          <Route path="/admin/sessions" element={<PrivateRoute><SessionsPage /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
          <Route path="/admin/roles" element={<PrivateRoute><RolesPage /></PrivateRoute>} />
          <Route path="/admin/permissions" element={<PrivateRoute><PermissionsPage /></PrivateRoute>} />
          <Route path="/admin/companies" element={<PrivateRoute><CompaniesPage /></PrivateRoute>} />
          <Route path="/admin/erp-connections" element={<PrivateRoute><ERPConnectionsPage /></PrivateRoute>} />
          <Route path="/admin/classifications" element={<PrivateRoute><ItemClassificationsPage /></PrivateRoute>} />
          <Route path="/admin/ai-config" element={<PrivateRoute><AIConfigPage /></PrivateRoute>} />

          {/* Inventory Routes */}
          <Route path="/inventory" element={<PrivateRoute><InventoryDashboardPage /></PrivateRoute>} />
          <Route path="/inventory/dashboard" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory/hub" element={<PrivateRoute><InventoryDashboardNavPage /></PrivateRoute>} />
          <Route path="/inventory/counts" element={<PrivateRoute><InventoryCountPage /></PrivateRoute>} />
          <Route path="/inventory/variances" element={<PrivateRoute><VarianceReportsPage /></PrivateRoute>} />
          <Route path="/inventory/warehouses" element={<PrivateRoute><WarehousesPage /></PrivateRoute>} />
          <Route path="/inventory/chat-ai" element={<PrivateRoute><AIChatPage /></PrivateRoute>} />

          {/* Legacy Redirects */}
          <Route path="/inventory/variance-reports" element={<Navigate to="/inventory/variances" replace />} />
          <Route path="/inventory/sync-to-erp" element={<Navigate to="/inventory/counts" replace />} />
          <Route path="/inventory/load-inventory" element={<Navigate to="/inventory/counts" replace />} />

          {/* Global Routes */}
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
