import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

let apiClient: AxiosInstance;

// Flag para evitar múltiples llamadas simultáneas al refresh
let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedRequestsQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedRequestsQueue = [];
}

export function initializeApiClient() {
  if (apiClient) return apiClient;

  // En DEV usamos el proxy de Vite '/api' para evitar problemas de CORS y preflights innecesarios.
  // En PROD el backend suele estar bajo la misma ruta o manejado por el reverse proxy.
  const baseURL = '/api';

  apiClient = axios.create({
    baseURL,
    withCredentials: true,
  });

  // Adjunta el accessToken a cada request de forma reactiva
  apiClient.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  // Interceptor de respuesta: si el server retorna 401, intenta refresh silencioso.
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Solo procesar 401 si no es una re-intento y no es login/refresh
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/refresh') &&
        !originalRequest.url?.includes('/auth/login')
      ) {
        const { refreshToken, logout } = useAuthStore.getState();

        console.warn(`🔐 [API Interceptor] 401 detectado en: ${originalRequest.url}. Intentando refrescar token...`);

        if (!refreshToken) {
          console.error('❌ [API Interceptor] No hay Refresh Token disponible en el store. Forzando logout.');
          logout();
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          console.debug('⏳ [API Interceptor] Ya hay un refresco en progreso. Encolando request.');
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              resolve: (token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(apiClient(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.debug('🔄 [API Interceptor] Solicitando nuevo Access Token al backend...');
          const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

          console.info('✅ [API Interceptor] Token refrescado con éxito.');
          useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError: any) {
          const status = refreshError.response?.status;
          console.error('❌ [API Interceptor] Falló el refresco del token:', {
            status,
            code: refreshError.response?.data?.error?.code,
            message: refreshError.message
          });

          processQueue(refreshError, null);

          // SOLO desloguear si el error es explícitamente 401 (token inválido/expirado en BD)
          // Si el error es de red (no hay status) o 500 (error servidor), NO desloguear automáticamente.
          if (status === 401) {
            console.error('🔒 [API Interceptor] El Refresh Token ha expirado o es inválido. Forzando login.');
            logout();
            if (!window.location.pathname.startsWith('/login')) {
              localStorage.setItem('redirectAfterLogin', window.location.pathname);
              window.location.href = '/login';
            }
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}

export function getApiClient() {
  if (!apiClient) {
    initializeApiClient();
  }
  return apiClient;
}
