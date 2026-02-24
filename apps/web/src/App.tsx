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
import SettingsPage from '@/pages/SettingsPage';
import InventoryDashboardPage from '@/pages/InventoryDashboardPage';
import InventoryCountPage from '@/pages/InventoryCountPage';
import VarianceReportsPage from '@/pages/VarianceReportsPage';
import WarehousesPage from '@/pages/WarehousesPage';
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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/mapping"
            element={
              <PrivateRoute>
                <MappingConfigAdminPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <PrivateRoute>
                <AuditLogsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/sessions"
            element={
              <PrivateRoute>
                <SessionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <UsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <PrivateRoute>
                <RolesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/permissions"
            element={
              <PrivateRoute>
                <PermissionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/companies"
            element={
              <PrivateRoute>
                <CompaniesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/erp-connections"
            element={
              <PrivateRoute>
                <ERPConnectionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <InventoryDashboardNavPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory/dashboard"
            element={
              <PrivateRoute>
                <InventoryDashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory/counts"
            element={
              <PrivateRoute>
                <InventoryCountPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory/variances"
            element={
              <PrivateRoute>
                <VarianceReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory/warehouses"
            element={
              <PrivateRoute>
                <WarehousesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
