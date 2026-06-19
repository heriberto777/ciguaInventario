import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { TestMappingRequest } from '@shared/schemas/api';

// getApiClient() se llama dentro de cada hook intencionalmente:
// si se llamara a nivel de módulo, podría ejecutarse antes de que
// initializeApiClient() sea invocado en App.tsx, devolviendo undefined.

// Helpers para normalizar la respuesta del módulo /mapping-configs
// que puede devolver array directo o { data: array }
const normalizeMappingList = (res: any): any[] => {
  const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  return raw.map((c: any) => ({ ...c, connectionId: c.erpConnectionId || c.connectionId }));
};

export function useMappingConfigs(datasetType?: string) {
  return useQuery({
    queryKey: ['mappings', datasetType],
    queryFn: async () => {
      const response = await getApiClient().get('/mapping-configs');
      const all = normalizeMappingList(response);
      return datasetType ? all.filter((c: any) => c.datasetType === datasetType) : all;
    },
    enabled: true,
    staleTime: 30000,
  });
}

export function useMappingConfig(mappingId: string) {
  return useQuery({
    queryKey: ['mapping', mappingId],
    queryFn: async () => {
      const response = await getApiClient().get('/mapping-configs');
      const all = normalizeMappingList(response);
      return all.find((c: any) => c.id === mappingId) || null;
    },
    enabled: !!mappingId,
    staleTime: 30000,
  });
}

export function useCreateMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await getApiClient().post('/mapping-configs', data);
      return Array.isArray(response.data) ? response.data : response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    },
  });
}

export function useTestMapping() {
  return useMutation({
    mutationFn: async (data: TestMappingRequest) => {
      // El módulo nuevo no tiene endpoint de test — mantiene el viejo por compatibilidad
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

export function useAppConfig() {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const response = await getApiClient().get('/settings/app-config');
      return response.data.data;
    },
    staleTime: 600000, // 10 minutes
  });
}

export function usePublicAppConfig(companyName: string = 'default') {
  return useQuery({
    queryKey: ['public-app-config', companyName],
    queryFn: async () => {
      const response = await getApiClient().get(`/public/app-config/${companyName}`);
      return response.data.data;
    },
    staleTime: 600000,
  });
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await getApiClient().patch('/settings/app-config', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      queryClient.invalidateQueries({ queryKey: ['public-app-config'] });
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
