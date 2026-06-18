import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { InventoryCount } from '@/services/inventory.types';

const extractErrorMessage = (error: any): string => {
  const axiosMessage = error?.response?.data?.message || error?.response?.data?.error;
  if (axiosMessage) return axiosMessage;
  return error?.message || 'Error desconocido';
};

export const useInventoryActions = () => {
  const apiClient = getApiClient();
  const queryClient = useQueryClient();

  const startCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/start`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
    onError: (error: any) => alert(`Error al iniciar conteo: ${extractErrorMessage(error)}`),
  });

  const completeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/complete`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
    onError: (error: any) => alert(`Error al completar conteo: ${extractErrorMessage(error)}`),
  });

  const finalizeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/finalize`, {});
      return response.data as InventoryCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
    onError: (error: any) => alert(`Error al finalizar conteo: ${extractErrorMessage(error)}`),
  });

  const createVersionMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.post(`/inventory-counts/${countId}/new-version`, {});
      const getResponse = await apiClient.get(`/inventory-counts/${countId}`);
      return getResponse.data as InventoryCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
    onError: (error: any) => alert(`Error al crear versión: ${extractErrorMessage(error)}`),
  });

  const sendToERPMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      alert('✅ Datos enviados al ERP exitosamente.');
    },
    onError: (error: any) => alert(`Error al enviar a ERP: ${extractErrorMessage(error)}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.delete(`/inventory-counts/${countId}/delete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
    onError: (error: any) => alert(`Error al eliminar conteo: ${extractErrorMessage(error)}`),
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
    onError: (error: any) => alert(`Error al reservar factura: ${extractErrorMessage(error)}`),
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
    onError: (error: any) => alert(`Error al reservar picking list: ${extractErrorMessage(error)}`),
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
    onError: (error: any) => alert(`Error al cargar reservas desde Excel: ${extractErrorMessage(error)}`),
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      await apiClient.delete(`/inventory-counts/${id}/reserved-invoices/${invoiceId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', variables.id] });
    },
    onError: (error: any) => alert(`Error al eliminar reserva: ${extractErrorMessage(error)}`),
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
    onError: (error: any) => alert(`Error al refrescar datos: ${extractErrorMessage(error)}`),
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
