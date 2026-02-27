import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getApiClient } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineSync } from '../services/offline-sync';

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
  // Clasificación
  category?: string;
  subcategory?: string;
  brand?: string;
  barCodeInv?: string;
  barCodeVt?: string;
  status: 'PENDING' | 'COMPLETED' | 'IN_PROGRESS';
  hasVariance: boolean;
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
  const queryClient = useQueryClient();

  return useQuery(
    ['inventory-count', countId],
    async () => {
      // 1. Intentar obtener de la API
      try {
        const apiClient = getApiClient();
        const response = await apiClient.get<InventoryCount>(
          `/inventory-counts/${countId}`
        );
        const freshData = response.data;

        // Actualizar caché SQLite con datos frescos
        await offlineSync.cacheCount(freshData);
        return freshData;
      } catch (error) {
        console.warn('API error in useInventoryCount, falling back to cache:', error);

        // 2. Fallback a caché SQLite
        const cached = await offlineSync.getCachedCount(countId);
        if (cached) return cached;

        throw error;
      }
    },
    {
      enabled: !!countId,
      staleTime: 30000, // 30 segundos de "frescura"
    }
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
      const updateData = { countedQty };

      try {
        await apiClient.patch(
          `/inventory-counts/${countId}/items/${itemId}`,
          updateData
        );
      } catch (error) {
        console.warn('Failed to update item via API, queueing for offline sync');
        // Guardar en cola de sincronización pendiente
        await offlineSync.addPendingSync('update-item', countId, updateData, itemId);

        // Actualizar caché SQLite local para que la UI refleje el cambio de inmediato
        const cached = await offlineSync.getCachedCount(countId);
        if (cached) {
          const updatedItems = cached.countItems.map(item =>
            item.id === itemId ? { ...item, countedQty } : item
          );
          await offlineSync.cacheCount({ ...cached, countItems: updatedItems });
        }
      }
    },
    {
      onMutate: async ({ countId, itemId, countedQty }) => {
        // Optimistic update en la caché de React Query
        await queryClient.cancelQueries(['inventory-count', countId]);
        const previousCount = queryClient.getQueryData<InventoryCount>(['inventory-count', countId]);

        if (previousCount) {
          queryClient.setQueryData(['inventory-count', countId], {
            ...previousCount,
            countItems: previousCount.countItems.map(item =>
              item.id === itemId ? { ...item, countedQty } : item
            )
          });
        }

        return { previousCount };
      },
      onError: (err, variables, context: any) => {
        // En caso de error REAL (no de red), revertir optimistic update
        // Pero si fue error de red, ya encolamos arriba, así que mantenemos el visual
        if (err && (err as any).response) {
          if (context?.previousCount) {
            queryClient.setQueryData(['inventory-count', variables.countId], context.previousCount);
          }
        }
      },
      onSettled: (_, __, { countId }) => {
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
      try {
        const response = await apiClient.post<InventoryCount>(
          `/inventory-counts/${countId}/start`,
          {}
        );
        const data = response.data;
        await offlineSync.cacheCount(data);
        return data;
      } catch (error) {
        console.warn('Failed to start count via API, this action requires connection');
        throw error;
      }
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
      try {
        await apiClient.post(`/inventory-counts/${countId}/complete`, {});
      } catch (error) {
        console.warn('Failed to complete count via API, queueing for offline sync');
        await offlineSync.addPendingSync('complete-count', countId, {});

        // Actualizar estado local a COMPLETED
        const cached = await offlineSync.getCachedCount(countId);
        if (cached) {
          await offlineSync.cacheCount({ ...cached, status: 'COMPLETED' });
        }
      }
    },
    {
      onMutate: async (countId) => {
        await queryClient.cancelQueries(['inventory-count', countId]);
        const previousCount = queryClient.getQueryData<InventoryCount>(['inventory-count', countId]);
        if (previousCount) {
          queryClient.setQueryData(['inventory-count', countId], { ...previousCount, status: 'COMPLETED' });
        }
        return { previousCount };
      },
      onSettled: (_, __, countId) => {
        queryClient.invalidateQueries(['inventory-count', countId]);
        queryClient.invalidateQueries('inventory-counts');
      },
    }
  );
}

export function useSendToERP() {
  const queryClient = useQueryClient();

  return useMutation(
    async (countId: string) => {
      const apiClient = getApiClient();
      const response = await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
      return response.data;
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
      const itemData = { itemCode, itemName, systemQty, packQty, uom };

      try {
        const response = await apiClient.post<CountItem>(
          `/inventory-counts/${countId}/items`,
          itemData
        );
        return response.data;
      } catch (error) {
        console.warn('Failed to add item via API, queueing for offline sync');
        const tempId = `temp-${Date.now()}`;
        await offlineSync.addPendingSync('add-item', countId, itemData, tempId);

        // Mock item for cache
        const newItem: CountItem = {
          ...itemData,
          id: tempId,
          version: 1,
          baseUom: uom,
          status: 'PENDING',
          hasVariance: false
        };
        const cached = await offlineSync.getCachedCount(countId);
        if (cached) {
          await offlineSync.cacheCount({ ...cached, countItems: [...cached.countItems, newItem] });
        }
        return newItem;
      }
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
      try {
        await apiClient.delete(
          `/inventory-counts/${countId}/items/${itemId}`
        );
      } catch (error) {
        console.warn('Failed to delete item via API, queueing for offline sync');
        await offlineSync.addPendingSync('delete-item', countId, {}, itemId);

        const cached = await offlineSync.getCachedCount(countId);
        if (cached) {
          const updatedItems = cached.countItems.filter(item => item.id !== itemId);
          await offlineSync.cacheCount({ ...cached, countItems: updatedItems });
        }
      }
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

// ─────────────────────────────────────────────
// Warehouses
// ─────────────────────────────────────────────
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export function useWarehouses() {
  return useQuery(
    'warehouses',
    async () => {
      const apiClient = getApiClient();
      const response = await apiClient.get<{ data: Warehouse[] }>('/warehouses');
      // El backend puede envolver en { data: [...] } o devolver el array directo
      const payload = response.data as any;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as Warehouse[];
    }
  );
}
