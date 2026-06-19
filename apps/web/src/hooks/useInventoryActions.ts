import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { InventoryCount } from '@/services/inventory.types';

const extractErrorMessage = (error: any): string => {
  // Backend devuelve: { error: { code: '...', message: '...' } }
  const backendMsg = error?.response?.data?.error?.message;
  if (backendMsg) return backendMsg;
  // Algunos endpoints devuelven: { message: '...' }
  const directMsg = error?.response?.data?.message;
  if (directMsg && typeof directMsg === 'string') return directMsg;
  return error?.message || 'Error desconocido';
};

type NotifyFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;

export const useInventoryActions = (onNotify?: NotifyFn) => {
  const apiClient = getApiClient();
  const queryClient = useQueryClient();

  const startCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/start`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (_, countId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al iniciar conteo', extractErrorMessage(error)),
  });

  const completeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/complete`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (_, countId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al completar conteo', extractErrorMessage(error)),
  });

  const finalizeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/finalize`, {});
      return response.data as InventoryCount;
    },
    onSuccess: (_, countId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al finalizar conteo', extractErrorMessage(error)),
  });

  const createVersionMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.post(`/inventory-counts/${countId}/new-version`, {});
      const getResponse = await apiClient.get(`/inventory-counts/${countId}`);
      return getResponse.data as InventoryCount;
    },
    onSuccess: (_, countId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al crear versión', extractErrorMessage(error)),
  });

  const sendToERPMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
      return response.data;
    },
    onSuccess: (_, countId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
      onNotify?.('success', 'ERP sincronizado', 'Datos enviados al ERP exitosamente.');
    },
    onError: (error: any) => onNotify?.('error', 'Error al enviar a ERP', extractErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.delete(`/inventory-counts/${countId}/delete`);
    },
    onSuccess: (_, countId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al eliminar conteo', extractErrorMessage(error)),
  });

  const reserveInvoiceMutation = useMutation({
    mutationFn: async ({ countId, invoiceNumber, reservationStrategy = 'PENDING_INVOICES', reservationType = 'IN_AISLE' }: { countId: string, invoiceNumber: string, reservationStrategy?: string, reservationType?: string }) => {
      // Fix field names as per change01 analysis
      const response = await apiClient.post(`/inventory-counts/${countId}/reserve-invoice`, {
        invoiceNumber,
        reservationStrategy,
        reservationType
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', variables.countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al reservar factura', extractErrorMessage(error)),
  });

  const reservePickingListMutation = useMutation({
    mutationFn: async (params: { countId: string; startDate: string; endDate: string; sellerCode?: string; dryRun?: boolean; reservationStrategy?: string }) => {
      const { countId, ...payload } = params;
      const response = await apiClient.post(
        `/inventory-counts/${countId}/reserve-picking-list`, 
        {
          ...payload,
          reservationStrategy: payload.reservationStrategy || 'PICKING_LIST'
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', variables.countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al reservar picking list', extractErrorMessage(error)),
  });

  const reserveExcelMutation = useMutation({
    mutationFn: async ({ countId, file, type }: { countId: string; file: File; type: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/inventory-counts/${countId}/load-reservations-from-excel?type=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', variables.countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al cargar desde Excel', extractErrorMessage(error)),
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      await apiClient.delete(`/inventory-counts/${id}/reserved-invoices/${invoiceId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', variables.id] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al eliminar reserva', extractErrorMessage(error)),
  });

  const refreshSKUMutation = useMutation({
    mutationFn: async ({ countId, warehouseId, mappingId, locationId, itemCodes }: { countId: string; warehouseId: string; mappingId: string; locationId: string; itemCodes?: string[] }) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/load-from-mapping`, {
        warehouseId,
        mappingId,
        locationId,
        ...(itemCodes && itemCodes.length > 0 ? { itemCodes } : {})
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', variables.countId] });
    },
    onError: (error: any) => onNotify?.('error', 'Error al refrescar datos', extractErrorMessage(error)),
  });

  return {
    startCountMutation,
    completeCountMutation,
    finalizeCountMutation,
    createVersionMutation,
    sendToERPMutation,
    deleteMutation,
    reserveInvoiceMutation,
    reservePickingListMutation,
    reserveExcelMutation,
    deleteReservationMutation,
    refreshSKUMutation
  };
};
