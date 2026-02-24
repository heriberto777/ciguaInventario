import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';

interface CreateCountParams {
  warehouseId: string;
  mappingConfigId: string;
}

interface StateTransitionParams {
  countId: string;
}

export const useInventoryCountState = () => {
  const apiClient = getApiClient();
  const queryClient = useQueryClient();

  // Create new inventory count
  const createNewInventoryCount = useMutation({
    mutationFn: async (params: CreateCountParams) => {
      const res = await apiClient.post('/inventory-counts/create', params);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Start inventory count (DRAFT -> ACTIVE)
  const startInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/start`);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Complete inventory count (ACTIVE -> COMPLETED)
  const completeInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/complete`);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Pause inventory count (ACTIVE -> ON_HOLD)
  const pauseInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/pause`);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Resume inventory count (ON_HOLD -> ACTIVE)
  const resumeInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/resume`);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Close inventory count (COMPLETED -> CLOSED)
  const closeInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/close`);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Cancel inventory count (any state -> CANCELLED)
  const cancelInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/cancel`);
      return res.data.count || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Create new version for recounting (COMPLETED -> ACTIVE V2, V3, etc)
  const createNewVersion = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.post(`/inventory-counts/${params.countId}/new-version`);
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  // Delete inventory count (DRAFT or ACTIVE only)
  const deleteInventoryCount = useMutation({
    mutationFn: async (params: StateTransitionParams) => {
      const res = await apiClient.delete(`/inventory-counts/${params.countId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
    },
  });

  return {
    createNewInventoryCount,
    startInventoryCount,
    completeInventoryCount,
    pauseInventoryCount,
    resumeInventoryCount,
    closeInventoryCount,
    cancelInventoryCount,
    createNewVersion,
    deleteInventoryCount,
  };
};
