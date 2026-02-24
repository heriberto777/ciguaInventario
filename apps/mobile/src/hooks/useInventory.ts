import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getApiClient } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CountItem {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty?: number;
  version: number;
  packQty: number;
  uom: string;
  baseUom: string;
  costPrice?: number;
  salePrice?: number;
}

export interface InventoryCount {
  id: string;
  sequenceNumber: number;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
  currentVersion: number;
  countItems: CountItem[];
  createdAt: string;
  updatedAt: string;
}

export function useInventoryCount(countId: string) {
  return useQuery(
    ['inventory-count', countId],
    async () => {
      const apiClient = getApiClient();
      const response = await apiClient.get<InventoryCount>(
        `/inventory-counts/${countId}`
      );
      return response.data;
    },
    { enabled: !!countId }
  );
}

export function useUpdateCountItem() {
  const queryClient = useQueryClient();

  return useMutation(
    async ({
      countId,
      itemId,
      countedQty,
    }: {
      countId: string;
      itemId: string;
      countedQty: number;
    }) => {
      const apiClient = getApiClient();
      await apiClient.patch(
        `/inventory-counts/${countId}/items/${itemId}`,
        { countedQty }
      );
    },
    {
      onSuccess: (_, { countId }) => {
        queryClient.invalidateQueries(['inventory-count', countId]);
      },
    }
  );
}

export function useStartCount() {
  const queryClient = useQueryClient();

  return useMutation(
    async (countId: string) => {
      const apiClient = getApiClient();
      const response = await apiClient.patch<InventoryCount>(
        `/inventory-counts/${countId}/start`,
        {}
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData(['inventory-count', data.id], data);
        queryClient.invalidateQueries('inventory-counts');
      },
    }
  );
}

export function useCompleteCount() {
  const queryClient = useQueryClient();

  return useMutation(
    async (countId: string) => {
      const apiClient = getApiClient();
      await apiClient.patch(`/inventory-counts/${countId}/complete`, {});
    },
    {
      onSuccess: (_, countId) => {
        queryClient.invalidateQueries(['inventory-count', countId]);
        queryClient.invalidateQueries('inventory-counts');
      },
    }
  );
}

// ========== HOOKS ADICIONALES ==========

export function useListInventoryCounts() {
  return useQuery(
    'inventory-counts',
    async () => {
      const apiClient = getApiClient();
      const response = await apiClient.get<InventoryCount[]>(
        '/inventory-counts'
      );
      return response.data;
    }
  );
}

export function useCreateCount() {
  const queryClient = useQueryClient();

  return useMutation(
    async (data: { warehouseId: string; description?: string; mappingId?: string }) => {
      const apiClient = getApiClient();
      const response = await apiClient.post<InventoryCount>(
        '/inventory-counts',
        data
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventory-counts');
      },
    }
  );
}

export function useAddCountItem() {
  const queryClient = useQueryClient();

  return useMutation(
    async ({
      countId,
      itemCode,
      itemName,
      systemQty,
      packQty,
      uom,
    }: {
      countId: string;
      itemCode: string;
      itemName: string;
      systemQty: number;
      packQty: number;
      uom: string;
    }) => {
      const apiClient = getApiClient();
      const response = await apiClient.post<CountItem>(
        `/inventory-counts/${countId}/items`,
        { itemCode, itemName, systemQty, packQty, uom }
      );
      return response.data;
    },
    {
      onSuccess: (_, { countId }) => {
        queryClient.invalidateQueries(['inventory-count', countId]);
      },
    }
  );
}

export function useDeleteCountItem() {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ countId, itemId }: { countId: string; itemId: string }) => {
      const apiClient = getApiClient();
      await apiClient.delete(
        `/inventory-counts/${countId}/items/${itemId}`
      );
    },
    {
      onSuccess: (_, { countId }) => {
        queryClient.invalidateQueries(['inventory-count', countId]);
      },
    }
  );
}

export function useGetCountItems(countId: string) {
  return useQuery(
    ['inventory-count-items', countId],
    async () => {
      const apiClient = getApiClient();
      const response = await apiClient.get<CountItem[]>(
        `/inventory-counts/${countId}/items`
      );
      return response.data;
    },
    { enabled: !!countId }
  );
}

export function useGetVarianceItems(countId: string) {
  return useQuery(
    ['inventory-count-variance', countId],
    async () => {
      const apiClient = getApiClient();
      const response = await apiClient.get<CountItem[]>(
        `/inventory-counts/${countId}/variance-items`
      );
      return response.data;
    },
    { enabled: !!countId }
  );
}
