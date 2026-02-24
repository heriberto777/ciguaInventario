import { AdminLayout } from '@/components/templates/AdminLayout';
import { MappingConfigAdminPage } from './MappingConfigAdminPage';

export function MappingPage() {
  return (
    <AdminLayout title="ERP Mapping Configuration">
      <MappingConfigAdminPage />
    </AdminLayout>
  );
}
