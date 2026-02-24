import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { MappingConfig, TestMappingRequest } from '@shared/schemas/api';

const apiClient = getApiClient();

export function useMappingConfigs(datasetType?: string) {
  return useQuery({
    queryKey: ['mappings', datasetType],
    queryFn: async () => {
      const response = await apiClient.get('/config/mapping', {
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
      const response = await apiClient.get(`/config/mapping/${mappingId}`);
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
      const response = await apiClient.post('/config/mapping', data);
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
      const response = await apiClient.post('/config/mapping/test', data);
      return response.data.data;
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data.data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
