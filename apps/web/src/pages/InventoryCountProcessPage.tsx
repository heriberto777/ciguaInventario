'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { NotificationModal } from '@/components/atoms/NotificationModal';
import { ConfirmModal } from '@/components/atoms/ConfirmModal';
import { OperationOverlay } from '@/components/atoms/OperationOverlay';
import { usePermissions } from '@/hooks/usePermissions';

// Hooks
import { useInventorySync } from '@/hooks/useInventorySync';
import { useInventoryActions } from '@/hooks/useInventoryActions';
import { useInventoryProcess } from '@/hooks/useInventoryProcess';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Organisms
import { CountItemsList } from '@/components/organisms/inventory/CountItemsList';
import { CountHeaderActions } from '@/components/organisms/inventory/CountHeaderActions';
import { CountSummary } from '@/components/organisms/inventory/CountSummary';
import { ReservationList } from '@/components/organisms/inventory/ReservationList';
import { PickingListManager } from '@/components/organisms/inventory/PickingListManager';
import { ReservationExcelImport } from '@/components/organisms/inventory/ReservationExcelImport';

// Types
import { InventoryCount } from '@/services/inventory.types';

const apiClient = getApiClient();

export default function InventoryCountProcessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'items' | 'dispatches'>('items');
  const [reservationSubTab, setReservationSubTab] = useState<'invoice' | 'picking' | 'excel'>('invoice');

  const { hasPermission } = usePermissions();
  const permissions = {
    canCreate: hasPermission('inv_counts:create'),
    canDelete: hasPermission('inv_counts:delete'),
    canComplete: hasPermission('inv_counts:complete'),
    canSyncERP: hasPermission('sync:erp'),
    canExport: hasPermission('reports:export'),
    hasSystemView: hasPermission('inventory:view_qty'),
    hasVarianceView: hasPermission('inventory:view_variances'),
    canEditQuantity: hasPermission('inv_counts:execute') || hasPermission('inventory:edit_items')
  };

  const { fetchFromServer, clearLocal } = useInventorySync({
    autoResume: false, // Prevent loading previous count from localStorage on mount
    onSyncSuccess: (count) => {
      if (count?.countItems) processHook.setCountItems(count.countItems);
    }
  });

  const processHook = useInventoryProcess(id);

  // Preview state for Picking List
  const [pickingPreview, setPickingPreview] = useState<any>(null);

  // Load initial data
  const { data: count, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory-count', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/inventory-counts/${id}`);
      return (response.data.data || response.data) as InventoryCount;
    },
    enabled: !!id
  });

  // Sync count items with local state whenever data changes
  useEffect(() => {
    if (count?.countItems) {
      processHook.setCountItems(count.countItems);
    }
  }, [count]);

  useKeyboardShortcuts({
    onSearch: () => { /* Future: Focus search ref */ },
    onSwitchToItems: () => setActiveTab('items'),
    onSwitchToDispatches: () => setActiveTab('dispatches')
  });

  const [notification, setNotification] = useState({ isOpen: false, type: 'info' as any, title: '', message: '' });
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) =>
    setNotification({ isOpen: true, type, title, message });
  const actionsHook = useInventoryActions(showNotification);
  const [actionConfirm, setActionConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false });
  const [selectedMappingId, setSelectedMappingId] = useState('');
  const [refreshingItemCodes, setRefreshingItemCodes] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  // Load Mappings
  const { data: mappingsData, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['mapping-configs', 'all'], // Removed 'inventory' to broaden search
    queryFn: async () => {
      console.log('🔍 [InventoryCountProcessPage] Fetching all mappings...');
      const response = await apiClient.get('/mapping-configs');
      const rawData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      if (Array.isArray(rawData)) {
        return rawData.map((m: any) => ({
          ...m,
          connectionId: m.erpConnectionId || m.connectionId,
          displayName: `${(m.datasetType || 'CONFIG').toUpperCase()} - v${m.version}`
        }));
      }
      return [];
    }
  });

  const summaryData = useMemo(() => {
    let totalItems = 0;
    let variances = 0;
    let shortages = 0;
    let overages = 0;
    
    let totalCostOverages = 0;
    let totalCostShortages = 0;
    
    let totalPhysicalValue = 0;
    let totalSystemValue = 0;
    let totalReservedValue = 0;

    processHook.countItems.forEach(item => {
      totalItems++;
      const systemQty = Number(item.systemQty ?? 0);
      const counted = Number(item.countedQty ?? 0);
      const separated = Number(item.reservedSeparated ?? 0);
      const inAisle = Number(item.reservedInAisle ?? 0);
      
      // Fórmula unificada:
      // Separado: ERP lo tiene, pero ya no está → restar
      // Pasillo: ERP ya lo descontó, pero sigue en estante → sumar
      const expectedStock = systemQty - separated + inAisle;
      const variance = counted - expectedStock;
      
      if (Math.abs(variance) > 0.001) {
        variances++;
        if (variance < 0) shortages++;
        else overages++;
      }

      // Ensure costPrice is treated as a number (Prisma Decimal → string)
      const cost = Number(item.costPrice ?? 0);
      
      if (variance > 0) totalCostOverages += variance * cost;
      if (variance < 0) totalCostShortages += Math.abs(variance) * cost;
      
      totalPhysicalValue += counted * cost;
      totalSystemValue += expectedStock * cost;
      totalReservedValue += (inAisle + separated) * cost;
    });

    return {
      totalItems,
      variances,
      shortages,
      overages,
      totalCostOverages,
      totalCostShortages,
      totalCostDifferences: totalCostOverages - totalCostShortages,
      totalPhysicalValue,
      totalSystemValue,
      totalReservedValue,
      totalInventoryDifference: totalPhysicalValue - totalSystemValue
    };
  }, [processHook.countItems]);

  const activeOperation = useMemo(() => {
    if (actionsHook.startCountMutation.isPending) return 'Iniciando conteo...';
    if (actionsHook.completeCountMutation.isPending) return 'Finalizando conteo y calculando varianzas...';
    if (actionsHook.finalizeCountMutation.isPending) return 'Finalizando conteo definitivamente...';
    if (actionsHook.sendToERPMutation.isPending) return 'Enviando datos al ERP...';
    if (actionsHook.createVersionMutation.isPending) return 'Creando nueva versión de conteo...';
    if (actionsHook.deleteMutation.isPending) return 'Cancelando conteo...';
    if (actionsHook.reserveInvoiceMutation.isPending) return 'Reservando factura...';
    if (actionsHook.reservePickingListMutation.isPending) return 'Procesando picking list...';
    if (actionsHook.reserveExcelMutation.isPending) return 'Cargando reservas desde Excel...';
    if (actionsHook.deleteReservationMutation.isPending) return 'Eliminando reserva...';
    return null;
  }, [
    actionsHook.startCountMutation.isPending,
    actionsHook.completeCountMutation.isPending,
    actionsHook.finalizeCountMutation.isPending,
    actionsHook.sendToERPMutation.isPending,
    actionsHook.createVersionMutation.isPending,
    actionsHook.deleteMutation.isPending,
    actionsHook.reserveInvoiceMutation.isPending,
    actionsHook.reservePickingListMutation.isPending,
    actionsHook.reserveExcelMutation.isPending,
    actionsHook.deleteReservationMutation.isPending,
  ]);

  const handleRefreshItem = async (itemCode: string) => {
    if (!id || !count) return;
    if (!selectedMappingId) {
      setNotification({ isOpen: true, type: 'warning', title: 'Atención', message: 'Por favor seleccione un Mapping ERP primero en el selector de la tabla.' });
      return;
    }

    // Obtener locationId real del primer item del conteo para que el upsert haga match
    const firstItem = processHook.countItems[0];
    const locationId = firstItem?.locationId || count.locationId || '';

    const isAll = itemCode === '*';
    if (isAll) {
      setRefreshingItemCodes(new Set(processHook.countItems.map(i => i.itemCode)));
    } else {
      setRefreshingItemCodes(prev => new Set([...prev, itemCode]));
    }

    try {
      await actionsHook.refreshSKUMutation.mutateAsync({
        countId: id,
        warehouseId: count.warehouseId,
        mappingId: selectedMappingId,
        locationId,
        itemCodes: isAll ? processHook.countItems.map((i: any) => i.itemCode) : [itemCode]
      });
      setNotification({ isOpen: true, type: 'success', title: 'Sincronización Exitosa', message: isAll ? 'Todo el stock teórico ha sido actualizado desde el ERP.' : `Stock de ${itemCode} actualizado.` });
    } catch (error) {
      console.error('Error refreshing SKU:', error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo sincronizar con el ERP.' });
    } finally {
      setRefreshingItemCodes(new Set());
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void, isDangerous = false) => {
    setActionConfirm({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setActionConfirm(prev => ({ ...prev, isOpen: false })); }, isDangerous });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!count) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-2xl font-black text-primary">Conteo no encontrado</h2>
        <button onClick={() => navigate('/inventory/counts')} className="mt-4 text-accent-primary font-bold">← Volver al listado</button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-app">
      <div className="flex-shrink-0 border-b border-border-default bg-card px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-primary tracking-tighter">{count.sequenceNumber}</h1>
            <p className="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1">{count.code}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border ${
            count.status === 'COMPLETED' || count.status === 'FINALIZED' ? 'bg-success/10 text-success border-success/20' : 'bg-accent-primary/10 text-accent-primary border-accent-primary/20'
          }`}>
            {count.status}
          </span>
        </div>
      </div>

      <CountHeaderActions 
        count={count}
        permissions={permissions}
        actions={{
          onStart: () => actionsHook.startCountMutation.mutate(count.id),
          onComplete: () => confirmAction('Finalizar Conteo', '¿Está seguro de finalizar el conteo? Se cerrará la edición.', () => actionsHook.completeCountMutation.mutate(count.id)),
          onPause: () => actionsHook.completeCountMutation.mutate(count.id),
          onResume: () => actionsHook.startCountMutation.mutate(count.id),
          onFinalize: () => confirmAction('Finalizar Definitivamente', '¿Desea finalizar definitivamente? Esto enviará los datos al histórico.', () => actionsHook.finalizeCountMutation.mutate(count.id)),
          onCreateVersion: () => actionsHook.createVersionMutation.mutate(count.id),
          onSyncERP: () => actionsHook.sendToERPMutation.mutate(count.id),
          onExportExcel: () => { /* Handle Export */ },
          onCancel: () => confirmAction('Cancelar Conteo', '¿Está seguro? Esta acción es irreversible.', () => actionsHook.deleteMutation.mutate(count.id), true),
          onBack: () => navigate('/inventory/counts'),
          onRefreshData: () => refetch()
        }}
        isLoading={{
          refresh: isFetching,
          complete: actionsHook.completeCountMutation.isPending,
          finalize: actionsHook.finalizeCountMutation.isPending,
          sync: actionsHook.sendToERPMutation.isPending,
          version: actionsHook.createVersionMutation.isPending
        }}
      />

      {/* Resumen del Conteo (Toggleable) */}
      {activeTab === 'items' && (
        <CountSummary 
          data={summaryData} 
          isVisible={showSummary} 
          onToggle={() => setShowSummary(!showSummary)} 
        />
      )}

      <div className="bg-card border-b border-border-default px-8">
        <div className="max-w-7xl mx-auto flex gap-8">
          <button onClick={() => setActiveTab('items')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 ${activeTab === 'items' ? 'border-accent-primary text-primary' : 'border-transparent text-muted'}`}>📦 Items</button>
          <button onClick={() => setActiveTab('dispatches')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 ${activeTab === 'dispatches' ? 'border-accent-primary text-primary' : 'border-transparent text-muted'}`}>📄 Reservas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto w-full">
          {activeTab === 'items' ? (
            <CountItemsList
              items={processHook.filteredItems}
              searchTerm={processHook.searchTerm}
              onSearchChange={processHook.setSearchTerm}
              onItemChange={processHook.handleItemChange}
              onRefresh={handleRefreshItem}
              syncingItemIds={processHook.syncingItemIds}
              syncedItemIds={processHook.syncedItemIds}
              refreshingItemCodes={refreshingItemCodes}
              canEdit={permissions.canEditQuantity && count.status === 'ACTIVE'}
              hasSystemView={permissions.hasSystemView}
              hasVarianceView={permissions.hasVarianceView}
              selectedMappingId={selectedMappingId}
              onMappingChange={setSelectedMappingId}
              mappings={mappingsData || []}
              filters={processHook.filters}
              setFilters={processHook.setFilters}
              categories={processHook.classifications.categories}
              subcategories={processHook.classifications.subcategories}
              brands={processHook.classifications.brands}
            />
          ) : (
            <div className="p-8 space-y-8">
              <div className="flex gap-2 bg-hover/20 p-1 rounded-xl w-fit border border-border-default">
                <button onClick={() => setReservationSubTab('invoice')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reservationSubTab === 'invoice' ? 'bg-card text-primary shadow-sm' : 'text-muted'}`}>📄 Factura Individual</button>
                <button onClick={() => setReservationSubTab('picking')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reservationSubTab === 'picking' ? 'bg-card text-primary shadow-sm' : 'text-muted'}`}>📦 Picking List</button>
                <button onClick={() => setReservationSubTab('excel')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reservationSubTab === 'excel' ? 'bg-card text-primary shadow-sm' : 'text-muted'}`}>📊 Excel</button>
              </div>

              {reservationSubTab === 'invoice' ? (
                <ReservationList
                  reservations={(count as any).reservedInvoices || []}
                  onReserve={(invoiceNumber, reservationType) => actionsHook.reserveInvoiceMutation.mutate({ countId: count.id, invoiceNumber, reservationType })}
                  onRemove={(id) => confirmAction('Eliminar Reserva', '¿Estás seguro de eliminar esta reserva?', () => actionsHook.deleteReservationMutation?.mutate({ id: count.id, invoiceId: id }), true)}
                  isPending={actionsHook.reserveInvoiceMutation.isPending}
                />
              ) : reservationSubTab === 'picking' ? (
                <PickingListManager
                  onReserve={(params) => {
                    actionsHook.reservePickingListMutation.mutate(
                      { ...params, countId: count.id },
                      { onSuccess: (data) => { if (params.dryRun) setPickingPreview(data); else { setPickingPreview(null); setNotification({ isOpen: true, type: 'success', title: 'Reserva Exitosa', message: 'Se han reservado las facturas del picking list.' }); } } }
                    );
                  }}
                  isPending={actionsHook.reservePickingListMutation.isPending}
                  previewData={pickingPreview}
                />
              ) : (
                <ReservationExcelImport
                  onUpload={(file, type) => actionsHook.reserveExcelMutation.mutate({ countId: count.id, file, type })}
                  isPending={actionsHook.reserveExcelMutation.isPending}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <OperationOverlay isActive={!!activeOperation} message={activeOperation || ''} />
      <ConfirmModal isOpen={actionConfirm.isOpen} onConfirm={actionConfirm.onConfirm} onCancel={() => setActionConfirm(prev => ({ ...prev, isOpen: false }))} title={actionConfirm.title} message={actionConfirm.message} isDangerous={actionConfirm.isDangerous} />
      <NotificationModal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} type={notification.type} title={notification.title} message={notification.message} />
    </div>
  );
}
