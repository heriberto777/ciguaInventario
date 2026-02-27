import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { TestMappingRequest } from '@shared/schemas/api';

// getApiClient() se llama dentro de cada hook intencionalmente:
// si se llamara a nivel de módulo, podría ejecutarse antes de que
// initializeApiClient() sea invocado en App.tsx, devolviendo undefined.

export function useMappingConfigs(datasetType?: string) {
  return useQuery({
    queryKey: ['mappings', datasetType],
    queryFn: async () => {
      const response = await getApiClient().get('/config/mapping', {
        params: { ...(datasetType && { datasetType }) },
      });
      return response.data.data;
    },
    enabled: true,
    staleTime: 30000,
  });
}

export function useMappingConfig(mappingId: string) {
  return useQuery({
    queryKey: ['mapping', mappingId],
    queryFn: async () => {
      const response = await getApiClient().get(`/config/mapping/${mappingId}`);
      return response.data.data;
    },
    enabled: !!mappingId,
    staleTime: 30000,
  });
}

export function useCreateMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await getApiClient().post('/config/mapping', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    },
  });
}

export function useTestMapping() {
  return useMutation({
    mutationFn: async (data: TestMappingRequest) => {
      const response = await getApiClient().post('/config/mapping/test', data);
      return response.data.data;
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await getApiClient().post('/auth/login', credentials);
      return response.data.data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await getApiClient().post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
