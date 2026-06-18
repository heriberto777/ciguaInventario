'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import { ConfirmModal } from '@/components/atoms/ConfirmModal';
import { ProcessingModal } from '@/components/atoms/ProcessingModal';
import { usePermissions } from '@/hooks/usePermissions';
import { InventoryCountsTable } from '@/components/organisms/inventory/InventoryCountsTable';
import { InventoryCountWizard } from '@/components/organisms/inventory/InventoryCountWizard';
import { InventoryCount, Warehouse, Location } from '@/services/inventory.types';
import { useInventoryActions } from '@/hooks/useInventoryActions';
import { useInventorySync } from '@/hooks/useInventorySync';

const apiClient = getApiClient();

export default function InventoryCountListPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>('');

  const { hasPermission } = usePermissions();
  const permissions = {
    canCreate: hasPermission('inv_counts:create'),
    canDelete: hasPermission('inv_counts:delete'),
  };

  const { actionsHook } = { actionsHook: useInventoryActions() };
  const { fetchFromServer } = useInventorySync({
    autoResume: false
  });

  // Queries
  const { data: counts = [], refetch: refetchCounts } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const response = await apiClient.get('/inventory-counts');
      return (response.data.data || response.data) as InventoryCount[];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await apiClient.get('/warehouses')).data as Warehouse[],
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', activeWarehouseId],
    queryFn: async () => (await apiClient.get(`/warehouses/${activeWarehouseId}/locations`)).data as Location[],
    enabled: !!activeWarehouseId,
  });

  const { data: availableMappings = [] } = useQuery({
    queryKey: ['available-mappings'],
    queryFn: async () => {
      const response = await apiClient.get('/mapping-configs');
      const rawData = Array.isArray(response.data) ? response.data : response.data.data || [];
      return Array.from(new Map(rawData.map((m: any) => [m.datasetType, m])).values());
    },
  });

  const [processing, setProcessing] = useState({ isOpen: false, message: '', status: 'processing' as any });

  const createCountMutation = useMutation({
    mutationFn: async (data: any) => {
      setProcessing({ isOpen: true, message: 'Creando conteo...', status: 'processing' });
      const response = await apiClient.post('/inventory-counts', {
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        mappingConfigId: data.mappingId,
        description: `Conteo físico - ${new Date().toLocaleDateString()}`,
      });
      const count = response.data.count || response.data;

      if (data.creationMode === 'excel' && data.excelFile) {
        const formData = new FormData();
        formData.append('file', data.excelFile);
        await apiClient.post(`/inventory-counts/${count.id}/load-from-excel`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (data.mappingId) {
        await apiClient.post(`/inventory-counts/${count.id}/load-from-mapping`, {
          warehouseId: data.warehouseId,
          mappingId: data.mappingId,
          locationId: data.locationId,
          itemCodes: data.selectedItemCodes,
        });
      }
      return count;
    },
    onSuccess: (count) => {
      setProcessing({ isOpen: true, message: 'Conteo creado con éxito', status: 'success' });
      setTimeout(() => {
        setProcessing(p => ({ ...p, isOpen: false }));
        navigate(`/inventory/counts/${count.id}`);
      }, 1500);
    },
    onError: (error: any) => {
      setProcessing({ isOpen: true, message: error.response?.data?.error || 'Error al crear conteo', status: 'error' });
    }
  });

  const [actionConfirm, setActionConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false });
  const confirmAction = (title: string, message: string, onConfirm: () => void, isDangerous = false) => {
    setActionConfirm({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setActionConfirm(prev => ({ ...prev, isOpen: false })); }, isDangerous });
  };

  if (view === 'create') {
    return (
      <InventoryCountWizard
        warehouses={warehouses}
        locations={locations}
        availableMappings={availableMappings}
        onWarehouseChange={setActiveWarehouseId}
        onConfirm={(data) => createCountMutation.mutate(data)}
        onCancel={() => setView('list')}
        isPending={createCountMutation.isPending}
      />
    );
  }

  return (
    <div className="p-8 bg-app min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl font-black text-primary tracking-tighter">Auditoría <span className="text-accent-primary">Inventario</span></h1>
          {permissions.canCreate && (
            <Button variant="primary" onClick={() => setView('create')}>+ Nuevo Conteo</Button>
          )}
        </div>
        
        <InventoryCountsTable 
          counts={counts} 
          onProcess={(count) => navigate(`/inventory/counts/${count.id}`)} 
          onDelete={(id) => confirmAction('Eliminar', '¿Eliminar conteo?', () => actionsHook.deleteMutation.mutate(id), true)}
        />
      </div>
      <ConfirmModal isOpen={actionConfirm.isOpen} onConfirm={actionConfirm.onConfirm} onCancel={() => setActionConfirm(prev => ({ ...prev, isOpen: false }))} title={actionConfirm.title} message={actionConfirm.message} isDangerous={actionConfirm.isDangerous} />
      <ProcessingModal isOpen={processing.isOpen} message={processing.message} status={processing.status} onClose={() => setProcessing(p => ({ ...p, isOpen: false }))} />
    </div>
  );
}
